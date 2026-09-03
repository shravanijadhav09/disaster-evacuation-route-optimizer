"""
Tests for Disaster Management API endpoints and Admin workflows.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.api.deps import initialize_default_road_graph, reset_road_graph
from backend.app.db.disaster_store import disaster_store

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_graph():
    reset_road_graph(initialize_default_road_graph())
    disaster_store.clear_all()




def test_list_disasters():
    response = client.get("/disasters")
    assert response.status_code == 200
    data = response.json()
    assert "total_count" in data
    assert "disasters" in data
    assert isinstance(data["disasters"], list)


def test_create_disaster_user_role():
    payload = {
        "title": "Bridge Submerged at Node B",
        "disaster_type": "FLOOD",
        "description": "High water levels observed under bridge, impassable for light vehicles.",
        "severity": 0.8,
        "affected_nodes": ["B"],
        "affected_roads": ["R2"],
        "reported_by": "Civilian Scout Jane",
    }
    response = client.post("/api/disasters", json=payload, headers={"X-Role": "user"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "PENDING"
    assert data["reported_by"] == payload["reported_by"]


def test_admin_approve_disaster_and_graph_impact():
    # 1. Create a disaster as user
    payload = {
        "title": "Road Debris on R4",
        "disaster_type": "LANDSLIDE",
        "description": "Heavy stones on road near Node D.",
        "severity": 0.9,
        "affected_nodes": ["D"],
        "affected_roads": ["R4"],
        "reported_by": "Driver Bob",
    }
    create_resp = client.post("/api/disasters", json=payload)
    assert create_resp.status_code == 201
    disaster_id = create_resp.json()["id"]

    # 2. Approve as Admin
    status_payload = {
        "status": "APPROVED",
        "admin_notes": "Approved by EOC Controller. Dispatching crew and updating routing.",
    }
    patch_resp = client.patch(
        f"/api/disasters/{disaster_id}/status",
        json=status_payload,
        headers={"X-Role": "admin"},
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["status"] == "APPROVED"
    assert updated_data["admin_notes"] == status_payload["admin_notes"]

    # 3. Check road network state updated
    road_resp = client.get("/roads/R4")
    assert road_resp.status_code == 200
    assert road_resp.json()["status"] == "BLOCKED"


def test_admin_resolve_disaster_and_graph_revert():
    # 1. Create and approve a disaster
    payload = {
        "title": "Flooding on R1",
        "disaster_type": "FLOOD",
        "description": "High water levels on R1",
        "severity": 0.95,
        "affected_nodes": ["A", "B"],
        "affected_roads": ["R1"],
        "reported_by": "Scout Alice",
    }
    create_resp = client.post("/api/disasters", json=payload)
    disaster_id = create_resp.json()["id"]

    client.patch(
        f"/api/disasters/{disaster_id}/status",
        json={"status": "APPROVED"},
        headers={"X-Role": "admin"},
    )
    assert client.get("/roads/R1").json()["status"] == "BLOCKED"

    # 2. Resolve disaster via status PATCH endpoint (simulating frontend Resolve Incident button)
    resolve_resp = client.patch(
        f"/api/disasters/{disaster_id}/status",
        json={"status": "RESOLVED", "admin_notes": "Incident resolved & hazards cleared by field team."},
        headers={"X-Role": "admin"},
    )
    assert resolve_resp.status_code == 200
    data = resolve_resp.json()
    assert data["status"] == "RESOLVED"
    assert "resolved" in data["admin_notes"].lower()

    # 3. Verify road status is reverted back to OPEN
    road_resp = client.get("/roads/R1")
    assert road_resp.status_code == 200
    assert road_resp.json()["status"] == "OPEN"


def test_lower_severity_disaster_sets_high_risk():
    # Moderate severity (0.5 < 0.7) should produce HIGH_RISK, not BLOCKED
    payload = {
        "title": "Minor Debris on R2",
        "disaster_type": "ROAD_DAMAGE",
        "description": "Small loose stones, drive with caution.",
        "severity": 0.5,
        "affected_nodes": ["B"],
        "affected_roads": ["R2"],
        "reported_by": "Civilian Scout Sam",
    }
    create_resp = client.post("/api/disasters", json=payload, headers={"X-Role": "admin"})
    assert create_resp.status_code == 201
    
    road_resp = client.get("/roads/R2")
    assert road_resp.status_code == 200
    assert road_resp.json()["status"] == "HIGH_RISK"


def test_admin_reject_disaster_leaves_graph_untouched():
    payload = {
        "title": "False Alarm on R3",
        "disaster_type": "FLOOD",
        "description": "Puddle reported, already drained.",
        "severity": 0.8,
        "affected_nodes": ["C"],
        "affected_roads": ["R3"],
        "reported_by": "Scout",
    }
    create_resp = client.post("/api/disasters", json=payload, headers={"X-Role": "user"})
    disaster_id = create_resp.json()["id"]

    reject_resp = client.patch(
        f"/api/disasters/{disaster_id}/status",
        json={"status": "REJECTED"},
        headers={"X-Role": "admin"},
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "REJECTED"

    # Road should remain OPEN
    assert client.get("/roads/R3").json()["status"] == "OPEN"



