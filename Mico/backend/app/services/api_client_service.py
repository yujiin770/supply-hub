"""
ApiClientService — CRUD + token exchange for OAuth2 client credentials.

Security model:
  - client_id is a UUID4 string (public identifier).
  - client_secret is 64 hex chars, bcrypt-hashed at rest.
  - Secret is returned in plain text ONLY at create / rotate time.
  - Rotate requires a fresh OTP sent to the superadmin's email.
"""
import logging
import random
import secrets
import string
import uuid
from contextlib import AbstractContextManager
from datetime import datetime, timedelta, timezone
from typing import Callable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_client_access_token,
    get_password_hash,
    verify_password,
)
from app.models.api_client import ApiClient
from app.models.otp_code import OtpCode
from app.repositories.api_client_repository import ApiClientRepository
from app.repositories.otp_repository import OtpRepository
from app.repositories.user_repository import UserRepository
from app.schemas.api_client import (
    ApiClientCreatedResponse,
    ApiClientResponse,
    ApiClientUpdate,
    ClientTokenResponse,
)
from app.services.audit_log_service import AuditLogService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

_INVALID_OTP = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired OTP.",
)


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


class ApiClientService:
    def __init__(
        self, session_factory: Callable[[], AbstractContextManager[Session]]
    ) -> None:
        self.session_factory = session_factory
        self.client_repo = ApiClientRepository(session_factory)
        self.otp_repo = OtpRepository(session_factory)
        self.user_repo = UserRepository(session_factory)
        self.email_svc = EmailService()

    # ── Create ────────────────────────────────────────────────────────────────

    def create(
        self,
        *,
        name: str,
        description: str | None,
        expires_at: datetime | None,
        actor_id: uuid.UUID,
    ) -> ApiClientCreatedResponse:
        """Generate a new client_id + secret, hash the secret, persist, and return
        the plain secret (shown only this once)."""
        plain_secret = secrets.token_hex(32)  # 64-char hex
        client_id = str(uuid.uuid4())

        api_client = ApiClient(
            id=uuid.uuid4(),
            name=name,
            description=description,
            client_id=client_id,
            hashed_secret=get_password_hash(plain_secret),
            is_active=True,
            expires_at=expires_at,
            created_by_id=actor_id,
        )

        with self.session_factory() as session:
            session.add(api_client)
            session.flush()   # assigns id + triggers any DB defaults
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="CREATE_API_CLIENT",
                entity_type="api_client",
                entity_id=api_client.id,
                metadata={"name": name},
            )

        logger.info("ApiClient created: id=%s name=%r by user_id=%s", api_client.id, name, actor_id)

        return ApiClientCreatedResponse(
            **ApiClientResponse.model_validate(api_client).model_dump(),
            client_secret=plain_secret,
        )

    # ── Read ──────────────────────────────────────────────────────────────────

    def list_all(self) -> list[ApiClientResponse]:
        clients = self.client_repo.list_all()
        return [ApiClientResponse.model_validate(c) for c in clients]

    def get_or_404(self, client_pk: uuid.UUID) -> ApiClient:
        client = self.client_repo.get(client_pk)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API client not found.")
        return client

    # ── Update ────────────────────────────────────────────────────────────────

    def update(
        self, client_pk: uuid.UUID, payload: ApiClientUpdate, *, actor_id: uuid.UUID
    ) -> ApiClientResponse:
        client = self.get_or_404(client_pk)
        changes = payload.model_dump(exclude_none=True)
        updated = self.client_repo.update(client, changes)

        with self.session_factory() as session:
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="UPDATE_API_CLIENT",
                entity_type="api_client",
                entity_id=client_pk,
                metadata=changes,
            )

        return ApiClientResponse.model_validate(updated)

    # ── Revoke ────────────────────────────────────────────────────────────────

    def revoke(self, client_pk: uuid.UUID, *, actor_id: uuid.UUID) -> ApiClientResponse:
        client = self.get_or_404(client_pk)
        updated = self.client_repo.update(client, {"is_active": False})

        with self.session_factory() as session:
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="REVOKE_API_CLIENT",
                entity_type="api_client",
                entity_id=client_pk,
            )

        logger.info("ApiClient revoked: id=%s by user_id=%s", client_pk, actor_id)
        return ApiClientResponse.model_validate(updated)

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, client_pk: uuid.UUID, *, actor_id: uuid.UUID) -> None:
        client = self.get_or_404(client_pk)

        with self.session_factory() as session:
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="DELETE_API_CLIENT",
                entity_type="api_client",
                entity_id=client_pk,
                metadata={"name": client.name},
            )

        self.client_repo.delete(client)
        logger.info("ApiClient deleted: id=%s by user_id=%s", client_pk, actor_id)

    # ── OTP-gated: request OTP for rotate ─────────────────────────────────────

    def request_rotate_otp(self, *, actor_id: uuid.UUID) -> None:
        """Send a 6-digit OTP to the superadmin's email to authorise a secret rotation."""
        settings = get_settings()
        user = self.user_repo.get(actor_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        plain_otp = _generate_otp()
        self.otp_repo.invalidate_previous(actor_id)
        self.otp_repo.create(
            OtpCode(
                user_id=actor_id,
                hashed_otp=get_password_hash(plain_otp),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=settings.otp_expire_minutes),
            )
        )

        self.email_svc.send(
            to_email=user.email,
            subject=f"[{settings.project_name}] API credentials rotation OTP",
            body=(
                f"<p>You requested to rotate API client credentials.</p>"
                f"<p>Your one-time code (expires in {settings.otp_expire_minutes} minutes):</p>"
                f"<div style='font-size:36px;font-weight:bold;letter-spacing:8px;"
                f"color:#1b4332;padding:16px;background:#d8f3dc;"
                f"border-radius:8px;text-align:center'>{plain_otp}</div>"
                f"<p style='color:#888;font-size:12px;margin-top:24px'>"
                f"If you did not request this, please ignore.</p>"
            ),
        )
        logger.info("Rotate OTP issued for user_id=%s", actor_id)

    # ── OTP-gated: rotate client_id + secret ─────────────────────────────────

    def rotate(
        self, client_pk: uuid.UUID, *, otp: str, actor_id: uuid.UUID
    ) -> ApiClientCreatedResponse:
        """Verify OTP then issue a brand-new client_id + client_secret pair."""
        otp_record = self.otp_repo.get_active(actor_id)
        if not otp_record or not verify_password(otp, otp_record.hashed_otp):
            raise _INVALID_OTP
        self.otp_repo.mark_used(otp_record.id)

        client = self.get_or_404(client_pk)

        new_plain_secret = secrets.token_hex(32)
        new_client_id = str(uuid.uuid4())
        updated = self.client_repo.update(
            client,
            {
                "client_id": new_client_id,
                "hashed_secret": get_password_hash(new_plain_secret),
            },
        )

        with self.session_factory() as session:
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="ROTATE_API_CLIENT_SECRET",
                entity_type="api_client",
                entity_id=client_pk,
            )

        logger.info("ApiClient secret rotated: id=%s by user_id=%s", client_pk, actor_id)
        return ApiClientCreatedResponse(
            **ApiClientResponse.model_validate(updated).model_dump(),
            client_secret=new_plain_secret,
        )

    # ── Authenticate (partner token exchange) ─────────────────────────────────

    def authenticate(self, client_id: str, client_secret: str) -> ClientTokenResponse:
        """
        Validate client_id + client_secret and issue a short-lived JWT.
        Subject is ``client:{client_id}`` to distinguish from user tokens.
        """
        settings = get_settings()
        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials.",
        )

        client = self.client_repo.get_by_client_id(client_id)
        if not client:
            raise invalid_exc

        if not client.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client credentials have been revoked.",
            )

        if client.expires_at and client.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client credentials have expired.",
            )

        if not verify_password(client_secret, client.hashed_secret):
            raise invalid_exc

        expires_in = settings.access_token_expire_minutes * 60
        access_token = create_client_access_token(
            subject=f"client:{client.client_id}",
            expires_delta=timedelta(seconds=expires_in),
        )

        logger.info("ApiClient authenticated: id=%s name=%r", client.id, client.name)
        return ClientTokenResponse(access_token=access_token, expires_in=expires_in)
