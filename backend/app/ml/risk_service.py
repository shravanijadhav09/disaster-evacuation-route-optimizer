"""
Road Risk Service for Disaster Evacuation Route Optimizer.
Integrates ML blockage probability into routing risk metrics and cost calculations.
Handles confirmed road closures by assigning infinite routing costs (float('inf')).
"""

import math
import logging
from typing import Dict, Any, Union, List, Optional
import pandas as pd

logger = logging.getLogger(__name__)

DEFAULT_RISK_WEIGHT = 10.0


def calculate_routing_cost(
    distance: float,
    blockage_probability: float,
    risk_weight: float = DEFAULT_RISK_WEIGHT,
    status: str = "OPEN",
    is_confirmed_blocked: bool = False,
) -> float:
    """
    Calculate the routing cost for a road segment based on physical distance,
    ML predicted blockage probability, risk weight penalty, and confirmed status.

    Formula for Open Roads:
        routing_cost = distance + (blockage_probability * risk_weight)

    Confirmed Blocked Roads:
        routing_cost = float('inf')

    Args:
        distance: Physical length of road segment (must be >= 0).
        blockage_probability: Predicted probability of blockage P(blocked=1) in [0.0, 1.0].
        risk_weight: Penalty factor multiplying risk score (configurable, default 10.0).
        status: Road operational status ('OPEN', 'BLOCKED', etc.).
        is_confirmed_blocked: Explicit boolean flag for reported closures.

    Returns:
        float: Computed routing cost (float('inf') if confirmed blocked).
    """
    if distance < 0:
        raise ValueError(f"Invalid distance: {distance}. Distance cannot be negative.")

    if not (0.0 <= blockage_probability <= 1.0):
        raise ValueError(
            f"Invalid blockage_probability: {blockage_probability}. Must be in range [0.0, 1.0]."
        )

    # Check for confirmed blockage (either via status string or boolean flag)
    if is_confirmed_blocked or (isinstance(status, str) and status.upper() == "BLOCKED"):
        logger.debug("Road segment is confirmed BLOCKED. Assigning infinite routing cost.")
        return math.inf

    # Calculate risk-weighted cost for open roads
    cost = distance + (blockage_probability * risk_weight)
    return float(cost)


class RoadRiskService:
    """
    Service class for calculating risk metrics and routing costs across road network segments.
    """

    def __init__(self, default_risk_weight: float = DEFAULT_RISK_WEIGHT, ml_inference_service=None):
        self.default_risk_weight = default_risk_weight
        self.ml_inference_service = ml_inference_service

    def compute_segment_risk(
        self,
        road_data: Dict[str, Any],
        risk_weight: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Assess a single road segment dictionary and return enriched risk data.

        Expected fields in road_data:
        - road_id (optional)
        - distance (required)
        - status (optional, default 'OPEN')
        - blockage_probability (optional if ML service is attached, required otherwise)
        """
        weight = risk_weight if risk_weight is not None else self.default_risk_weight
        road_id = road_data.get("road_id", "UNKNOWN_ROAD")
        distance = float(road_data.get("distance", 0.0))
        status = str(road_data.get("status", "OPEN")).upper()
        is_confirmed = bool(road_data.get("is_confirmed_blocked", status == "BLOCKED"))

        # Obtain blockage probability
        if "blockage_probability" in road_data:
            blockage_prob = float(road_data["blockage_probability"])
        elif self.ml_inference_service is not None:
            # Predict using attached ML service
            prediction_res = self.ml_inference_service.predict_road_blockage(road_data)
            blockage_prob = float(prediction_res["blockage_probability"].iloc[0])
        else:
            raise ValueError(
                f"Missing blockage_probability for road_id '{road_id}' and no ML service provided."
            )

        routing_cost = calculate_routing_cost(
            distance=distance,
            blockage_probability=blockage_prob,
            risk_weight=weight,
            status=status,
            is_confirmed_blocked=is_confirmed,
        )

        return {
            "road_id": road_id,
            "distance": distance,
            "status": status,
            "blockage_probability": round(blockage_prob, 4),
            "risk_score": round(blockage_prob, 4),
            "risk_weight": weight,
            "routing_cost": routing_cost,
            "is_passable": not math.isinf(routing_cost),
        }

    def compute_batch_risk(
        self,
        roads_list: List[Dict[str, Any]],
        risk_weight: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Compute risk and routing cost for a list of road segments.
        If ML inference service is provided and blockage_probability is missing in input,
        runs batch ML prediction first.
        """
        weight = risk_weight if risk_weight is not None else self.default_risk_weight

        # Check if batch ML prediction is required
        needs_ml = any("blockage_probability" not in r for r in roads_list)
        if needs_ml and self.ml_inference_service is not None:
            # Filter and run prediction
            df_input = pd.DataFrame(roads_list)
            predictions_df = self.ml_inference_service.predict_road_blockage(df_input)
            probs = predictions_df["blockage_probability"].values
            for i, r in enumerate(roads_list):
                if "blockage_probability" not in r:
                    r["blockage_probability"] = float(probs[i])

        results = []
        for r in roads_list:
            results.append(self.compute_segment_risk(r, risk_weight=weight))

        return results
