"""
Evacuation Shelters API Router.
"""

from typing import List
from fastapi import APIRouter
from backend.app.schemas.shelters import ShelterResponse, ShelterListResponse

router = APIRouter(prefix="/shelters", tags=["Shelters"])

# Sample evacuation shelters data
DEFAULT_SHELTERS = [
    ShelterResponse(
        shelter_id="SHELTER_Z",
        name="Central Disaster Evacuation Complex Z",
        location_node="Z",
        capacity=5000,
        current_occupancy=1200,
        status="OPERATIONAL",
    ),
    ShelterResponse(
        shelter_id="SHELTER_C",
        name="North District Community Relief Center C",
        location_node="C",
        capacity=2500,
        current_occupancy=800,
        status="OPERATIONAL",
    ),
    ShelterResponse(
        shelter_id="SHELTER_E",
        name="Eastside Emergency Stadium E",
        location_node="E",
        capacity=4000,
        current_occupancy=4000,
        status="FULL",
    ),
]


@router.get("", response_model=ShelterListResponse)
def list_shelters():
    """
    Retrieve all registered evacuation shelters.
    """
    return ShelterListResponse(
        total_count=len(DEFAULT_SHELTERS),
        shelters=DEFAULT_SHELTERS,
    )
