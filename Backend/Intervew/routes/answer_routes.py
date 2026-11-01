from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Intervew.schemas.answer_schemas import SubmitAnswerRequest
from Intervew.services.session_service import service_submit_answer

router = APIRouter()


@router.post("/{interview_token}/answer", status_code=status.HTTP_200_OK)
async def submit_interview_answer(
    interview_token: str,
    payload: SubmitAnswerRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Submits candidate's answer for real-time Gemini evaluation and progresses
    to the next question, or concludes the interview with the final scorecard.
    """
    return await service_submit_answer(interview_token, payload, db)

