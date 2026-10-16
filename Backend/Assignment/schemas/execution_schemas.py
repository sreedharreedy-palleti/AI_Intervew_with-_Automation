from typing import List, Optional, Any
from pydantic import BaseModel


class RunTestsRequest(BaseModel):
    question_id: str
    code: str
    language: str = "python"


class PublicTestResult(BaseModel):
    test_index: int
    input: Any
    expected_output: Any
    actual_output: Any
    passed: bool
    execution_time_ms: float
    error: Optional[str] = None


class HiddenTestResult(BaseModel):
    test_index: int
    passed: bool
    execution_time_ms: float
    status: str


class RunTestsResponse(BaseModel):
    question_id: str
    all_passed: bool
    total_tests: int
    passed_tests: int
    public_results: List[PublicTestResult]
    hidden_results: List[HiddenTestResult]
    stdout: str = ""
    compile_error: Optional[str] = None
    execution_time_ms: Optional[float] = None
