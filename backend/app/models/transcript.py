from typing import List, Optional
from pydantic import BaseModel

class WordTiming(BaseModel):
    word: str
    start: float
    end: float
    confidence: Optional[float] = None
    emphasized: Optional[bool] = False

class TranscriptSegment(BaseModel):
    id: str
    start: float
    end: float
    text: str
    words: List[WordTiming] = []
