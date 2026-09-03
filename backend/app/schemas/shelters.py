"""
Shelter Schemas for Disaster Evacuation Route Optimizer API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ShelterResponse(BaseModel):
    shelter_id: str = Field(..., description="Unique shelter identifier")
    name: str = Field(..., description="Name of evacuation shelter facility")
    location_node: str = Field(..., description="Graph node ID where shelter is situated")
    capacity: int = Field(..., ge=0, description="Total maximum capacity of shelter")
    current_occupancy: int = Field(default=0, ge=0, description="Current number of evacuees sheltered")
    status: str = Field(default="OPERATIONAL", description="Status: 'OPERATIONAL', 'FULL', or 'CLOSED'")


class ShelterListResponse(BaseModel):
    total_count: int = Field(..., ge=0)
    shelters: List[ShelterResponse]
