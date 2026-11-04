from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class InterviewScheduleRequest(BaseModel):
    """
    Admin command to schedule the interview date, time, and policies.
    """
    interview_datetime: str
    duration_minutes: Optional[int] = 45
    interview_policy: Optional[str] = None
    send_email: Optional[bool] = True


class AdminInterviewSummary(BaseModel):
    """
    Administrative overview item of a candidate interview session.
    """
    id: str
    interview_token: str
    candidate_name: str
    candidate_email: str
    course_title: str
    course_id: Optional[str] = None
    assignment_score: Optional[float] = None
    status: str
    precheck_verified: bool = False
    current_question_index: int = 0
    total_questions: int = 4
    started_at: str
    completed_at: Optional[str] = None
    final_report: Optional[Dict[str, Any]] = None

