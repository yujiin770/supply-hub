from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def get_by_email(self, email: str) -> User | None:
        with self.session_factory() as session:
            return session.query(User).filter(User.email == email).first()

    def get(self, user_id: object) -> User | None:
        with self.session_factory() as session:
            return session.get(User, user_id)

    def update_password(self, user_id: object, new_password_hash: str) -> None:
        """Update the user's password hash and commit in a single session."""
        with self.session_factory() as session:
            user = session.get(User, user_id)
            if user:
                user.password_hash = new_password_hash
