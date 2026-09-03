"""
Risk-Aware Evacuation Router Module using NetworkX Dijkstra Algorithm.
Computes optimal evacuation routes minimizing overall risk-weighted cost.
Strictly excludes confirmed BLOCKED roads from routing paths.
"""

import logging
import math
from typing import List, Dict, Any, Optional, Callable
import networkx as nx

from backend.app.routing.models import (
    RouteResult,
    NodeNotFoundError,
    InvalidRouteRequestError,
    NoRouteFoundError,
)
from backend.app.routing.graph import EvacuationRoadGraph
from backend.app.ml.risk_service import calculate_routing_cost

logger = logging.getLogger(__name__)


def _create_weight_function(risk_weight: float) -> Callable[[str, str, Dict[str, Any]], float]:
    """
    Create a weight function for NetworkX Dijkstra that computes routing cost dynamically.

    The function computes: distance + (blockage_probability * risk_weight) for OPEN roads.
    Returns infinity for BLOCKED roads (though they should be excluded from traversable graph).
    """
    def weight_func(u: str, v: str, edge_data: Dict[str, Any]) -> float:
        status = edge_data.get("status", "OPEN").upper()
        if status == "BLOCKED":
            return math.inf

        distance = edge_data.get("distance", 0.0)
        blockage_probability = edge_data.get("blockage_probability", edge_data.get("risk_score", 0.0))

        return calculate_routing_cost(
            distance=distance,
            blockage_probability=blockage_probability,
            risk_weight=risk_weight,
            status=status,
        )

    return weight_func


class EvacuationRouter:
    """
    Router class implementing Dijkstra shortest path optimization over EvacuationRoadGraph.
    """

    def __init__(self, risk_weight: float = 10.0):
        self.risk_weight = risk_weight

    def find_safest_route(
        self,
        start_node: str,
        destination_node: str,
        road_graph: EvacuationRoadGraph,
        risk_weight: Optional[float] = None,
    ) -> RouteResult:
        """
        Find the optimal (safest) evacuation route between start_node and destination_node
        using Dijkstra's algorithm weighted by dynamically computed routing_cost.

        Validation Rules:
        1. start_node must exist in road_graph.
        2. destination_node must exist in road_graph.
        3. start_node != destination_node.
        4. A traversable route must exist (confirmed BLOCKED roads excluded).

        Args:
            start_node: Origin intersection node ID.
            destination_node: Destination/evacuation center node ID.
            road_graph: EvacuationRoadGraph instance containing network topology.
            risk_weight: Optional risk penalty weight override.

        Returns:
            RouteResult containing nodes, road_ids, total_distance, total_risk, total_cost.
        """
        start = str(start_node)
        dest = str(destination_node)
        weight = risk_weight if risk_weight is not None else self.risk_weight

        # 1. Validate node existence
        all_nodes = road_graph.nodes
        if start not in all_nodes:
            error_msg = f"Start node '{start}' does not exist in the road graph."
            logger.error(error_msg)
            raise NodeNotFoundError(error_msg)

        if dest not in all_nodes:
            error_msg = f"Destination node '{dest}' does not exist in the road graph."
            logger.error(error_msg)
            raise NodeNotFoundError(error_msg)

        # 2. Validate start != destination
        if start == dest:
            error_msg = f"Start node '{start}' cannot equal destination node '{dest}'."
            logger.error(error_msg)
            raise InvalidRouteRequestError(error_msg)

        # 3. Get traversable graph view (confirmed BLOCKED roads explicitly excluded)
        traversable_g = road_graph.get_traversable_graph()

        # 4. Check if start or dest is isolated in traversable view
        if not traversable_g.has_node(start) or not traversable_g.has_node(dest):
            error_msg = f"No traversable evacuation route exists between '{start}' and '{dest}' (Nodes disconnected due to road closures)."
            logger.error(error_msg)
            raise NoRouteFoundError(error_msg)

        # 5. Execute Dijkstra Shortest Path Search with dynamic weight function
        weight_func = _create_weight_function(weight)
        try:
            path_nodes = nx.shortest_path(
                traversable_g,
                source=start,
                target=dest,
                weight=weight_func,
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound) as e:
            error_msg = f"No traversable evacuation route exists between '{start}' and '{dest}'."
            logger.error(error_msg)
            raise NoRouteFoundError(error_msg) from e

        # 6. Extract Route Metrics and Road IDs along path
        road_ids: List[str] = []
        total_distance: float = 0.0
        total_risk: float = 0.0
        total_cost: float = 0.0

        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i + 1]
            edge_data = traversable_g[u][v]

            road_ids.append(edge_data["road_id"])
            total_distance += edge_data["distance"]
            blockage_prob = edge_data.get("blockage_probability", edge_data.get("risk_score", 0.0))
            total_risk += blockage_prob
            total_cost += calculate_routing_cost(
                distance=edge_data["distance"],
                blockage_probability=blockage_prob,
                risk_weight=weight,
                status=edge_data.get("status", "OPEN"),
            )

        route_result = RouteResult(
            start_node=start,
            destination_node=dest,
            nodes=path_nodes,
            road_ids=road_ids,
            total_distance=round(total_distance, 4),
            total_risk=round(total_risk, 4),
            total_cost=round(total_cost, 4),
        )

        logger.info(
            f"Successfully found safest route from {start} to {dest}: "
            f"Cost={route_result.total_cost}, Dist={route_result.total_distance}km, "
            f"Risk={route_result.total_risk}, Hop Count={len(road_ids)}"
        )
        return route_result


def find_safest_route(
    start_node: str,
    destination_node: str,
    road_graph: EvacuationRoadGraph,
    risk_weight: float = 10.0,
) -> RouteResult:
    """
    Convenience function to compute safest evacuation route.
    """
    router = EvacuationRouter(risk_weight=risk_weight)
    return router.find_safest_route(start_node, destination_node, road_graph, risk_weight=risk_weight)
