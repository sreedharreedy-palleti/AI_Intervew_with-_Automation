from fastapi import APIRouter
from .admin_course_routes import router as admin_course_routes
from .admin_user_routes import router as admin_user_routes

admin_router = APIRouter()

# 1. Course routes under /api/v1/admin/courses
admin_router.include_router(admin_course_routes, prefix="/courses", tags=["Admin Courses"])

# 2. User management CRUD routes under /api/v1/admin/users
admin_router.include_router(admin_user_routes, prefix="/users", tags=["Admin Users Management"])