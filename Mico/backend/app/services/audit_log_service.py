import uuid
from contextlib import AbstractContextManager
from datetime import datetime, timezone
from typing import Callable, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogService:
    """
    Provides write (static, within an existing session) and read operations
    for the audit_logs table.

    Write pattern — call inside an existing `with session_factory() as session` block:
        AuditLogService.write(session, actor_user_id=..., action=..., ...)

    Read pattern — via an instance:
        svc = AuditLogService(session_factory=get_sync_session)
        items, total = svc.list(...)
    """

    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    # ── Write (static — executes within caller's session) ─────────────────────

    @staticmethod
    def write(
        session: Session,
        *,
        actor_user_id: uuid.UUID,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID,
        metadata: Optional[dict] = None,
    ) -> None:
        """Append an audit entry to the current session (no commit — caller controls that)."""
        log = AuditLog(
            id=uuid.uuid4(),
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
        session.add(log)

    # ── Read ──────────────────────────────────────────────────────────────────

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> tuple[list[AuditLog], int]:
        with self.session_factory() as session:
            query = session.query(AuditLog)
            if entity_type:
                query = query.filter(AuditLog.entity_type == entity_type)
            if action:
                query = query.filter(AuditLog.action == action)
            if actor_user_id:
                query = query.filter(AuditLog.actor_user_id == actor_user_id)
            total = query.count()
            items = (
                query.order_by(AuditLog.created_at.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
            return items, total
