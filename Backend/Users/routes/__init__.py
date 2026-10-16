from fastapi import APIRouter
from .user_course_routes import router as user_course_routes

users_router = APIRouter()
users_router.include_router(user_course_routes, prefix="/courses", tags=["User Courses"])