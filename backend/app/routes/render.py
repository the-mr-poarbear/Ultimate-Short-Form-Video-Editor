import json
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.project_service import project_service
from app.services.render_service import video_renderer
from app.services.job_service import job_service

router = APIRouter(prefix="/api/projects/{project_id}", tags=["render"])

class RenderRequest(BaseModel):
    resolution: Optional[str] = "1080p"  # "720p", "1080p", "4k", "custom"
    customWidth: Optional[int] = None
    customHeight: Optional[int] = None
    startTime: Optional[float] = None
    endTime: Optional[float] = None
    fps: Optional[int] = 30

def run_render_job(project_id: str, job_id: str, options: Optional[Dict[str, Any]] = None):
    try:
        proj = project_service.get_project(project_id)
        if not proj:
            job_service.fail_job(job_id, "Project not found")
            return

        proj_dir = project_service.get_project_dir(project_id)
        opts = options or {}
        video_renderer.render(
            project=proj,
            project_dir=proj_dir,
            job_id=job_id,
            resolution=opts.get("resolution", "1080p"),
            custom_width=opts.get("customWidth"),
            custom_height=opts.get("customHeight"),
            start_time=opts.get("startTime"),
            end_time=opts.get("endTime"),
            fps=opts.get("fps", 30)
        )
    except Exception as e:
        print(f"[RenderJob] Error: {e}")
        job_service.fail_job(job_id, str(e))

@router.post("/render")
async def trigger_render(project_id: str, background_tasks: BackgroundTasks, request: Request):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    options: Dict[str, Any] = {}
    try:
        raw_body = await request.body()
        if raw_body:
            parsed = json.loads(raw_body.decode("utf-8"))
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            if isinstance(parsed, dict):
                options = parsed
    except Exception as e:
        print(f"[RenderRoute] Warning parsing render options: {e}")

    job = job_service.create_job(project_id, "render", "Initializing FFmpeg video renderer...")
    background_tasks.add_task(run_render_job, project_id, job.id, options)

    return {"jobId": job.id}
