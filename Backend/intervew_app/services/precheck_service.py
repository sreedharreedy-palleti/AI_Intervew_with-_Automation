from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from intervew_app.schemas.precheck_schemas import InterviewPrecheckRequest


async def service_verify_precheck(
    interview_token: str,
    payload: InterviewPrecheckRequest,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Validates that camera and microphone access have both been verified active
    before granting the candidate access to the live AI interview room.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    if not payload.camera_verified or not payload.mic_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both camera and microphone permissions must be verified active to proceed."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    await db["interviews"].update_one(
        {"interview_token": interview_token},
        {
            "$set": {
                "precheck_verified": True,
                "precheck_at": now_iso,
                "precheck_snapshot": payload.image_base64[:500] if payload.image_base64 else None,
                "browser": payload.browser,
            }
        }
    )

    return {
        "status": "verified",
        "interview_token": interview_token,
        "message": "Camera and microphone permissions verified. Live AI Interview Room unlocked!",
        "precheck_verified": True,
    }

