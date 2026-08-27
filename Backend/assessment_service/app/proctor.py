from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Literal, Optional
from app.database import proctor_collection

router = APIRouter(prefix="/api/proctor", tags=["Proctoring"])

# All supported violation types
ViolationType = Literal[
    "no_face_detected",
    "multiple_faces_detected",
    "mobile_phone_detected",
    "smartwatch_or_wearable",
    "unauthorized_object",
    "background_person_or_shadow",
    "excessive_screen_motion",
    "tab_switch",
    "fullscreen_exit",
    "window_blur",
    "camera_off",
    "mic_muted"
]

# Violations that cause immediate exam auto-exit / termination
CRITICAL_TERMINATION_VIOLATIONS = {
    "multiple_faces_detected",
    "mobile_phone_detected",
    "smartwatch_or_wearable",
    "unauthorized_object",
    "background_person_or_shadow",
    "excessive_screen_motion",
    "no_face_detected"
}

class StartSessionRequest(BaseModel):
    candidateId: str
    cameraGranted: bool = False
    micGranted: bool = False

class LogViolationRequest(BaseModel):
    sessionId: str
    violationType: ViolationType
    details: Optional[str] = ""

# --- 1. Start Proctor Session ---
@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_session(payload: StartSessionRequest):
    try:
        new_session = {
            "candidateId": payload.candidateId,
            "status": "in-progress",
            "mediaPermissions": {
                "cameraGranted": payload.cameraGranted,
                "micGranted": payload.micGranted
            },
            "violations": [],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        result = await proctor_collection.insert_one(new_session)
        return {
            "success": True,
            "sessionId": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize proctor session: {str(e)}"
        )

# --- 2. Log Violation & Handle Immediate Auto-Exit ---
@router.post("/violation", status_code=status.HTTP_200_OK)
async def log_violation(payload: LogViolationRequest):
    try:
        session_id_obj = ObjectId(payload.sessionId)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Session ID format"
        )

    session = await proctor_collection.find_one({"_id": session_id_obj})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    new_violation = {
        "type": payload.violationType,
        "details": payload.details or "",
        "timestamp": datetime.utcnow()
    }

    violations = session.get("violations", [])
    violations.append(new_violation)

    current_status = session.get("status", "in-progress")
    should_terminate = False

    # Instant exit on any critical visual violation
    if payload.violationType in CRITICAL_TERMINATION_VIOLATIONS:
        current_status = "terminated"
        should_terminate = True
    elif len(violations) >= 3:
        current_status = "flagged"
        should_terminate = True

    await proctor_collection.update_one(
        {"_id": session_id_obj},
        {
            "$set": {
                "violations": violations,
                "status": current_status,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    return {
        "success": True,
        "violationCount": len(violations),
        "status": current_status,
        "action": "terminate_exam" if should_terminate else "continue"
    }

# --- 3. Get Session Status ---
@router.get("/status/{session_id}", status_code=status.HTTP_200_OK)
async def get_session_status(session_id: str):
    try:
        session_id_obj = ObjectId(session_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Session ID format"
        )

    session = await proctor_collection.find_one({"_id": session_id_obj})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {
        "success": True,
        "sessionId": str(session["_id"]),
        "candidateId": session.get("candidateId"),
        "status": session.get("status", "in-progress"),
        "violations": session.get("violations", [])
    }