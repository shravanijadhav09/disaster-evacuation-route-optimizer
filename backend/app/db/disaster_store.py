"""
Disaster Data Store & Graph Synchronizer (SQLite-Backed).
Manages user-reported and admin-managed disasters with thread-safe SQLite persistence,
legacy JSON data auto-migration, audit logging, and dynamic NetworkX graph risk synchronization.
"""

import os
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from enum import Enum
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.schemas.disasters import (
    DisasterResponse,
    DisasterCreate,
    DisasterUpdate,
    DisasterStatusUpdate,
    DisasterStatus,
    DisasterType,
)
from backend.app.db.database import settings, Base, init_db, SessionLocal, engine as default_engine
from backend.app.db.models import IncidentModel, AuditLogModel
from backend.app.api.deps import get_road_graph

logger = logging.getLogger(__name__)

LEGACY_JSON_FILE = os.path.join(os.path.dirname(__file__), "disasters_data.json")

# Clean production initial state: zero prepared/seeded disasters on startup
INITIAL_DISASTERS = []


class DisasterStore:
    def __init__(self, db_engine=None, json_filepath: str = LEGACY_JSON_FILE):
        self.engine = db_engine or default_engine
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.json_filepath = json_filepath
        
        # Initialize SQLite tables
        init_db(target_engine=self.engine)
        
        # Auto-migrate legacy JSON data into SQLite on startup if DB is empty
        self._migrate_from_json()

    def get_session(self):
        return self.Session()

    def _migrate_from_json(self):
        """
        Idempotent initialization mechanism from disasters_data.json into SQLite.
        If database already contains records, skip seed import to preserve user actions
        (e.g., resolving incidents, civilian report submissions) across backend restarts.
        """
        session = self.get_session()
        try:
            total_in_db = session.query(IncidentModel).count()
            if total_in_db > 0:
                logger.info(f"Database already initialized with {total_in_db} incident(s). Skipping seed import.")
                self._rebuild_graph_impacts()
                return

            records_to_import = []
            if os.path.exists(self.json_filepath):
                try:
                    with open(self.json_filepath, "r", encoding="utf-8") as f:
                        records_to_import = json.load(f)
                    logger.info(f"Loaded {len(records_to_import)} disaster records from {self.json_filepath}")
                except Exception as e:
                    logger.warning(f"Error reading legacy JSON file: {e}")
                    records_to_import = INITIAL_DISASTERS
            else:
                records_to_import = INITIAL_DISASTERS

            if not records_to_import:
                self._rebuild_graph_impacts()
                return

            imported_count = 0
            for item in records_to_import:
                inc_id = item.get("id")
                if not inc_id:
                    continue

                affected_nodes = item.get("affected_nodes", [])
                affected_roads = item.get("affected_roads", [])
                status_str = item.get("status", "APPROVED").upper()
                
                sev = float(item.get("severity", 0.85))
                if sev > 1.0:
                    sev = sev / 100.0

                new_inc = IncidentModel(
                    id=inc_id,
                    title=item.get("title", "Severe Flash Flood near Bridge R1"),
                    description=item.get("description", "Initial active flood incident"),
                    disaster_type=str(item.get("disaster_type", "FLOOD")).upper(),
                    severity=sev,
                    status=status_str,
                    reported_by=item.get("reported_by", "Civilian Scout Alex"),
                    reporter_type=item.get("reporter_type", "Civilian"),
                    created_at=item.get("created_at") or datetime.now(timezone.utc).isoformat(),
                    updated_at=item.get("updated_at") or datetime.now(timezone.utc).isoformat(),
                    reviewed_by=item.get("reviewed_by") or "Admin EOC",
                    reviewed_at=item.get("reviewed_at") or datetime.now(timezone.utc).isoformat(),
                    admin_notes=item.get("admin_notes") or "Verified by field team.",
                    affected_nodes_json=json.dumps(affected_nodes),
                    affected_roads_json=json.dumps(affected_roads),
                )
                session.add(new_inc)
                imported_count += 1

                audit = AuditLogModel(
                    incident_id=inc_id,
                    action="MIGRATED_IMPORT",
                    performed_by="System Migration",
                    performed_at=datetime.now(timezone.utc).isoformat(),
                    notes="Imported initial active incident",
                )
                session.add(audit)

            session.commit()

            if imported_count > 0:
                logger.info(f"Successfully initialized {imported_count} record(s) into SQLite database.")
                
            # Sync graph state for active/approved disasters
            approved_incidents = session.query(IncidentModel).filter(IncidentModel.status == "APPROVED").all()
            for inc in approved_incidents:
                self._apply_disaster_to_graph(self._doc_to_dict(inc))

        except Exception as e:
            session.rollback()
            logger.error(f"Error during legacy JSON migration: {e}")
        finally:
            session.close()

    def _doc_to_dict(self, doc: IncidentModel) -> Dict[str, Any]:
        """Convert ORM IncidentModel object to dictionary."""
        affected_nodes = json.loads(doc.affected_nodes_json) if doc.affected_nodes_json else []
        affected_roads = json.loads(doc.affected_roads_json) if doc.affected_roads_json else []
        return {
            "id": doc.id,
            "title": doc.title,
            "disaster_type": doc.disaster_type,
            "description": doc.description,
            "severity": doc.severity,
            "status": doc.status,
            "reported_by": doc.reported_by,
            "reporter_type": doc.reporter_type,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "reviewed_by": doc.reviewed_by,
            "reviewed_at": doc.reviewed_at,
            "admin_notes": doc.admin_notes,
            "affected_nodes": affected_nodes,
            "affected_roads": affected_roads,
        }

    def _dict_to_response(self, d: Dict[str, Any]) -> DisasterResponse:
        """Convert dictionary to Pydantic DisasterResponse schema."""
        return DisasterResponse(**d)

    def list_disasters(self, status: Optional[str] = None, disaster_type: Optional[str] = None) -> List[DisasterResponse]:
        """List disaster records from SQLite database with optional filtering."""
        session = self.get_session()
        try:
            query = session.query(IncidentModel)
            if status:
                query = query.filter(IncidentModel.status == status.upper())
            if disaster_type:
                query = query.filter(IncidentModel.disaster_type == disaster_type.upper())
            
            docs = query.order_by(IncidentModel.created_at.desc()).all()
            return [self._dict_to_response(self._doc_to_dict(doc)) for doc in docs]
        finally:
            session.close()

    def get_disaster(self, disaster_id: str) -> Optional[DisasterResponse]:
        """Retrieve a single disaster record by ID."""
        session = self.get_session()
        try:
            doc = session.query(IncidentModel).filter(IncidentModel.id == disaster_id).first()
            if not doc:
                return None
            return self._dict_to_response(self._doc_to_dict(doc))
        finally:
            session.close()

    def create_disaster(self, payload: DisasterCreate, is_admin: bool = False) -> DisasterResponse:
        """Create a new disaster incident. Admins create APPROVED incidents; Civilians create PENDING reports."""
        session = self.get_session()
        try:
            aff_roads = payload.affected_roads or []
            aff_nodes = payload.affected_nodes or []

            # Check for duplicate active/pending reports on same roads/nodes
            if aff_roads:
                for r_id in aff_roads:
                    existing = session.query(IncidentModel).filter(
                        IncidentModel.status.in_(["PENDING", "APPROVED"])
                    ).all()
                    for ext in existing:
                        ext_roads = json.loads(ext.affected_roads_json or "[]")
                        if r_id in ext_roads and not is_admin:
                            raise ValueError(f"An active/pending disaster report already exists for Road '{r_id}' ({ext.title}).")

            sev = float(payload.severity)
            if sev > 1.0:
                sev = sev / 100.0

            disaster_type_str = payload.disaster_type.value if hasattr(payload.disaster_type, "value") else str(payload.disaster_type).upper()
            now_str = datetime.now(timezone.utc).isoformat()
            disaster_id = f"DISASTER-{uuid.uuid4().hex[:6].upper()}"
            initial_status = DisasterStatus.APPROVED.value if is_admin else DisasterStatus.PENDING.value

            new_doc = IncidentModel(
                id=disaster_id,
                title=payload.title,
                disaster_type=disaster_type_str,
                description=payload.description,
                severity=sev,
                status=initial_status,
                reported_by=payload.reported_by,
                reporter_type="Admin" if is_admin else "Civilian",
                created_at=now_str,
                updated_at=now_str,
                reviewed_by="Admin EOC" if is_admin else None,
                reviewed_at=now_str if is_admin else None,
                admin_notes="Automatically approved (Admin submission)" if is_admin else None,
                affected_nodes_json=json.dumps(aff_nodes),
                affected_roads_json=json.dumps(aff_roads),
            )

            session.add(new_doc)

            # Audit record
            audit = AuditLogModel(
                incident_id=disaster_id,
                action="CREATED",
                performed_by=payload.reported_by,
                performed_at=now_str,
                notes=f"Initial status: {initial_status}",
            )
            session.add(audit)
            session.commit()

            dict_resp = self._doc_to_dict(new_doc)

            # Apply graph impact if approved on creation
            if initial_status == DisasterStatus.APPROVED.value:
                self._apply_disaster_to_graph(dict_resp)

            logger.info(f"Created disaster {disaster_id} (status={initial_status}) in SQLite")
            return self._dict_to_response(dict_resp)

        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_status(self, disaster_id: str, status_payload: DisasterStatusUpdate, reviewer: str = "Admin Controller") -> Optional[DisasterResponse]:
        """Update status of a disaster incident (Admin action). Persists to SQLite & audit log."""
        session = self.get_session()
        try:
            doc = session.query(IncidentModel).filter(IncidentModel.id == disaster_id).first()
            if not doc:
                return None

            old_status = doc.status
            new_status = status_payload.status.value if hasattr(status_payload.status, "value") else str(status_payload.status).upper()
            now_str = datetime.now(timezone.utc).isoformat()

            doc.status = new_status
            doc.updated_at = now_str
            doc.reviewed_by = reviewer
            doc.reviewed_at = now_str
            if status_payload.admin_notes is not None:
                doc.admin_notes = status_payload.admin_notes

            # Write Audit Log
            audit = AuditLogModel(
                incident_id=disaster_id,
                action=new_status,
                performed_by=reviewer,
                performed_at=now_str,
                notes=status_payload.admin_notes or f"Status changed from {old_status} to {new_status}",
            )
            session.add(audit)
            session.commit()

            dict_resp = self._doc_to_dict(doc)

            # Handle graph impact sync
            if new_status in (DisasterStatus.APPROVED.value, "ACTIVE"):
                self._apply_disaster_to_graph(dict_resp)
            elif new_status in (DisasterStatus.RESOLVED.value, DisasterStatus.REJECTED.value):
                self._revert_disaster_from_graph(dict_resp)

            logger.info(f"Updated disaster {disaster_id} status from {old_status} to {new_status} in SQLite")
            return self._dict_to_response(dict_resp)

        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_disaster(self, disaster_id: str, update_payload: DisasterUpdate) -> Optional[DisasterResponse]:
        """Update general fields of a disaster in SQLite database."""
        session = self.get_session()
        try:
            doc = session.query(IncidentModel).filter(IncidentModel.id == disaster_id).first()
            if not doc:
                return None

            update_dict = update_payload.model_dump(exclude_unset=True)
            now_str = datetime.now(timezone.utc).isoformat()

            if "title" in update_dict and update_dict["title"] is not None:
                doc.title = update_dict["title"]
            if "disaster_type" in update_dict and update_dict["disaster_type"] is not None:
                doc.disaster_type = update_dict["disaster_type"].value if hasattr(update_dict["disaster_type"], "value") else str(update_dict["disaster_type"]).upper()
            if "description" in update_dict and update_dict["description"] is not None:
                doc.description = update_dict["description"]
            if "severity" in update_dict and update_dict["severity"] is not None:
                sev = float(update_dict["severity"])
                doc.severity = sev / 100.0 if sev > 1.0 else sev
            if "status" in update_dict and update_dict["status"] is not None:
                doc.status = update_dict["status"].value if hasattr(update_dict["status"], "value") else str(update_dict["status"]).upper()
            if "admin_notes" in update_dict and update_dict["admin_notes"] is not None:
                doc.admin_notes = update_dict["admin_notes"]
            if "affected_nodes" in update_dict and update_dict["affected_nodes"] is not None:
                doc.affected_nodes_json = json.dumps(update_dict["affected_nodes"])
            if "affected_roads" in update_dict and update_dict["affected_roads"] is not None:
                doc.affected_roads_json = json.dumps(update_dict["affected_roads"])

            doc.updated_at = now_str
            session.commit()

            dict_resp = self._doc_to_dict(doc)

            # Apply or revert graph impact based on status
            if doc.status == DisasterStatus.APPROVED.value:
                self._apply_disaster_to_graph(dict_resp)
            elif doc.status in [DisasterStatus.RESOLVED.value, DisasterStatus.REJECTED.value]:
                self._revert_disaster_from_graph(dict_resp)

            return self._dict_to_response(dict_resp)
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_disaster(self, disaster_id: str) -> bool:
        """Delete a disaster record from SQLite database."""
        session = self.get_session()
        try:
            doc = session.query(IncidentModel).filter(IncidentModel.id == disaster_id).first()
            if doc:
                dict_resp = self._doc_to_dict(doc)
                session.delete(doc)
                session.commit()
                self._rebuild_graph_impacts()
                logger.info(f"Deleted disaster {disaster_id} from SQLite")
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def _apply_disaster_to_graph(self, disaster_data: Dict[str, Any]):
        """Apply disaster intensity / blockage to road network graph edges based on severity threshold."""
        try:
            graph = get_road_graph()
            affected_roads = disaster_data.get("affected_roads", [])
            affected_nodes = disaster_data.get("affected_nodes", [])
            severity = float(disaster_data.get("severity", 0.8))

            # Normalize severity if passed as percentage
            if severity > 1.0:
                severity = severity / 100.0

            # High severity (>= 0.7) sets status to BLOCKED; lower severity sets status to HIGH_RISK
            target_status = "BLOCKED" if severity >= 0.7 else "HIGH_RISK"

            if affected_roads:
                for r_id in affected_roads:
                    try:
                        graph.update_road_status(r_id, target_status)
                    except KeyError:
                        pass
            elif affected_nodes:
                for u, v, data in graph.graph.edges(data=True):
                    r_id = data.get("road_id")
                    if (u in affected_nodes and v in affected_nodes) and r_id:
                        try:
                            graph.update_road_status(r_id, target_status)
                        except KeyError:
                            pass
        except Exception as e:
            logger.error(f"Error applying disaster graph impact for {disaster_data.get('id')}: {e}")

    def _revert_disaster_from_graph(self, disaster_data: Dict[str, Any]):
        """Revert disaster intensity on road network graph when resolved or rejected, re-applying any remaining approved incidents."""
        try:
            self._rebuild_graph_impacts()
        except Exception as e:
            logger.error(f"Error reverting disaster graph impact: {e}")

    def _rebuild_graph_impacts(self):
        """Re-sync road graph state by restoring base ML road attributes and re-applying all currently APPROVED incidents."""
        session = self.get_session()
        try:
            graph = get_road_graph()
            # 1. Reset each edge status to OPEN while preserving baseline ML risk/distance/attributes
            for u, v, data in graph.graph.edges(data=True):
                r_id = data.get("road_id")
                if r_id:
                    # Preserve baseline blockage probability
                    if "base_blockage_probability" not in data:
                        data["base_blockage_probability"] = data.get("blockage_probability", 0.1)
                    else:
                        data["blockage_probability"] = data["base_blockage_probability"]

                    graph.update_road_status(r_id, "OPEN")

            # 2. Re-apply all currently APPROVED incidents from SQLite
            approved_incidents = session.query(IncidentModel).filter(IncidentModel.status == "APPROVED").all()
            for inc in approved_incidents:
                self._apply_disaster_to_graph(self._doc_to_dict(inc))
        finally:
            session.close()

    def clear_all(self) -> None:
        """Clear all incidents and audit logs from the database (for testing)."""
        session = self.get_session()
        try:
            session.query(AuditLogModel).delete()
            session.query(IncidentModel).delete()
            session.commit()
            logger.info("Cleared all incidents and audit logs from SQLite database.")
        except Exception as e:
            session.rollback()
            logger.error(f"Error clearing disaster store: {e}")
            raise
        finally:
            session.close()


# Singleton disaster store instance
disaster_store = DisasterStore()
