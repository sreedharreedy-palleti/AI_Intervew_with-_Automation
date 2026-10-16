from typing import List, Optional, Any, Dict
from pydantic import BaseModel


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
    app_download_url: Optional[str] = None
    download_url: Optional[str] = None
    is_app_required: bool = False
    locked: bool = False
    lock_message: Optional[str] = None


class VerifyExamAccessRequest(BaseModel):
    username: str
    unique_code: str
    from_app: Optional[bool] = False


class VerifyExamAccessResponse(BaseModel):
    valid: bool
    message: str
    assignment_token: str
    candidate_name: str
    candidate_email: str
    course_title: str
    unique_code: str
    duration_minutes: int = 60
    app_download_url: Optional[str] = None
