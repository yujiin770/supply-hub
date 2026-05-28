"""
SuperAdmin service — operations that require SUPERADMIN privileges.

Provision is fully atomic: supplier + owner user are created in a single
database session so a failure on either rolls back both.
"""
import uuid
from contextlib import AbstractContextManager
from typing import Callable, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.supplier import Supplier, SupplierStatus
from app.models.user import User
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.superadmin import (
    AdminUserListResponse,
    AdminUserResponse,
    CreateAdminRequest,
    ImpersonationResponse,
    OwnerSummary,
    ProvisionSupplierRequest,
    ProvisionSupplierResponse,
)
from app.schemas.supplier import SupplierResponse
from app.services.audit_log_service import AuditLogService
from app.services.email_service import EmailService


class SuperAdminService:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory
        self.supplier_repo = SupplierRepository(session_factory)
        self.email_svc = EmailService()

    # ── Provision ─────────────────────────────────────────────────────────────

    def provision_supplier(
        self, payload: ProvisionSupplierRequest, *, actor_id: uuid.UUID
    ) -> ProvisionSupplierResponse:
        """
        Atomically create a Supplier (status=APPROVED) and its SUPPLIER_OWNER
        user in a single transaction.  Validates unique emails before inserting.
        """
        with self.session_factory() as session:
            # ── Uniqueness checks ─────────────────────────────────────────────
            errors: list[dict] = []

            supplier_email_exists = (
                session.query(Supplier).filter(Supplier.email == payload.email).first()
            )
            if supplier_email_exists:
                errors.append(
                    {"field": "email", "message": "A supplier with this email already exists."}
                )

            owner_email_exists = (
                session.query(User).filter(User.email == payload.owner_email).first()
            )
            if owner_email_exists:
                errors.append(
                    {"field": "owner_email", "message": "A user with this email already exists."}
                )

            if errors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=errors,
                )

            # ── Create supplier ───────────────────────────────────────────────
            supplier = Supplier(
                id=uuid.uuid4(),
                legal_name=payload.legal_name,
                trade_name=payload.trade_name,
                email=payload.email,
                mobile_number=payload.mobile_number,
                address_line1=payload.address_line1,
                city=payload.city,
                province=payload.province,
                postal_code=payload.postal_code,
                country=payload.country,
                status=SupplierStatus.APPROVED,
            )
            session.add(supplier)
            session.flush()          # → DB assigns supplier_code via sequence
            session.refresh(supplier)

            # ── Create owner user ─────────────────────────────────────────────
            owner = User(
                id=uuid.uuid4(),
                email=payload.owner_email,
                full_name=payload.owner_full_name,
                password_hash=get_password_hash(payload.owner_password),
                role=Role.SUPPLIER_OWNER,
                supplier_id=supplier.id,
                is_active=True,
            )
            session.add(owner)
            session.flush()
            session.refresh(owner)

            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="supplier.provision",
                entity_type="supplier",
                entity_id=supplier.id,
                metadata={
                    "supplier_code": supplier.supplier_code,
                    "legal_name": supplier.legal_name,
                    "owner_email": payload.owner_email,
                },
            )

            return ProvisionSupplierResponse(
                supplier=SupplierResponse.model_validate(supplier),
                owner=OwnerSummary.model_validate(owner),
            )

    # ── Admin account management ──────────────────────────────────────────────

    def create_admin(
        self, payload: CreateAdminRequest, *, actor_id: uuid.UUID
    ) -> AdminUserResponse:
        """Create a new ADMIN user with a locked placeholder password and send
        an activation invitation email.  Only SUPERADMIN may call this."""
        import hashlib
        import secrets
        from datetime import datetime, timedelta, timezone

        from app.models.password_reset_token import PasswordResetToken
        from app.repositories.password_reset_repository import PasswordResetRepository

        settings = get_settings()
        reset_repo = PasswordResetRepository(self.session_factory)

        with self.session_factory() as session:
            if session.query(User).filter(User.email == payload.email).first():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=[{"field": "email", "message": "A user with this email already exists."}],
                )
            # Set an unusable placeholder hash — the real password is set via activation link
            temp_hash = get_password_hash(secrets.token_hex(32))
            admin_user = User(
                id=uuid.uuid4(),
                email=payload.email,
                full_name=payload.full_name,
                password_hash=temp_hash,
                role=Role.ADMIN,
                is_active=True,
            )
            session.add(admin_user)
            session.flush()
            session.refresh(admin_user)
            user_id = admin_user.id
            AuditLogService.write(
                session,
                actor_user_id=actor_id,
                action="admin.create",
                entity_type="user",
                entity_id=admin_user.id,
                metadata={"email": payload.email, "full_name": payload.full_name},
            )
            result = AdminUserResponse.model_validate(admin_user)

        # Generate activation token (reuses password-reset infrastructure)
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset_repo.invalidate_previous(user_id)
        reset_repo.create(
            PasswordResetToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=settings.password_reset_expire_minutes),
            )
        )

        activate_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
        sent = self.email_svc.send_admin_invitation(
            payload.email, payload.full_name, activate_url
        )
        if not sent:
            import logging
            logging.getLogger(__name__).warning(
                "Admin invitation email failed for user_id=%s", user_id
            )

        return result

    def list_admins(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
    ) -> tuple[list[User], int]:
        with self.session_factory() as session:
            query = session.query(User).filter(User.role == Role.ADMIN)
            if q:
                like = f"%{q}%"
                query = query.filter(
                    (User.full_name.ilike(like)) | (User.email.ilike(like))
                )
            total = query.count()
            items = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
            # Detach objects so they remain accessible after session closes
            for item in items:
                session.expunge(item)
            return items, total

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_or_404(self, supplier_id: uuid.UUID) -> Supplier:
        supplier = self.supplier_repo.get(supplier_id)
        if supplier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found.",
            )
        return supplier

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        filter_status: Optional[SupplierStatus] = None,
        q: Optional[str] = None,
    ) -> tuple[list[Supplier], int]:
        items = self.supplier_repo.list(skip=skip, limit=limit, status=filter_status, q=q)
        total = self.supplier_repo.count(status=filter_status, q=q)
        return items, total

    # ── Update status ─────────────────────────────────────────────────────────

    def update_status(self, supplier_id: uuid.UUID, new_status: SupplierStatus) -> Supplier:
        self.get_or_404(supplier_id)
        return self.supplier_repo.update_status(supplier_id, new_status)

    # ── Impersonation ─────────────────────────────────────────────────────────

    def impersonate(
        self, supplier_id: uuid.UUID, *, impersonator_id: uuid.UUID
    ) -> ImpersonationResponse:
        """
        Issue a short-lived (2 h) access token that lets a SUPERADMIN act as the
        SUPPLIER_OWNER of the given supplier.  No refresh token is issued.
        """
        from app.core.security import create_impersonation_token

        supplier = self.get_or_404(supplier_id)

        with self.session_factory() as session:
            owner: User | None = (
                session.query(User)
                .filter(
                    User.supplier_id == supplier_id,
                    User.role == Role.SUPPLIER_OWNER,
                )
                .first()
            )

        if owner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No SUPPLIER_OWNER user found for this supplier.",
            )

        expires_in = 2 * 60 * 60  # 2 hours in seconds
        token = create_impersonation_token(
            owner_user_id=owner.id,
            owner_role=owner.role.value,
            owner_email=owner.email,
            impersonated_by=impersonator_id,
        )
        return ImpersonationResponse(
            access_token=token,
            expires_in=expires_in,
            supplier_name=supplier.legal_name,
            owner=OwnerSummary.model_validate(owner),
        )
