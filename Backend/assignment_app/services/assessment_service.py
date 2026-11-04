import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from assignment_app.services.assignment_generator import (
    generate_coding_assignment,
    generate_coding_assignment_with_ollama,
)

UNLIMITED_TRIAL_EMAILS = {"23091a32j4@rgmcet.edu.in"}


def parse_and_check_schedule(
    assignment_datetime_val: Optional[str],
) -> Tuple[bool, str, str, Optional[str], Optional[str]]:
    """
    Validates whether the assignment can be started based on admin schedule.
    Returns: (can_start, schedule_status, lock_reason, sched_iso, formatted_display)
    schedule_status: 'not_scheduled' | 'scheduled_future' | 'active'
    """
    if not assignment_datetime_val or not str(assignment_datetime_val).strip():
        return (
            False,
            "not_scheduled",
            "Interview Schedule Pending: Your technical interview has not been scheduled by the administrator yet. You will receive an official email invitation once your date, time, and duration are assigned.",
            None,
            None,
        )

    raw_val = str(assignment_datetime_val).strip()

    dt = None
    # 1. Try ISO / datetime-local format: 2026-10-30T10:00 or with seconds/tz
    try:
        clean_iso = raw_val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_iso)
    except Exception:
        pass

    if dt is None:
        for fmt in (
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%B %d, %Y %I:%M %p",
            "%Y-%m-%dT%H:%M",
            "%Y-%m-%dT%H:%M:%S",
        ):
            try:
                dt = datetime.strptime(raw_val, fmt)
                break
            except Exception:
                continue

    if dt is None:
        # Fallback for unparseable text
        return (True, "active", "Scheduled interview window active.", raw_val, raw_val)

    # Normalize to UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    now_utc = datetime.now(timezone.utc)

    # Allow candidate in 5 minutes early to prepare camera and microphone
    early_buffer = timedelta(minutes=5)
    formatted_display = dt.strftime("%B %d, %Y at %I:%M %p UTC")

    if now_utc < (dt - early_buffer):
        return (
            False,
            "scheduled_future",
            f"Scheduled Technical Interview: Your interview is scheduled for {formatted_display}. The examination room will unlock at your scheduled time.",
            dt.isoformat(),
            formatted_display,
        )

    return (
        True,
        "active",
        "Scheduled interview window active.",
        dt.isoformat(),
        formatted_display,
    )


