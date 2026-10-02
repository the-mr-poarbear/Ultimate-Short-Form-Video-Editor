from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.models.sfx import SfxItem
from app.services.sfx_service import sfx_service

router = APIRouter(prefix="/api/sfx", tags=["sfx"])

@router.get("", response_model=List[SfxItem])
def list_sfx(category: Optional[str] = Query(None)):
    return sfx_service.list_sfx(category=category)

@router.get("/{sfx_id}", response_model=SfxItem)
def get_sfx(sfx_id: str):
    item = sfx_service.get_sfx(sfx_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sound effect not found")
    return item

@router.post("", response_model=SfxItem)
async def create_sfx(
    name: str = Form(...),
    category: str = Form("custom"),
    file: UploadFile = File(...)
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Sound effect name cannot be empty")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    item = sfx_service.create_sfx(
        name=name.strip(),
        category=category.strip(),
        file_bytes=content,
        filename=file.filename or "sfx.wav"
    )

    return item

@router.delete("/{sfx_id}")
def delete_sfx(sfx_id: str):
    success = sfx_service.delete_sfx(sfx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sound effect not found")
    return {"status": "success"}
