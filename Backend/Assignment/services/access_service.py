from typing import Dict, Any
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from Assignment.services.assessment_service import parse_and_check_schedule


async def service_verify_exam_access(
    assignment_token: str,
    username: str,
    unique_code: str,
    from_app: bool,
    db: AsyncIOMotorDatabase,
) -> Dict[str, Any]:
    """
    Verifies that the provided Username and Unique Exam Number match the
    shortlisted candidate record for this assessment token, and confirms
    the interview has been scheduled by the admin and the scheduled time has arrived.
    """
    course = await db["courses"].find_one({"enrolled_students.assignment_token": assignment_token})
    if not course:
        raise HTTPException(status_code=404, detail="Invalid or expired assessment token.")

    student = next(
        (s for s in course.get("enrolled_students", []) if s.get("assignment_token") == assignment_token),
        None,
    )
    if not student:
        raise HTTPException(status_code=404, detail="Candidate record not found for this assessment.")

    # 1. Enforce Admin Scheduling Check
    can_start, schedule_status, schedule_msg, sched_iso, sched_display = parse_and_check_schedule(
        student.get("assignment_datetime")
    )
    if not can_start:
        raise HTTPException(
            status_code=403,
            detail=schedule_msg,
        )

    # 2. Enforce Credentials Check
    student_email = (student.get("email") or "").strip().lower()
    provided_user = username.strip().lower()

    student_code = (student.get("unique_code") or "").strip().upper()
    provided_code = unique_code.strip().upper()

    if student_email != provided_user or student_code != provided_code:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: The Username or Unique Exam Number does not match the invitation credentials.",
        )

    return {
        "valid": True,
        "message": "Credentials verified. Access granted to the technical assessment in Google Chrome.",
        "assignment_token": assignment_token,
        "candidate_name": student.get("name", "Candidate"),
        "candidate_email": student.get("email", ""),
        "course_title": course.get("title", ""),
        "unique_code": student.get("unique_code", ""),
        "duration_minutes": student.get("duration_minutes", 60),
        "assignment_datetime": sched_iso,
        "scheduled_datetime_display": sched_display,
    }
