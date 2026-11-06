"""
Administrative Evaluation & Reporting Service.
Aggregates candidate AI Coding Assignment performance and AI Technical Interview reports,
supports interview qualification shortlisting, and provides structured data for Excel exports.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase


def parse_datetime(val: Any) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None


async def service_get_assignment_reports(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """
    Returns unified AI assignment reports for all candidate submissions across courses,
    including candidate credentials, course title, coding score, qualification threshold,
    and admin interview shortlist decisions.
    """
    reports = []
    seen_keys = set()

    # 1. Query courses enrolled_students
    courses_cursor = db["courses"].find()
    async for course in courses_cursor:
        c_id = str(course.get("_id"))
        c_title = course.get("title", "Technical Track")

        for st in course.get("enrolled_students", []):
            email = (st.get("email") or "").strip().lower()
            name = st.get("name") or (email.split("@")[0] if email else "Candidate")
            u_id = st.get("user_id") or ""
            asgn_token = st.get("assignment_token")

            unique_key = f"{c_id}_{email}_{asgn_token}"
            if unique_key in seen_keys:
                continue
            seen_keys.add(unique_key)

            score = float(st.get("assignment_score") or 0.0)
            status = st.get("assignment_status") or ("submitted" if score > 0 else "pending")

            # Check if assignment document has more recent evaluation
            if asgn_token:
                asgn_doc = await db["assignments"].find_one({"assignment_token": asgn_token})
                if asgn_doc:
                    score = float(asgn_doc.get("score") or score)
                    status = asgn_doc.get("status") or status

            qualifies = score >= 50.0

            # Interview shortlisted decision: True, False, or None
            interview_shortlisted = st.get("interview_shortlisted")
            if interview_shortlisted is None:
                # Default to automated score qualification threshold if not explicitly set by admin
                if st.get("application_status") == "selected_for_interview" or st.get("selected_for_interview") is True:
                    interview_shortlisted = True
                elif st.get("application_status") == "interview_rejected":
                    interview_shortlisted = False
                elif status == "submitted":
                    interview_shortlisted = qualifies
                else:
                    interview_shortlisted = None

            reports.append({
                "candidate_name": name,
                "candidate_email": email,
                "course_title": c_title,
                "course_id": c_id,
                "user_id": u_id,
                "assignment_token": asgn_token,
                "final_score": round(score, 1),
                "status": status,
                "qualifies_for_interview": qualifies,
                "qualification_verdict": "Qualified (Score >= 50%)" if qualifies else "Not Qualified (Score < 50%)",
                "interview_shortlisted": interview_shortlisted,
                "interview_status": (
                    "Shortlisted for Interview"
                    if interview_shortlisted is True
                    else "Not Shortlisted"
                    if interview_shortlisted is False
                    else "Pending Decision"
                ),
                "submitted_at": st.get("assignment_submitted_at"),
                "unique_code": st.get("unique_code"),
            })

    # 2. Also check any assignments collection documents that might not be in courses
    asgn_cursor = db["assignments"].find()
    async for a in asgn_cursor:
        email = (a.get("candidate_email") or "").strip().lower()
        asgn_token = a.get("assignment_token")
        c_id = a.get("course_id") or ""
        unique_key = f"{c_id}_{email}_{asgn_token}"

        if unique_key not in seen_keys and email:
            seen_keys.add(unique_key)
            score = float(a.get("score") or 0.0)
            qualifies = score >= 50.0
            interview_shortlisted = a.get("interview_shortlisted")
            if interview_shortlisted is None:
                interview_shortlisted = qualifies if a.get("status") == "submitted" else None

            reports.append({
                "candidate_name": a.get("candidate_name") or (email.split("@")[0] if email else "Candidate"),
                "candidate_email": email,
                "course_title": a.get("course_title") or "Technical Track",
                "course_id": c_id,
                "user_id": a.get("user_id") or "",
                "assignment_token": asgn_token,
                "final_score": round(score, 1),
                "status": a.get("status", "pending"),
                "qualifies_for_interview": qualifies,
                "qualification_verdict": "Qualified (Score >= 50%)" if qualifies else "Not Qualified (Score < 50%)",
                "interview_shortlisted": interview_shortlisted,
                "interview_status": (
                    "Shortlisted for Interview"
                    if interview_shortlisted is True
                    else "Not Shortlisted"
                    if interview_shortlisted is False
                    else "Pending Decision"
                ),
                "submitted_at": a.get("submitted_at"),
                "unique_code": a.get("unique_code"),
            })

    return reports


async def service_update_assignment_interview_decision(
    db: AsyncIOMotorDatabase,
    course_id: str,
    user_id: str,
    decision: str,
    assignment_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Updates the candidate's interview qualification decision (shortlisted / not_shortlisted).
    Persists decision to both courses.enrolled_students and assignments collections.
    """
    is_shortlisted = (decision.lower() in ["shortlisted", "true", "yes", "shortlist", "interview_shortlisted"])
    now_iso = datetime.now(timezone.utc).isoformat()

    interview_status_text = (
        "Selected for Next AI Interview Round" if is_shortlisted else "Not Shortlisted for Interview"
    )
    application_status_text = (
        "selected_for_interview" if is_shortlisted else "interview_rejected"
    )

    updated_in_course = False
    if course_id and ObjectId.is_valid(course_id):
        # Match by user_id or assignment_token
        query: Dict[str, Any] = {"_id": ObjectId(course_id)}
        if user_id:
            query["enrolled_students.user_id"] = user_id
        elif assignment_token:
            query["enrolled_students.assignment_token"] = assignment_token

        res = await db["courses"].update_one(
            query,
            {
                "$set": {
                    "enrolled_students.$.interview_shortlisted": is_shortlisted,
                    "enrolled_students.$.interview_status": interview_status_text,
                    "enrolled_students.$.application_status": application_status_text,
                    "enrolled_students.$.next_round_eligible": is_shortlisted,
                    "enrolled_students.$.decision_updated_at": now_iso,
                }
            }
        )
        updated_in_course = res.modified_count > 0

    if assignment_token:
        await db["assignments"].update_one(
            {"assignment_token": assignment_token},
            {
                "$set": {
                    "interview_shortlisted": is_shortlisted,
                    "interview_status": interview_status_text,
                    "selected_for_interview": is_shortlisted,
                    "next_round_eligible": is_shortlisted,
                    "decision_updated_at": now_iso,
                }
            }
        )
    elif user_id:
        await db["assignments"].update_many(
            {"user_id": user_id},
            {
                "$set": {
                    "interview_shortlisted": is_shortlisted,
                    "interview_status": interview_status_text,
                    "selected_for_interview": is_shortlisted,
                    "next_round_eligible": is_shortlisted,
                    "decision_updated_at": now_iso,
                }
            }
        )

    return {
        "success": True,
        "decision": "shortlisted" if is_shortlisted else "not_shortlisted",
        "interview_shortlisted": is_shortlisted,
        "interview_status": interview_status_text,
        "application_status": application_status_text,
        "updated_at": now_iso,
    }


