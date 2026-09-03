"""
API Integration and Endpoint Test Suite for Disaster Evacuation Route Optimizer.
Uses FastAPI TestClient to test all REST API endpoints and error mappings.
Run command: python -m unittest backend/tests/test_api_endpoints.py
"""

import unittest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.api.deps import reset_road_graph, initialize_default_road_graph
from backend.app.routing.graph import EvacuationRoadGraph


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        """Reset test client and road graph state before each test."""
        self.client = TestClient(app)
        self.test_graph = initialize_default_road_graph()
        reset_road_graph(self.test_graph)

    # 1. GET /health
    def test_01_get_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("app", data)

    # 2. GET /roads
    def test_02_get_all_roads(self):
        response = self.client.get("/roads")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_count", data)
        self.assertIn("roads", data)
        self.assertGreater(data["total_count"], 0)

    # 3. GET /roads/{road_id}
    def test_03_get_road_by_id(self):
        response = self.client.get("/roads/R1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["road_id"], "R1")
        self.assertEqual(data["u"], "A")
        self.assertEqual(data["v"], "B")

    # 4. Missing road -> 404
    def test_04_get_missing_road_404(self):
        response = self.client.get("/roads/NON_EXISTENT_ROAD_XYZ")
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn("detail", data)

    # 5. POST /route
    def test_05_post_route_success(self):
        payload = {"start_node": "A", "destination_node": "Z", "risk_weight": 10.0}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["start_node"], "A")
        self.assertEqual(data["destination_node"], "Z")
        self.assertIn("nodes", data)
        self.assertIn("road_ids", data)
        self.assertIn("total_distance", data)
        self.assertIn("total_risk_score", data)
        self.assertIn("total_cost", data)

    # 6. Invalid start node -> 404
    def test_06_route_invalid_start_node(self):
        payload = {"start_node": "MISSING_START", "destination_node": "Z"}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    # 7. Invalid destination node -> 404
    def test_07_route_invalid_destination_node(self):
        payload = {"start_node": "A", "destination_node": "MISSING_DEST"}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    # 8. No available route -> 404
    def test_08_no_available_route_404(self):
        # Create disconnected nodes in active graph
        self.test_graph.add_node("ISOLATED_X")
        self.test_graph.add_node("ISOLATED_Y")

        payload = {"start_node": "ISOLATED_X", "destination_node": "ISOLATED_Y"}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    # 9. POST /roads/{road_id}/block
    def test_09_block_road_segment(self):
        response = self.client.post("/roads/R1/block")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("message", data)
        self.assertEqual(data["road"]["road_id"], "R1")
        self.assertEqual(data["road"]["status"], "BLOCKED")

    # 10. Route after blocking a road
    def test_10_route_after_blocking_road(self):
        # Block R1 (A -> B)
        _ = self.client.post("/roads/R1/block")

        # Request route A -> B (must use alternative A -> D -> C -> ... or raise route)
        payload = {"start_node": "A", "destination_node": "C"}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertNotIn("R1", data["road_ids"])

    # 11. Invalid risk_weight -> 422
    def test_11_invalid_risk_weight_422(self):
        payload = {"start_node": "A", "destination_node": "Z", "risk_weight": -5.0}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 422)

    # 12. Successful alternative route
    def test_12_successful_alternative_route(self):
        # Block default direct road R2 (B -> C)
        self.client.post("/roads/R2/block")

        payload = {"start_node": "A", "destination_node": "Z"}
        response = self.client.post("/route", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("R2", data["road_ids"])

    # PART K — IMPORTANT INTEGRATION TEST
    def test_part_k_integration_road_blocking_flow(self):
        """
        PART K Verification:
        1. Setup custom graph: A -> B -> C (1.0km + 1.0km) vs A -> D -> C (3.0km + 3.0km).
        2. Calculate initial route A -> C. Verify it uses R_BC.
        3. POST /roads/R_BC/block.
        4. Calculate route A -> C again.
        5. Verify:
           - Initial route uses R_BC.
           - After blocking, route does NOT use R_BC.
           - New route uses A -> D -> C (road_ids: R_AD, R_DC).
           - API response contains updated route.
           - No blocked road appears in returned road_ids.
        """
        integration_graph = EvacuationRoadGraph(name="Part K Integration Graph")
        # Short route A -> B -> C
        integration_graph.add_road("A", "B", "R_AB", distance=1.0, blockage_probability=0.1)
        integration_graph.add_road("B", "C", "R_BC", distance=1.0, blockage_probability=0.1)
        # Longer alternative A -> D -> C
        integration_graph.add_road("A", "D", "R_AD", distance=3.0, blockage_probability=0.1)
        integration_graph.add_road("D", "C", "R_DC", distance=3.0, blockage_probability=0.1)

        reset_road_graph(integration_graph)

        # Step 1: Initial Route A -> C
        route_req = {"start_node": "A", "destination_node": "C"}
        initial_resp = self.client.post("/route", json=route_req)
        self.assertEqual(initial_resp.status_code, 200)
        initial_data = initial_resp.json()

        self.assertEqual(initial_data["nodes"], ["A", "B", "C"])
        self.assertIn("R_BC", initial_data["road_ids"])

        # Step 2: Block road R_BC via API
        block_resp = self.client.post("/roads/R_BC/block")
        self.assertEqual(block_resp.status_code, 200)
        self.assertEqual(block_resp.json()["road"]["status"], "BLOCKED")

        # Step 3: Recalculate route A -> C via API
        recalc_resp = self.client.post("/route", json=route_req)
        self.assertEqual(recalc_resp.status_code, 200)
        recalc_data = recalc_resp.json()

        # Step 4: Verifications
        self.assertNotIn("R_BC", recalc_data["road_ids"], "Blocked road R_BC must not appear in route!")
        self.assertEqual(recalc_data["nodes"], ["A", "D", "C"])
        self.assertEqual(recalc_data["road_ids"], ["R_AD", "R_DC"])
        self.assertEqual(recalc_data["total_distance"], 6.0)


if __name__ == "__main__":
    unittest.main()
