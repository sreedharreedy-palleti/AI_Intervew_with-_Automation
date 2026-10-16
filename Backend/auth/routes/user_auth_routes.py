from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database

from auth.schemas.auth_schemas import (
    SendEmailOTPRequest,
    VerifyEmailOTPRequest,
    UserRegister,
    UserLogin,
    TokenResponse,
    ForgotPasswordSendOTP,
    ForgotPasswordVerifyOTP,
    ForgotPasswordReset,
)
from auth.services.security_service import (
    hash_password,
    verify_password,
    generate_otp,
    create_access_token,
)
from auth.services.email_service import send_otp_email

router = APIRouter()

# 1. SEND OTP
@router.post("/send-registration-otp")
async def send_registration_otp(
    payload: SendEmailOTPRequest,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db["users"].find_one({"email": payload.email, "is_verified": True})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    raw_otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db["email_verifications"].update_one(
        {"email": payload.email},
        {"$set": {"otp_hash": hash_password(raw_otp), "otp_expiry": expiry, "is_verified": False}},
        upsert=True
    )

    background_tasks.add_task(send_otp_email, payload.email, raw_otp, "Candidate")
    return {"message": f"Verification OTP sent to {payload.email}."}

# 2. VERIFY OTP
@router.post("/verify-registration-otp")
async def verify_registration_otp(
    payload: VerifyEmailOTPRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    record = await db["email_verifications"].find_one({"email": payload.email})
    if not record:
        raise HTTPException(status_code=404, detail="No OTP requested for this email.")

    expiry = record.get("otp_expiry")
    if not expiry or datetime.now(timezone.utc) > expiry.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if not verify_password(payload.otp, record.get("otp_hash", "")):
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    await db["email_verifications"].update_one(
        {"email": payload.email},
        {"$set": {"is_verified": True}}
    )
    return {"message": "Email verified successfully."}

# 3. COMPLETE REGISTRATION
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    verification = await db["email_verifications"].find_one({"email": payload.email})
    if not verification or not verification.get("is_verified", False):
        raise HTTPException(status_code=400, detail="Verify your Gmail with OTP before registering.")

    user_dict = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": "user",
        "is_verified": True
    }
    result = await db["users"].insert_one(user_dict)
    user_id = str(result.inserted_id)

    await db["email_verifications"].delete_one({"email": payload.email})
    token = create_access_token({"sub": user_id, "role": "user"})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": user_dict["name"], "email": user_dict["email"], "role": "user"}
    }

# 4. DIRECT USER LOGIN
@router.post("/login", response_model=TokenResponse)
async def login_user(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user = await db["users"].find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "role": user.get("role", "user")})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": user["name"], "email": user["email"], "role": user.get("role", "user")}
    }

# 5. FORGOT PASSWORD
@router.post("/forgot-password-send-otp")
async def forgot_password_send_otp(
    payload: ForgotPasswordSendOTP,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user = await db["users"].find_one({"email": payload.email})
    if not user:
        return {"message": f"If an account exists for {payload.email}, an OTP was sent."}

    raw_otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db["password_resets"].update_one(
        {"email": payload.email},
        {"$set": {"otp_hash": hash_password(raw_otp), "otp_expiry": expiry, "is_verified": False}},
        upsert=True
    )
    background_tasks.add_task(send_otp_email, payload.email, raw_otp, user.get("name", "User"))
    return {"message": f"Password reset OTP sent to {payload.email}."}

@router.post("/forgot-password-verify-otp")
async def forgot_password_verify_otp(
    payload: ForgotPasswordVerifyOTP,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    record = await db["password_resets"].find_one({"email": payload.email})
    if not record:
        raise HTTPException(status_code=404, detail="No reset request found.")

    expiry = record.get("otp_expiry")
    if not expiry or datetime.now(timezone.utc) > expiry.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired.")

    if not verify_password(payload.otp, record.get("otp_hash", "")):
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    await db["password_resets"].update_one({"email": payload.email}, {"$set": {"is_verified": True}})
    return {"message": "OTP verified successfully. You may update your password."}

@router.post("/forgot-password-update")
async def forgot_password_update(
    payload: ForgotPasswordReset,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    record = await db["password_resets"].find_one({"email": payload.email})
    if not record or not record.get("is_verified", False):
        raise HTTPException(status_code=400, detail="Verify OTP first.")

    user = await db["users"].find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_hash = hash_password(payload.new_password)
    await db["users"].update_one({"_id": user["_id"]}, {"$set": {"password": new_hash}})
    await db["password_resets"].delete_one({"email": payload.email})

    return {"message": "Password updated successfully."}