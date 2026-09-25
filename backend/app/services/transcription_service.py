import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import settings
from app.models.transcript import TranscriptSegment, WordTiming
from app.services.job_service import job_service

class TranscriptionService:
    def __init__(self):
        self.model_name = settings.WHISPER_MODEL
        self.device = settings.DEVICE
        self.compute_type = settings.COMPUTE_TYPE

    def transcribe(self, audio_path: Path, job_id: Optional[str] = None) -> List[TranscriptSegment]:
        """
        Transcribes audio and returns segments with word-level timestamps.
        First tries WhisperX pipeline with forced alignment.
        Falls back to faster-whisper with word_timestamps=True if needed.
        """
        if job_id:
            job_service.update_progress(job_id, 20, f"Loading Whisper model ({self.model_name})...")

        try:
            return self._transcribe_whisperx(audio_path, job_id)
        except Exception as e:
            print(f"[TranscriptionService] WhisperX pipeline failed: {e}. Falling back to faster-whisper.")
            if job_id:
                job_service.update_progress(job_id, 40, f"WhisperX align fallback: using faster-whisper ({self.model_name})...")
            return self._transcribe_faster_whisper(audio_path, job_id)

    def _transcribe_whisperx(self, audio_path: Path, job_id: Optional[str] = None) -> List[TranscriptSegment]:
        import whisperx
        import torch

        device = "cuda" if torch.cuda.is_available() and self.device == "cuda" else "cpu"
        compute_type = self.compute_type if device == "cuda" else "float32"

        if job_id:
            job_service.update_progress(job_id, 35, f"Transcribing audio on {device} ({compute_type})...")

        # 1. Transcribe with WhisperX
        audio = whisperx.load_audio(str(audio_path))
        model = whisperx.load_model(self.model_name, device, compute_type=compute_type)
        result = model.transcribe(audio, batch_size=4)

        detected_lang = result.get("language", "en")

        # 2. Forced Alignment for precise word timestamps
        if job_id:
            job_service.update_progress(job_id, 70, "Performing forced alignment for word timestamps...")

        model_a, metadata = whisperx.load_align_model(language_code=detected_lang, device=device)
        aligned_result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

        # 3. Format into TranscriptSegments
        segments: List[TranscriptSegment] = []
        for i, seg in enumerate(aligned_result.get("segments", [])):
            words: List[WordTiming] = []
            for w in seg.get("words", []):
                # whisperx aligned words have 'word', 'start', 'end', and optional 'score'
                w_text = w.get("word", "").strip()
                if not w_text:
                    continue
                w_start = float(w.get("start", seg.get("start", 0.0)))
                w_end = float(w.get("end", seg.get("end", w_start + 0.1)))
                words.append(WordTiming(
                    word=w_text,
                    start=round(w_start, 3),
                    end=round(w_end, 3),
                    confidence=round(float(w.get("score", 1.0)), 2) if "score" in w else None
                ))

            seg_text = seg.get("text", "").strip()
            segments.append(TranscriptSegment(
                id=f"seg-{i+1}",
                start=round(float(seg.get("start", 0.0)), 3),
                end=round(float(seg.get("end", 0.0)), 3),
                text=seg_text,
                words=words
            ))

        if job_id:
            job_service.update_progress(job_id, 90, f"Generated {len(segments)} segments with word timestamps")

        return segments

    def _transcribe_faster_whisper(self, audio_path: Path, job_id: Optional[str] = None) -> List[TranscriptSegment]:
        from faster_whisper import WhisperModel
        import torch

        device = "cuda" if torch.cuda.is_available() and self.device == "cuda" else "cpu"
        compute_type = self.compute_type if device == "cuda" else "float32"

        if job_id:
            job_service.update_progress(job_id, 50, f"Transcribing with faster-whisper ({self.model_name})...")

        model = WhisperModel(self.model_name, device=device, compute_type=compute_type)
        segments_gen, info = model.transcribe(str(audio_path), word_timestamps=True, beam_size=5)

        segments: List[TranscriptSegment] = []
        for i, seg in enumerate(segments_gen):
            words: List[WordTiming] = []
            if seg.words:
                for w in seg.words:
                    words.append(WordTiming(
                        word=w.word.strip(),
                        start=round(w.start, 3),
                        end=round(w.end, 3),
                        confidence=round(w.probability, 2)
                    ))
            else:
                # Fallback if words array was empty
                words = [WordTiming(word=w, start=seg.start, end=seg.end) for w in seg.text.split()]

            segments.append(TranscriptSegment(
                id=f"seg-{i+1}",
                start=round(seg.start, 3),
                end=round(seg.end, 3),
                text=seg.text.strip(),
                words=words
            ))

        if job_id:
            job_service.update_progress(job_id, 90, f"Generated {len(segments)} segments with word timestamps")

        return segments

transcription_service = TranscriptionService()
