"""
Road Network Management API Router.
Handles querying road details and marking roads as confirmed BLOCKED.
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.schemas.roads import RoadResponse, RoadListResponse, BlockRoadResponse
from backend.app.routing.graph import EvacuationRoadGraph
from backend.app.api.deps import get_road_graph

router = APIRouter(prefix="/roads", tags=["Roads"])


@router.get("", response_model=RoadListResponse)
def list_all_roads(graph: EvacuationRoadGraph = Depends(get_road_graph)):
    """
    Retrieve all road segments in the evacuation network graph.
    """
    roads_list = []
    for u, v, d in graph.graph.edges(data=True):
        roads_list.append(
            RoadResponse(
                road_id=d["road_id"],
                u=u,
                v=v,
                distance=d["distance"],
                status=d["status"],
                blockage_probability=d["blockage_probability"],
                risk_score=d.get("risk_score", d["blockage_probability"]),
                routing_cost=d["routing_cost"],
            )
        )
    return RoadListResponse(total_count=len(roads_list), roads=roads_list)


@router.get("/{road_id}", response_model=RoadResponse)
def get_road_by_id(
    road_id: str,
    graph: EvacuationRoadGraph = Depends(get_road_graph),
):
    """
    Retrieve details for a specific road segment by road_id.
    """
    try:
        d = graph.get_road_by_id(road_id)
        return RoadResponse(
            road_id=d["road_id"],
            u=d["u"],
            v=d["v"],
            distance=d["distance"],
            status=d["status"],
            blockage_probability=d["blockage_probability"],
            risk_score=d.get("risk_score", d["blockage_probability"]),
            routing_cost=d["routing_cost"],
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road with ID '{road_id}' not found in evacuation network.",
        )


@router.post("/{road_id}/block", response_model=BlockRoadResponse)
def block_road_segment(
    road_id: str,
    graph: EvacuationRoadGraph = Depends(get_road_graph),
):
    """
    Mark a road segment as confirmed BLOCKED.
    Updates road status, sets routing_cost to infinity, and excludes it from future routing.
    """
    try:
        # 1. Validate road exists
        _ = graph.get_road_by_id(road_id)

        # 2. Update status in graph
        graph.update_road_status(road_id=road_id, new_status="BLOCKED")

        # 3. Retrieve updated road data
        updated_d = graph.get_road_by_id(road_id)
        road_resp = RoadResponse(
            road_id=updated_d["road_id"],
            u=updated_d["u"],
            v=updated_d["v"],
            distance=updated_d["distance"],
            status=updated_d["status"],
            blockage_probability=updated_d["blockage_probability"],
            risk_score=updated_d.get("risk_score", updated_d["blockage_probability"]),
            routing_cost=updated_d["routing_cost"],
        )

        return BlockRoadResponse(
            message=f"Road segment '{road_id}' has been confirmed BLOCKED and excluded from routing graph.",
            road=road_resp,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road with ID '{road_id}' not found in evacuation network.",
        )
