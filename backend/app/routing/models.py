"""
Domain Models and Custom Exceptions for Disaster Evacuation Routing Engine.
Uses Python dataclasses for zero-dependency portability.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


# Custom Exceptions
class RoutingError(Exception):
    """Base exception for all routing engine errors."""
    pass


class NodeNotFoundError(RoutingError):
    """Raised when a requested start or destination node is missing from the graph."""
    pass


class InvalidRouteRequestError(RoutingError):
    """Raised when a route request is invalid (e.g., start node equals destination node)."""
    pass


class NoRouteFoundError(RoutingError):
    """Raised when no traversable route exists between start and destination."""
    pass


# Domain Models
@dataclass
class RoadSegment:
    """Data model representing an individual road segment (edge)."""
    road_id: str
    u: str
    v: str
    distance: float
    status: str = "OPEN"
    blockage_probability: float = 0.0
    risk_score: float = 0.0
    routing_cost: float = 0.0


@dataclass
class RouteResult:
    """Data model representing the optimal evacuation path result."""
    start_node: str
    destination_node: str
    nodes: List[str] = field(default_factory=list)
    road_ids: List[str] = field(default_factory=list)
    total_distance: float = 0.0
    total_risk: float = 0.0
    total_cost: float = 0.0
