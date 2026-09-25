from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.project_service import project_service
from app.services.render_service import video_renderer
from app.services.job_service import job_service

router = APIRouter(prefix="/api/projects/{project_id}", tags=["render"])

def run_render_job(project_id: str, job_id: str):
    try:
        proj = project_service.get_project(project_id)
        if not proj:
            job_service.fail_job(job_id, "Project not found")
            return

        proj_dir = project_service.get_project_dir(project_id)
        video_renderer.render(proj, proj_dir, job_id=job_id)
    except Exception as e:
        print(f"[RenderJob] Error: {e}")
        job_service.fail_job(job_id, str(e))

@router.post("/render")
def trigger_render(project_id: str, background_tasks: BackgroundTasks):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    job = job_service.create_job(project_id, "render", "Initializing FFmpeg video renderer...")
    background_tasks.add_task(run_render_job, project_id, job.id)

    return {"jobId": job.id}
