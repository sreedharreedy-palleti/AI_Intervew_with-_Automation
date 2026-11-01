from typing import Optional
from pydantic import BaseModel


class VerifyExamAccessRequest(BaseModel):
    username: str
    unique_code: str
    from_app: Optional[bool] = False


class VerifyExamAccessResponse(BaseModel):
    valid: bool
    message: str
    assignment_token: str
    candidate_name: str
    candidate_email: Optional[str] = None
    course_title: Optional[str] = None
    unique_code: Optional[str] = None
    duration_minutes: Optional[int] = 60
