from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CourseUserResponse(BaseModel):
    id: str
    title: str
    description: str
    instructor: str
    duration_weeks: int
    level: str
    created_at: datetime
    enrolled_count: int = 0
    is_enrolled: bool = False
    application_status: Optional[str] = None
    assignment_token: Optional[str] = None
    assignment_status: Optional[str] = None
    assignment_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class EnrollmentApplicationResponse(BaseModel):
    message: str
    course_id: str
    full_name: str
    ats_score: int
    status: str
    assignment_link: Optional[str] = None
    strengths: List[str] = []
    missing_skills: List[str] = []