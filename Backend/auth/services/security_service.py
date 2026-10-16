import os
import random
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/user/login")

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day


def hash_password(password: str) -> str:
    """Hashes a raw password/OTP using bcrypt directly, avoiding passlib 72-byte bug."""
    pwd_bytes = password.encode("utf-8")[:72]  # Truncate to bcrypt's 72-byte limit
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain string against a bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def generate_otp() -> str:
    """Generates a random 6-digit verification code."""
    return f"{random.randint(100000, 999999)}"


def create_access_token(data: dict) -> str:
    """Encodes JWT payload with an expiration timestamp."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db=Depends(get_database)
) -> dict:
    """Decodes the Bearer token and verifies the user exists in MongoDB."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise credentials_exception
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforces admin role check."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    return current_user