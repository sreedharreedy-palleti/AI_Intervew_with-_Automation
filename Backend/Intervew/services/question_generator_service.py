import json
from typing import Dict, Any, List
from .gemini_client import call_gemini_api_json


def get_curated_fallback_questions(course_title: str) -> List[Dict[str, Any]]:
    """
    Curated high-yield architectural and systems questions for fail-safe fallback.
    """
    return [
        {
            "question_id": "iq1",
            "question_text": f"In the context of {course_title}, explain how asynchronous request processing and concurrency work under the hood, and how you would prevent blocking event loops under high traffic.",
            "topic": "Concurrency & Architecture",
            "difficulty": "Medium",
            "category": "technical",
            "context_hint": "Discuss asynchronous tasks, thread pools, and non-blocking I/O.",
            "expected_points": [
                "Async event loop mechanics",
                "Offloading blocking CPU bound work to background workers",
                "Connection pooling and thread management"
            ]
        },
        {
            "question_id": "iq2",
            "question_text": "In your recent coding assessment, you solved algorithmic data transformations. If your solution needed to scale to 10 million real-time items with sub-50ms latency, what caching, indexing, or streaming strategies would you introduce?",
            "topic": "Algorithmic Scalability & Optimization",
            "difficulty": "Medium-Hard",
            "category": "coding_followup",
            "context_hint": "Focus on space/time complexity trade-offs and caching layers.",
            "expected_points": [
                "Memory efficiency and generator pipelines",
                "Distributed cache (e.g. Redis) and memoization",
                "Database indexing and partition keys"
            ]
        },
        {
            "question_id": "iq3",
            "question_text": f"Walk me through how you would design a robust, fault-tolerant microservice system for {course_title}. How do you ensure high availability, data consistency, and graceful degradation during network partitions?",
            "topic": "System Design & Distributed Systems",
            "difficulty": "Hard",
            "category": "system_design",
            "context_hint": "Mention circuit breakers, idempotency, and retry policies.",
            "expected_points": [
                "Circuit breaker and rate limiting patterns",
                "Idempotent API endpoint designs",
                "Observability, metrics, and distributed tracing"
            ]
        },
        {
            "question_id": "iq4",
            "question_text": "Describe a scenario where a critical production service experiences intermittent latency spikes or memory leaks. What systematic debugging workflow would you use to isolate and resolve the root cause?",
            "topic": "Production Debugging & Reliability",
            "difficulty": "Medium",
            "category": "behavioral",
            "context_hint": "Walk through APM telemetry, profiling tools, and staged rollbacks.",
            "expected_points": [
                "Structured metric isolation (CPU, memory, heap dumps)",
                "Log correlation and APM profiling",
                "Rollback protocols and post-mortem RCA"
            ]
        }
    ]


async def generate_interview_questions(
    candidate_name: str,
    course_title: str,
    course_description: str,
    assignment_score: float = 75.0,
    resume_text: str = ""
) -> List[Dict[str, Any]]:
    """
    Generates 4 personalized, progressive AI technical interview questions
    tailored to the candidate's track and assessment performance using Gemini 2.5 Flash.
    """
    system_instruction = (
        "You are an Elite Principal AI Technical Interviewer at a top technology company. "
        "Generate 4 progressive, deep technical and architectural interview questions for a qualified candidate. "
        "Return STRICT valid JSON only."
    )

    prompt = f"""
Candidate: {candidate_name}
Course Track: {course_title}
Overview: {course_description}
Coding Assessment Score: {assignment_score}% (Qualified with >= 50%)
Resume Summary: {resume_text[:1200] if resume_text else "Proficient technical software background"}

Generate EXACTLY 4 structured technical interview questions:
1. Core Architecture & Language Concurrency (technical)
2. Scalability Follow-up on their coding logic (coding_followup)
3. System Design & Fault Tolerance for this specific domain (system_design)
4. Production incident debugging & resilience trade-offs (technical / behavioral)

Return this EXACT JSON structure:
{{
  "questions": [
    {{
      "question_id": "iq1",
      "question_text": "The complete interview question text.",
      "topic": "Core Architecture",
      "difficulty": "Medium",
      "category": "technical",
      "context_hint": "Brief hint on focus area.",
      "expected_points": ["Point 1", "Point 2", "Point 3"]
    }},
    {{
      "question_id": "iq2",
      "question_text": "The second interview question text.",
      "topic": "Algorithmic Scalability",
      "difficulty": "Medium",
      "category": "coding_followup",
      "context_hint": "Focus hint.",
      "expected_points": ["Point 1", "Point 2"]
    }},
    {{
      "question_id": "iq3",
      "question_text": "The third question text.",
      "topic": "System Design",
      "difficulty": "Hard",
      "category": "system_design",
      "context_hint": "Focus hint.",
      "expected_points": ["Point 1", "Point 2"]
    }},
    {{
      "question_id": "iq4",
      "question_text": "The fourth question text.",
      "topic": "Production Reliability",
      "difficulty": "Medium",
      "category": "behavioral",
      "context_hint": "Focus hint.",
      "expected_points": ["Point 1", "Point 2"]
    }}
  ]
}}
"""

    res = await call_gemini_api_json(prompt, system_instruction, timeout=35.0, temperature=0.3)
    if res and "questions" in res and isinstance(res["questions"], list) and len(res["questions"]) >= 3:
        formatted = []
        for idx, q in enumerate(res["questions"][:4], start=1):
            formatted.append({
                "question_id": f"iq{idx}",
                "question_text": str(q.get("question_text", "")),
                "topic": str(q.get("topic", "Technical Proficiency")),
                "difficulty": str(q.get("difficulty", "Medium")),
                "category": str(q.get("category", "technical")),
                "context_hint": str(q.get("context_hint", "")),
                "expected_points": list(q.get("expected_points", ["Conceptual depth", "Practical experience"])),
            })
        print(f"[AI INTERVIEW] Successfully generated 4 custom questions via Gemini for {candidate_name}.")
        return formatted

    print(f"[AI INTERVIEW FALLBACK] Using curated interview questions for track: {course_title}")
    return get_curated_fallback_questions(course_title)

