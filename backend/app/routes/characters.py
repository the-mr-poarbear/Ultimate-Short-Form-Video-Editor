from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.models.character import Character, CharacterPose
from app.services.character_service import character_service

router = APIRouter(prefix="/api/characters", tags=["characters"])

class CreateCharacterRequest(BaseModel):
    name: str

class UpdateCharacterRequest(BaseModel):
    name: str
    defaultPoseId: Optional[str] = None

class UpdatePoseRequest(BaseModel):
    name: str

@router.get("", response_model=List[Character])
def list_characters():
    return character_service.list_characters()

@router.post("", response_model=Character)
def create_character(req: CreateCharacterRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Character name cannot be empty")
    return character_service.create_character(name=req.name.strip())

@router.get("/{character_id}", response_model=Character)
def get_character(character_id: str):
    char = character_service.get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char

@router.put("/{character_id}", response_model=Character)
def update_character(character_id: str, req: UpdateCharacterRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Character name cannot be empty")
    char = character_service.update_character(character_id, name=req.name.strip(), default_pose_id=req.defaultPoseId)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char

@router.delete("/{character_id}")
def delete_character(character_id: str):
    success = character_service.delete_character(character_id)
    if not success:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"status": "success"}

@router.post("/{character_id}/poses", response_model=CharacterPose)
async def add_pose(
    character_id: str,
    poseName: str = Form(...),
    file: UploadFile = File(...)
):
    char = character_service.get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    if not poseName.strip():
        raise HTTPException(status_code=400, detail="Pose name cannot be empty")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    pose = character_service.add_pose(
        character_id=character_id,
        pose_name=poseName.strip(),
        file_bytes=content,
        filename=file.filename or "pose.png"
    )

    if not pose:
        raise HTTPException(status_code=500, detail="Failed to save pose")

    return pose

@router.delete("/{character_id}/poses/{pose_id}")
def delete_pose(character_id: str, pose_id: str):
    success = character_service.delete_pose(character_id, pose_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pose not found")
    return {"status": "success"}

@router.put("/{character_id}/poses/{pose_id}", response_model=CharacterPose)
def update_pose(character_id: str, pose_id: str, req: UpdatePoseRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Pose name cannot be empty")
    pose = character_service.update_pose(character_id, pose_id, req.name.strip())
    if not pose:
        raise HTTPException(status_code=404, detail="Pose not found")
    return pose
