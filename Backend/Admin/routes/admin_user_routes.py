from typing import List
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from auth.services.security_service import require_admin
from Admin.schemas.admin_user_schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserListItem,
    AdminUserDetailResponse,
)
from Admin.services.admin_user_service import (
    service_get_all_users,
    service_get_user_with_enrolled_courses,
    service_create_user_by_admin,
    service_update_user_by_admin,
    service_delete_user_by_admin,
)

router = APIRouter()


# 1. GET ALL REGISTERED USERS
@router.get("", response_model=List[AdminUserListItem])
@router.get("/", response_model=List[AdminUserListItem])
async def get_all_registered_users(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_get_all_users(db)


# 2. CREATE NEW USER (MANUAL ADMIN CREATE)
@router.post("", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    payload: AdminUserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_create_user_by_admin(payload, db)


# 3. GET SINGLE USER WITH ALL ENROLLED COURSES
@router.get("/{user_id}", response_model=AdminUserDetailResponse)
async def get_single_user_and_enrolled_courses(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_get_user_with_enrolled_courses(user_id, db)


# 4. UPDATE USER
@router.put("/{user_id}")
async def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_update_user_by_admin(user_id, payload, db)


# 5. DELETE USER
@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    return await service_delete_user_by_admin(user_id, db)