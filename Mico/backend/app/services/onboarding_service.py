"""
Onboarding service — public supplier self-signup.

Creates Supplier (status=PENDING_KYC) + SUPPLIER_OWNER user (is_active=False)
in a single atomic transaction.  The account stays inactive until a SUPERADMIN
or ADMIN approves the application.

Verification placeholders
──────────────────────────
Both `Supplier.is_email_verified` and `User.is_email_verified` default to
False at signup.  Future steps (email-click token, OTP over SMS) should flip
these flags.  The fields are already on the models and the DB — only the
trigger logic needs to be wired up when ready.
"""
import uuid
from contextlib import AbstractContextManager
from typing import Callable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.supplier import Supplier, SupplierStatus
from app.models.user import User
from app.schemas.onboarding import SupplierSignupRequest, SupplierSignupResponse


class OnboardingService:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def signup(self, payload: SupplierSignupRequest) -> SupplierSignupResponse:
        """
        Validate uniqueness, then atomically insert:
        1. Supplier (status=PENDING_KYC, is_email_verified=False, is_mobile_verified=False)
        2. SUPPLIER_OWNER User (is_active=False — activated on approval)
        """
        with self.session_factory() as session:
            # ── Uniqueness validation ─────────────────────────────────────────
            errors: list[dict] = []

            if session.query(Supplier).filter(Supplier.email == payload.business_email).first():
                errors.append(
                    {
                        "field": "business_email",
                        "message": "A supplier account with this email already exists.",
                    }
                )

            if session.query(User).filter(User.email == payload.owner_email).first():
                errors.append(
                    {
                        "field": "owner_email",
                        "message": "A user account with this email already exists.",
                    }
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
                email=payload.business_email,
                mobile_number=payload.business_mobile,
                address_line1=payload.address_line1,
                city=payload.city,
                province=payload.province,
                postal_code=payload.postal_code,
                country=payload.country,
                status=SupplierStatus.PENDING_KYC,
                is_email_verified=False,
                is_mobile_verified=False,
            )
            session.add(supplier)
            session.flush()          # DB assigns supplier_code via sequence
            session.refresh(supplier)

            # ── Create owner user (inactive until approved) ───────────────────
            owner = User(
                id=uuid.uuid4(),
                email=payload.owner_email,
                full_name=payload.owner_full_name,
                password_hash=get_password_hash(payload.owner_password),
                role=Role.SUPPLIER_OWNER,
                supplier_id=supplier.id,
                is_active=False,          # activated by SUPERADMIN/ADMIN on approval
                is_email_verified=False,  # placeholder — wire email-click token here
                is_mobile_verified=False, # placeholder — wire SMS OTP here
            )
            session.add(owner)
            session.flush()

            return SupplierSignupResponse(
                message=(
                    "Signup submitted. Your application is awaiting review. "
                    "You will be notified once your account is approved."
                ),
                supplier_id=supplier.id,
                supplier_code=supplier.supplier_code,
            )
