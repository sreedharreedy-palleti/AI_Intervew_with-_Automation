import logging
from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from ..schemas.chatbot_schemas import ChatbotRequest, ChatbotResponse
from ..services.chatbot_service import generate_chatbot_response, get_live_courses_catalog

logger = logging.getLogger("chatbot.routes")

chatbot_router = APIRouter(tags=["Platform AI Chatbot"])


@chatbot_router.post("/chat", response_model=ChatbotResponse)
async def chat_with_platform_bot(
    payload: ChatbotRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Direct endpoint for HirePulse Platform AI Chatbot.
    Strictly answers questions exclusively about this website, its courses,
    ATS screening, assignments, AI voice interview, proctoring, and navigation.
    """
    try:
        user_msg = payload.message.strip()
        if not user_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty."
            )

        history_dicts = [m.model_dump() for m in payload.history] if payload.history else []
        result = await generate_chatbot_response(
            user_message=user_msg,
            history=history_dicts,
            context=payload.context,
            db=db,
        )

        return ChatbotResponse(
            reply=result.get("reply", "I can help you with anything related to our platform!"),
            suggested_questions=result.get("suggested_questions", []),
            status="success"
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[CHATBOT ROUTE EXCEPTION] {exc}")
        return ChatbotResponse(
            reply="I am the HirePulse Platform Assistant. I am here to assist with any questions about our website, courses, and interviews. Please ask your question!",
            suggested_questions=[
                "How many courses are there in HirePulse?",
                "Which roles and experience are eligible for each course?",
                "How does AI ATS shortlisting work?"
            ],
            status="fallback"
        )


@chatbot_router.get("/starter")
async def get_chatbot_starters(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Returns initial starter greeting and quick-prompt questions for the chatbot widget.
    """
    courses = await get_live_courses_catalog(db)
    count = len(courses)

    return {
        "greeting": f"👋 Hi! I'm the **HirePulse Platform Assistant**. We currently offer **{count} technical courses** with AI ATS screening and proctored evaluations. How can I help you today?",
        "suggested_questions": [
            "How many courses are there in HirePulse?",
            "Which roles & experience are eligible for each course?",
            "How does AI ATS shortlisting work?",
            "What happens during the AI Voice Interview?"
        ]
    }
