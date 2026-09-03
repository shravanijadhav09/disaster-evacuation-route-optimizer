"""
Health Check Schemas for Disaster Evacuation Route Optimizer API.
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field


class ModuleStatus(BaseModel):
    networkx_available: bool = True
    scikit_learn_available: bool = True
    sqlite_connected: bool = True


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Overall API health status")
    app: str = Field(default="Disaster Evacuation Route Optimizer API")
    version: str = Field(default="0.1.0")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    modules: Optional[ModuleStatus] = None
