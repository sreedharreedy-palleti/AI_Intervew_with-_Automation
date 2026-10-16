from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class AdminUserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="user")
    is_verified: bool = Field(default=True)


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class UserCourseEnrollmentInfo(BaseModel):
    course_id: str
    title: str
    instructor: str
    level: str
    duration_weeks: int
    enrolled_at: datetime


class AdminUserListItem(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    enrolled_courses_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminUserDetailResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    total_enrolled_courses: int
    enrolled_courses: List[UserCourseEnrollmentInfo]

    model_config = ConfigDict(from_attributes=True)