from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ProctorFrameRequest(BaseModel):
    image_base64: Optional[str] = None
    screen_visible: Optional[bool] = True
    fullscreen_active: Optional[bool] = True
    audio_noise_level: Optional[float] = 0.0
    voice_detected: Optional[bool] = False
    warning_count: Optional[int] = 0


class ProctorFrameResponse(BaseModel):
    violation_detected: bool = False
    violation_type: str = "none"  # "mobile_phone", "screen_shift", "multiple_persons", "other_voice", "no_person"
    severity: str = "none"  # "none", "warning", "critical"
    should_terminate: bool = False
    message: str = "All clear. Examination proctoring normal."
    details: Dict[str, Any] = {}


class ProctorViolationLogRequest(BaseModel):
    violation_type: str
    details: str
    timestamp: Optional[str] = None
    strike_count: int = 1


class ProctorTerminationRequest(BaseModel):
    reason: str
    violation_history: List[Dict[str, Any]] = []


class ProctorTerminationResponse(BaseModel):
    status: str = "terminated"
    message: str
    terminated_at: str
    assignment_token: str


class ProctorPrecheckRequest(BaseModel):
    face_snapshot: Optional[str] = None
    audio_verified: bool = True
    face_verified: bool = True
    device_info: Optional[Dict[str, Any]] = None
    mic_level: Optional[float] = 0.0


class ProctorPrecheckResponse(BaseModel):
    status: str = "verified"
    message: str = "Face and audio verification recorded successfully in database."
    verified_at: str
    can_proceed: bool = True

