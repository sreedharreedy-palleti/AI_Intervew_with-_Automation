from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from Assignment.schemas.execution_schemas import PublicTestResult, HiddenTestResult


class QuestionSubmission(BaseModel):
    question_id: str
    code: str
    language: str = "python"


class SubmitAssignmentRequest(BaseModel):
    submissions: List[QuestionSubmission]


class SubmitAssignmentResponse(BaseModel):
    assignment_token: Optional[str] = None
    status: str
    score: float
    total_questions: int
    submitted_at: Optional[str] = None
    results: List[Dict[str, Any]] = []
    detailed_results: Optional[List[Dict[str, Any]]] = None
    ai_review: Optional[Dict[str, Any]] = None
    message: str = "Assessment submitted successfully."
    selected_for_interview: Optional[bool] = False
    interview_status: Optional[str] = None
    next_round_eligible: Optional[bool] = False
