import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

# Read MONGO_URI from .env, or fall back to MONGO_URL
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO_URL") or "mongodb://localhost:27017"
DATABASE_NAME = os.getenv("DATABASE_NAME", "interview_db")

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongo():
    global client, db
    try:
        # serverSelectionTimeoutMS prevents 30s hangs if cluster is sleeping
        client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection ping
        await client.admin.command("ping")
        db = client[DATABASE_NAME]
        print(f"[DB] Successfully connected to MongoDB Atlas: {DATABASE_NAME}")
    except Exception as exc:
        print(f"[DB ERROR] Connection failed: {exc}")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("[DB] Closed MongoDB connection")


def get_database() -> AsyncIOMotorDatabase:
    return db