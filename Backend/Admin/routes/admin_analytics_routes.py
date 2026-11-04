from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from auth.services.security_service import require_admin
from Admin.services.admin_analytics_service import (
    service_get_dashboard_analytics,
    service_get_app_downloads,
)

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    """
    Returns real-time aggregated platform visualization statistics:
    - User counts (candidates, admins, verified)
    - Course counts & roster distribution
    - Total registrations and enrollment breakdowns
    - ATS score distributions & qualification rates
    - AI Assessment simulations and academic integrity telemetry
    - Desktop App download telemetry
    """
    return await service_get_dashboard_analytics(db)


@router.get("/app-downloads")
async def get_app_downloads(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(require_admin),
):
    """
    Returns the total count, unique candidate count, and full list of
    users who downloaded the Windows desktop application (.exe).
    """
    return await service_get_app_downloads(db)

