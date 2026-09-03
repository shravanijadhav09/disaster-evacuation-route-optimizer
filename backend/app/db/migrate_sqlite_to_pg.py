"""
SQLite to PostgreSQL / Supabase Migration Script for Disaster Evacuation Route Optimizer.

Usage:
  python backend/app/db/migrate_sqlite_to_pg.py [--sqlite-path PATH] [--migrate-demo]

By default, this script reads records from SQLite (evacuation_data.db), checks the target
PostgreSQL database specified by the DATABASE_URL environment variable, creates the required
tables using SQLAlchemy models, and safely copies records idempotently without duplication.
"""

import os
import sys
import argparse
import sqlite3
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.db.models import IncidentModel, AuditLogModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sqlite_pg_migration")


def run_migration(sqlite_path: str = None, include_demo_records: bool = False):
    db_url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""
    if not db_url or "sqlite" in db_url:
        logger.error("DATABASE_URL environment variable is not set to a valid PostgreSQL/Supabase connection URL.")
        logger.error("Example format: DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres")
        sys.exit(1)

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    target_sqlite = sqlite_path or settings.DB_PATH
    if not os.path.exists(target_sqlite):
        logger.error(f"SQLite source file does not exist at '{target_sqlite}'. Migration aborted.")
        sys.exit(1)

    logger.info(f"Connecting to target PostgreSQL database via DATABASE_URL...")
    pg_engine = create_engine(db_url, pool_pre_ping=True)

    # Initialize PostgreSQL tables
    init_db(target_engine=pg_engine)
    logger.info("PostgreSQL database schema initialized/verified.")

    # Read SQLite records
    conn_sqlite = sqlite3.connect(target_sqlite)
    conn_sqlite.row_factory = sqlite3.Row
    cursor_sqlite = conn_sqlite.cursor()

    sqlite_incidents = [dict(r) for r in cursor_sqlite.execute("SELECT * FROM incidents").fetchall()]
    sqlite_audit = [dict(r) for r in cursor_sqlite.execute("SELECT * FROM audit_logs").fetchall()]
    conn_sqlite.close()

    logger.info(f"Read {len(sqlite_incidents)} incident(s) and {len(sqlite_audit)} audit log(s) from SQLite.")

    # PostgreSQL Session
    PgSession = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)
    pg_session = PgSession()

    try:
        migrated_incidents = 0
        skipped_incidents = 0

        for inc in sqlite_incidents:
            inc_id = inc["id"]
            title = inc.get("title", "")

            # Filter out obvious test synthetic titles if include_demo_records is False
            if not include_demo_records and any(kw in title.lower() for kw in ["test", "aaaa", "werte", "lanslidexyzzz"]):
                logger.info(f"Skipping demo/test incident record '{inc_id}' ({title})")
                skipped_incidents += 1
                continue

            existing = pg_session.query(IncidentModel).filter(IncidentModel.id == inc_id).first()
            if existing:
                skipped_incidents += 1
                continue

            new_inc = IncidentModel(
                id=inc_id,
                title=inc.get("title", "Disaster Report"),
                description=inc.get("description", ""),
                disaster_type=inc.get("disaster_type", "FLOOD"),
                severity=float(inc.get("severity", 0.7)),
                status=inc.get("status", "PENDING"),
                reported_by=inc.get("reported_by", "User"),
                reporter_type=inc.get("reporter_type", "Civilian"),
                created_at=inc.get("created_at"),
                updated_at=inc.get("updated_at"),
                reviewed_by=inc.get("reviewed_by"),
                reviewed_at=inc.get("reviewed_at"),
                admin_notes=inc.get("admin_notes"),
                affected_nodes_json=inc.get("affected_nodes_json", "[]"),
                affected_roads_json=inc.get("affected_roads_json", "[]"),
            )
            pg_session.add(new_inc)
            migrated_incidents += 1

        pg_session.commit()

        # Migrate Audit Logs
        migrated_audit = 0
        for audit in sqlite_audit:
            audit_id = audit.get("id")
            inc_id = audit.get("incident_id")

            # Ensure parent incident exists in PG
            parent_exists = pg_session.query(IncidentModel).filter(IncidentModel.id == inc_id).first()
            if not parent_exists:
                continue

            existing_audit = pg_session.query(AuditLogModel).filter(
                AuditLogModel.incident_id == inc_id,
                AuditLogModel.performed_at == audit.get("performed_at"),
            ).first()
            if existing_audit:
                continue

            new_audit = AuditLogModel(
                incident_id=inc_id,
                action=audit.get("action", "LOGGED"),
                performed_by=audit.get("performed_by", "System"),
                performed_at=audit.get("performed_at"),
                notes=audit.get("notes"),
            )
            pg_session.add(new_audit)
            migrated_audit += 1

        pg_session.commit()

        # Print Migration Comparison Summary
        pg_incidents_count = pg_session.query(IncidentModel).count()
        pg_audit_count = pg_session.query(AuditLogModel).count()

        print("\n" + "=" * 50)
        print("MIGRATION VERIFICATION SUMMARY")
        print("=" * 50)
        print(f"SQLite Source File:       {target_sqlite}")
        print(f"SQLite Total Incidents:   {len(sqlite_incidents)}")
        print(f"SQLite Total Audit Logs:  {len(sqlite_audit)}")
        print(f"Migrated Incidents to PG: {migrated_incidents}")
        print(f"Skipped / Duplicate:      {skipped_incidents}")
        print(f"PostgreSQL Total Incidents: {pg_incidents_count}")
        print(f"PostgreSQL Total Audit Logs: {pg_audit_count}")
        print("=" * 50)
        print("MIGRATION STATUS: SUCCESS\n")

    except Exception as e:
        pg_session.rollback()
        logger.error(f"Migration error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        pg_session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate SQLite to Supabase PostgreSQL")
    parser.add_argument("--sqlite-path", type=str, help="Path to SQLite database file", default=None)
    parser.add_argument("--migrate-demo", action="store_true", help="Include legacy test/demo records during migration")
    args = parser.parse_args()
    run_migration(sqlite_path=args.sqlite_path, include_demo_records=args.migrate_demo)
