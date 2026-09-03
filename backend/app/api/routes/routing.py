"""
Evacuation Routing API Router.
Calculates optimal risk-aware evacuation paths using NetworkX Dijkstra engine.
"""

from fastapi import APIRouter, Depends
from backend.app.schemas.routing import RouteRequest, RouteResponse
from backend.app.routing.graph import EvacuationRoadGraph
from backend.app.routing.router import EvacuationRouter
from backend.app.api.deps import get_road_graph

router = APIRouter(tags=["Routing"])


@router.post("/route", response_model=RouteResponse)
def calculate_evacuation_route(
    request: RouteRequest,
    graph: EvacuationRoadGraph = Depends(get_road_graph),
):
    """
    Calculate the optimal risk-aware evacuation route between start_node and destination_node.
    """
    router_engine = EvacuationRouter(risk_weight=request.risk_weight)

    # Execute Dijkstra routing calculation
    result = router_engine.find_safest_route(
        start_node=request.start_node,
        destination_node=request.destination_node,
        road_graph=graph,
        risk_weight=request.risk_weight,
    )

    return RouteResponse(
        start_node=result.start_node,
        destination_node=result.destination_node,
        nodes=result.nodes,
        road_ids=result.road_ids,
        total_distance=result.total_distance,
        total_risk_score=result.total_risk,
        total_cost=result.total_cost,
    )
