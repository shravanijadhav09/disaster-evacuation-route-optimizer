"""
API Routes Package for Disaster Evacuation Route Optimizer API.
"""

from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.roads import router as roads_router
from backend.app.api.routes.routing import router as routing_router
from backend.app.api.routes.shelters import router as shelters_router
from backend.app.api.routes.disasters import router as disasters_router

__all__ = [
    "health_router",
    "roads_router",
    "routing_router",
    "shelters_router",
    "disasters_router",
]

