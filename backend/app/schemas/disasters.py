"""
Disaster Incident Schemas for Disaster Evacuation Route Optimizer API.
"""

from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DisasterStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"


class DisasterType(str, Enum):
    FLOOD = "FLOOD"
    CYCLONE = "CYCLONE"
    LANDSLIDE = "LANDSLIDE"
    EARTHQUAKE = "EARTHQUAKE"
    HEAVY_RAINFALL = "HEAVY_RAINFALL"
    FIRE = "FIRE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    OTHER = "OTHER"


class DisasterCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100, description="Short title of the disaster event")
    disaster_type: DisasterType = Field(default=DisasterType.FLOOD, description="Category of disaster")
    description: str = Field(..., min_length=5, description="Detailed description of the incident")
    severity: float = Field(default=0.7, ge=0.0, le=1.0, description="Severity score from 0.0 (low) to 1.0 (critical)")
    affected_nodes: List[str] = Field(default_factory=list, description="List of node IDs affected (e.g. ['A', 'B'])")
    affected_roads: List[str] = Field(default_factory=list, description="List of road IDs affected (e.g. ['R1', 'R2'])")
    reported_by: str = Field(default="Civilian User", description="Name or role of reporter")


class DisasterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    disaster_type: Optional[DisasterType] = None
    description: Optional[str] = None
    severity: Optional[float] = Field(None, ge=0.0, le=1.0)
    affected_nodes: Optional[List[str]] = None
    affected_roads: Optional[List[str]] = None
    status: Optional[DisasterStatus] = None
    admin_notes: Optional[str] = None


class DisasterStatusUpdate(BaseModel):
    status: DisasterStatus = Field(..., description="Target status: APPROVED, REJECTED, RESOLVED, PENDING")
    admin_notes: Optional[str] = Field(None, description="Explanation or action notes from administrator")


class DisasterResponse(BaseModel):
    id: str = Field(..., description="Unique disaster ID")
    title: str
    disaster_type: DisasterType
    description: str
    severity: float
    affected_nodes: List[str]
    affected_roads: List[str]
    status: DisasterStatus
    reported_by: str
    created_at: str
    updated_at: str
    admin_notes: Optional[str] = None


class DisasterListResponse(BaseModel):
    total_count: int = Field(..., ge=0)
    pending_count: int = Field(..., ge=0)
    approved_count: int = Field(..., ge=0)
    disasters: List[DisasterResponse]
