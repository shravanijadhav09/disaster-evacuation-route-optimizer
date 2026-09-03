"""
# Updated: 2026-09-03 - Clean startup initialization
"""

import sys
import os
import logging
from datetime import datetime, timezone

# Ensure project root is in sys.path when running from inside backend/ directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.api.routes import (
    health_router,
    roads_router,
    routing_router,
    shelters_router,
    disasters_router,
)

from backend.app.routing.models import (
    NodeNotFoundError,
    InvalidRouteRequestError,
    NoRouteFoundError,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="REST API for Disaster Evacuation Route Optimizer using NetworkX Dijkstra & ML Risk Assessment.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS Middleware for production Vercel frontend & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handlers for Routing Errors (PART F)
@app.exception_handler(NodeNotFoundError)
async def node_not_found_handler(request: Request, exc: NodeNotFoundError):
    logger.warning(f"NodeNotFoundError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(InvalidRouteRequestError)
async def invalid_route_request_handler(request: Request, exc: InvalidRouteRequestError):
    logger.warning(f"InvalidRouteRequestError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(NoRouteFoundError)
async def no_route_found_handler(request: Request, exc: NoRouteFoundError):
    logger.warning(f"NoRouteFoundError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def global_unexpected_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected internal error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred. Please check server logs."},
    )


# Root health endpoint
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_PREFIX}/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/health",
    }


# Include Routers
app.include_router(health_router)
app.include_router(roads_router)
app.include_router(routing_router)
app.include_router(shelters_router)
app.include_router(disasters_router)

app.include_router(roads_router, prefix=settings.API_PREFIX)
app.include_router(routing_router, prefix=settings.API_PREFIX)
app.include_router(shelters_router, prefix=settings.API_PREFIX)
app.include_router(disasters_router, prefix=settings.API_PREFIX)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
