"""
NetworkX Road Graph Management Module for Disaster Evacuation Route Optimizer.
Manages network topology, node intersections, road attributes, status updates,
and traversable subgraph generation.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx

from backend.app.ml.risk_service import calculate_routing_cost

logger = logging.getLogger(__name__)


class EvacuationRoadGraph:
    """
    Evacuation Road Graph wrapping NetworkX Graph.
    Nodes represent intersections/locations. Edges represent road segments.
    """

    def __init__(self, name: str = "Evacuation Network"):
        self.name = name
        self._graph = nx.Graph(name=name)
        self._road_id_lookup: Dict[str, Tuple[str, str]] = {}

    @property
    def graph(self) -> nx.Graph:
        """Access underlying raw NetworkX Graph."""
        return self._graph

    @property
    def nodes(self) -> List[str]:
        """Get list of node IDs in the graph."""
        return list(self._graph.nodes())

    @property
    def number_of_nodes(self) -> int:
        """Get total node count."""
        return self._graph.number_of_nodes()

    @property
    def number_of_roads(self) -> int:
        """Get total road edge count."""
        return self._graph.number_of_edges()

    def add_node(self, node_id: str, **attributes) -> None:
        """Add an intersection/location node to the graph."""
        if not node_id:
            raise ValueError("node_id cannot be empty.")
        self._graph.add_node(str(node_id), **attributes)
        logger.debug(f"Added node: {node_id}")

    def add_road(
        self,
        u: str,
        v: str,
        road_id: str,
        distance: float,
        status: str = "OPEN",
        blockage_probability: float = 0.0,
        risk_weight: float = 10.0,
        **extra_attrs,
    ) -> None:
        """
        Add a road segment edge between nodes u and v.
        """
        u_str, v_str = str(u), str(v)

        if not self._graph.has_node(u_str):
            self.add_node(u_str)
        if not self._graph.has_node(v_str):
            self.add_node(v_str)

        status_clean = str(status).upper()
        routing_cost = calculate_routing_cost(
            distance=distance,
            blockage_probability=blockage_probability,
            risk_weight=risk_weight,
            status=status_clean,
        )

        edge_attrs = {
            "road_id": str(road_id),
            "distance": float(distance),
            "status": status_clean,
            "blockage_probability": float(blockage_probability),
            "risk_score": float(blockage_probability),
            "routing_cost": routing_cost,
            **extra_attrs,
        }

        self._graph.add_edge(u_str, v_str, **edge_attrs)
        self._road_id_lookup[str(road_id)] = (u_str, v_str)
        logger.debug(f"Added road {road_id} between {u_str} and {v_str} (status={status_clean}, cost={routing_cost})")

    def update_road_status(
        self, road_id: str, new_status: str, risk_weight: float = 10.0
    ) -> None:
        """
        Update the operational status of a road (e.g. from OPEN to BLOCKED).
        Recalculates routing_cost.
        """
        road_id_str = str(road_id)
        if road_id_str not in self._road_id_lookup:
            raise KeyError(f"Road ID '{road_id_str}' not found in road graph.")

        u, v = self._road_id_lookup[road_id_str]
        edge_data = self._graph[u][v]
        new_status_clean = str(new_status).upper()
        if new_status_clean == "BLOCKED":
            import traceback
            print(f"[DEBUG GRAPH] update_road_status called for '{road_id_str}' to BLOCKED from:")
            traceback.print_stack(limit=4)

        edge_data["status"] = new_status_clean
        edge_data["routing_cost"] = calculate_routing_cost(
            distance=edge_data["distance"],
            blockage_probability=edge_data["blockage_probability"],
            risk_weight=risk_weight,
            status=new_status_clean,
        )
        logger.info(
            f"Updated road {road_id_str} status to {new_status_clean}. New cost: {edge_data['routing_cost']}"
        )

    def get_traversable_graph(self) -> nx.Graph:
        """
        Generate a subgraph containing ALL nodes, but ONLY edges that are OPEN and traversable.
        Confirmed BLOCKED roads are EXCLUDED from this graph.
        """
        traversable_edges = [
            (u, v, d)
            for u, v, d in self._graph.edges(data=True)
            if d.get("status", "OPEN").upper() == "OPEN" and not math.isinf(d.get("routing_cost", float("inf")))
        ]

        traversable_g = nx.Graph(name=f"{self.name} (Traversable View)")
        traversable_g.add_nodes_from(self._graph.nodes(data=True))

        for u, v, d in traversable_edges:
            traversable_g.add_edge(u, v, **d)

        logger.debug(
            f"Extracted traversable graph: {traversable_g.number_of_nodes()} nodes, "
            f"{traversable_g.number_of_edges()} open edges (excluded {self.number_of_roads - traversable_g.number_of_edges()} blocked roads)."
        )
        return traversable_g

    def get_road_by_id(self, road_id: str) -> Dict[str, Any]:
        """Retrieve road edge attributes by road_id."""
        road_id_str = str(road_id)
        if road_id_str not in self._road_id_lookup:
            raise KeyError(f"Road ID '{road_id_str}' not found.")

        u, v = self._road_id_lookup[road_id_str]
        edge_data = self._graph[u][v].copy()
        edge_data["u"] = u
        edge_data["v"] = v
        return edge_data

    def get_edge_data(self, u: str, v: str) -> Dict[str, Any]:
        """Retrieve edge attributes between node u and node v."""
        u_str, v_str = str(u), str(v)
        if not self._graph.has_edge(u_str, v_str):
            raise KeyError(f"No edge exists between '{u_str}' and '{v_str}'.")
        return self._graph[u_str][v_str]
