from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.models.project import Project
from app.services.project_service import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])

class CreateProjectRequest(BaseModel):
    title: Optional[str] = "New Book Bite"

@router.post("", response_model=Project)
def create_project(req: CreateProjectRequest):
    return project_service.create_project(title=req.title or "New Book Bite")

@router.get("", response_model=List[Project])
def list_projects():
    return project_service.list_projects()

@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.put("/{project_id}", response_model=Project)
def update_project(project_id: str, project: Project):
    if project.id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")
    return project_service.save_project(project)

@router.delete("/{project_id}")
def delete_project(project_id: str):
    success = project_service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success"}

class DuplicateProjectRequest(BaseModel):
    title: Optional[str] = None

@router.post("/{project_id}/duplicate", response_model=Project)
def duplicate_project(project_id: str, req: Optional[DuplicateProjectRequest] = None):
    new_title = req.title if req else None
    proj = project_service.duplicate_project(project_id, new_title=new_title)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj
