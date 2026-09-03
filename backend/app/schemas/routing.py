"""
Routing Schemas for Disaster Evacuation Route Optimizer API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class RouteRequest(BaseModel):
    start_node: str = Field(..., min_length=1, description="Origin intersection / node ID")
    destination_node: str = Field(..., min_length=1, description="Destination shelter / node ID")
    risk_weight: float = Field(default=10.0, ge=0.0, description="Penalty multiplier for road risk score")

    @field_validator("start_node", "destination_node")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Node ID cannot be empty or whitespace.")
        return s


class RouteResponse(BaseModel):
    start_node: str
    destination_node: str
    nodes: List[str] = Field(..., description="Ordered sequence of nodes along optimal path")
    road_ids: List[str] = Field(..., description="Ordered sequence of road IDs along optimal path")
    total_distance: float = Field(..., ge=0.0, description="Total physical distance of route")
    total_risk_score: float = Field(..., ge=0.0, description="Total accumulated blockage risk score")
    total_cost: float = Field(..., ge=0.0, description="Total risk-weighted routing cost")
