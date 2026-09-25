import uuid
import shutil
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.models.media import MediaAsset
from app.services.project_service import project_service

router = APIRouter(prefix="/api/projects/{project_id}", tags=["media"])

def extract_media_metadata(file_path: Path, is_video: bool):
    width, height, duration = None, None, None
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration",
            "-of", "csv=s=x:p=0",
            str(file_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0 and res.stdout.strip():
            parts = res.stdout.strip().split("x")
            if len(parts) >= 2:
                width = int(parts[0])
                height = int(parts[1])
            if len(parts) >= 3:
                try:
                    duration = float(parts[2])
                except ValueError:
                    pass
    except Exception:
        pass

    if is_video and not duration:
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path)
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0:
                duration = float(res.stdout.strip())
        except Exception:
            pass

    return width, height, duration

@router.post("/media")
async def upload_media(project_id: str, file: UploadFile = File(...)):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_dir = project_service.get_project_dir(project_id)
    media_dir = proj_dir / "media"
    media_dir.mkdir(exist_ok=True)

    filename = file.filename
    ext = Path(filename).suffix.lower()
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    is_video = ext in [".mp4", ".mov", ".mkv", ".webm"]

    if not (is_image or is_video):
        raise HTTPException(status_code=400, detail="Unsupported media format. Upload images or videos.")

    asset_id = str(uuid.uuid4())[:8]
    safe_name = f"{asset_id}{ext}"
    dest_path = media_dir / safe_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    width, height, duration = extract_media_metadata(dest_path, is_video)

    # Generate thumbnail if video
    thumb_url = None
    if is_video:
        thumb_name = f"{asset_id}_thumb.jpg"
        thumb_path = media_dir / thumb_name
        thumb_cmd = [
            "ffmpeg", "-y",
            "-ss", "00:00:00.5",
            "-i", str(dest_path),
            "-vframes", "1",
            "-vf", "scale=360:-1",
            str(thumb_path)
        ]
        try:
            subprocess.run(thumb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            thumb_url = f"/media/{project_id}/media/{thumb_name}"
        except Exception:
            pass

    asset = MediaAsset(
        id=asset_id,
        name=filename,
        type="image" if is_image else "video",
        path=str(dest_path),
        url=f"/media/{project_id}/media/{safe_name}",
        duration=duration,
        width=width,
        height=height,
        thumbnailUrl=thumb_url or f"/media/{project_id}/media/{safe_name}"
    )

    proj.mediaAssets.append(asset)
    project_service.save_project(proj)

    return asset

@router.get("/assets")
def list_assets(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"assets": proj.mediaAssets}

@router.delete("/media/{asset_id}")
def delete_asset(project_id: str, asset_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    asset = next((a for a in proj.mediaAssets if a.id == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    proj.mediaAssets = [a for a in proj.mediaAssets if a.id != asset_id]
    
    # Remove from any slices using it
    for s in proj.slices:
        if s.visual and s.visual.assetId == asset_id:
            s.visual = None

    project_service.save_project(proj)

    # Attempt to remove file
    try:
        p = Path(asset.path)
        if p.exists():
            p.unlink()
    except Exception:
        pass

    return {"status": "success"}