def sanitize_assignment_for_client(
    assign_doc: Dict[str, Any],
    locked: bool = False,
    lock_msg: Optional[str] = None,
    schedule_status: str = "active",
    can_start: bool = True,
    scheduled_datetime_display: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Strips hidden test cases from the question payload so candidate cannot inspect them.
    Only returns hidden_test_cases_count and public_test_cases.
    """
    sanitized_questions = []
    if not locked:
        for q in assign_doc.get("questions", []):
            sanitized_questions.append({
                "id": q.get("id"),
                "title": q.get("title"),
                "difficulty": q.get("difficulty", "Medium"),
                "category": q.get("category", "General"),
                "problem_statement": q.get("problem_statement", ""),
                "constraints": q.get("constraints", []),
                "function_name": q.get("function_name", "solution"),
                "starter_code": q.get("starter_code", ""),
                "public_test_cases": q.get("public_test_cases", []),
                "hidden_test_cases_count": len(q.get("hidden_test_cases", [])),
            })

    return {
        "assignment_token": assign_doc["assignment_token"],
        "course_id": str(assign_doc.get("course_id", "")),
        "course_title": assign_doc.get("course_title", ""),
        "candidate_name": assign_doc.get("candidate_name", ""),
        "candidate_email": assign_doc.get("candidate_email", ""),
        "duration_minutes": assign_doc.get("duration_minutes", 60),
        "status": "locked" if locked else assign_doc.get("status", "pending"),
        "questions": sanitized_questions,
        "created_at": assign_doc.get("created_at"),
        "started_at": assign_doc.get("started_at"),
        "submitted_at": assign_doc.get("submitted_at"),
        "score": assign_doc.get("score"),
        "ai_review": assign_doc.get("ai_review"),
        "unique_code": assign_doc.get("unique_code") if not locked else None,
        "is_app_required": False,
        "locked": locked,
        "lock_message": lock_msg,
        "schedule_status": schedule_status,
        "can_start": can_start,
        "assignment_datetime": assign_doc.get("assignment_datetime"),
        "scheduled_datetime_display": scheduled_datetime_display,
        "verification_completed": bool(assign_doc.get("verification_completed", False)),
        "termination_reason": assign_doc.get("termination_reason"),
        "terminated_at": assign_doc.get("terminated_at"),
        "proctor_logs": assign_doc.get("proctor_logs", []),
        "proctor_violation_history": assign_doc.get("proctor_violation_history", []),
        "is_unlimited_trial": (assign_doc.get("candidate_email") or "").strip().lower() in UNLIMITED_TRIAL_EMAILS,
        "attempt_limit": "unlimited" if ((assign_doc.get("candidate_email") or "").strip().lower() in UNLIMITED_TRIAL_EMAILS) else "1",
    }


async def service_get_or_create_assignment(
    assignment_token: str,
    db: AsyncIOMotorDatabase,
    unique_code: Optional[str] = None,
    username: Optional[str] = None,
    from_app: bool = False,
) -> Dict[str, Any]:
    """
    Retrieves existing assignment or generates questions tailored to candidate's resume and course.
    Enforces admin schedule and credential verification.
    """
    course = await db["courses"].find_one({"enrolled_students.assignment_token": assignment_token})
    assign_doc = await db["assignments"].find_one({"assignment_token": assignment_token})

    # Allow cross-resolving if caller provided interview_token instead
    if not course and not assign_doc:
        interview_doc = await db["interviews"].find_one({"interview_token": assignment_token})
        if interview_doc and interview_doc.get("assignment_token"):
            return await service_get_or_create_assignment(
                assignment_token=interview_doc["assignment_token"],
                db=db,
                unique_code=unique_code,
                username=username,
                from_app=from_app,
            )
        course_by_interview = await db["courses"].find_one({"enrolled_students.interview_token": assignment_token})
        if course_by_interview:
            for s in course_by_interview.get("enrolled_students", []):
                if s.get("interview_token") == assignment_token and s.get("assignment_token"):
                    return await service_get_or_create_assignment(
                        assignment_token=s["assignment_token"],
                        db=db,
                        unique_code=unique_code,
                        username=username,
                        from_app=from_app,
                    )

    if not course and assign_doc and assign_doc.get("course_id"):
        from bson import ObjectId
        try:
            course = await db["courses"].find_one({"_id": ObjectId(assign_doc["course_id"])})
        except Exception:
            pass

    if not course:
        raise HTTPException(status_code=404, detail="Invalid or expired assessment token.")

    student = next(
        (s for s in course.get("enrolled_students", []) if s.get("assignment_token") == assignment_token),
        None,
    )
    if not student and assign_doc:
        student = next(
            (s for s in course.get("enrolled_students", []) if str(s.get("user_id")) == str(assign_doc.get("user_id")) or s.get("email") == assign_doc.get("candidate_email")),
            None,
        )

    if not student:
        raise HTTPException(status_code=404, detail="Candidate record not found for this assessment.")

    candidate_name = student.get("name", "Candidate")
    candidate_email = student.get("email", "")
    student_unique_code = student.get("unique_code", "")
    course_title = course.get("title", "Technical Track")
    course_desc = course.get("description", "")
    duration_minutes = student.get("duration_minutes", 60)
    scheduled_dt_raw = student.get("assignment_datetime")

    # 1. Enforce Admin Scheduling Check
    is_unlimited = candidate_email.strip().lower() in UNLIMITED_TRIAL_EMAILS
    def _clean_code(c: str) -> str:
        return str(c).strip().upper().replace("EXAM-", "").replace("EXAM", "").replace("-", "")

    has_valid_code = bool(
        unique_code and (
            str(unique_code).strip().upper() == str(student_unique_code).strip().upper()
            or _clean_code(unique_code) == _clean_code(student_unique_code)
        )
    )

    # If assignment is already submitted, candidate can view the report
    if assign_doc and assign_doc.get("status") == "submitted":
        return sanitize_assignment_for_client(assign_doc, locked=False, can_start=True)

    # If previous attempt was terminated by mistake, entering valid credentials or desktop app unlocks fresh attempt
    if assign_doc and assign_doc.get("status") == "terminated_violation":
        if is_unlimited or from_app or has_valid_code:
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
            assign_doc["status"] = "pending"
            assign_doc["strike_count"] = 0
            assign_doc["proctor_logs"] = []
            assign_doc["proctor_violation_history"] = []
            assign_doc["terminated_at"] = None
            assign_doc["termination_reason"] = None
        else:
            return sanitize_assignment_for_client(assign_doc, locked=False, can_start=True)

    can_start, schedule_status, schedule_msg, sched_iso, sched_display = parse_and_check_schedule(
        scheduled_dt_raw
    )

    # If demo account, or from desktop app, or provided legitimate exam passcode from email: unlock immediately!
    if is_unlimited or from_app or has_valid_code:
        can_start = True
        schedule_status = "active"
        if not sched_display:
            sched_display = "Active & Ready"

    # If schedule was pending or unassigned, allow candidate to start with their exam passcode
    if not scheduled_dt_raw or schedule_status == "not_scheduled":
        can_start = True
        schedule_status = "active"
        sched_display = "Active & Ready"

    if not can_start:
        temp_doc = {
            "assignment_token": assignment_token,
            "course_id": str(course["_id"]),
            "course_title": course_title,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "duration_minutes": duration_minutes,
            "assignment_datetime": sched_iso,
            "status": "locked",
            "questions": [],
            "created_at": None,
            "started_at": None,
            "submitted_at": None,
            "score": None,
            "ai_review": None,
            "unique_code": None,
        }
        return sanitize_assignment_for_client(
            temp_doc,
            locked=True,
            lock_msg=schedule_msg,
            schedule_status=schedule_status,
            can_start=False,
            scheduled_datetime_display=sched_display,
        )

    if assign_doc:
        # Check if existing questions are empty or are the old repetitive fallback questions
        existing_questions = assign_doc.get("questions", [])
        is_old_duplicate = (
            not existing_questions
            or any(
                "Data Token Scope Validator" in q.get("title", "")
                or "Target State Index Pair Resolver" in q.get("title", "")
                for q in existing_questions
            )
        )

        if is_old_duplicate:
            print(f"[AI GENERATION] Regenerating fresh dynamic AI questions for {candidate_name} ({course_title})...")
            fresh_questions = await generate_coding_assignment(
                candidate_name=candidate_name,
                resume_text=student.get("resume_raw_text", ""),
                course_title=course_title,
                course_description=course_desc,
                user_id=student.get("user_id"),
                assignment_token=assignment_token,
            )
            await db["assignments"].update_one(
                {"assignment_token": assignment_token},
                {"$set": {"questions": fresh_questions}}
            )
            assign_doc["questions"] = fresh_questions

        # Update duration and schedule if admin changed them
        if assign_doc.get("duration_minutes") != duration_minutes or assign_doc.get("assignment_datetime") != sched_iso:
            await db["assignments"].update_one(
                {"assignment_token": assignment_token},
                {"$set": {
                    "duration_minutes": duration_minutes,
                    "assignment_datetime": sched_iso,
                }}
            )
            assign_doc["duration_minutes"] = duration_minutes
            assign_doc["assignment_datetime"] = sched_iso

        return sanitize_assignment_for_client(
            assign_doc,
            locked=False,
            schedule_status="active",
            can_start=True,
            scheduled_datetime_display=sched_display,
        )

    resume_text = student.get("resume_raw_text", "")
    questions = await generate_coding_assignment(
        candidate_name=candidate_name,
        resume_text=resume_text,
        course_title=course_title,
        course_description=course_desc,
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    assign_doc = {
        "assignment_token": assignment_token,
        "course_id": str(course["_id"]),
        "course_title": course_title,
        "user_id": student.get("user_id"),
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "unique_code": student_unique_code,
        "duration_minutes": duration_minutes,
        "assignment_datetime": sched_iso,
        "status": "in_progress",
        "questions": questions,
        "created_at": now_iso,
        "started_at": now_iso,
        "submitted_at": None,
        "score": None,
        "submissions": {},
        "ai_review": None,
    }

    await db["assignments"].insert_one(assign_doc)
    return sanitize_assignment_for_client(
        assign_doc,
        locked=False,
        schedule_status="active",
        can_start=True,
        scheduled_datetime_display=sched_display,
    )
