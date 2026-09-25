from typing import List, Optional
from pydantic import BaseModel, Field

class CharacterPose(BaseModel):
    id: str
    name: str
    imageUrl: str
    createdAt: Optional[str] = None

class Character(BaseModel):
    id: str
    name: str
    defaultPoseId: Optional[str] = None
    poses: List[CharacterPose] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
