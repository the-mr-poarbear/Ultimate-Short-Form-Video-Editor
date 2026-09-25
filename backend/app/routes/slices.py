from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.models.project import Slice
from app.services.project_service import project_service
from app.services.slice_service import slice_generator

router = APIRouter(prefix="/api/projects/{project_id}", tags=["slices"])

class GenerateSlicesRequest(BaseModel):
    minDuration: Optional[float] = None
    maxDuration: Optional[float] = None

class SplitSliceRequest(BaseModel):
    sliceId: str
    splitTime: float

class MergeSlicesRequest(BaseModel):
    firstId: str
    secondId: str

@router.post("/generate-slices")
def generate_slices(project_id: str, req: GenerateSlicesRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if not proj.transcript:
        raise HTTPException(status_code=400, detail="No transcript available. Run transcription first.")

    min_dur = req.minDuration or proj.settings.minimumSliceDuration
    max_dur = req.maxDuration or proj.settings.maximumSliceDuration

    slices = slice_generator.generate_slices(proj.transcript, min_dur, max_dur)
    proj.slices = slices
    project_service.save_project(proj)

    return {"slices": slices, "count": len(slices)}

@router.post("/split-slice")
def split_slice(project_id: str, req: SplitSliceRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slice_generator.split_slice_at_time(proj.slices, req.sliceId, req.splitTime)
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.post("/merge-slices")
def merge_slices(project_id: str, req: MergeSlicesRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slice_generator.merge_slices(proj.slices, req.firstId, req.secondId)
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.put("/slices")
def update_slices(project_id: str, slices: List[Slice]):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slices
    project_service.save_project(proj)
    return {"slices": proj.slices}
