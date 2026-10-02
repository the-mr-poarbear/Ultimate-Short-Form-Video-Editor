import json
import uuid
import wave
import math
import struct
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from app.config import settings
from app.models.sfx import SfxItem, SfxCategory

SAMPLE_RATE = 44100

def generate_wav(filepath: Path, samples: List[float]):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)        # mono
        wav_file.setsampwidth(2)       # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for s in samples:
            # clamp to -1.0 to 1.0
            clamped = max(-1.0, min(1.0, s))
            int_val = int(clamped * 32767.0)
            frames.extend(struct.pack("<h", int_val))
        wav_file.writeframes(frames)

def synth_whoosh() -> List[float]:
    """Fast swoosh sweep"""
    duration = 0.35
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Frequency sweep from 200 to 1400 then drop
        freq = 200.0 + 1200.0 * math.sin(progress * math.pi)
        # Volume bell curve
        amp = math.sin(progress * math.pi) ** 1.8 * 0.75
        phase = 2.0 * math.pi * freq * t
        # Add slight harmonics for airy breath
        sample = (math.sin(phase) + 0.4 * math.sin(phase * 1.5) + 0.2 * math.sin(phase * 2.5)) * amp
        samples.append(sample)
    return samples

def synth_pop() -> List[float]:
    """Bubble pop sound"""
    duration = 0.12
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Rapid exponential pitch drop from 1100 to 140 Hz
        freq = 140.0 + 960.0 * math.exp(-progress * 18.0)
        amp = math.exp(-progress * 22.0) * 0.85
        sample = math.sin(2.0 * math.pi * freq * t) * amp
        samples.append(sample)
    return samples

def synth_ding() -> List[float]:
    """Bright bell chime"""
    duration = 0.8
    total = int(SAMPLE_RATE * duration)
    samples = []
    f1 = 1320.0
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        amp1 = math.exp(-progress * 5.0) * 0.55
        amp2 = math.exp(-progress * 8.0) * 0.25
        amp3 = math.exp(-progress * 12.0) * 0.15
        sample = (
            math.sin(2.0 * math.pi * f1 * t) * amp1 +
            math.sin(2.0 * math.pi * (f1 * 2.0) * t) * amp2 +
            math.sin(2.0 * math.pi * (f1 * 3.5) * t) * amp3
        )
        samples.append(sample)
    return samples

def synth_punch() -> List[float]:
    """Low bass impact punch"""
    duration = 0.35
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 45.0 + 140.0 * math.exp(-progress * 16.0)
        amp = math.exp(-progress * 8.0) * 0.9
        # add mild distortion saturation
        raw = math.sin(2.0 * math.pi * freq * t) * amp
        sample = math.tanh(raw * 1.5) * 0.75
        samples.append(sample)
    return samples

def synth_click() -> List[float]:
    """Sharp mechanical click"""
    duration = 0.07
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 2400.0 * math.exp(-progress * 30.0) + 800.0
        amp = math.exp(-progress * 45.0) * 0.8
        sample = math.sin(2.0 * math.pi * freq * t) * amp
        samples.append(sample)
    return samples

def synth_boing() -> List[float]:
    """Cartoon boing spring"""
    duration = 0.55
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Modulated spring frequency
        mod = 12.0 * math.sin(2.0 * math.pi * 9.0 * t)
        carrier_freq = 240.0 + 160.0 * progress + mod
        amp = math.exp(-progress * 4.5) * 0.75
        sample = math.sin(2.0 * math.pi * carrier_freq * t) * amp
        samples.append(sample)
    return samples

def synth_riser() -> List[float]:
    """Tension riser swell"""
    duration = 1.1
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 150.0 + 1000.0 * (progress ** 2.2)
        # Volume swells until sudden release
        amp = (progress ** 1.8) * 0.8
        sample = (
            math.sin(2.0 * math.pi * freq * t) +
            0.35 * math.sin(2.0 * math.pi * freq * 1.5 * t)
        ) * amp
        samples.append(sample)
    return samples

