from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from auth.schemas.auth_schemas import UserLogin, TokenResponse
from auth.services.security_service import verify_password, create_access_token

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def admin_direct_login(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user = await db["users"].find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(user["_id"])
    role = user.get("role", "user")
    token = create_access_token({"sub": user_id, "role": role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "role": role
        }
    }