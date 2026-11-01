from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from Assignment.schemas.access_schemas import (
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
)


class CodingQuestionOut(BaseModel):
    id: str
    title: str
    difficulty: str = "Medium"
    category: str = "Algorithms"
    problem_statement: str
    constraints: List[str] = []
    function_name: str = "solution"
    starter_code: str = ""
    public_test_cases: List[Dict[str, Any]] = []
    hidden_test_cases_count: int = 0


class AssignmentDetailsResponse(BaseModel):
    assignment_token: str
    course_id: str
    course_title: str
    candidate_name: str
    candidate_email: str
    duration_minutes: int = 60
    status: str = "pending"
    questions: List[CodingQuestionOut] = []
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    submitted_at: Optional[str] = None
    score: Optional[float] = None
    ai_review: Optional[Dict[str, Any]] = None
    unique_code: Optional[str] = None
    is_app_required: bool = False
    locked: bool = False
    lock_message: Optional[str] = None
    verification_completed: bool = False
    termination_reason: Optional[str] = None
    terminated_at: Optional[str] = None
    proctor_logs: Optional[List[Dict[str, Any]]] = None
    proctor_violation_history: Optional[List[Dict[str, Any]]] = None
    is_unlimited_trial: bool = False
    attempt_limit: Optional[str] = "1"


__all__ = [
    "CodingQuestionOut",
    "AssignmentDetailsResponse",
    "VerifyExamAccessRequest",
    "VerifyExamAccessResponse",
]
