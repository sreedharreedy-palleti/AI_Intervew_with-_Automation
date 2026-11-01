from bson import ObjectId
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Intervew.schemas.session_schemas import InterviewStartRequest
from Intervew.services.session_service import (
    service_start_or_resume_interview,
    service_get_interview_session,
    DEMO_TESTING_EMAILS,
)

router = APIRouter()


@router.post("/start", status_code=status.HTTP_200_OK)
async def start_or_resume_interview(
    payload: InterviewStartRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Starts or resumes an AI Technical Interview session for a qualified candidate.
    Prerequisite: Candidate must have scored >= 50% on their coding assessment (or demo access).
    """
    return await service_start_or_resume_interview(payload, db)


@router.get("/candidate/{user_id}/qualification")
async def check_candidate_interview_qualification(
    user_id: str,
    course_id: str = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Checks if a candidate has passed their prerequisite coding assessment with >= 50%
    and returns their interview qualification status and launch token.
    Grants free demo testing access for authorized test accounts.
    """
    user_doc = None
    if ObjectId.is_valid(user_id):
        user_doc = await db["users"].find_one({"_id": ObjectId(user_id)})

    user_email = (user_doc.get("email", "") if user_doc else "").strip().lower()
    is_demo_tester = user_email in DEMO_TESTING_EMAILS

    query = {"user_id": user_id, "status": "submitted"}
    if course_id:
        query["course_id"] = course_id

    assign_doc = await db["assignments"].find_one(query)
    if not assign_doc and is_demo_tester:
        assign_doc = await db["assignments"].find_one({
            "$or": [
                {"user_id": user_id},
                {"candidate_email": user_email}
            ]
        })

    if not assign_doc and not is_demo_tester:
        return {
            "qualified": False,
            "status": "pending_assignment",
            "message": "Candidate has not submitted the prerequisite coding assessment yet.",
        }

    score = assign_doc.get("score") if assign_doc else None
    qualified = float(score or 0.0) >= 50.0

    if is_demo_tester:
        qualified = True
        score = max(float(score or 0.0), 95.0)

    assignment_token = (
        (assign_doc.get("assignment_token") if assign_doc else None)
        or f"demo-{user_id[:8]}"
    )

    existing_interview = await db["interviews"].find_one({
        "$or": [
            {"assignment_token": assignment_token},
            {"user_id": user_id},
            {"candidate_email": user_email} if user_email else {"assignment_token": assignment_token}
        ]
    })

    return {
        "qualified": qualified,
        "is_demo_access": is_demo_tester,
        "score": score,
        "cutoff": 50.0,
        "status": "selected_for_interview" if qualified else "not_qualified",
        "assignment_token": assignment_token,
        "interview_token": existing_interview["interview_token"] if existing_interview else None,
        "interview_status": (
            existing_interview.get("status")
            if existing_interview
            else ("ready_to_start" if qualified else "ineligible")
        ),
        "message": (
            f"Free demo testing access active for {user_email}."
            if is_demo_tester
            else (
                f"Candidate achieved {score}%, qualifying for the AI Interview process."
                if qualified
                else f"Candidate achieved {score}%, which is below the 50% threshold."
            )
        ),
    }


@router.get("/{interview_token}")
async def get_interview_session(
    interview_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Retrieves the active interview state, questions, and current question index.
    """
    return await service_get_interview_session(interview_token, db)

