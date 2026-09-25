import time
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.services.project_service import project_service
from app.services.audio_service import audio_service

router = APIRouter(prefix="/api/projects/{project_id}", tags=["audio"])

class SilenceSettingsRequest(BaseModel):
    silenceThresholdDb: Optional[float] = -35.0
    minimumSilenceMs: Optional[int] = 300
    silenceRetentionPercent: Optional[float] = 20.0

@router.post("/audio")
async def upload_audio(project_id: str, file: UploadFile = File(...)):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_dir = project_service.get_project_dir(project_id)
    audio_dir = proj_dir / "audio"
    audio_dir.mkdir(exist_ok=True)

    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp3", ".wav", ".m4a", ".aac", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    # Clean up any existing audio files to avoid extension mismatch or stale files
    for old_f in audio_dir.glob("original.*"):
        try:
            old_f.unlink(missing_ok=True)
        except Exception:
            pass
    for old_f in audio_dir.glob("processed.*"):
        try:
            old_f.unlink(missing_ok=True)
        except Exception:
            pass

    dest_orig = audio_dir / f"original{ext}"
    with open(dest_orig, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    duration = audio_service.get_audio_duration(dest_orig)
    ts = int(time.time() * 1000)
    proj.originalAudio = f"/media/{project_id}/audio/original{ext}?t={ts}"
    proj.processedAudio = None
    proj.duration = duration
    project_service.save_project(proj)

    return {
        "status": "success",
        "originalAudio": proj.originalAudio,
        "duration": duration
    }

@router.post("/analyze-audio")
def analyze_and_process_audio(project_id: str, req: SilenceSettingsRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_dir = project_service.get_project_dir(project_id)
    audio_dir = proj_dir / "audio"

    # Find original audio
    orig_files = list(audio_dir.glob("original.*"))
    if not orig_files:
        raise HTTPException(status_code=400, detail="No original audio found for this project")

    orig_path = orig_files[0]
    processed_path = audio_dir / "processed.wav"

    threshold = req.silenceThresholdDb if req.silenceThresholdDb is not None else proj.settings.silenceThresholdDb
    min_silence = req.minimumSilenceMs if req.minimumSilenceMs is not None else proj.settings.minimumSilenceMs
    retention = req.silenceRetentionPercent if req.silenceRetentionPercent is not None else proj.settings.silenceRetentionPercent

    # Update project settings
    proj.settings.silenceThresholdDb = threshold
    proj.settings.minimumSilenceMs = min_silence
    proj.settings.silenceRetentionPercent = retention

    analysis = audio_service.process_and_reduce_silence(
        input_path=orig_path,
        output_path=processed_path,
        threshold_db=threshold,
        min_silence_ms=min_silence,
        retention_percent=retention
    )

    peaks = audio_service.generate_waveform_peaks(processed_path, num_peaks=800)

    ts = int(time.time() * 1000)
    proj.processedAudio = f"/media/{project_id}/audio/processed.wav?t={ts}"
    proj.duration = analysis["processedDuration"]
    project_service.save_project(proj)

    return {
        "status": "success",
        "analysis": analysis,
        "processedAudio": proj.processedAudio,
        "duration": proj.duration,
        "waveform": peaks
    }

@router.get("/waveform")
def get_waveform(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_dir = project_service.get_project_dir(project_id)
    processed_path = proj_dir / "audio" / "processed.wav"
    if not processed_path.exists():
        # Fall back to original
        orig_files = list((proj_dir / "audio").glob("original.*"))
        if not orig_files:
            raise HTTPException(status_code=404, detail="No audio found")
        processed_path = orig_files[0]

    peaks = audio_service.generate_waveform_peaks(processed_path, num_peaks=800)
    return {"peaks": peaks}

from app.models.project import BackgroundMusic

class UpdateBackgroundMusicRequest(BaseModel):
    volume: Optional[float] = None
    loop: Optional[bool] = None
    fadeInDuration: Optional[float] = None
    fadeOutDuration: Optional[float] = None

class SetBackgroundMusicRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    volume: Optional[float] = 0.15
    loop: Optional[bool] = True
    fadeInDuration: Optional[float] = 1.0
    fadeOutDuration: Optional[float] = 2.0

@router.post("/background-music/upload")
async def upload_background_music(
    project_id: str,
    file: UploadFile = File(...),
    volume: float = 0.15,
):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_dir = project_service.get_project_dir(project_id)
    audio_dir = proj_dir / "audio"
    audio_dir.mkdir(exist_ok=True)

    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp3", ".wav", ".m4a", ".aac", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    for old_f in audio_dir.glob("bgm.*"):
        try:
            old_f.unlink(missing_ok=True)
        except Exception:
            pass

    dest_bgm = audio_dir / f"bgm{ext}"
    with open(dest_bgm, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ts = int(time.time() * 1000)
    bgm = BackgroundMusic(
        url=f"/media/{project_id}/audio/bgm{ext}?t={ts}",
        filename=file.filename,
        volume=volume,
        loop=True,
        fadeInDuration=1.0,
        fadeOutDuration=2.0
    )
    proj.backgroundMusic = bgm
    project_service.save_project(proj)

    return {"status": "success", "backgroundMusic": bgm}

@router.post("/background-music")
def set_background_music(project_id: str, req: SetBackgroundMusicRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    bgm = BackgroundMusic(
        url=req.url,
        filename=req.filename,
        volume=req.volume if req.volume is not None else 0.15,
        loop=req.loop if req.loop is not None else True,
        fadeInDuration=req.fadeInDuration if req.fadeInDuration is not None else 1.0,
        fadeOutDuration=req.fadeOutDuration if req.fadeOutDuration is not None else 2.0
    )
    proj.backgroundMusic = bgm
    project_service.save_project(proj)
    return {"status": "success", "backgroundMusic": bgm}

@router.patch("/background-music")
def update_background_music(project_id: str, req: UpdateBackgroundMusicRequest):
    proj = project_service.get_project(project_id)
    if not proj or not proj.backgroundMusic:
        raise HTTPException(status_code=404, detail="Project or background music not found")

    if req.volume is not None:
        proj.backgroundMusic.volume = max(0.0, min(1.0, req.volume))
    if req.loop is not None:
        proj.backgroundMusic.loop = req.loop
    if req.fadeInDuration is not None:
        proj.backgroundMusic.fadeInDuration = max(0.0, req.fadeInDuration)
    if req.fadeOutDuration is not None:
        proj.backgroundMusic.fadeOutDuration = max(0.0, req.fadeOutDuration)

    project_service.save_project(proj)
    return {"status": "success", "backgroundMusic": proj.backgroundMusic}

@router.delete("/background-music")
def delete_background_music(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.backgroundMusic = None
    project_service.save_project(proj)

    proj_dir = project_service.get_project_dir(project_id)
    audio_dir = proj_dir / "audio"
    for f in audio_dir.glob("bgm.*"):
        try:
            f.unlink(missing_ok=True)
        except Exception:
            pass

    return {"status": "success"}
