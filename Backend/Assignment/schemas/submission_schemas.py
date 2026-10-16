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
    assignment_token: str
    status: str
    score: float
    total_questions: int
    submitted_at: str
    results: List[Dict[str, Any]] = []
    ai_review: Optional[Dict[str, Any]] = None
    message: str = "Assessment submitted successfully."
