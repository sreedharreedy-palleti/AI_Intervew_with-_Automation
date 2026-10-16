from fastapi import APIRouter
from .user_auth_routes import router as user_auth_router
from .admin_auth_routes import router as admin_auth_router

auth_router = APIRouter()

auth_router.include_router(user_auth_router, prefix="/user", tags=["Auth (User)"])
auth_router.include_router(admin_auth_router, prefix="/admin", tags=["Auth (Admin)"])