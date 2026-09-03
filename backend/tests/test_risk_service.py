"""
Unit tests for Road Risk and Routing Cost Calculation Service.
Run command: python -m unittest backend/tests/test_risk_service.py
"""

import math
import unittest

from backend.app.ml.risk_service import (
    calculate_routing_cost,
    RoadRiskService,
)


class TestRiskService(unittest.TestCase):
    def test_risk_calculation_example(self):
        """
        Test Requirement 3:
        distance = 2.0, risk = 0.1, risk_weight = 10 -> expected cost = 3.0
        """
        distance = 2.0
        blockage_prob = 0.1
        risk_weight = 10.0

        cost = calculate_routing_cost(
            distance=distance,
            blockage_probability=blockage_prob,
            risk_weight=risk_weight,
        )

        # Expected: 2.0 + (0.1 * 10.0) = 3.0
        self.assertAlmostEqual(cost, 3.0, places=4)

    def test_risk_weight_scaling_behavior(self):
        """
        Test Requirement 4:
        Verify that increasing risk_weight increases the penalty associated with high-risk roads.
        """
        distance = 3.0
        high_risk_prob = 0.70

        cost_low_weight = calculate_routing_cost(
            distance=distance,
            blockage_probability=high_risk_prob,
            risk_weight=5.0,
        )
        # Cost: 3.0 + (0.7 * 5) = 6.5

        cost_high_weight = calculate_routing_cost(
            distance=distance,
            blockage_probability=high_risk_prob,
            risk_weight=20.0,
        )
        # Cost: 3.0 + (0.7 * 20) = 17.0

        self.assertAlmostEqual(cost_low_weight, 6.5, places=4)
        self.assertAlmostEqual(cost_high_weight, 17.0, places=4)
        self.assertGreater(cost_high_weight, cost_low_weight)

    def test_confirmed_blocked_road(self):
        """
        Test Requirement 5:
        Verify status = BLOCKED results in infinite routing cost (float('inf')).
        """
        # Test string status = 'BLOCKED'
        cost_status_blocked = calculate_routing_cost(
            distance=1.5,
            blockage_probability=0.2,
            risk_weight=10.0,
            status="BLOCKED",
        )
        self.assertTrue(math.isinf(cost_status_blocked))
        self.assertEqual(cost_status_blocked, float("inf"))

        # Test explicit boolean flag is_confirmed_blocked = True
        cost_flag_blocked = calculate_routing_cost(
            distance=1.5,
            blockage_probability=0.2,
            risk_weight=10.0,
            status="OPEN",
            is_confirmed_blocked=True,
        )
        self.assertTrue(math.isinf(cost_flag_blocked))
        self.assertEqual(cost_flag_blocked, float("inf"))

    def test_safer_vs_shorter_scenario(self):
        """
        Test Requirement 6:
        Road A: distance = 2 km, blockage_probability = 0.90
        Road B: distance = 4 km, blockage_probability = 0.10
        Verify that safer Road B receives a lower routing cost than shorter high-risk Road A.
        """
        risk_weight = 10.0

        # Road A (Shorter, High Risk): 2.0 + (0.90 * 10.0) = 11.0
        cost_road_a = calculate_routing_cost(
            distance=2.0,
            blockage_probability=0.90,
            risk_weight=risk_weight,
        )

        # Road B (Longer, Low Risk): 4.0 + (0.10 * 10.0) = 5.0
        cost_road_b = calculate_routing_cost(
            distance=4.0,
            blockage_probability=0.10,
            risk_weight=risk_weight,
        )

        self.assertAlmostEqual(cost_road_a, 11.0, places=4)
        self.assertAlmostEqual(cost_road_b, 5.0, places=4)
        self.assertLess(
            cost_road_b,
            cost_road_a,
            "Safer Road B must have a lower routing cost than high-risk Road A!",
        )

    def test_road_risk_service_compute(self):
        """Test RoadRiskService dictionary assessment wrapper."""
        service = RoadRiskService(default_risk_weight=10.0)

        road_segment = {
            "road_id": "R_ALPHA",
            "distance": 2.0,
            "blockage_probability": 0.1,
            "status": "OPEN",
        }

        assessed = service.compute_segment_risk(road_segment)
        self.assertEqual(assessed["road_id"], "R_ALPHA")
        self.assertEqual(assessed["routing_cost"], 3.0)
        self.assertTrue(assessed["is_passable"])

        # Test blocked segment in service wrapper
        blocked_segment = {
            "road_id": "R_BETA",
            "distance": 1.0,
            "blockage_probability": 0.2,
            "status": "BLOCKED",
        }
        assessed_blocked = service.compute_segment_risk(blocked_segment)
        self.assertTrue(math.isinf(assessed_blocked["routing_cost"]))
        self.assertFalse(assessed_blocked["is_passable"])

    def test_invalid_input_validation(self):
        """Verify negative distance or invalid probability raises ValueError."""
        with self.assertRaises(ValueError):
            calculate_routing_cost(distance=-1.0, blockage_probability=0.5)

        with self.assertRaises(ValueError):
            calculate_routing_cost(distance=2.0, blockage_probability=1.5)


if __name__ == "__main__":
    unittest.main()
