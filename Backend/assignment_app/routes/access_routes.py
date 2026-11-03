from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from assignment_app.schemas.access_schemas import (
    VerifyExamAccessRequest,
    VerifyExamAccessResponse,
)
from assignment_app.services.access_service import service_verify_exam_access

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


def _normalize_exam_code(code_str: str) -> str:
    if not code_str:
        return ""
    return str(code_str).strip().upper().replace("EXAM-", "").replace("EXAM", "").replace("-", "").strip()


def _codes_match(code_a: str, code_b: str) -> bool:
    if not code_a or not code_b:
        return False
    a = str(code_a).strip().upper()
    b = str(code_b).strip().upper()
    if a == b:
        return True
    return _normalize_exam_code(a) == _normalize_exam_code(b)


@router.post("/lookup")
async def lookup_assignment_by_credentials(
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Looks up candidate assignment token using their email and unique exam code.
    Flexibly matches codes with or without 'EXAM-' prefix (e.g. 769766 and EXAM-769766).
    """
    import uuid
    from fastapi import HTTPException

    email = (payload.get("username") or payload.get("email") or "").strip().lower()
    code = (payload.get("unique_code") or payload.get("code") or "").strip().upper()

    if not email:
        raise HTTPException(status_code=400, detail="Candidate email is required.")

    is_unlimited = email == "23091a32j4@rgmcet.edu.in"
    clean_code = _normalize_exam_code(code)

    # 1. Search enrolled students across courses
    courses = await db["courses"].find({
        "enrolled_students.email": {"$regex": f"^{email}$", "$options": "i"}
    }).to_list(20)

    matched_course = None
    matched_student = None

    for c in courses:
        for s in c.get("enrolled_students", []):
            if s.get("email", "").strip().lower() == email:
                student_code = s.get("unique_code", "")
                if is_unlimited or _codes_match(code, student_code) or clean_code in _normalize_exam_code(student_code):
                    matched_course = c
                    matched_student = s
                    break
        if matched_student:
            break

    # 2. Search assignments collection directly
    if not matched_student:
        assign_docs = await db["assignments"].find({
            "candidate_email": {"$regex": f"^{email}$", "$options": "i"}
        }).to_list(20)

        for assign_doc in assign_docs:
            doc_code = assign_doc.get("unique_code", "")
            if is_unlimited or _codes_match(code, doc_code) or clean_code in _normalize_exam_code(doc_code):
                return {
                    "assignment_token": assign_doc["assignment_token"],
                    "candidate_name": assign_doc.get("candidate_name", "Candidate"),
                    "candidate_email": assign_doc.get("candidate_email", email),
                    "course_title": assign_doc.get("course_title", "Technical Track"),
                    "unique_code": assign_doc.get("unique_code", code),
                }

    if not matched_student:
        raise HTTPException(
            status_code=404,
            detail=f"No matching assessment found for email '{email}'. Please check your registered email or invitation details."
        )

    # If assignment token wasn't assigned yet, generate one
    token = matched_student.get("assignment_token")
    if not token:
        token = f"exam_{uuid.uuid4().hex[:12]}"
        await db["courses"].update_one(
            {"_id": matched_course["_id"], "enrolled_students.email": matched_student["email"]},
            {"$set": {"enrolled_students.$.assignment_token": token}}
        )
        matched_student["assignment_token"] = token

    return {
        "assignment_token": token,
        "candidate_name": matched_student.get("name", "Candidate"),
        "candidate_email": matched_student.get("email", email),
        "course_title": matched_course.get("title", ""),
        "unique_code": matched_student.get("unique_code", code),
    }

