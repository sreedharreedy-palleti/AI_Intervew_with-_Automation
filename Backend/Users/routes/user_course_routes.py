from typing import List
from fastapi import APIRouter, Depends, Form, File, UploadFile, BackgroundTasks, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from auth.services.security_service import get_current_user
from Users.schemas.user_course_schemas import CourseUserResponse, EnrollmentApplicationResponse
from Users.services.user_course_service import (
    service_get_user_courses,
    service_get_user_course_detail,
    service_enroll_user_with_ai,
)

router = APIRouter()


@router.get("", response_model=List[CourseUserResponse])
@router.get("/", response_model=List[CourseUserResponse])
async def get_courses_catalog(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    return await service_get_user_courses(str(current_user["_id"]), db, current_user.get("email", ""))


@router.get("/{course_id}", response_model=CourseUserResponse)
async def get_course_details(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    return await service_get_user_course_detail(course_id, str(current_user["_id"]), db, current_user.get("email", ""))


@router.post("/{course_id}/enroll", response_model=EnrollmentApplicationResponse, status_code=status.HTTP_200_OK)
async def enroll_in_course_with_resume(
    course_id: str,
    background_tasks: BackgroundTasks,
    full_name: str = Form(..., description="Full Name"),
    dob: str = Form(..., description="Date of Birth"),
    college: str = Form(..., description="College or Institute"),
    year: str = Form(..., description="Graduation Year / Academic Year"),
    resume: UploadFile = File(..., description="Resume in PDF or DOCX format"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    return await service_enroll_user_with_ai(
        course_id=course_id,
        full_name=full_name,
        dob=dob,
        college=college,
        year=year,
        resume_file=resume,
        current_user=current_user,
        background_tasks=background_tasks,
        db=db,
    )