from typing import List, Dict, Any
from typing import Optional
from pydantic import BaseModel, Field


class QuestionReviewItem(BaseModel):
    question_id: str
    question_text: str
    topic: str
    score: float
    verdict: Optional[str] = None
    feedback: Optional[str] = None
    candidate_answer: Optional[str] = None


class InterviewFinalReport(BaseModel):
    """
    Synthesized executive scorecard compiled by Gemini upon interview conclusion.
    """
    interview_token: str
    candidate_name: str
    course_title: str
    status: str
    overall_score: float
    technical_score: float
    communication_score: float
    problem_solving_score: float
    hiring_verdict: str  # Strong Hire | Hire | Consider | Needs Development
    executive_summary: str
    key_strengths: List[str] = Field(default_factory=list)
    growth_recommendations: List[str] = Field(default_factory=list)
    questions_count: int
    completed_at: str
    detailed_question_reviews: List[Dict[str, Any]] = Field(default_factory=list)

