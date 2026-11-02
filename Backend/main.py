import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure Backend directory is in sys.path and .env is loaded
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

env_file = BASE_DIR / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import connect_to_mongo, close_mongo_connection, get_database
from auth.routes import auth_router
from Admin.routes import admin_router
from Users.routes import users_router
from Assignment.routes import assignment_router
from Intervew.routes import interview_router
from Chatbot.routes import chatbot_router
from Users.services.resume_storage_service import (
    migrate_disk_resumes_to_mongo,
    service_get_resume_file,
)
from Assignment.routes.portal_routes import download_assignment_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    db = get_database()
    try:
        await migrate_disk_resumes_to_mongo(db)
    except Exception as exc:
        print(f"[STARTUP NOTICE] Resume migration check: {exc}")
    yield
    await close_mongo_connection()


app = FastAPI(title="AI Interview Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(admin_router, prefix="/api/v1/admin")
app.include_router(users_router, prefix="/api/v1/user")
app.include_router(assignment_router, prefix="/api/v1/assignment")
app.include_router(interview_router, prefix="/api/v1/interview")
app.include_router(chatbot_router, prefix="/api/v1/chatbot")


# Backward-compatible route for any legacy resume URLs stored in DB
@app.get("/uploads/resumes/{filename:path}", tags=["Resumes"])
async def get_legacy_uploaded_resume(
    filename: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Streams legacy candidate resume directly from MongoDB without requiring disk files.
    """
    return await service_get_resume_file(filename, db)


@app.get("/download/app", tags=["Downloads"])
async def root_download_assignment_app():
    return await download_assignment_app()


@app.get("/", tags=["Health"])
def root():
    return {"status": "online", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
