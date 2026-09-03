"""
Health Check Router for Disaster Evacuation Route Optimizer API.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.schemas.health import HealthResponse, ModuleStatus
from backend.app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health():
    """
    Health check endpoint returning application operational status.
    """
    return HealthResponse(
        status="ok",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
        modules=ModuleStatus(
            networkx_available=True,
            scikit_learn_available=True,
            sqlite_connected=True,
        ),
    )
