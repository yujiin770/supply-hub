from contextlib import AbstractContextManager
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


class PasswordResetRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def invalidate_previous(self, user_id: object) -> None:
        """Mark all existing unused reset tokens for this user as used."""
        with self.session_factory() as session:
            (
                session.query(PasswordResetToken)
                .filter(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.is_used == False,  # noqa: E712
                )
                .update({"is_used": True})
            )

    def create(self, token: PasswordResetToken) -> PasswordResetToken:
        with self.session_factory() as session:
            session.add(token)
        return token

    def get_by_token_hash(self, token_hash: str) -> PasswordResetToken | None:
        """Return an active (unused, non-expired) token record matching the hash."""
        now = datetime.now(timezone.utc)
        with self.session_factory() as session:
            return (
                session.query(PasswordResetToken)
                .filter(
                    PasswordResetToken.token_hash == token_hash,
                    PasswordResetToken.is_used == False,  # noqa: E712
                    PasswordResetToken.expires_at > now,
                )
                .first()
            )

    def mark_used(self, token_id: object) -> None:
        with self.session_factory() as session:
            record = session.get(PasswordResetToken, token_id)
            if record:
                record.is_used = True
