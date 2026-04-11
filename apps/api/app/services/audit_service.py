import json
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def log_audit_event(
    db: Session,
    *,
    actor_id: int | None,
    action_type: str,
    entity_type: str,
    entity_id: int | None,
    description: str,
    metadata: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        actor_id=actor_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(log)
    db.flush()
    return log