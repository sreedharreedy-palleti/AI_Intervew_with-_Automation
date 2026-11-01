from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class InterviewProctorFrameRequest(BaseModel):
    """
    Live frame and audio metrics submitted from the candidate's active interview session.
    """
    image_base64: Optional[str] = None
    audio_noise_level: Optional[float] = 0.0
    voice_detected: Optional[bool] = False
    conversation_phase: Optional[str] = "candidate_turn"  # ai_asking | candidate_turn | candidate_paused | evaluating
    question_id: Optional[str] = None


class InterviewProctorFrameResponse(BaseModel):
    """
    Real-time vision & audio proctoring verdict for mobile, multiple faces, and secondary voice.
    """
    mobile_detected: bool = False
    multiple_faces: bool = False
    second_person_sound: bool = False
    face_count: int = 1
    person_count: int = 1
    face_detected: bool = True
    violation_detected: bool = False
    violation_type: str = "none"  # mobile_phone | multifaces | second_person_sound | none
    severity: str = "none"        # critical | warning | none
    message: str = "Environment normal."
    details: Dict[str, Any] = Field(default_factory=dict)

