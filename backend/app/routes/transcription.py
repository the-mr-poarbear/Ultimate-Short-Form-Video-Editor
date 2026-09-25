import threading
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.project_service import project_service
from app.services.transcription_service import transcription_service
from app.services.job_service import job_service

router = APIRouter(prefix="/api/projects/{project_id}", tags=["transcription"])

def run_transcription_job(project_id: str, job_id: str):
    try:
        proj = project_service.get_project(project_id)
        if not proj:
            job_service.fail_job(job_id, "Project not found")
            return

        proj_dir = project_service.get_project_dir(project_id)
        processed_audio = proj_dir / "audio" / "processed.wav"
        if not processed_audio.exists():
            orig_files = list((proj_dir / "audio").glob("original.*"))
            if not orig_files:
                job_service.fail_job(job_id, "No audio file found for transcription")
                return
            processed_audio = orig_files[0]

        segments = transcription_service.transcribe(processed_audio, job_id=job_id)

        proj.transcript = segments
        project_service.save_project(proj)

        job_service.complete_job(job_id, "Transcription completed successfully", {
            "segmentsCount": len(segments),
            "wordsCount": sum(len(s.words) for s in segments)
        })
    except Exception as e:
        print(f"[TranscriptionJob] Error: {e}")
        job_service.fail_job(job_id, str(e))

@router.post("/transcribe")
def start_transcription(project_id: str, background_tasks: BackgroundTasks):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    job = job_service.create_job(project_id, "transcription", "Preparing audio for transcription...")
    background_tasks.add_task(run_transcription_job, project_id, job.id)

    return {"jobId": job.id}

@router.get("/transcript")
def get_transcript(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"transcript": proj.transcript}
