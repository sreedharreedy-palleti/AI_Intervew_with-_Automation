from typing import Optional, Any
from pydantic import BaseModel


class TestCasePublic(BaseModel):
    input: Any
    expected_output: Any
    explanation: Optional[str] = ""


class TestCaseHidden(BaseModel):
    input: Any
    expected_output: Any
    hidden_state_reason: Optional[str] = ""
