import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routes import projects, audio, transcription, slices, media, render, jobs, characters

app = FastAPI(
    title="Book Bite Video Editor API",
    description="Backend audio processing, transcription, alignment, slicing, and FFmpeg rendering engine for Book Bite Shorts",
    version="1.0.0"
)

# CORS configuration for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local projects directory for media streaming
app.mount("/media", StaticFiles(directory=str(settings.PROJECTS_DIR)), name="media")
# Mount global characters directory for character pose streaming
app.mount("/characters_media", StaticFiles(directory=str(settings.CHARACTERS_DIR)), name="characters_media")

# Include Routers
app.include_router(projects.router)
app.include_router(characters.router)
app.include_router(audio.router)
app.include_router(transcription.router)
app.include_router(slices.router)
app.include_router(media.router)
app.include_router(render.router)
app.include_router(jobs.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Book Bite Video Editor Backend",
        "whisper_model": settings.WHISPER_MODEL,
        "device": settings.DEVICE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
