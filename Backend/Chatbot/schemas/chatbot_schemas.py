from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatbotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Recent conversation turns")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional page context or user role")


class ChatbotResponse(BaseModel):
    reply: str = Field(..., description="Strict domain-restricted assistant answer")
    suggested_questions: List[str] = Field(default=[], description="Suggested follow-up questions")
    status: str = Field(default="success")

