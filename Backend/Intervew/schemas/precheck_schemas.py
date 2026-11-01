from typing import Optional
from pydantic import BaseModel


class InterviewPrecheckRequest(BaseModel):
    """
    Hardware and media device verification data captured
    before granting entry to the live AI interview room.
    """
    image_base64: Optional[str] = None
    camera_verified: bool = True
    mic_verified: bool = True
    audio_level: Optional[float] = None
    browser: Optional[str] = "Google Chrome"


class InterviewPrecheckResponse(BaseModel):
    status: str
    interview_token: str
    message: str
    precheck_verified: bool

