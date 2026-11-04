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

    # If regular candidate has already completed or terminated their 1 attempt, lock qualification
    if not is_demo_tester and existing_interview and existing_interview.get("status") in ("completed", "terminated_violation"):
        return {
            "qualified": False,
            "is_demo_access": False,
            "is_unlimited_trial": False,
            "attempts_remaining": "0",
            "score": score,
            "cutoff": 50.0,
            "status": "attempt_exhausted",
            "assignment_token": assignment_token,
            "interview_token": existing_interview["interview_token"],
            "interview_status": existing_interview.get("status"),
            "message": "You have already completed your 1 permitted interview attempt. Multiple attempts are not permitted.",
        }

    return {
        "qualified": qualified,
        "is_demo_access": is_demo_tester,
        "is_unlimited_trial": is_demo_tester,
        "attempts_remaining": "unlimited" if is_demo_tester else "1",
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
            f"Unlimited free trial access active for {user_email}."
            if is_demo_tester
            else (
                f"Candidate achieved {score}%, qualifying for the AI Interview process (1 attempt)."
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


@router.post("/{interview_token}/verify-access")
async def verify_interview_access(
    interview_token: str,
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Verifies that the provided candidate email and unique exam code
    match the record to unlock the AI Interview session.
    """
    from fastapi import HTTPException
    email = (payload.get("username") or payload.get("email") or "").strip().lower()
    code = (payload.get("unique_code") or payload.get("code") or "").strip().upper()

    session = await db["interviews"].find_one({
        "$or": [
            {"interview_token": interview_token},
            {"assignment_token": interview_token},
        ]
    })

    student = None
    if not session:
        course = await db["courses"].find_one({
            "$or": [
                {"enrolled_students.assignment_token": interview_token},
                {"enrolled_students.interview_token": interview_token},
            ]
        })
        if course:
            for s in course.get("enrolled_students", []):
                if s.get("assignment_token") == interview_token or s.get("interview_token") == interview_token:
                    student = s
                    break

    candidate_email = (
        (session.get("candidate_email") if session else None)
        or (student.get("email") if student else None)
        or ""
    ).strip().lower()

    student_code = (
        (session.get("unique_code") if session else None)
        or (student.get("unique_code") if student else None)
        or ""
    ).strip().upper()

    is_unlimited = candidate_email in DEMO_TESTING_EMAILS or email in DEMO_TESTING_EMAILS

    def _norm(c: str) -> str:
        return str(c).strip().upper().replace("EXAM-", "").replace("EXAM", "").replace("-", "")

    if not is_unlimited:
        if email and candidate_email and email != candidate_email:
            raise HTTPException(
                status_code=400,
                detail=f"Email mismatch: '{email}' does not match the registered candidate record."
            )
        if code and student_code and _norm(code) != _norm(student_code):
            raise HTTPException(
                status_code=400,
                detail="Invalid Exam Passcode. Please check the unique code from your invitation."
            )

    return {
        "verified": True,
        "message": "Interview credentials verified successfully.",
        "candidate_email": candidate_email or email,
    }


@router.post("/{interview_token}/reset-trial")
async def reset_interview_for_unlimited_trial(
    interview_token: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Resets the interview session for unlimited trial account (23091a32j4@rgmcet.edu.in).
    Normal candidates are locked to 1 attempt.
    """
    from fastapi import HTTPException
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    candidate_email = (session.get("candidate_email") or "").strip().lower()
    if candidate_email not in DEMO_TESTING_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resetting interviews is only permitted for the unlimited trial account (23091a32j4@rgmcet.edu.in). Regular candidates have a 1-attempt limit."
        )

    await db["interviews"].delete_one({"_id": session["_id"]})
    return {"message": "Interview session reset successfully. You can launch a fresh interview.", "status": "reset"}

