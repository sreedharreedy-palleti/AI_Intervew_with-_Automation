from typing import List
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from auth.services.security_service import require_admin
from Admin.schemas.admin_course_schemas import (
    CourseCreate,
    CourseUpdate,
    CourseAdminResponse,
    CourseEnrolledUsersResponse,
    EnrollmentStatusUpdate,
    AdminManualEnroll,
    ScheduleAssignmentRequest,
)
from Admin.services.admin_course_service import (
    service_create_course,
    service_get_all_courses_with_rosters,
    service_get_single_course,
    service_update_course,
    service_get_course_enrolled_users,
    service_update_enrollment_status,
    service_delete_enrollment,
    service_admin_manual_enroll,
    service_delete_course,
    service_schedule_candidate_assignment,
    service_schedule_course_assignment_broadcast,
)

router = APIRouter()

# 1. CREATE COURSE
@router.post("", response_model=CourseAdminResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CourseAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_create_course(payload, str(current_admin["_id"]), db)

# 2. LIST ALL COURSES
@router.get("", response_model=List[CourseAdminResponse])
@router.get("/", response_model=List[CourseAdminResponse])
async def list_all_courses(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_get_all_courses_with_rosters(db)

# 3. GET SINGLE COURSE
@router.get("/{course_id}", response_model=CourseAdminResponse)
async def get_single_course(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_get_single_course(course_id, db)

# 4. UPDATE COURSE
@router.put("/{course_id}", response_model=CourseAdminResponse)
async def update_course(
    course_id: str,
    payload: CourseUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_update_course(course_id, payload, db)

# 5. GET ENROLLED USERS FOR A COURSE
@router.get("/{course_id}/enrolled-users", response_model=CourseEnrolledUsersResponse)
async def get_particular_course_enrolled_users(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_get_course_enrolled_users(course_id, db)

# 6. MANUAL ENROLL CANDIDATE
@router.post("/{course_id}/enrolled-users", status_code=status.HTTP_201_CREATED)
async def admin_manual_enroll_candidate(
    course_id: str,
    payload: AdminManualEnroll,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_admin_manual_enroll(course_id, payload, db)

# 7. UPDATE CANDIDATE SHORTLIST STATUS
@router.put("/{course_id}/enrolled-users/{user_id}/status")
@router.patch("/{course_id}/enrolled-users/{user_id}/status")
async def update_candidate_enrollment_status(
    course_id: str,
    user_id: str,
    payload: EnrollmentStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_update_enrollment_status(course_id, user_id, payload, db)

# 8. DELETE / REMOVE ENROLLED CANDIDATE
@router.delete("/{course_id}/enrolled-users/{user_id}")
async def delete_candidate_enrollment(
    course_id: str,
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_delete_enrollment(course_id, user_id, db)

# 9. DELETE COURSE
@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_delete_course(course_id, db)

# 10. SCHEDULE ASSIGNMENT FOR SINGLE CANDIDATE & SEND GMAIL
@router.post("/{course_id}/enrolled-users/{user_id}/schedule-assignment")
async def schedule_candidate_assignment(
    course_id: str,
    user_id: str,
    payload: ScheduleAssignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_schedule_candidate_assignment(course_id, user_id, payload, db)

# 11. BROADCAST ASSIGNMENT SCHEDULE TO ALL SHORTLISTED CANDIDATES & SEND GMAIL
@router.post("/{course_id}/broadcast-assignment")
async def broadcast_course_assignment(
    course_id: str,
    payload: ScheduleAssignmentRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_schedule_course_assignment_broadcast(course_id, payload, db)