def synth_cyber_beep() -> List[float]:
    """Sci-Fi digitized accent chirp"""
    duration = 0.28
    total = int(SAMPLE_RATE * duration)
    samples = []
    pitches = [880.0, 1174.6, 1760.0]
    segment_len = total // 3
    for i in range(total):
        t = i / SAMPLE_RATE
        seg_idx = min(2, i // segment_len)
        freq = pitches[seg_idx]
        seg_progress = (i % segment_len) / segment_len
        amp = math.exp(-seg_progress * 8.0) * 0.65
        # Soft square-ish tone
        sin_val = math.sin(2.0 * math.pi * freq * t)
        sample = (sin_val + 0.3 * math.sin(2.0 * math.pi * freq * 3.0 * t)) * amp
        samples.append(sample)
    return samples

def synth_success_chord() -> List[float]:
    """Happy two-tone chime"""
    duration = 0.75
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        tone1_amp = math.exp(-progress * 6.0) * 0.4
        tone2_amp = math.exp(-max(0.0, progress - 0.15) * 5.0) * (0.5 if progress >= 0.15 else 0.0)
        sample = (
            math.sin(2.0 * math.pi * 587.33 * t) * tone1_amp + # D5
            math.sin(2.0 * math.pi * 880.0 * t) * tone2_amp    # A5
        )
        samples.append(sample)
    return samples

def synth_robot_voice() -> List[float]:
    """Robotic voice accent pulse"""
    duration = 0.45
    total = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Rapid pulse rate (50Hz buzz) on a vocal resonant formant (440Hz & 880Hz)
        buzz = math.sin(2.0 * math.pi * 55.0 * t)
        formant = math.sin(2.0 * math.pi * 440.0 * t) + 0.6 * math.sin(2.0 * math.pi * 880.0 * t)
        amp = math.sin(progress * math.pi) * 0.7
        sample = (formant * buzz) * amp
        samples.append(sample)
    return samples

DEFAULT_SFX_PRESETS = [
    {
        "id": "sfx-whoosh-fast",
        "name": "Fast Whoosh",
        "category": "whoosh",
        "duration": 0.35,
        "filename": "whoosh_fast.wav",
        "generator": synth_whoosh,
    },
    {
        "id": "sfx-bubble-pop",
        "name": "Bubble Pop",
        "category": "pop",
        "duration": 0.12,
        "filename": "bubble_pop.wav",
        "generator": synth_pop,
    },
    {
        "id": "sfx-bell-ding",
        "name": "Bell Ding",
        "category": "chime",
        "duration": 0.8,
        "filename": "bell_ding.wav",
        "generator": synth_ding,
    },
    {
        "id": "sfx-bass-punch",
        "name": "Bass Punch",
        "category": "impact",
        "duration": 0.35,
        "filename": "bass_punch.wav",
        "generator": synth_punch,
    },
    {
        "id": "sfx-ui-click",
        "name": "Crisp Click",
        "category": "pop",
        "duration": 0.07,
        "filename": "ui_click.wav",
        "generator": synth_click,
    },
    {
        "id": "sfx-cartoon-boing",
        "name": "Cartoon Boing",
        "category": "voice",
        "duration": 0.55,
        "filename": "cartoon_boing.wav",
        "generator": synth_boing,
    },
    {
        "id": "sfx-riser-swell",
        "name": "Tension Riser",
        "category": "whoosh",
        "duration": 1.1,
        "filename": "riser_swell.wav",
        "generator": synth_riser,
    },
    {
        "id": "sfx-cyber-beep",
        "name": "Cyber Glitch Beep",
        "category": "voice",
        "duration": 0.28,
        "filename": "cyber_beep.wav",
        "generator": synth_cyber_beep,
    },
    {
        "id": "sfx-success-chime",
        "name": "Success Chime",
        "category": "chime",
        "duration": 0.75,
        "filename": "success_chime.wav",
        "generator": synth_success_chord,
    },
    {
        "id": "sfx-robot-voice",
        "name": "Robot Voice Accent",
        "category": "voice",
        "duration": 0.45,
        "filename": "robot_voice.wav",
        "generator": synth_robot_voice,
    },
]

class SfxService:
    def __init__(self, sfx_dir: Path = settings.SFX_DIR):
        self.sfx_dir = sfx_dir
        self.sfx_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir = self.sfx_dir / "assets"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.data_file = self.sfx_dir / "sfx.json"
        self._seed_defaults()

    def _read_sfx(self) -> List[SfxItem]:
        if not self.data_file.exists():
            return []
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [SfxItem(**item) for item in data]
        except Exception as e:
            print(f"[SfxService] Error reading sfx.json: {e}")
            return []

    def _write_sfx(self, items: List[SfxItem]):
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump([item.model_dump() for item in items], f, indent=2)

    def _seed_defaults(self):
        existing = self._read_sfx()
        existing_ids = {s.id for s in existing}
        updated = False

        for preset in DEFAULT_SFX_PRESETS:
            p_id = preset["id"]
            filename = preset["filename"]
            wav_path = self.assets_dir / filename
            if not wav_path.exists():
                try:
                    samples = preset["generator"]()
                    generate_wav(wav_path, samples)
                except Exception as e:
                    print(f"[SfxService] Error synthesizing preset {p_id}: {e}")

            if p_id not in existing_ids:
                item = SfxItem(
                    id=p_id,
                    name=preset["name"],
                    category=preset["category"],
                    url=f"/sfx_media/assets/{filename}",
                    duration=preset["duration"],
                    isPreset=True,
                    createdAt=datetime.now(timezone.utc).isoformat()
                )
                existing.append(item)
                existing_ids.add(p_id)
                updated = True

        if updated or not self.data_file.exists():
            self._write_sfx(existing)

    def list_sfx(self, category: Optional[str] = None) -> List[SfxItem]:
        items = self._read_sfx()
        if category and category != "all":
            items = [item for item in items if item.category == category]
        return items

    def get_sfx(self, sfx_id: str) -> Optional[SfxItem]:
        for item in self._read_sfx():
            if item.id == sfx_id:
                return item
        return None

    def create_sfx(
        self,
        name: str,
        category: str,
        file_bytes: bytes,
        filename: str
    ) -> SfxItem:
        items = self._read_sfx()
        sfx_id = str(uuid.uuid4())[:8]
        ext = Path(filename).suffix.lower()
        if not ext:
            ext = ".wav"

        save_name = f"{sfx_id}{ext}"
        dest_path = self.assets_dir / save_name

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        # Detect audio duration using ffprobe or wave
        duration = 1.0
        try:
            if ext == ".wav":
                with wave.open(str(dest_path), "r") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    if rate > 0:
                        duration = round(frames / float(rate), 3)
            else:
                # Use ffprobe for non-wav formats
                probe_cmd = [
                    "ffprobe", "-v", "error", "-show_entries",
                    "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
                    str(dest_path)
                ]
                res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                if res.returncode == 0 and res.stdout.strip():
                    duration = round(float(res.stdout.strip()), 3)
        except Exception as e:
            print(f"[SfxService] Warning: Could not detect duration for {save_name}: {e}")

        now = datetime.now(timezone.utc).isoformat()
        item = SfxItem(
            id=sfx_id,
            name=name.strip(),
            category=category if category in ["whoosh", "pop", "impact", "chime", "voice", "custom"] else "custom",
            url=f"/sfx_media/assets/{save_name}",
            duration=duration,
            isPreset=False,
            createdAt=now
        )

        items.insert(0, item)
        self._write_sfx(items)
        return item

    def delete_sfx(self, sfx_id: str) -> bool:
        items = self._read_sfx()
        target = next((item for item in items if item.id == sfx_id), None)
        if not target:
            return False

        new_list = [item for item in items if item.id != sfx_id]
        self._write_sfx(new_list)

        if not target.isPreset:
            try:
                filename = Path(target.url).name
                file_path = self.assets_dir / filename
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"[SfxService] Error removing sfx file: {e}")

        return True

sfx_service = SfxService()
