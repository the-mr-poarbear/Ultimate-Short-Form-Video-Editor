from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.models.overlay import OverlayItem
from app.services.overlay_service import overlay_service

router = APIRouter(prefix="/api/overlays", tags=["overlays"])

@router.get("", response_model=List[OverlayItem])
def list_overlays(category: Optional[str] = Query(None)):
    return overlay_service.list_overlays(category=category)

@router.get("/{overlay_id}", response_model=OverlayItem)
def get_overlay(overlay_id: str):
    item = overlay_service.get_overlay(overlay_id)
    if not item:
        raise HTTPException(status_code=404, detail="Overlay not found")
    return item

@router.post("", response_model=OverlayItem)
async def create_overlay(
    name: str = Form(...),
    category: str = Form("custom"),
    defaultAnimation: str = Form("bounce"),
    file: UploadFile = File(...)
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Overlay name cannot be empty")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    item = overlay_service.create_overlay(
        name=name.strip(),
        category=category.strip(),
        default_animation=defaultAnimation.strip(),
        file_bytes=content,
        filename=file.filename or "overlay.png"
    )

    return item

@router.delete("/{overlay_id}")
def delete_overlay(overlay_id: str):
    success = overlay_service.delete_overlay(overlay_id)
    if not success:
        raise HTTPException(status_code=404, detail="Overlay not found")
    return {"status": "success"}
