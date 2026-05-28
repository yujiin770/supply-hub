"""
Auth service – two-step OTP login flow.
Mirrors pharmalake: sync SQLAlchemy, class-based, session-factory pattern.

Step 1  POST /auth/login       → validate credentials, send OTP, return mfa_token
Step 2  POST /auth/verify-otp  → validate OTP + mfa_token, return access/refresh tokens
"""
import hashlib
import logging
import random
import secrets
import string
from contextlib import AbstractContextManager
from datetime import datetime, timedelta, timezone
from typing import Callable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_mfa_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.otp_code import OtpCode
from app.models.password_reset_token import PasswordResetToken
from app.repositories.otp_repository import OtpRepository
from app.repositories.password_history_repository import PasswordHistoryRepository
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import MfaRequiredResponse, TokenResponse, RefreshRequest
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password.",
)
_INVALID_OTP = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired OTP.",
)


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


class AuthService:
    def __init__(
        self,
        session_factory: Callable[[], AbstractContextManager[Session]],
    ) -> None:
        self.user_repo = UserRepository(session_factory)
        self.otp_repo = OtpRepository(session_factory)
        self.reset_repo = PasswordResetRepository(session_factory)
        self.history_repo = PasswordHistoryRepository(session_factory)
        self.email_svc = EmailService()

    # ── Step 1 ────────────────────────────────────────────────────────────────

    def login(self, email: str, password: str) -> MfaRequiredResponse:
        """
        Validate email + password. On success send a 6-digit OTP and
        return a short-lived mfa_token for Step 2.
        """
        settings = get_settings()
        user = self.user_repo.get_by_email(email)

        if user is None or not verify_password(password, user.password_hash):
            raise _INVALID_CREDENTIALS

        # Supplier owners/staff may be inactive until approved — still allow login
        # so they can upload KYC documents.  All other roles must be active.
        is_supplier_role = user.role.value in ("SUPPLIER_OWNER", "SUPPLIER_STAFF")
        if not user.is_active and not is_supplier_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive.",
            )

        plain_otp = _generate_otp()
        self.otp_repo.invalidate_previous(user.id)
        self.otp_repo.create(
            OtpCode(
                user_id=user.id,
                hashed_otp=get_password_hash(plain_otp),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=settings.otp_expire_minutes),
            )
        )

        sent = self.email_svc.send_otp(user.email, plain_otp)
        if not sent:
            logger.warning("OTP email failed to deliver for user_id=%s", user.id)

        mfa_token = create_mfa_token(user.id)
        logger.info("MFA OTP issued: user_id=%s email=%s", user.id, user.email)
        return MfaRequiredResponse(mfa_token=mfa_token)

    # ── Step 2 ────────────────────────────────────────────────────────────────

    def verify_otp(self, mfa_token: str, otp: str) -> TokenResponse:
        """
        Validate the mfa_token and 6-digit OTP. Returns full access + refresh tokens.
        """
        from jose import JWTError

        settings = get_settings()

        try:
            payload = decode_token(mfa_token)
            if payload.get("type") != "mfa":
                raise _INVALID_OTP
            user_id_str: str | None = payload.get("sub")
            if user_id_str is None:
                raise _INVALID_OTP
        except JWTError:
            raise _INVALID_OTP

        otp_record = self.otp_repo.get_active(user_id_str)
        if not otp_record or not verify_password(otp, otp_record.hashed_otp):
            raise _INVALID_OTP

        self.otp_repo.mark_used(otp_record.id)

        user = self.user_repo.get(otp_record.user_id)
        if user is None:
            raise _INVALID_OTP

        access_token = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            email=user.email,
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        logger.info("MFA verified — tokens issued: user_id=%s", user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
    # \u2500\u2500 Refresh \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n
    def refresh(self, refresh_token: str) -> TokenResponse:
        """
        Validate a refresh token and issue a new access + refresh token pair
        (token rotation).
        """
        from jose import JWTError

        settings = get_settings()
        _INVALID = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise _INVALID
            user_id_str: str | None = payload.get("sub")
            if not user_id_str:
                raise _INVALID
        except JWTError:
            raise _INVALID

        user = self.user_repo.get(user_id_str)
        if user is None:
            raise _INVALID

        new_access = create_access_token(
            subject=str(user.id),
            role=user.role.value,
            email=user.email,
        )
        new_refresh = create_refresh_token(subject=str(user.id))

        logger.info("Token refreshed: user_id=%s", user.id)
        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    # ── Forgot / Reset Password ───────────────────────────────────────────────

    def forgot_password(self, email: str) -> None:
        """
        Initiate a password reset for the given email.
        Always returns normally — never reveals whether the email is registered.
        """
        settings = get_settings()
        user = self.user_repo.get_by_email(email)
        if user is None:
            logger.info("forgot_password: unknown email=%s (no-op)", email)
            return

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        self.reset_repo.invalidate_previous(user.id)
        self.reset_repo.create(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=settings.password_reset_expire_minutes),
            )
        )

        reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
        sent = self.email_svc.send_password_reset(user.email, reset_url)
        if not sent:
            logger.warning("Password reset email failed for user_id=%s", user.id)
        else:
            logger.info("Password reset email sent: user_id=%s", user.id)

    def reset_password(self, token: str, new_password: str) -> None:
        """
        Validate the reset token and update the user's password.
        Raises 400 if the token is invalid, expired, or already used.
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        record = self.reset_repo.get_by_token_hash(token_hash)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset link.",
            )

        user = self.user_repo.get(record.user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset link.",
            )

        # Reject if the new password matches any previously used password.
        past_hashes = self.history_repo.get_all_for_user(user.id)
        if any(verify_password(new_password, h.password_hash) for h in past_hashes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot reuse a previous password. Please choose a new one.",
            )
        # Also reject if it matches the current active password.
        if user.password_hash and verify_password(new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot reuse a previous password. Please choose a new one.",
            )

        # Archive the current password before overwriting.
        if user.password_hash:
            self.history_repo.add(user.id, user.password_hash)

        # Update in a new session so the change is actually committed.
        self.user_repo.update_password(user.id, get_password_hash(new_password))
        self.reset_repo.mark_used(record.id)
        logger.info("Password reset successful: user_id=%s", user.id)
