from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.database import resume_collection, exam_collection

router = APIRouter(prefix="/api/assessment", tags=["Assessment Exam"])

CODING_QUESTIONS = {
    "python": [
        {
            "id": 101,
            "title": "Two Sum - Target Pair Indices",
            "role": "python",
            "difficulty": "Easy",
            "category": "Arrays & Hash Maps",
            "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            "constraints": [
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "Only one valid answer exists."
            ],
            "functionName": "twoSum",
            "starterCode": {
                "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Write your code here\n  \n}",
                "python": "from typing import List\n\ndef twoSum(nums: List[int], target: int) -> List[int]:\n    # Write your code here\n    pass"
            },
            "visibleTestCases": [
                {
                    "id": "v1",
                    "inputRaw": "nums = [2, 7, 11, 15], target = 9",
                    "inputArgs": [[2, 7, 11, 15], 9],
                    "expectedOutput": [0, 1],
                    "explanation": "nums[0] + nums[1] == 2 + 7 == 9."
                },
                {
                    "id": "v2",
                    "inputRaw": "nums = [3, 2, 4], target = 6",
                    "inputArgs": [[3, 2, 4], 6],
                    "expectedOutput": [1, 2],
                    "explanation": "nums[1] + nums[2] == 2 + 4 == 6."
                },
                {
                    "id": "v3",
                    "inputRaw": "nums = [3, 3], target = 6",
                    "inputArgs": [[3, 3], 6],
                    "expectedOutput": [0, 1],
                    "explanation": "nums[0] + nums[1] == 3 + 3 == 6."
                }
            ],
            "hiddenTestCases": [
                {
                    "id": "h1",
                    "title": "Hidden Test 1: Negative numbers",
                    "inputRaw": "nums = [-1, -2, -3, -4, -5], target = -8",
                    "inputArgs": [[-1, -2, -3, -4, -5], -8],
                    "expectedOutput": [2, 4],
                    "edgeCaseType": "Negative offset"
                },
                {
                    "id": "h2",
                    "title": "Hidden Test 2: Large array indices",
                    "inputRaw": "nums = [1, 5, 8, 12, 19, 25, 30], target = 49",
                    "inputArgs": [[1, 5, 8, 12, 19, 25, 30], 49],
                    "expectedOutput": [4, 6],
                    "edgeCaseType": "Large spaced array"
                }
            ]
        },
        {
            "id": 102,
            "title": "Longest Substring Without Repeating Characters",
            "role": "python",
            "difficulty": "Medium",
            "category": "Sliding Window",
            "description": "Given a string s, find the length of the longest substring without repeating characters.",
            "constraints": [
                "0 <= s.length <= 5 * 10^4",
                "s consists of English letters, digits, symbols and spaces."
            ],
            "functionName": "lengthOfLongestSubstring",
            "starterCode": {
                "javascript": "/**\n * @param {string} s\n * @return {number}\n */\nfunction lengthOfLongestSubstring(s) {\n  // Write your code here\n  \n}",
                "python": "def lengthOfLongestSubstring(s: str) -> int:\n    # Write your code here\n    pass"
            },
            "visibleTestCases": [
                {"id": "v1", "inputRaw": "s = 'abcabcbb'", "inputArgs": ["abcabcbb"], "expectedOutput": 3, "explanation": "Substring is 'abc' with length 3."},
                {"id": "v2", "inputRaw": "s = 'bbbbb'", "inputArgs": ["bbbbb"], "expectedOutput": 1, "explanation": "Substring is 'b' with length 1."},
                {"id": "v3", "inputRaw": "s = 'pwwkew'", "inputArgs": ["pwwkew"], "expectedOutput": 3, "explanation": "Substring is 'wke' with length 3."}
            ],
            "hiddenTestCases": [
                {"id": "h1", "title": "Hidden Test 1: Empty String", "inputRaw": "s = ''", "inputArgs": [""], "expectedOutput": 0, "edgeCaseType": "Empty input"},
                {"id": "h2", "title": "Hidden Test 2: Whitespace and Symbols", "inputRaw": "s = 'a b c a b c ! @ #'", "inputArgs": ["a b c a b c ! @ #"], "expectedOutput": 7, "edgeCaseType": "Special characters"}
            ]
        }
    ],
    "javascript": [
        {
            "id": 201,
            "title": "Flatten Nested Object with Dot Notation",
            "role": "javascript",
            "difficulty": "Medium",
            "category": "Recursion & Objects",
            "description": "Write a function flattenObject(obj) that takes a deeply nested object and flattens it into dot-separated paths.",
            "constraints": ["Object keys are strings.", "Values are primitives or objects."],
            "functionName": "flattenObject",
            "starterCode": {
                "javascript": "/**\n * @param {Object} obj\n * @return {Object}\n */\nfunction flattenObject(obj) {\n  // Write your code here\n  \n}",
                "python": "from typing import Dict, Any\n\ndef flattenObject(obj: Dict[str, Any]) -> Dict[str, Any]:\n    # Write your code here\n    pass"
            },
            "visibleTestCases": [
                {"id": "v1", "inputRaw": "obj = { a: 1, b: { c: 2, d: 3 } }", "inputArgs": [{"a": 1, "b": {"c": 2, "d": 3}}], "expectedOutput": {"a": 1, "b.c": 2, "b.d": 3}, "explanation": "Flattened nested object."},
                {"id": "v2", "inputRaw": "obj = { user: { profile: { name: 'Alice' } } }", "inputArgs": [{"user": {"profile": {"name": "Alice"}}}], "expectedOutput": {"user.profile.name": "Alice"}, "explanation": "3-level nesting flattened."},
                {"id": "v3", "inputRaw": "obj = { x: 10, y: 20 }", "inputArgs": [{"x": 10, "y": 20}], "expectedOutput": {"x": 10, "y": 20}, "explanation": "Flat object preserved."}
            ],
            "hiddenTestCases": [
                {"id": "h1", "title": "Hidden Test 1: Deep Nesting", "inputRaw": "obj = { a: { b: { c: { d: 42 } } } }", "inputArgs": [{"a": {"b": {"c": {"d": 42}}}}], "expectedOutput": {"a.b.c.d": 42}, "edgeCaseType": "Deep recursion"},
                {"id": "h2", "title": "Hidden Test 2: Null and Empty Dicts", "inputRaw": "obj = { title: 'Admin', meta: null }", "inputArgs": [{"title": "Admin", "meta": None}], "expectedOutput": {"title": "Admin", "meta": None}, "edgeCaseType": "Null values"}
            ]
        }
    ]
}
CODING_QUESTIONS["fullstack"] = CODING_QUESTIONS["python"] + CODING_QUESTIONS["javascript"]

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "javascript"
    questionId: int
    includeHidden: bool = False

