"""
Road Schemas for Disaster Evacuation Route Optimizer API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class RoadResponse(BaseModel):
    road_id: str = Field(..., description="Unique road segment ID")
    u: str = Field(..., description="Start node / intersection")
    v: str = Field(..., description="End node / intersection")
    distance: float = Field(..., ge=0.0, description="Physical distance in kilometers")
    status: str = Field(..., description="Operational status: 'OPEN' or 'BLOCKED'")
    blockage_probability: float = Field(..., ge=0.0, le=1.0, description="ML predicted blockage probability")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk index equal to blockage probability")
    routing_cost: float = Field(..., description="Calculated routing cost for Dijkstra engine")


class RoadListResponse(BaseModel):
    total_count: int = Field(..., ge=0)
    roads: List[RoadResponse]


class BlockRoadResponse(BaseModel):
    message: str
    road: RoadResponse
