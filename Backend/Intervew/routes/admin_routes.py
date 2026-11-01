from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Intervew.schemas.admin_schemas import InterviewScheduleRequest
from Intervew.services.admin_interview_service import (
    service_admin_list_interviews,
    service_admin_schedule_interview,
)

router = APIRouter()


@router.get("/admin/sessions")
async def admin_list_interview_sessions(
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Admin route: lists all candidate interview sessions, statuses, and reports.
    """
    return await service_admin_list_interviews(db)


@router.post("/{interview_token}/schedule")
async def admin_schedule_interview_session(
    interview_token: str,
    payload: InterviewScheduleRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Admin route: schedules the candidate's interview date and time.
    """
    return await service_admin_schedule_interview(interview_token, payload, db)

