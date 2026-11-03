from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from Assignment.schemas.access_schemas import (
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
)
from Assignment.services.access_service import service_verify_exam_access

router = APIRouter()


@router.post("/{assignment_token}/verify-access", response_model=VerifyExamAccessResponse)
async def verify_candidate_exam_access(
    assignment_token: str,
    payload: VerifyExamAccessRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Verifies that the provided Username and Unique Exam Number match the record.
    """
    return await service_verify_exam_access(
        assignment_token=assignment_token,
        username=payload.username,
        unique_code=payload.unique_code,
        from_app=bool(payload.from_app),
        db=db,
    )


@router.post("/lookup")
async def lookup_assignment_by_credentials(
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Looks up candidate assignment token using their email and unique exam code.
    """
    from fastapi import HTTPException
    email = (payload.get("username") or payload.get("email") or "").strip().lower()
    code = (payload.get("unique_code") or payload.get("code") or "").strip().upper()

    if not email or not code:
        raise HTTPException(status_code=400, detail="Both registered email and unique exam code are required.")

    course = await db["courses"].find_one({
        "enrolled_students": {
            "$elemMatch": {
                "email": {"$regex": f"^{email}$", "$options": "i"},
                "unique_code": {"$regex": f"^{code}$", "$options": "i"},
            }
        }
    })
    if not course:
        # Also check assignments collection
        assign_doc = await db["assignments"].find_one({
            "candidate_email": {"$regex": f"^{email}$", "$options": "i"},
            "unique_code": {"$regex": f"^{code}$", "$options": "i"},
        })
        if assign_doc:
            return {
                "assignment_token": assign_doc["assignment_token"],
                "candidate_name": assign_doc.get("candidate_name", "Candidate"),
                "candidate_email": assign_doc.get("candidate_email", email),
                "course_title": assign_doc.get("course_title", "Technical Track"),
                "unique_code": assign_doc.get("unique_code", code),
            }
        raise HTTPException(status_code=404, detail="No matching exam record found for the provided email and exam code.")

    student = next(
        (s for s in course.get("enrolled_students", []) if s.get("email", "").strip().lower() == email and s.get("unique_code", "").strip().upper() == code),
        None
    )
    if not student or not student.get("assignment_token"):
        raise HTTPException(status_code=404, detail="No assessment assigned to this candidate.")

    return {
        "assignment_token": student["assignment_token"],
        "candidate_name": student.get("name", "Candidate"),
        "candidate_email": student.get("email", email),
        "course_title": course.get("title", ""),
        "unique_code": student.get("unique_code", code),
    }

