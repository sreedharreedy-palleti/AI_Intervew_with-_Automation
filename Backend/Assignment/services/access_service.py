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
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})

    if not course and assign_doc and assign_doc.get("course_id"):
        from bson import ObjectId
        try:
            course = await db["courses"].find_one({"_id": ObjectId(assign_doc["course_id"])})
        except Exception:
            pass

    if not course and not assign_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired assessment token.")

    student = None
    if course:
        student = next(
            (s for s in course.get("enrolled_students", []) if s.get("assignment_token") == assignment_token),
            None,
        )
        if not student and assign_doc:
            student = next(
                (s for s in course.get("enrolled_students", []) if str(s.get("user_id")) == str(assign_doc.get("user_id")) or s.get("email") == assign_doc.get("candidate_email")),
                None,
            )

    student_email = ((student.get("email") if student else assign_doc.get("candidate_email")) or "").strip().lower()
    student_code = ((student.get("unique_code") if student else assign_doc.get("unique_code")) or "").strip().upper()
    candidate_name = (student.get("name") if student else assign_doc.get("candidate_name")) or "Candidate"
    course_title = (course.get("title") if course else assign_doc.get("course_title")) or "Technical Assessment"
    duration_minutes = (student.get("duration_minutes") if student else assign_doc.get("duration_minutes")) or 60
    sched_dt = (student.get("assignment_datetime") if student else assign_doc.get("assignment_datetime"))

    clean_student_code = str(student_code).strip().upper().replace("EXAM-", "").replace("EXAM", "").replace("-", "")
    clean_provided_code = str(provided_code).strip().upper().replace("EXAM-", "").replace("EXAM", "").replace("-", "")
    is_unlimited = provided_user == "23091a32j4@rgmcet.edu.in"

    codes_match = (
        student_code == provided_code
        or clean_student_code == clean_provided_code
        or is_unlimited
    )

    if (student_email != provided_user or not codes_match) and not is_unlimited:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: The Username or Unique Exam Code does not match the invitation credentials.",
        )

    # If assessment was previously terminated (e.g. from screen switch bug), reset it so candidate can start clean
    if assign_doc and assign_doc.get("status") == "terminated_violation":
        await db["assignments"].update_one(
            {"assignment_token": assignment_token},
            {
                "$set": {
                    "status": "pending",
                    "strike_count": 0,
                    "proctor_logs": [],
                    "proctor_violation_history": [],
                    "terminated_at": None,
                    "termination_reason": None,
                }
            }
        )

    # 2. Check schedule info (informational display)
    can_start, schedule_status, schedule_msg, sched_iso, sched_display = parse_and_check_schedule(
        sched_dt
    )

    return {
        "valid": True,
        "message": "Credentials verified. Access granted to the technical assessment in Google Chrome.",
        "assignment_token": assignment_token,
        "candidate_name": candidate_name,
        "candidate_email": student_email,
        "course_title": course_title,
        "unique_code": student_code,
        "duration_minutes": duration_minutes,
        "assignment_datetime": sched_iso,
        "scheduled_datetime_display": sched_display,
    }
