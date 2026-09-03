"""
SQLAlchemy ORM Models for Disaster Evacuation Route Optimizer SQLite Database.
"""

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    disaster_type = Column(String, default="FLOOD", nullable=False)
    severity = Column(Float, default=0.7, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    reported_by = Column(String, default="Civilian User", nullable=False)
    reporter_type = Column(String, default="Civilian", nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)
    affected_nodes_json = Column(Text, nullable=True, default="[]")
    affected_roads_json = Column(Text, nullable=True, default="[]")

    audit_logs = relationship("AuditLogModel", back_populates="incident", cascade="all, delete-orphan")


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(String, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)  # CREATED, APPROVED, REJECTED, RESOLVED, EDITED
    performed_by = Column(String, nullable=False)
    performed_at = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    incident = relationship("IncidentModel", back_populates="audit_logs")
