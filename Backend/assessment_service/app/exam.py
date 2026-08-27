from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.database import resume_collection, exam_collection

router = APIRouter(prefix="/api/assessment", tags=["Assessment Exam"])

ROLE_QUESTIONS = {
    "python": [
        {
            "id": 101,
            "role": "python",
            "question": "In Python, what is the output of `[i * 2 for i in range(5) if i % 2 == 0]`?",
            "options": [
                "[0, 4, 8]",
                "[0, 2, 4, 6, 8]",
                "[2, 6]",
                "[0, 2, 4]"
            ],
            "correctIndex": 0,
            "explanation": "range(5) produces 0, 1, 2, 3, 4. Filtering with i % 2 == 0 gives 0, 2, 4. Multiplying each by 2 yields [0, 4, 8]."
        },
        {
            "id": 102,
            "role": "python",
            "question": "What is the Global Interpreter Lock (GIL) in CPython and what is its primary effect?",
            "options": [
                "A lock that prevents Python scripts from importing external C libraries",
                "A mutex that allows only one native thread to execute Python bytecode at a time",
                "A memory allocation manager that garbage collects circular references",
                "A compiler flag that enables JIT optimizations"
            ],
            "correctIndex": 1,
            "explanation": "The GIL ensures that only one thread runs Python bytecode at a time in CPython."
        },
        {
            "id": 103,
            "role": "python",
            "question": "Which built-in Python function/keyword transforms a normal function into a generator?",
            "options": [
                "`return`",
                "`yield`",
                "`async def`",
                "`lambda`"
            ],
            "correctIndex": 1,
            "explanation": "Using yield transforms a function into a lazy generator iterator."
        },
        {
            "id": 104,
            "role": "python",
            "question": "What is the key difference between `@staticmethod` and `@classmethod` in Python?",
            "options": [
                "`@classmethod` receives the class object (`cls`) as first argument, while `@staticmethod` receives no implicit first argument",
                "`@staticmethod` can only access private instance attributes",
                "`@classmethod` is executed at compile time only",
                "There is no difference; they are interchangeable aliases"
            ],
            "correctIndex": 0,
            "explanation": "@classmethod receives cls as first argument, whereas @staticmethod receives no implicit first parameter."
        },
        {
            "id": 105,
            "role": "python",
            "question": "How does Python handle memory management and cleanup of objects with circular references?",
            "options": [
                "Exclusively through reference counting (circular references cause permanent memory leaks)",
                "Reference counting supplemented by a cyclic generational garbage collector",
                "By storing all objects in non-volatile virtual memory cache",
                "Through compile-time manual free() statements"
            ],
            "correctIndex": 1,
            "explanation": "Python combines reference counting with a cyclic generational garbage collector."
        }
    ],
    "javascript": [
        {
            "id": 201,
            "role": "javascript",
            "question": "In modern JavaScript, what is the output of `typeof null` and why?",
            "options": [
                "null — because it is a primitive type",
                "\"object\" — due to a legacy bug in JS type representation where 0x00 tagged objects",
                "undefined — since null represents absence of value",
                "\"null\" — ES6 standardized it as a distinct string tag"
            ],
            "correctIndex": 1,
            "explanation": "typeof null === 'object' is a legacy artifact in JavaScript."
        },
        {
            "id": 202,
            "role": "javascript",
            "question": "Which of the following best describes how JavaScript Promise microtasks are scheduled vs macrotasks in the Event Loop?",
            "options": [
                "Macrotasks execute before microtasks in every cycle",
                "All microtasks in the microtask queue are drained immediately after synchronous script execution before the next macrotask is processed",
                "Microtasks run on a separate WebAssembly background thread",
                "Microtasks and macrotasks execute concurrently in parallel"
            ],
            "correctIndex": 1,
            "explanation": "Microtasks drain completely before the next macrotask runs."
        }
    ],
    "fullstack": [
        {
            "id": 301,
            "role": "fullstack",
            "question": "Which HTTP status code should a REST API return when a resource is successfully created?",
            "options": [
                "200 OK",
                "201 Created",
                "204 No Content",
                "302 Found"
            ],
            "correctIndex": 1,
            "explanation": "HTTP 201 Created is the standard response for new resource creation."
        },
        {
            "id": 302,
            "role": "fullstack",
            "question": "What is the primary benefit of database indexing in MongoDB / PostgreSQL?",
            "options": [
                "Reduces disk storage consumed by documents",
                "Accelerates query lookups from O(N) full table scan to O(log N) tree traversal",
                "Encrypts sensitive table columns at rest",
                "Automatically normalizes database schemas"
            ],
            "correctIndex": 1,
            "explanation": "Indexes accelerate lookups using B-Tree data structures."
        }
    ]
}

class AssessmentSubmission(BaseModel):
    candidateId: str
    sessionId: str
    answers: List[Dict[str, Any]]
    score: float = 0.0

@router.get("/questions")
async def get_questions(role: str = Query("fullstack"), candidateId: Optional[str] = None):
    norm_role = role.lower().strip()
    if "python" in norm_role or "django" in norm_role or "flask" in norm_role:
        q_list = ROLE_QUESTIONS["python"]
    elif "javascript" in norm_role or "react" in norm_role or "node" in norm_role or "frontend" in norm_role:
        q_list = ROLE_QUESTIONS["javascript"]
    else:
        q_list = ROLE_QUESTIONS["fullstack"]

    candidate_name = "Candidate"
    if candidateId and len(candidateId) == 24:
        try:
            cand = await resume_collection.find_one({"_id": ObjectId(candidateId)})
            if cand and "candidateDetails" in cand:
                candidate_name = cand["candidateDetails"].get("fullName", candidate_name)
        except Exception:
            pass

    return {
        "success": True,
        "role": role,
        "candidateName": candidate_name,
        "total": len(q_list),
        "questions": q_list
    }

@router.get("/{candidate_id}")
async def get_candidate_exam_info(candidate_id: str):
    try:
        candidate = await resume_collection.find_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Candidate ID format")

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {
        "success": True,
        "candidate": {
            "fullName": candidate.get("candidateDetails", {}).get("fullName", ""),
            "targetRole": candidate.get("candidateDetails", {}).get("targetRole", ""),
            "finalAtsScore": candidate.get("finalAtsScore", 0)
        }
    }

@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_exam(submission: AssessmentSubmission):
    record = {
        "candidateId": submission.candidateId,
        "sessionId": submission.sessionId,
        "answers": submission.answers,
        "score": submission.score,
        "submittedAt": datetime.utcnow()
    }
    result = await exam_collection.insert_one(record)
    return {"success": True, "submissionId": str(result.inserted_id)}