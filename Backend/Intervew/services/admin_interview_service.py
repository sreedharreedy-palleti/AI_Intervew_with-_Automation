from datetime import datetime, timezone
from typing import Dict, Any, List
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from Intervew.schemas.admin_schemas import InterviewScheduleRequest


async def service_admin_list_interviews(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """
    Returns all candidate interview sessions for administrative monitoring and review.
    """
    cursor = db["interviews"].find().sort("started_at", -1)
    interviews = []
    async for doc in cursor:
        interviews.append({
            "id": str(doc["_id"]),
            "interview_token": doc.get("interview_token"),
            "candidate_name": doc.get("candidate_name"),
            "candidate_email": doc.get("candidate_email"),
            "course_title": doc.get("course_title"),
            "course_id": doc.get("course_id"),
            "assignment_score": doc.get("assignment_score"),
            "status": doc.get("status", "in_progress"),
            "precheck_verified": doc.get("precheck_verified", False),
            "current_question_index": doc.get("current_question_index", 0),
            "total_questions": len(doc.get("questions", [])),
            "started_at": doc.get("started_at"),
            "completed_at": doc.get("completed_at"),
            "final_report": doc.get("final_report"),
        })
    return interviews


async def service_admin_schedule_interview(
    interview_token: str,
    payload: InterviewScheduleRequest,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Admin scheduling of the live AI interview slot for a candidate.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "scheduled_datetime": payload.interview_datetime,
        "duration_minutes": payload.duration_minutes or 45,
        "scheduled_at": now_iso,
    }

    await db["interviews"].update_one(
        {"interview_token": interview_token},
        {"$set": update_data}
    )

    course_id = session.get("course_id")
    if course_id and ObjectId.is_valid(course_id):
        await db["courses"].update_one(
            {
                "_id": ObjectId(course_id),
                "enrolled_students.interview_token": interview_token
            },
            {
                "$set": {
                    "enrolled_students.$.interview_datetime": payload.interview_datetime,
                    "enrolled_students.$.interview_duration_minutes": payload.duration_minutes or 45,
                }
            }
        )

    return {
        "interview_token": interview_token,
        "scheduled_datetime": payload.interview_datetime,
        "duration_minutes": payload.duration_minutes or 45,
        "message": f"Interview successfully scheduled for {payload.interview_datetime}."
    }

