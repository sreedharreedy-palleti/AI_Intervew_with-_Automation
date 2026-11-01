from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Intervew.services.report_service import service_get_interview_report

router = APIRouter()


@router.get("/{interview_token}/report")
async def get_interview_final_report(
    interview_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Retrieves the complete final AI interview evaluation report, rubrics, and verdict.
    """
    return await service_get_interview_report(interview_token, db)

