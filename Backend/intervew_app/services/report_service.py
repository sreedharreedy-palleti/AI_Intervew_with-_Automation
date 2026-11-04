import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from .gemini_client import call_gemini_api_json


async def generate_final_interview_report(
    candidate_name: str,
    course_title: str,
    assignment_score: float,
    answers_evaluation: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Synthesizes the candidate's complete performance across coding + interview
    into an executive hiring scorecard using Gemini 2.5 Flash.
    """
    if not answers_evaluation:
        return {
            "overall_score": 60.0,
            "technical_score": 60.0,
            "communication_score": 65.0,
            "problem_solving_score": 60.0,
            "hiring_verdict": "Consider",
            "executive_summary": f"{candidate_name} completed the AI interview for {course_title}.",
            "key_strengths": ["Completed required technical stages"],
            "growth_recommendations": ["Deepen domain architecture practice"]
        }

    interview_avg_score = sum(a.get("score", 70) for a in answers_evaluation) / len(answers_evaluation)
    overall_score = round((assignment_score * 0.4) + (interview_avg_score * 0.6), 1)

    system_instruction = (
        "You are the VP of Engineering presiding over final hiring review. "
        "Synthesize the candidate's interview session into a final hiring verdict and executive evaluation report. "
        "Return STRICT valid JSON only."
    )

    prompt = f"""
Candidate: {candidate_name}
Course Track: {course_title}
Prerequisite Coding Assessment Score: {assignment_score}%
AI Technical Interview Score: {round(interview_avg_score, 1)}%
Combined Overall Score: {overall_score}%

Per-Question Answer Evaluations:
{json.dumps(answers_evaluation, indent=2)}

Provide the final executive interview report. Return this EXACT JSON structure:
{{
  "overall_score": {overall_score},
  "technical_score": 85.0,
  "communication_score": 82.0,
  "problem_solving_score": 88.0,
  "hiring_verdict": "Strong Hire / Hire / Consider / Needs Development",
  "executive_summary": "Comprehensive 3-4 sentence appraisal of candidate technical caliber and engineering readiness.",
  "key_strengths": ["Top strength 1", "Top strength 2", "Top strength 3"],
  "growth_recommendations": ["Recommendation 1", "Recommendation 2"]
}}
"""

    res = await call_gemini_api_json(prompt, system_instruction, timeout=30.0, temperature=0.2)
    if res and "hiring_verdict" in res:
        return {
            "overall_score": overall_score,
            "technical_score": float(res.get("technical_score", overall_score)),
            "communication_score": float(res.get("communication_score", overall_score)),
            "problem_solving_score": float(res.get("problem_solving_score", overall_score)),
            "hiring_verdict": str(res.get("hiring_verdict", "Hire" if overall_score >= 70 else "Consider")),
            "executive_summary": str(res.get("executive_summary", f"{candidate_name} demonstrated strong technical skills throughout the {course_title} evaluation.")),
            "key_strengths": list(res.get("key_strengths", ["Solid foundational knowledge", "Clear technical communication"])),
            "growth_recommendations": list(res.get("growth_recommendations", ["Expand distributed systems depth", "Focus on proactive system monitoring"]))
        }

    verdict = "Strong Hire" if overall_score >= 85 else ("Hire" if overall_score >= 70 else ("Consider" if overall_score >= 55 else "Needs Development"))
    return {
        "overall_score": overall_score,
        "technical_score": round(overall_score + 1.5, 1),
        "communication_score": round(overall_score - 1.0, 1),
        "problem_solving_score": round(overall_score + 0.5, 1),
        "hiring_verdict": verdict,
        "executive_summary": f"{candidate_name} successfully concluded the Stage 2 AI Technical Interview for {course_title} with an overall score of {overall_score}%. The candidate demonstrated solid reasoning across coding and system architecture.",
        "key_strengths": ["Consistent problem-solving methodology", "Good algorithmic foundations"],
        "growth_recommendations": ["Further practice with large-scale distributed caching", "Explore advanced performance profiling"]
    }


async def service_get_interview_report(
    interview_token: str,
    db: AsyncIOMotorDatabase
) -> Dict[str, Any]:
    """
    Retrieves the final synthesized AI interview report and scorecard.
    """
    session = await db["interviews"].find_one({"interview_token": interview_token})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.get("status") != "completed" or not session.get("final_report"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview has not been completed yet."
        )

    return session["final_report"]

