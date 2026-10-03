import re
import subprocess
import json
import struct
from pathlib import Path
from typing import Dict, List, Tuple, Any
import numpy as np

class AudioService:
    def get_audio_duration(self, audio_path: Path) -> float:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(res.stdout.strip())

    def detect_silence_intervals(self, audio_path: Path, threshold_db: float = -35.0, min_silence_ms: int = 300) -> Tuple[List[Dict[str, float]], float]:
        """
        Runs ffmpeg silencedetect filter and parses silence intervals.
        Returns (silence_intervals, total_duration).
        """
        min_silence_sec = max(min_silence_ms / 1000.0, 0.1)
        cmd = [
            "ffmpeg",
            "-i", str(audio_path),
            "-af", f"silencedetect=noise={threshold_db}dB:d={min_silence_sec}",
            "-f", "null",
            "-"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stderr = res.stderr

        intervals = []
        current_start = None
        duration = 0.0

        # Try to parse duration from ffmpeg output as well
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", stderr)
        if dur_match:
            h, m, s = dur_match.groups()
            duration = int(h) * 3600 + int(m) * 60 + float(s)
        else:
            try:
                duration = self.get_audio_duration(audio_path)
            except Exception:
                duration = 0.0

        for line in stderr.splitlines():
            start_match = re.search(r"silence_start:\s*([0-9.]+)", line)
            if start_match:
                current_start = float(start_match.group(1))

            end_match = re.search(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)", line)
            if end_match and current_start is not None:
                end = float(end_match.group(1))
                dur = float(end_match.group(2))
                intervals.append({
                    "start": current_start,
                    "end": end,
                    "duration": dur
                })
                current_start = None

        return intervals, duration

    def process_and_reduce_silence(
        self,
        input_path: Path,
        output_path: Path,
        threshold_db: float = -35.0,
        min_silence_ms: int = 300,
        retention_percent: float = 20.0
    ) -> Dict[str, Any]:
        """
        Detects silence, trims unnecessary pauses retaining retention_percent,
        and outputs a normalized 16kHz mono WAV for WhisperX and playback.
        """
        intervals, original_dur = self.detect_silence_intervals(input_path, threshold_db, min_silence_ms)
        
        if original_dur <= 0:
            original_dur = self.get_audio_duration(input_path)

        total_silence = sum(i["duration"] for i in intervals)
        
        # Build segments of audio to keep
        # Each silence interval [s, e] will be compressed to keep retention_percent * (e - s)
        retention_ratio = max(min(retention_percent / 100.0, 1.0), 0.0)
        
        # If no silence detected or total silence is very small, simply convert & normalize
        if not intervals or total_silence < 0.2:
            cmd = [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-ar", "44100",
                "-ac", "2",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                str(output_path)
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            processed_dur = self.get_audio_duration(output_path)
            return {
                "originalDuration": original_dur,
                "originalSilence": total_silence,
                "removedSilence": 0.0,
                "remainingSilence": total_silence,
                "processedDuration": processed_dur,
                "silenceIntervals": intervals
            }

        # Build filter_complex segments
        # Non-silent segments + shortened silent segments
        filter_parts = []
        seg_idx = 0
        current_time = 0.0
        removed_silence = 0.0

        for interval in intervals:
            silence_start = interval["start"]
            silence_end = interval["end"]
            silence_dur = interval["duration"]

            # Speech segment before this silence
            if silence_start > current_time + 0.05:
                filter_parts.append(f"[0:a]atrim=start={current_time:.3f}:end={silence_start:.3f},asetpts=PTS-STARTPTS[a{seg_idx}];")
                seg_idx += 1

            # Kept silence segment
            kept_dur = max(silence_dur * retention_ratio, 0.15)
            # If silence duration was already smaller than or equal to kept_dur, don't trim
            if kept_dur >= silence_dur:
                kept_end = silence_end
            else:
                kept_end = silence_start + kept_dur
                removed_silence += (silence_dur - kept_dur)

            filter_parts.append(f"[0:a]atrim=start={silence_start:.3f}:end={kept_end:.3f},asetpts=PTS-STARTPTS[a{seg_idx}];")
            seg_idx += 1

            current_time = silence_end

        # Remaining audio after last silence
        if current_time < original_dur - 0.05:
            filter_parts.append(f"[0:a]atrim=start={current_time:.3f}:end={original_dur:.3f},asetpts=PTS-STARTPTS[a{seg_idx}];")
            seg_idx += 1

        # Concat all segments with loudnorm normalization
        inputs_str = "".join(f"[a{i}]" for i in range(seg_idx))
        concat_str = f"{inputs_str}concat=n={seg_idx}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[outa]"
        full_filter = "".join(filter_parts) + concat_str

        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-filter_complex", full_filter,
            "-map", "[outa]",
            "-ar", "44100",
            "-ac", "2",
            str(output_path)
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"[AudioService] FFmpeg filter complex failed: {res.stderr}\nFilter was: {full_filter}")
            # Fallback to simple normalization if complex filter had a precision issue
            fallback_cmd = [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-ar", "44100",
                "-ac", "2",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                str(output_path)
            ]
            subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            removed_silence = 0.0

        processed_dur = self.get_audio_duration(output_path)
        remaining_silence = max(total_silence - removed_silence, 0.0)

        return {
            "originalDuration": original_dur,
            "originalSilence": total_silence,
            "removedSilence": removed_silence,
            "remainingSilence": remaining_silence,
            "processedDuration": processed_dur,
            "silenceIntervals": intervals
        }

    def generate_waveform_peaks(self, audio_path: Path, num_peaks: int = 800) -> List[float]:
        """
        Extracts peak amplitudes across the audio file downsampled to num_peaks values between 0.0 and 1.0.
        """
        cmd = [
            "ffmpeg",
            "-i", str(audio_path),
            "-ac", "1",
            "-filter:a", "aresample=8000",
            "-map", "0:a",
            "-c:a", "pcm_s16le",
            "-f", "s16le",
            "-"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        raw_bytes = res.stdout
        
        if not raw_bytes:
            return [0.0] * num_peaks

        samples = np.frombuffer(raw_bytes, dtype=np.int16)
        if len(samples) == 0:
            return [0.0] * num_peaks

        # Absolute values
        abs_samples = np.abs(samples)
        
        # Bin into num_peaks chunks
        chunk_size = max(len(abs_samples) // num_peaks, 1)
        peaks = []
        for i in range(num_peaks):
            start = i * chunk_size
            end = min((i + 1) * chunk_size, len(abs_samples))
            if start < len(abs_samples):
                peak = float(np.max(abs_samples[start:end])) if end > start else 0.0
                peaks.append(peak)
            else:
                peaks.append(0.0)

        # Normalize to 0.0 - 1.0
        max_val = max(peaks) if peaks else 1.0
        if max_val > 0:
            peaks = [round(p / max_val, 3) for p in peaks]
        else:
            peaks = [0.0] * num_peaks

        return peaks

audio_service = AudioService()
