from typing import Literal, Optional
from pydantic import BaseModel

class MediaAsset(BaseModel):
    id: str
    name: str
    type: Literal["image", "video"]
    path: str
    url: str
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnailUrl: Optional[str] = None