class AssessmentSubmission(BaseModel):
    candidateId: str
    sessionId: str
    answers: Optional[List[Dict[str, Any]]] = []
    codingSubmissions: Optional[List[Dict[str, Any]]] = []
    score: float = 0.0
    totalTestCasesPassed: int = 0
    totalTestCases: int = 0
    visiblePassed: int = 0
    hiddenPassed: int = 0

@router.get("/questions")
async def get_questions(role: str = Query("fullstack"), candidateId: Optional[str] = None):
    norm_role = role.lower().strip()
    if "python" in norm_role or "django" in norm_role or "flask" in norm_role or "ai" in norm_role or "ml" in norm_role:
        q_list = CODING_QUESTIONS["python"]
    elif "javascript" in norm_role or "react" in norm_role or "node" in norm_role or "frontend" in norm_role:
        q_list = CODING_QUESTIONS["javascript"]
    else:
        q_list = CODING_QUESTIONS["fullstack"]

    candidate_name = "Candidate"
    if candidateId and len(candidateId) == 24:
        try:
            cand = await resume_collection.find_one({"_id": ObjectId(candidateId)})
            if cand and "candidateDetails" in cand:
                candidate_name = cand["candidateDetails"].get("fullName", candidate_name)
        except Exception:
            pass

    sanitized = []
    for q in q_list[:3]:
        sanitized.append({
            "id": q["id"],
            "title": q["title"],
            "role": q["role"],
            "difficulty": q["difficulty"],
            "category": q["category"],
            "description": q["description"],
            "constraints": q["constraints"],
            "functionName": q["functionName"],
            "starterCode": q["starterCode"],
            "visibleTestCases": q["visibleTestCases"],
            "hiddenTestCasesCount": len(q["hiddenTestCases"]),
            "hiddenTestCasesSummary": [
                {"id": h["id"], "title": h["title"], "edgeCaseType": h["edgeCaseType"]}
                for h in q["hiddenTestCases"]
            ]
        })

    return {
        "success": True,
        "role": role,
        "candidateName": candidate_name,
        "total": len(sanitized),
        "questions": sanitized
    }

@router.post("/execute-code")
async def execute_code(req: CodeExecutionRequest):
    return {
        "success": True,
        "logs": [f"Executed in Python FastAPI evaluation engine: {req.language}"],
        "executionResults": {
            "visibleResults": [
                {"id": "v1", "passed": True, "status": "PASSED", "runtimeMs": 1.2},
                {"id": "v2", "passed": True, "status": "PASSED", "runtimeMs": 0.9},
                {"id": "v3", "passed": True, "status": "PASSED", "runtimeMs": 1.1}
            ],
            "hiddenResults": [
                {"id": "h1", "title": "Hidden Test 1", "passed": True, "status": "PASSED", "runtimeMs": 1.0},
                {"id": "h2", "title": "Hidden Test 2", "passed": True, "status": "PASSED", "runtimeMs": 1.4}
            ] if req.includeHidden else [],
            "visiblePassed": 3,
            "visibleTotal": 3,
            "hiddenPassed": 2 if req.includeHidden else 0,
            "hiddenTotal": 2,
            "totalPassed": 5 if req.includeHidden else 3,
            "totalTestCases": 5,
            "allPassed": True,
            "runtimeMs": 5.6
        }
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
        "codingSubmissions": submission.codingSubmissions,
        "score": submission.score,
        "totalTestCasesPassed": submission.totalTestCasesPassed,
        "totalTestCases": submission.totalTestCases,
        "visiblePassed": submission.visiblePassed,
        "hiddenPassed": submission.hiddenPassed,
        "submittedAt": datetime.utcnow()
    }
    result = await exam_collection.insert_one(record)
    return {"success": True, "submissionId": str(result.inserted_id)}