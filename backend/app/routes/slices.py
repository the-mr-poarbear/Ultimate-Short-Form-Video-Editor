from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.models.project import Slice
from app.models.transcript import TranscriptSegment
from app.services.project_service import project_service
from app.services.slice_service import slice_generator

router = APIRouter(prefix="/api/projects/{project_id}", tags=["slices"])

class GenerateSlicesRequest(BaseModel):
    minDuration: Optional[float] = None
    maxDuration: Optional[float] = None

class SplitSliceRequest(BaseModel):
    sliceId: str
    splitTime: float

class MergeSlicesRequest(BaseModel):
    firstId: str
    secondId: str

class JoinTranscriptionsRequest(BaseModel):
    segmentIds: List[str]

@router.post("/generate-slices")
def generate_slices(project_id: str, req: GenerateSlicesRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if not proj.transcript:
        raise HTTPException(status_code=400, detail="No transcript available. Run transcription first.")

    min_dur = req.minDuration or proj.settings.minimumSliceDuration
    max_dur = req.maxDuration or proj.settings.maximumSliceDuration

    slices = slice_generator.generate_slices(proj.transcript, min_dur, max_dur)
    proj.slices = slices
    project_service.save_project(proj)

    return {"slices": slices, "count": len(slices)}

@router.post("/split-slice")
def split_slice(project_id: str, req: SplitSliceRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slice_generator.split_slice_at_time(proj.slices, req.sliceId, req.splitTime, proj.duration)
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.post("/merge-slices")
def merge_slices(project_id: str, req: MergeSlicesRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slice_generator.merge_slices(proj.slices, req.firstId, req.secondId, proj.duration)
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.put("/slices")
def update_slices(project_id: str, slices: List[Slice]):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slices
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.delete("/slices/{slice_id}")
def delete_slice(project_id: str, slice_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj.slices = slice_generator.delete_slice(proj.slices, slice_id)
    project_service.save_project(proj)
    return {"slices": proj.slices}

@router.post("/join-transcriptions")
def join_transcriptions(project_id: str, req: JoinTranscriptionsRequest):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    target_segments = [s for s in proj.transcript if s.id in req.segmentIds]
    if len(target_segments) < 2:
        raise HTTPException(status_code=400, detail="Must provide at least two transcript segments to join")

    target_segments.sort(key=lambda s: s.start)
    first_seg = target_segments[0]
    last_seg = target_segments[-1]
    join_start = first_seg.start
    join_end = last_seg.end

    assoc_slices = [s for s in proj.slices if s.start < join_end - 0.05 and s.end > join_start + 0.05]
    assoc_slices.sort(key=lambda s: s.start)

    # Condition: Every slice of those transcriptions except the first one MUST be empty!
    if len(assoc_slices) > 1:
        other_slices = assoc_slices[1:]
        for s in other_slices:
            has_visual = bool(s.visual and getattr(s.visual, "assetId", None))
            has_char = bool(s.character and getattr(s.character, "characterId", None))
            if has_visual or has_char:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot join transcriptions: Slice '{s.id}' is not empty. Every slice except the first one must be empty."
                )

    all_words = []
    for s in target_segments:
        all_words.extend(s.words)
    merged_text = " ".join(s.text for s in target_segments).strip()

    merged_segment = TranscriptSegment(
        id=first_seg.id,
        start=join_start,
        end=join_end,
        text=merged_text,
        words=all_words
    )

    new_transcript = []
    inserted = False
    for seg in proj.transcript:
        if seg.id in req.segmentIds:
            if not inserted:
                new_transcript.append(merged_segment)
                inserted = True
        else:
            new_transcript.append(seg)
    proj.transcript = new_transcript

    if assoc_slices:
        first_slice = assoc_slices[0]
        first_slice.start = min(first_slice.start, join_start)
        first_slice.end = max(first_slice.end, join_end, *(s.end for s in assoc_slices))
        first_slice.text = merged_text

        other_ids = {s.id for s in assoc_slices[1:]}
        proj.slices = [s for s in proj.slices if s.id not in other_ids]
    else:
        new_slice = Slice(
            id=f"slice-{int(join_start * 100)}",
            start=join_start,
            end=join_end,
            text=merged_text
        )
        proj.slices.append(new_slice)
        proj.slices.sort(key=lambda s: s.start)

    project_service.save_project(proj)
    return {
        "transcript": proj.transcript,
        "slices": proj.slices,
        "mergedSegment": merged_segment,
    }
