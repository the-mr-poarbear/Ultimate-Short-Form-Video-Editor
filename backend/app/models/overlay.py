from typing import Optional, Literal
from pydantic import BaseModel

OverlayCategory = Literal["arrows", "lines", "callouts", "stickers", "custom"]
OverlayType = Literal["svg", "image", "gif"]
OverlayAnimation = Literal[
    "none",
    "bounce",
    "pulse",
    "spin",
    "fade",
    "slide-up",
    "slide-down",
    "slide-left",
    "slide-right",
    "pop",
    "wiggle",
    "glow"
]

class OverlayItem(BaseModel):
    id: str
    name: str
    category: OverlayCategory = "custom"
    type: OverlayType = "image"
    url: str
    defaultAnimation: OverlayAnimation = "bounce"
    isPreset: bool = False
    createdAt: Optional[str] = None
