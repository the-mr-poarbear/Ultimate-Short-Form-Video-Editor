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

def generate_video_thumbnail(file_path: Path, output_path: Path, duration: float = None) -> bool:
    """
    Generate thumbnail for video at midpoint or somewhere in between to avoid black screen at video start.
    """
    candidates = []
    if duration and duration > 0:
        # Seek somewhere in between start and end (midpoint)
        midpoint = duration / 2.0
        candidates.append(midpoint)
        if duration > 4.0:
            candidates.append(min(duration * 0.25, 5.0))
        if duration > 1.5:
            candidates.append(1.0)
    else:
        candidates.extend([2.0, 1.5, 1.0])

    # Fallbacks in case earlier seeks fail
    candidates.extend([0.5, 0.1, 0.0])

    for ss in candidates:
        cmd = [
            "ffmpeg", "-y",
            "-ss", f"{ss:.3f}",
            "-i", str(file_path),
            "-vframes", "1",
            "-vf", "scale=360:-1",
            str(output_path)
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                return True
        except Exception:
            continue

    return False

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

    # Generate thumbnail if video (taken from somewhere in between to avoid black screen at start)
    thumb_url = None
    if is_video:
        thumb_name = f"{asset_id}_thumb.jpg"
        thumb_path = media_dir / thumb_name
        if generate_video_thumbnail(dest_path, thumb_path, duration):
            thumb_url = f"/media/{project_id}/media/{thumb_name}"

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

    # Ensure all video assets have valid thumbnails from in-between frame
    modified = False
    media_dir = project_service.get_project_dir(project_id) / "media"
    for a in proj.mediaAssets:
        if a.type == "video":
            video_path = Path(a.path)
            if (not a.duration or a.duration <= 0) and video_path.exists():
                w, h, dur = extract_media_metadata(video_path, True)
                if dur:
                    a.duration = dur
                    modified = True
                if w and not a.width:
                    a.width = w
                    modified = True
                if h and not a.height:
                    a.height = h
                    modified = True

            thumb_name = f"{a.id}_thumb.jpg"
            thumb_path = media_dir / thumb_name
            if not thumb_path.exists() or thumb_path.stat().st_size == 0:
                if video_path.exists():
                    if generate_video_thumbnail(video_path, thumb_path, a.duration):
                        a.thumbnailUrl = f"/media/{project_id}/media/{thumb_name}"
                        modified = True
            elif not a.thumbnailUrl or a.thumbnailUrl != f"/media/{project_id}/media/{thumb_name}":
                a.thumbnailUrl = f"/media/{project_id}/media/{thumb_name}"
                modified = True

    if modified:
        project_service.save_project(proj)

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

    # Clear background if this asset was set as background media
    if proj.backgroundVideo and (
        asset.url in proj.backgroundVideo
        or asset.name in proj.backgroundVideo
        or Path(asset.path).name in proj.backgroundVideo
    ):
        proj.backgroundVideo = None

    project_service.save_project(proj)

    # Attempt to remove file and its thumbnail
    try:
        p = Path(asset.path)
        if p.exists():
            p.unlink()
        thumb_p = p.parent / f"{asset.id}_thumb.jpg"
        if thumb_p.exists():
            thumb_p.unlink()
    except Exception:
        pass

    return {"status": "success"}
