from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .session_schemas import InterviewQuestion


class SubmitAnswerRequest(BaseModel):
    """
    Candidate's spoken or written response to an interview question.
    """
    question_id: str
    answer_text: Optional[str] = ""
    duration_seconds: Optional[int] = 0
    audio_metrics: Optional[Dict[str, Any]] = None
    audio_base64: Optional[str] = None
    audio_mime_type: Optional[str] = "audio/webm"


class AnswerEvaluationResponse(BaseModel):
    """
    Real-time Gemini evaluation and scorecard for the submitted answer.
    """
    question_id: str
    score: float
    verdict: str
    technical_accuracy: float
    clarity_of_thought: float
    feedback: str
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    next_question: Optional[InterviewQuestion] = None
    current_index: int
    total_questions: int
    is_interview_complete: bool
    final_report: Optional[Dict[str, Any]] = None

