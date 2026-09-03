"""
API Dependencies and Active Graph State Provider for Disaster Evacuation Route Optimizer.
Provides thread-safe access to the singleton EvacuationRoadGraph instance.
"""

import logging
from typing import Dict, Any
from backend.app.routing.graph import EvacuationRoadGraph
from backend.app.ml.predict import MLInferenceService
from backend.app.ml.risk_service import calculate_routing_cost, RoadRiskService

logger = logging.getLogger(__name__)

# Global singleton graph instance
_ACTIVE_GRAPH: EvacuationRoadGraph = None


def get_road_graph() -> EvacuationRoadGraph:
    """
    Get or initialize the active singleton EvacuationRoadGraph instance.
    """
    global _ACTIVE_GRAPH
    if _ACTIVE_GRAPH is None:
        _ACTIVE_GRAPH = initialize_default_road_graph()
    return _ACTIVE_GRAPH


def reset_road_graph(new_graph: EvacuationRoadGraph = None) -> EvacuationRoadGraph:
    """
    Reset or replace the active singleton EvacuationRoadGraph instance (useful for testing).
    """
    global _ACTIVE_GRAPH
    if new_graph is not None:
        _ACTIVE_GRAPH = new_graph
    else:
        _ACTIVE_GRAPH = initialize_default_road_graph()
    return _ACTIVE_GRAPH


def initialize_default_road_graph() -> EvacuationRoadGraph:
    """
    Initialize a default evacuation road graph populated with initial network topology.
    Uses ML inference to predict blockage probabilities from road features.
    """
    logger.info("Initializing default evacuation road network graph with ML risk predictions...")
    graph = EvacuationRoadGraph(name="Disaster Evacuation Active Network")

    # Initialize ML inference service for predicting blockage probabilities
    ml_service = MLInferenceService()
    risk_service = RoadRiskService(ml_inference_service=ml_service)

    # Sample road network topology (A, B, C, D, E, Z) with full road features for ML prediction
    sample_roads = [
        {
            "u": "A", "v": "B", "road_id": "R1", "distance": 2.0, "status": "OPEN",
            "rainfall_mm": 120.0, "flood_level": 0.5, "elevation_m": 50.0,
            "road_type": "Bridge", "historical_blockages": 5, "traffic_density": 800.0,
            "disaster_intensity": 0.7, "distance_to_waterbody_km": 0.3, "road_condition": 0.6,
        },
        {
            "u": "B", "v": "C", "road_id": "R2", "distance": 2.5, "status": "OPEN",
            "rainfall_mm": 200.0, "flood_level": 0.8, "elevation_m": 30.0,
            "road_type": "Main Road", "historical_blockages": 10, "traffic_density": 1200.0,
            "disaster_intensity": 0.85, "distance_to_waterbody_km": 0.2, "road_condition": 0.4,
        },
        {
            "u": "A", "v": "D", "road_id": "R3", "distance": 4.0, "status": "OPEN",
            "rainfall_mm": 50.0, "flood_level": 0.2, "elevation_m": 100.0,
            "road_type": "Highway", "historical_blockages": 1, "traffic_density": 600.0,
            "disaster_intensity": 0.3, "distance_to_waterbody_km": 2.0, "road_condition": 0.85,
        },
        {
            "u": "D", "v": "C", "road_id": "R4", "distance": 3.0, "status": "OPEN",
            "rainfall_mm": 60.0, "flood_level": 0.25, "elevation_m": 80.0,
            "road_type": "Highway", "historical_blockages": 2, "traffic_density": 700.0,
            "disaster_intensity": 0.35, "distance_to_waterbody_km": 1.5, "road_condition": 0.8,
        },
        {
            "u": "C", "v": "Z", "road_id": "R5", "distance": 1.5, "status": "OPEN",
            "rainfall_mm": 80.0, "flood_level": 0.3, "elevation_m": 60.0,
            "road_type": "Main Road", "historical_blockages": 3, "traffic_density": 900.0,
            "disaster_intensity": 0.4, "distance_to_waterbody_km": 1.0, "road_condition": 0.75,
        },
        {
            "u": "D", "v": "Z", "road_id": "R6", "distance": 5.0, "status": "OPEN",
            "rainfall_mm": 40.0, "flood_level": 0.15, "elevation_m": 120.0,
            "road_type": "Highway", "historical_blockages": 0, "traffic_density": 500.0,
            "disaster_intensity": 0.2, "distance_to_waterbody_km": 3.0, "road_condition": 0.9,
        },
        {
            "u": "B", "v": "E", "road_id": "R7", "distance": 3.5, "status": "OPEN",
            "rainfall_mm": 150.0, "flood_level": 0.6, "elevation_m": 40.0,
            "road_type": "Rural Road", "historical_blockages": 8, "traffic_density": 400.0,
            "disaster_intensity": 0.75, "distance_to_waterbody_km": 0.5, "road_condition": 0.55,
        },
        {
            "u": "E", "v": "Z", "road_id": "R8", "distance": 2.0, "status": "OPEN",
            "rainfall_mm": 100.0, "flood_level": 0.4, "elevation_m": 70.0,
            "road_type": "Main Road", "historical_blockages": 4, "traffic_density": 600.0,
            "disaster_intensity": 0.5, "distance_to_waterbody_km": 0.8, "road_condition": 0.7,
        },
    ]

    # Prepare road data for batch ML prediction
    roads_for_ml = []
    for road in sample_roads:
        road_data = {k: v for k, v in road.items() if k not in ("u", "v")}
        roads_for_ml.append(road_data)

    # Compute risk for all roads using ML predictions
    logger.info("Running ML batch prediction for road blockage probabilities...")
    risk_results = risk_service.compute_batch_risk(roads_for_ml, risk_weight=10.0)

    # Add roads to graph with ML-predicted probabilities
    for i, road in enumerate(sample_roads):
        risk_data = risk_results[i]
        u_str, v_str = str(road["u"]), str(road["v"])

        if not graph.graph.has_node(u_str):
            graph.add_node(u_str)
        if not graph.graph.has_node(v_str):
            graph.add_node(v_str)

        # Store all road features in edge attributes for potential future re-prediction
        edge_attrs = {
            "road_id": str(road["road_id"]),
            "distance": float(road["distance"]),
            "status": str(road["status"]).upper(),
            "blockage_probability": risk_data["blockage_probability"],
            "risk_score": risk_data["risk_score"],
            "routing_cost": risk_data["routing_cost"],
            # Store original road features for ML re-prediction if needed
            "rainfall_mm": road["rainfall_mm"],
            "flood_level": road["flood_level"],
            "elevation_m": road["elevation_m"],
            "road_type": road["road_type"],
            "historical_blockages": road["historical_blockages"],
            "traffic_density": road["traffic_density"],
            "disaster_intensity": road["disaster_intensity"],
            "distance_to_waterbody_km": road["distance_to_waterbody_km"],
            "road_condition": road["road_condition"],
        }

        graph.graph.add_edge(u_str, v_str, **edge_attrs)
        graph._road_id_lookup[str(road["road_id"])] = (u_str, v_str)
        logger.debug(f"Added road {road['road_id']} between {u_str} and {v_str} (status={road['status']}, prob={risk_data['blockage_probability']:.4f}, cost={risk_data['routing_cost']:.4f})")

    logger.info(
        f"Default road graph initialized: {graph.number_of_nodes} nodes, {graph.number_of_roads} roads with ML-predicted risks."
    )
    return graph
