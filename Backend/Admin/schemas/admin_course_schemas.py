from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10)
    instructor: str = Field(..., min_length=2)
    duration_weeks: int = Field(..., gt=0)
    level: str = Field(default="Beginner")


class EnrolledStudentDetail(BaseModel):
    user_id: str
    name: str
    email: str
    dob: Optional[str] = None
    college: Optional[str] = None
    year: Optional[str] = None
    resume_path: Optional[str] = None
    ats_score: Optional[int] = None
    application_status: Optional[str] = None
    assignment_token: Optional[str] = None
    assignment_datetime: Optional[str] = None
    assignment_policy: Optional[str] = None
    assignment_email_sent_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    enrolled_at: datetime


class CourseAdminResponse(BaseModel):
    id: str
    title: str
    description: str
    instructor: str
    duration_weeks: int
    level: str
    created_at: datetime
    enrolled_count: int = 0
    enrolled_students: List[EnrolledStudentDetail] = []

    model_config = ConfigDict(from_attributes=True)


class CourseEnrolledUsersResponse(BaseModel):
    course_id: str
    course_title: str
    total_enrolled_count: int
    enrolled_users: List[EnrolledStudentDetail]

    model_config = ConfigDict(from_attributes=True)


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = Field(None, min_length=10)
    instructor: Optional[str] = Field(None, min_length=2)
    duration_weeks: Optional[int] = Field(None, gt=0)
    level: Optional[str] = None


class EnrollmentStatusUpdate(BaseModel):
    application_status: Optional[str] = None
    ats_score: Optional[int] = Field(None, ge=0, le=100)
    name: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    college: Optional[str] = None
    year: Optional[str] = None
    unique_code: Optional[str] = None
    assignment_datetime: Optional[str] = None
    duration_minutes: Optional[int] = None


class AdminManualEnroll(BaseModel):
    user_id: Optional[str] = None
    name: str = Field(..., min_length=2)
    email: str
    dob: Optional[str] = None
    college: Optional[str] = None
    year: Optional[str] = None
    ats_score: Optional[int] = Field(75, ge=0, le=100)
    application_status: Optional[str] = Field("shortlisted")
    resume_path: Optional[str] = None


class ScheduleAssignmentRequest(BaseModel):
    assignment_datetime: str = Field(..., description="Assignment date and time")
    assignment_policy: Optional[str] = Field(
        default="1. Complete the technical assessment within the allotted duration.\n2. Ensure full-screen browser mode and active webcam.\n3. Plagiarism or external assistance will invalidate results.\n4. Submissions after deadline will not be evaluated.",
        description="Assignment rules and proctoring policy",
    )
    duration_minutes: Optional[int] = Field(default=60, ge=5, le=300)
    send_email: bool = Field(default=True, description="Whether to dispatch invitation via Gmail SMTP")


class ScheduleAssignmentResponse(BaseModel):
    message: str
    course_id: str
    candidates_count: int
    scheduled_datetime: str
    policy: str
    email_dispatched: bool