import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1")
    
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "small.en")
    DEVICE: str = os.getenv("DEVICE", "cuda")
    COMPUTE_TYPE: str = os.getenv("COMPUTE_TYPE", "float16")
    
    PROJECTS_DIR: Path = BASE_DIR / os.getenv("PROJECTS_DIR", "projects")
    CHARACTERS_DIR: Path = BASE_DIR / os.getenv("CHARACTERS_DIR", "characters")
    OVERLAYS_DIR: Path = BASE_DIR / os.getenv("OVERLAYS_DIR", "overlays")
    SFX_DIR: Path = BASE_DIR / os.getenv("SFX_DIR", "sfx")

settings = Settings()
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
settings.CHARACTERS_DIR.mkdir(parents=True, exist_ok=True)
settings.OVERLAYS_DIR.mkdir(parents=True, exist_ok=True)
settings.SFX_DIR.mkdir(parents=True, exist_ok=True)
