from typing import List, Optional
from pydantic import BaseModel, Field


class InterviewQuestion(BaseModel):
    """
    Individual technical interview question details.
    """
    question_id: str
    question_text: str
    topic: str
    difficulty: str = "Medium"
    category: str = "technical"  # technical | system_design | coding_followup | behavioral
    context_hint: Optional[str] = None
    expected_points: List[str] = Field(default_factory=list)


class InterviewStartRequest(BaseModel):
    """
    Payload to launch or resume an interview for a candidate
    who passed their coding assessment with >= 50%.
    """
    assignment_token: Optional[str] = None
    course_id: Optional[str] = None
    user_id: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    force_restart: Optional[bool] = False


class InterviewSessionResponse(BaseModel):
    """
    Live state of the active interview session.
    """
    interview_token: str
    status: str  # in_progress | completed
    candidate_name: str
    course_title: str
    assignment_score: Optional[float] = None
    current_question_index: int
    total_questions: int
    current_question: Optional[InterviewQuestion] = None
    questions: List[InterviewQuestion] = Field(default_factory=list)
    started_at: str
    completed_at: Optional[str] = None
    precheck_verified: Optional[bool] = False
    is_unlimited_trial: Optional[bool] = False
    attempts_remaining: Optional[str] = None

