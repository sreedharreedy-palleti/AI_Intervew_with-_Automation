import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load the .env file from the Backend root folder
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("ai_interview")

resume_collection = db.get_collection("resumeanalyses")
proctor_collection = db.get_collection("proctorsessions")
exam_collection = db.get_collection("assessmentsubmissions")