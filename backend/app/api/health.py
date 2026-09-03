# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings
from app.db.database import check_db_health
from app.schemas.health import HealthResponse, ModuleStatus

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health_status():
    """
    Health check endpoint verifying core backend framework, database connection,
    and key dependencies (NetworkX, scikit-learn).
    """
    # Check NetworkX availability
    try:
        import networkx as nx
        nx_ok = True
    except ImportError:
        nx_ok = False

    # Check scikit-learn availability
    try:
        import sklearn
        sklearn_ok = True
    except ImportError:
        sklearn_ok = False

    db_ok = check_db_health()

    return HealthResponse(
        status="healthy" if (db_ok and nx_ok and sklearn_ok) else "degraded",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        modules=ModuleStatus(
            networkx_available=nx_ok,
            scikit_learn_available=sklearn_ok,
            sqlite_connected=db_ok
        ),
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
