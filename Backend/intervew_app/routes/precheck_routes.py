from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from intervew_app.schemas.precheck_schemas import InterviewPrecheckRequest
from intervew_app.services.precheck_service import service_verify_precheck

router = APIRouter()


@router.post("/{interview_token}/precheck", status_code=status.HTTP_200_OK)
async def verify_interview_precheck(
    interview_token: str,
    payload: InterviewPrecheckRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Pre-interview verification: Ensures camera video feed and microphone audio
    access are verified active before unlocking the live AI interview.
    """
    return await service_verify_precheck(interview_token, payload, db)

