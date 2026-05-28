from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session

from app.models.password_history import PasswordHistory


class PasswordHistoryRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def add(self, user_id: object, password_hash: str) -> None:
        """Save a password hash to the user's history."""
        with self.session_factory() as session:
            session.add(
                PasswordHistory(
                    user_id=user_id,
                    password_hash=password_hash,
                )
            )

    def get_all_for_user(self, user_id: object) -> list[PasswordHistory]:
        """Return all past password hashes for a user, newest first."""
        with self.session_factory() as session:
            return (
                session.query(PasswordHistory)
                .filter(PasswordHistory.user_id == user_id)
                .order_by(PasswordHistory.created_at.desc())
                .all()
            )
