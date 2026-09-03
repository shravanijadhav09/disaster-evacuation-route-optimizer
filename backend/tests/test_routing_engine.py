"""
Comprehensive Unit Test Suite for NetworkX Evacuation Routing Engine.
Covers all 17 required test scenarios for Step 5.
Run command: python -m unittest backend/tests/test_routing_engine.py
"""

import math
import unittest
import networkx as nx

from backend.app.routing.models import (
    RoadSegment,
    RouteResult,
    RoutingError,
    NodeNotFoundError,
    InvalidRouteRequestError,
    NoRouteFoundError,
)
from backend.app.routing.graph import EvacuationRoadGraph
from backend.app.routing.router import EvacuationRouter, find_safest_route


class TestRoutingEngine(unittest.TestCase):
    def setUp(self):
        """Set up fresh EvacuationRoadGraph before each test."""
        self.road_graph = EvacuationRoadGraph(name="Test Network")

    # 1. Graph creation
    def test_01_graph_creation(self):
        self.assertIsNotNone(self.road_graph)
        self.assertEqual(self.road_graph.number_of_nodes, 0)
        self.assertEqual(self.road_graph.number_of_roads, 0)
        self.assertEqual(self.road_graph.name, "Test Network")

    # 2. Adding nodes
    def test_02_adding_nodes(self):
        self.road_graph.add_node("A", label="Intersection A", zone="East")
        self.road_graph.add_node("B", label="Intersection B", zone="West")

        self.assertIn("A", self.road_graph.nodes)
        self.assertIn("B", self.road_graph.nodes)
        self.assertEqual(self.road_graph.number_of_nodes, 2)
        self.assertEqual(self.road_graph.graph.nodes["A"]["label"], "Intersection A")

    # 3. Adding roads
    def test_03_adding_roads(self):
        self.road_graph.add_road(
            u="A", v="B", road_id="R101", distance=2.5, status="OPEN", blockage_probability=0.15
        )
        self.assertEqual(self.road_graph.number_of_roads, 1)
        self.assertTrue(self.road_graph.graph.has_edge("A", "B"))

    # 4. Road attributes
    def test_04_road_attributes(self):
        self.road_graph.add_road(
            u="A", v="B", road_id="R101", distance=2.5, status="OPEN", blockage_probability=0.15, risk_weight=10.0
        )
        edge_data = self.road_graph.get_road_by_id("R101")

        self.assertEqual(edge_data["road_id"], "R101")
        self.assertEqual(edge_data["distance"], 2.5)
        self.assertEqual(edge_data["status"], "OPEN")
        self.assertEqual(edge_data["blockage_probability"], 0.15)
        self.assertEqual(edge_data["risk_score"], 0.15)
        # Expected routing cost = 2.5 + (0.15 * 10.0) = 4.0
        self.assertAlmostEqual(edge_data["routing_cost"], 4.0, places=4)

    # 5. Dijkstra basic routing
    def test_05_dijkstra_basic_routing(self):
        # Linear network: A -> B -> C
        self.road_graph.add_road("A", "B", "R1", distance=2.0, blockage_probability=0.1)
        self.road_graph.add_road("B", "C", "R2", distance=3.0, blockage_probability=0.2)

        result = find_safest_route("A", "C", self.road_graph, risk_weight=10.0)
        self.assertEqual(result.nodes, ["A", "B", "C"])
        self.assertEqual(result.road_ids, ["R1", "R2"])
        self.assertEqual(result.total_distance, 5.0)

    # 6. Shortest route when risk is equal
    def test_06_shortest_route_when_risk_equal(self):
        """
        PART G Requirement:
        Route A: distance = 2 km, risk = 0.0 -> cost = 2.0
        Route B: distance = 5 km, risk = 0.0 -> cost = 5.0
        Expected: Route A selected.
        """
        # Route A: A -> B (2 km)
        self.road_graph.add_road("A", "B", "R_SHORTER", distance=2.0, blockage_probability=0.0)
        # Route B: A -> C -> B (5 km total)
        self.road_graph.add_road("A", "C", "R_LONGER_1", distance=2.5, blockage_probability=0.0)
        self.road_graph.add_road("C", "B", "R_LONGER_2", distance=2.5, blockage_probability=0.0)

        result = find_safest_route("A", "B", self.road_graph, risk_weight=10.0)

        self.assertEqual(result.nodes, ["A", "B"])
        self.assertEqual(result.road_ids, ["R_SHORTER"])
        self.assertEqual(result.total_distance, 2.0)
        self.assertEqual(result.total_cost, 2.0)

    # 7. Safer longer route selection
    def test_07_safer_longer_route_selection(self):
        """
        PART F Requirement:
        Route A: distance = 2 km, blockage_probability = 0.90 -> cost = 2 + (0.90 * 10) = 11
        Route B: distance = 4 km, blockage_probability = 0.10 -> cost = 4 + (0.10 * 10) = 5
        Expected: Route B selected.
        """
        # Route A: Node 1 -> Node 2 (2 km, high risk 0.90)
        self.road_graph.add_road("N1", "N2", "R_ROUTE_A", distance=2.0, blockage_probability=0.90)

        # Route B: Node 1 -> Node 3 -> Node 2 (4 km total, low risk 0.10)
        self.road_graph.add_road("N1", "N3", "R_ROUTE_B1", distance=2.0, blockage_probability=0.05)
        self.road_graph.add_road("N3", "N2", "R_ROUTE_B2", distance=2.0, blockage_probability=0.05)

        result = find_safest_route("N1", "N2", self.road_graph, risk_weight=10.0)

        # Route B must be selected because cost (5.0) < cost Route A (11.0)
        self.assertEqual(result.nodes, ["N1", "N3", "N2"])
        self.assertEqual(result.road_ids, ["R_ROUTE_B1", "R_ROUTE_B2"])
        self.assertEqual(result.total_distance, 4.0)
        self.assertEqual(result.total_risk, 0.10)
        self.assertEqual(result.total_cost, 5.0)

    # 8. Confirmed blocked road exclusion
    def test_08_confirmed_blocked_road_exclusion(self):
        """
        PART D Requirement:
        Confirmed BLOCKED roads must be excluded from traversable graph and never returned.
        """
        self.road_graph.add_road("A", "B", "R_BLOCKED", distance=1.0, status="BLOCKED")

        traversable_g = self.road_graph.get_traversable_graph()
        self.assertFalse(traversable_g.has_edge("A", "B"))

        with self.assertRaises(NoRouteFoundError):
            find_safest_route("A", "B", self.road_graph)

    # 9. Alternative route after shortest route is blocked
    def test_09_alternative_route_after_shortest_route_blocked(self):
        """
        PART H Requirement:
        Shortest route A -> B -> C has B -> C marked BLOCKED.
        Engine must select alternative open route A -> D -> C.
        """
        # Shortest direct route: A -> B -> C
        self.road_graph.add_road("A", "B", "R_AB", distance=1.0, status="OPEN")
        self.road_graph.add_road("B", "C", "R_BC_BLOCKED", distance=1.0, status="BLOCKED")

        # Alternative route: A -> D -> C
        self.road_graph.add_road("A", "D", "R_AD", distance=3.0, status="OPEN")
        self.road_graph.add_road("D", "C", "R_DC", distance=3.0, status="OPEN")

        result = find_safest_route("A", "C", self.road_graph)

        self.assertEqual(result.nodes, ["A", "D", "C"])
        self.assertEqual(result.road_ids, ["R_AD", "R_DC"])
        self.assertNotIn("R_BC_BLOCKED", result.road_ids)
        self.assertEqual(result.total_distance, 6.0)

    # 10. No available route
    def test_10_no_available_route(self):
        """
        PART I Requirement:
        If start and destination are disconnected, raise NoRouteFoundError.
        """
        self.road_graph.add_node("ISOLATED_START")
        self.road_graph.add_node("ISOLATED_DEST")

        with self.assertRaises(NoRouteFoundError):
            find_safest_route("ISOLATED_START", "ISOLATED_DEST", self.road_graph)

    # 11. Invalid start node
    def test_11_invalid_start_node(self):
        self.road_graph.add_node("VALID_DEST")

        with self.assertRaises(NodeNotFoundError) as cm:
            find_safest_route("NON_EXISTENT_START", "VALID_DEST", self.road_graph)
        self.assertIn("NON_EXISTENT_START", str(cm.exception))

    # 12. Invalid destination node
    def test_12_invalid_destination_node(self):
        self.road_graph.add_node("VALID_START")

        with self.assertRaises(NodeNotFoundError) as cm:
            find_safest_route("VALID_START", "NON_EXISTENT_DEST", self.road_graph)
        self.assertIn("NON_EXISTENT_DEST", str(cm.exception))

    # 13. Start equals destination
    def test_13_start_equals_destination(self):
        self.road_graph.add_node("SAME_NODE")

        with self.assertRaises(InvalidRouteRequestError) as cm:
            find_safest_route("SAME_NODE", "SAME_NODE", self.road_graph)
        self.assertIn("cannot equal", str(cm.exception))

    # 14. Route result structure
    def test_14_route_result_structure(self):
        self.road_graph.add_road("A", "B", "R1", distance=2.0, blockage_probability=0.1)

        result = find_safest_route("A", "B", self.road_graph)

        self.assertIsInstance(result, RouteResult)
        self.assertEqual(result.start_node, "A")
        self.assertEqual(result.destination_node, "B")
        self.assertIsInstance(result.nodes, list)
        self.assertIsInstance(result.road_ids, list)
        self.assertIsInstance(result.total_distance, float)
        self.assertIsInstance(result.total_risk, float)
        self.assertIsInstance(result.total_cost, float)

    # 15. Correct total distance
    def test_15_correct_total_distance(self):
        self.road_graph.add_road("A", "B", "R1", distance=3.2, blockage_probability=0.1)
        self.road_graph.add_road("B", "C", "R2", distance=4.5, blockage_probability=0.2)

        result = find_safest_route("A", "C", self.road_graph)
        self.assertAlmostEqual(result.total_distance, 7.7, places=4)

    # 16. Correct total routing cost
    def test_16_correct_total_routing_cost(self):
        # R1 cost = 2.0 + (0.10 * 10.0) = 3.0
        self.road_graph.add_road("A", "B", "R1", distance=2.0, blockage_probability=0.10)
        # R2 cost = 4.0 + (0.20 * 10.0) = 6.0
        self.road_graph.add_road("B", "C", "R2", distance=4.0, blockage_probability=0.20)

        result = find_safest_route("A", "C", self.road_graph, risk_weight=10.0)
        self.assertAlmostEqual(result.total_cost, 9.0, places=4)

    # 17. Correct road IDs in returned route
    def test_17_correct_road_ids(self):
        self.road_graph.add_road("A", "B", "R_ALPHA", distance=1.0)
        self.road_graph.add_road("B", "C", "R_BETA", distance=1.0)
        self.road_graph.add_road("C", "D", "R_GAMMA", distance=1.0)

        result = find_safest_route("A", "D", self.road_graph)
        self.assertEqual(result.road_ids, ["R_ALPHA", "R_BETA", "R_GAMMA"])


if __name__ == "__main__":
    unittest.main()