async def service_get_interview_reports(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """
    Returns detailed AI Technical Interview reports for all candidate sessions,
    calculating completion duration in minutes, interview scores, hiring verdicts, and competencies.
    """
    cursor = db["interviews"].find().sort("started_at", -1)
    reports = []

    async for doc in cursor:
        candidate_name = doc.get("candidate_name") or "Candidate"
        candidate_email = doc.get("candidate_email") or ""
        course_title = doc.get("course_title") or "Technical Track"
        status = doc.get("status", "in_progress")
        final_report = doc.get("final_report") or {}

        # Calculate duration in minutes
        started_dt = parse_datetime(doc.get("started_at"))
        completed_dt = parse_datetime(doc.get("completed_at"))

        duration_minutes = 0.0
        if started_dt and completed_dt and completed_dt > started_dt:
            total_seconds = (completed_dt - started_dt).total_seconds()
            duration_minutes = round(total_seconds / 60.0, 1)
        else:
            # Fallback to sum of per-question audio / speech durations
            questions = doc.get("questions", [])
            q_secs = sum(float(q.get("duration_seconds") or 0.0) for q in questions)
            if q_secs > 0:
                duration_minutes = round(q_secs / 60.0, 1)
            elif doc.get("duration_minutes"):
                duration_minutes = float(doc.get("duration_minutes"))

        # Extract score
        overall_score = 0.0
        if final_report.get("overall_score") is not None:
            overall_score = float(final_report.get("overall_score"))
        elif doc.get("assignment_score") is not None:
            overall_score = float(doc.get("assignment_score"))

        verdict = final_report.get("hiring_verdict") or (
            "Qualified / Selected" if overall_score >= 50.0 else "Needs Development" if status == "completed" else "In Progress"
        )

        reports.append({
            "id": str(doc["_id"]),
            "interview_token": doc.get("interview_token"),
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "course_title": course_title,
            "course_id": doc.get("course_id"),
            "duration_minutes": duration_minutes,
            "interview_score": round(overall_score, 1),
            "technical_score": float(final_report.get("technical_score") or 0.0),
            "communication_score": float(final_report.get("communication_score") or 0.0),
            "problem_solving_score": float(final_report.get("problem_solving_score") or 0.0),
            "hiring_verdict": verdict,
            "status": status,
            "started_at": doc.get("started_at"),
            "completed_at": doc.get("completed_at"),
            "executive_summary": final_report.get("executive_summary") or "",
            "key_strengths": final_report.get("key_strengths") or [],
            "growth_recommendations": final_report.get("growth_recommendations") or [],
        })

    return reports
