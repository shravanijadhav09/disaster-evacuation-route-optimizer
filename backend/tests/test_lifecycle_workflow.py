"""
Verification Suite for Disaster Incident Lifecycle Workflow (Tests 1 - 6).
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.api.deps import initialize_default_road_graph, reset_road_graph
from backend.app.db.disaster_store import DisasterStore, disaster_store

client = TestClient(app)


def test_lifecycle_workflow_full_suite():
    # ----------------------------------------------------
    # TEST 1: Fresh Startup
    # ----------------------------------------------------
    reset_road_graph(initialize_default_road_graph())
    disaster_store.clear_all()
    
    # Create test fixture disaster record DISASTER-001
    from backend.app.schemas.disasters import DisasterCreate
    fixture = DisasterCreate(
        title="Severe Flash Flood near Bridge R1",
        disaster_type="FLOOD",
        description="Initial active flood incident",
        severity=0.85,
        affected_nodes=["A", "B"],
        affected_roads=["R1"],
        reported_by="Civilian Scout Alex",
    )
    created_fixture = disaster_store.create_disaster(fixture, is_admin=True)
    
    list_resp = client.get("/disasters")
    assert list_resp.status_code == 200
    incidents = list_resp.json()["disasters"]
    assert len(incidents) == 1
    demo_inc = incidents[0]
    assert demo_inc["status"] == "APPROVED"

    # ----------------------------------------------------
    # TEST 2: Backend Restart (Idempotency)
    # ----------------------------------------------------
    # Simulate backend restart by calling _migrate_from_json again
    disaster_store._migrate_from_json()
    list_resp_after = client.get("/disasters")
    assert list_resp_after.status_code == 200
    assert len(list_resp_after.json()["disasters"]) == 1

    # ----------------------------------------------------
    # TEST 3: Incident Resolution & Persistence
    # ----------------------------------------------------
    resolve_resp = client.patch(
        f"/api/disasters/{demo_inc['id']}/status",
        json={"status": "RESOLVED", "admin_notes": "Cleared flood waters"},
        headers={"X-Role": "admin"},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"

    # Verify road R1 is restored to OPEN
    road_r1 = client.get("/roads/R1").json()
    assert road_r1["status"] == "OPEN"

    # Simulate restart: incident remains RESOLVED and is not recreated
    disaster_store._migrate_from_json()
    restarted_incidents = client.get("/disasters").json()["disasters"]
    assert len(restarted_incidents) == 1
    assert restarted_incidents[0]["status"] == "RESOLVED"

    # ----------------------------------------------------
    # TEST 4: Civilian Incident Submission
    # ----------------------------------------------------
    civ_payload = {
        "title": "Tree Fallen near Node C",
        "disaster_type": "ROAD_DAMAGE",
        "description": "Large tree branch blocking lane.",
        "severity": 0.8,
        "affected_nodes": ["C"],
        "affected_roads": ["R3"],
        "reported_by": "Civilian Scout Mark",
    }
    civ_resp = client.post("/api/disasters", json=civ_payload, headers={"X-Role": "user"})
    assert civ_resp.status_code == 201
    civ_data = civ_resp.json()
    assert civ_data["status"] == "PENDING"

    # Verify graph/road R3 remains OPEN before approval
    assert client.get("/roads/R3").json()["status"] == "OPEN"

    # Verify pending count increased
    disasters_summary = client.get("/disasters").json()
    assert disasters_summary["pending_count"] >= 1

    # ----------------------------------------------------
    # TEST 5: Admin Approval of Civilian Incident
    # ----------------------------------------------------
    appr_resp = client.patch(
        f"/api/disasters/{civ_data['id']}/status",
        json={"status": "APPROVED", "admin_notes": "Verified by field unit"},
        headers={"X-Role": "admin"},
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"

    # Verify road R3 operational status updated to BLOCKED
    assert client.get("/roads/R3").json()["status"] == "BLOCKED"

    # ----------------------------------------------------
    # TEST 6: Admin Rejection of another Civilian Incident
    # ----------------------------------------------------
    rej_payload = {
        "title": "Minor Water Puddle",
        "disaster_type": "FLOOD",
        "description": "Small puddle, harmless.",
        "severity": 0.3,
        "affected_nodes": ["E"],
        "affected_roads": ["R6"],
        "reported_by": "Civilian Bob",
    }
    rej_create = client.post("/api/disasters", json=rej_payload, headers={"X-Role": "user"})
    rej_id = rej_create.json()["id"]
    assert rej_create.json()["status"] == "PENDING"

    rej_patch = client.patch(
        f"/api/disasters/{rej_id}/status",
        json={"status": "REJECTED", "admin_notes": "Disregarded - minor puddle"},
        headers={"X-Role": "admin"},
    )
    assert rej_patch.status_code == 200
    assert rej_patch.json()["status"] == "REJECTED"

    # Verify R6 remains OPEN
    assert client.get("/roads/R6").json()["status"] == "OPEN"
