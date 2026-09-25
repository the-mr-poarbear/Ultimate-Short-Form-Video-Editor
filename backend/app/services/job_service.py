import uuid
from typing import Dict, Optional, Any
from app.models.jobs import Job

class JobService:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}

    def create_job(self, project_id: str, job_type: str, message: str = "Starting...") -> Job:
        job_id = str(uuid.uuid4())[:8]
        job = Job(
            id=job_id,
            projectId=project_id,
            type=job_type,
            status="pending",
            progress=0,
            message=message
        )
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def update_progress(self, job_id: str, progress: int, message: str):
        if job_id in self.jobs:
            self.jobs[job_id].status = "processing"
            self.jobs[job_id].progress = min(max(progress, 0), 100)
            self.jobs[job_id].message = message

    def complete_job(self, job_id: str, message: str = "Completed", result: Optional[Dict[str, Any]] = None):
        if job_id in self.jobs:
            self.jobs[job_id].status = "completed"
            self.jobs[job_id].progress = 100
            self.jobs[job_id].message = message
            self.jobs[job_id].result = result

    def fail_job(self, job_id: str, error: str):
        if job_id in self.jobs:
            self.jobs[job_id].status = "failed"
            self.jobs[job_id].error = error
            self.jobs[job_id].message = f"Failed: {error}"

job_service = JobService()
