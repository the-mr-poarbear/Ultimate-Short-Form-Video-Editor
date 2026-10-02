from typing import Optional, Literal
from pydantic import BaseModel

SfxCategory = Literal["whoosh", "pop", "impact", "chime", "voice", "custom"]

class SfxItem(BaseModel):
    id: str
    name: str
    category: SfxCategory = "custom"
    url: str
    duration: float = 1.0
    isPreset: bool = False
    createdAt: Optional[str] = None
