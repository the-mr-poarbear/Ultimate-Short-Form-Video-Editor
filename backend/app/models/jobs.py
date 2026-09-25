from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel

class Job(BaseModel):
    id: str
    projectId: str
    type: str
    status: Literal["pending", "processing", "completed", "failed"] = "pending"
    progress: int = 0
    message: str = ""
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
