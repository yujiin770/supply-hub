from contextlib import AbstractContextManager
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.orm import Session

from app.models.otp_code import OtpCode


class OtpRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def invalidate_previous(self, user_id: object) -> None:
        """Mark all existing unused OTPs for this user as used before issuing a new one."""
        with self.session_factory() as session:
            (
                session.query(OtpCode)
                .filter(OtpCode.user_id == user_id, OtpCode.is_used == False)  # noqa: E712
                .update({"is_used": True})
            )

    def create(self, otp: OtpCode) -> OtpCode:
        with self.session_factory() as session:
            session.add(otp)
        return otp

    def get_active(self, user_id: object) -> OtpCode | None:
        """Return the latest valid (unused, non-expired) OTP for a user."""
        now = datetime.now(timezone.utc)
        with self.session_factory() as session:
            return (
                session.query(OtpCode)
                .filter(
                    OtpCode.user_id == user_id,
                    OtpCode.is_used == False,  # noqa: E712
                    OtpCode.expires_at > now,
                )
                .order_by(OtpCode.created_at.desc())
                .first()
            )

    def mark_used(self, otp_id: object) -> None:
        with self.session_factory() as session:
            otp = session.get(OtpCode, otp_id)
            if otp:
                otp.is_used = True
