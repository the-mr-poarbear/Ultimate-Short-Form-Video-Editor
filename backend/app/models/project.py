from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.transcript import TranscriptSegment
from app.models.media import MediaAsset

class SliceVisual(BaseModel):
    assetId: str
    type: Literal["image", "video"]
    fit: Literal["cover", "contain"] = "cover"
    transition: Literal["none", "fade", "zoom-in", "zoom-out", "pan-right", "pan-left", "pan-down", "pan-up"] = "none"
    layoutStyle: Literal["fullscreen", "window"] = "fullscreen"
    positionX: float = 50.0  # 0 to 100% center
    positionY: float = 50.0  # 0 to 100% center
    scale: float = 1.0       # 0.2 to 2.5
    rotation: float = 0.0    # -180 to 180 deg
    speed: float = 1.0       # 0.2 to 5.0
    width: float = 75.0      # width in % of 9:16 canvas (15-95%)
    height: float = 40.0     # height in % of 9:16 canvas (10-95%)
    zoom: float = 1.0        # content zoom 1.0 to 3.0
    cropX: float = 0.0       # pan offset X (-50 to +50)
    cropY: float = 0.0       # pan offset Y (-50 to +50)
    panCoverage: float = 100.0 # 20 to 100% of media width/height to reveal during pan
    mediaStart: float = 0.0  # start offset in seconds into source video clip
    borderRadius: int = 16   # corner radius in px
    borderWidth: int = 0     # border width in px
    borderColor: str = "#ffffff"
    shadow: bool = True

class SliceCharacter(BaseModel):
    characterId: str
    poseId: str
    positionX: float = 75.0  # 0 to 100% center
    positionY: float = 75.0  # 0 to 100% center
    width: float = 35.0      # width in % of 9:16 canvas
    height: float = 40.0     # height in % of 9:16 canvas
    scale: float = 1.0       # 0.2 to 2.5
    flipX: bool = False      # mirror character horizontally
    visible: bool = True

class Slice(BaseModel):
    id: str
    start: float
    end: float
    text: str
    visual: Optional[SliceVisual] = None
    character: Optional[SliceCharacter] = None

class TimelineOverlay(BaseModel):
    id: str
    overlayId: Optional[str] = None
    url: str
    name: str
    start: float
    end: float
    positionX: float = 50.0  # 0 to 100% center
    positionY: float = 50.0  # 0 to 100% center
    width: float = 30.0      # width in % of 9:16 canvas
    height: float = 30.0     # height in % of 9:16 canvas
    scale: float = 1.0       # 0.2 to 3.0
    rotation: float = 0.0    # -180 to 180 deg
    opacity: float = 1.0     # 0.0 to 1.0
    flipX: bool = False
    animation: str = "none"  # "bounce", "pulse", "spin", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "pop", "wiggle", "none"
    lane: Optional[int] = 0

class TimelineSoundEffect(BaseModel):
    id: str
    sfxId: Optional[str] = None
    url: str
    name: str
    start: float             # start offset in seconds
    duration: float = 1.0    # duration in seconds
    volume: float = 0.8      # 0.0 to 1.0

class CaptionStyle(BaseModel):
    fontFamily: str = "Inter"
    fontSize: int = 48
    lineHeight: float = 1.25
    letterSpacing: float = 0.0
    positionY: int = 80 # percentage from top (e.g. 80% = bottom third)
    maxWordsPerLine: int = 4
    textColor: str = "#FFFFFF"
    highlightColor: str = "#FFE600"
    strokeColor: str = "#000000"
    strokeWidth: int = 3

class ProjectSettings(BaseModel):
    width: int = 1080
    height: int = 1920
    fps: int = 30
    silenceThresholdDb: float = -35.0
    minimumSilenceMs: int = 300
    silenceRetentionPercent: float = 20.0
    minimumSliceDuration: float = 2.0
    maximumSliceDuration: float = 8.0
    captionStyle: CaptionStyle = Field(default_factory=CaptionStyle)

class BackgroundMusic(BaseModel):
    url: str
    filename: Optional[str] = None
    volume: float = 0.15 # 0.0 to 1.0 (default 15% ducking for voiceover)
    loop: bool = True
    fadeInDuration: float = 1.0
    fadeOutDuration: float = 2.0

class Project(BaseModel):
    id: str
    title: str
    originalAudio: Optional[str] = None
    processedAudio: Optional[str] = None
    duration: float = 0.0
    transcript: List[TranscriptSegment] = []
    slices: List[Slice] = []
    mediaAssets: List[MediaAsset] = []
    backgroundVideo: Optional[str] = None
    backgroundMusic: Optional[BackgroundMusic] = None
    overlays: List[TimelineOverlay] = Field(default_factory=list)
    soundEffects: List[TimelineSoundEffect] = Field(default_factory=list)
    settings: ProjectSettings = Field(default_factory=ProjectSettings)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
