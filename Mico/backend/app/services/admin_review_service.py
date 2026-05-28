"""
Admin review service — supplier onboarding workflow.

Approve / reject suppliers and review individual KYC documents.
All operations are atomic (single session).
"""
import uuid
from contextlib import AbstractContextManager
from datetime import datetime, timezone
from typing import Callable, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.kyc_document import KycDocStatus, SupplierKycDocument
from app.models.supplier import Supplier, SupplierStatus
from app.models.user import User
from app.services.audit_log_service import AuditLogService

_settings = get_settings()

_PENDING_STATUSES = (SupplierStatus.PENDING_KYC, SupplierStatus.PENDING_APPROVAL)


class AdminReviewService:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    # ── List pending ──────────────────────────────────────────────────────────

    def list_pending(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
    ) -> tuple[list[Supplier], int]:
        with self.session_factory() as session:
            query = session.query(Supplier).filter(
                Supplier.status.in_(_PENDING_STATUSES)
            )
            if q:
                search = f"%{q}%"
                query = query.filter(
                    Supplier.legal_name.ilike(search)
                    | Supplier.trade_name.ilike(search)
                    | Supplier.email.ilike(search)
                    | Supplier.supplier_code.ilike(search)
                )
            total = query.count()
            items = query.order_by(Supplier.created_at.asc()).offset(skip).limit(limit).all()
            return items, total

    # ── Get supplier KYC detail ───────────────────────────────────────────────

    def get_supplier_kyc(self, supplier_id: uuid.UUID) -> tuple[Supplier, list[SupplierKycDocument], bool]:
        with self.session_factory() as session:
            supplier = session.get(Supplier, supplier_id)
            if supplier is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found.",
                )

            docs = (
                session.query(SupplierKycDocument)
                .filter(SupplierKycDocument.supplier_id == supplier_id)
                .order_by(SupplierKycDocument.uploaded_at.desc())
                .all()
            )

            submitted_types = {
                d.doc_type for d in docs if d.status != KycDocStatus.REJECTED
            }
            required = set(_settings.kyc_required_docs)
            kyc_complete = required.issubset(submitted_types)

            return supplier, docs, kyc_complete

    # ── Approve ───────────────────────────────────────────────────────────────

    def approve(self, supplier_id: uuid.UUID, reviewer_id: uuid.UUID) -> Supplier:
        with self.session_factory() as session:
            supplier = session.get(Supplier, supplier_id)
            if supplier is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")

            if supplier.status == SupplierStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Supplier is already approved.",
                )
            if supplier.status not in _PENDING_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cannot approve a supplier with status '{supplier.status.value}'.",
                )

            now = datetime.now(timezone.utc)
            supplier.status = SupplierStatus.APPROVED
            supplier.approved_at = now
            supplier.approved_by = reviewer_id
            # Clear any previous rejection data
            supplier.rejected_at = None
            supplier.rejected_by = None
            supplier.rejection_reason = None

            # Activate all users belonging to this supplier
            session.query(User).filter(User.supplier_id == supplier_id).update(
                {"is_active": True}, synchronize_session="fetch"
            )

            AuditLogService.write(
                session,
                actor_user_id=reviewer_id,
                action="supplier.approve",
                entity_type="supplier",
                entity_id=supplier_id,
                metadata={
                    "supplier_code": supplier.supplier_code,
                    "legal_name": supplier.legal_name,
                },
            )

            session.flush()
            session.refresh(supplier)
            return supplier

    # ── Reject ────────────────────────────────────────────────────────────────

    def reject(
        self,
        supplier_id: uuid.UUID,
        reviewer_id: uuid.UUID,
        reason: str,
    ) -> Supplier:
        with self.session_factory() as session:
            supplier = session.get(Supplier, supplier_id)
            if supplier is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")

            if supplier.status == SupplierStatus.REJECTED:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Supplier is already rejected.",
                )
            if supplier.status not in _PENDING_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cannot reject a supplier with status '{supplier.status.value}'.",
                )

            now = datetime.now(timezone.utc)
            supplier.status = SupplierStatus.REJECTED
            supplier.rejected_at = now
            supplier.rejected_by = reviewer_id
            supplier.rejection_reason = reason
            # Users remain inactive

            AuditLogService.write(
                session,
                actor_user_id=reviewer_id,
                action="supplier.reject",
                entity_type="supplier",
                entity_id=supplier_id,
                metadata={
                    "supplier_code": supplier.supplier_code,
                    "legal_name": supplier.legal_name,
                    "reason": reason,
                },
            )

            session.flush()
            session.refresh(supplier)
            return supplier

    # ── Review KYC document ───────────────────────────────────────────────────

    def review_kyc_document(
        self,
        document_id: uuid.UUID,
        reviewer_id: uuid.UUID,
        new_status: KycDocStatus,
        remarks: Optional[str],
    ) -> tuple[SupplierKycDocument, Supplier]:
        if new_status == KycDocStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Review status must be APPROVED or REJECTED.",
            )

        with self.session_factory() as session:
            doc = session.get(SupplierKycDocument, document_id)
            if doc is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

            doc.status = new_status
            doc.remarks = remarks
            doc.reviewed_at = datetime.now(timezone.utc)
            session.flush()

            # Re-evaluate supplier status after document review
            supplier = session.get(Supplier, doc.supplier_id)
            if supplier and supplier.status in (
                SupplierStatus.PENDING_KYC,
                SupplierStatus.PENDING_APPROVAL,
            ):
                submitted_types = set(
                    session.query(SupplierKycDocument.doc_type)
                    .filter(
                        SupplierKycDocument.supplier_id == supplier.id,
                        SupplierKycDocument.status != KycDocStatus.REJECTED,
                    )
                    .distinct()
                    .all()
                )
                submitted_types_values = {r[0] for r in submitted_types}
                required = set(_settings.kyc_required_docs)

                if required.issubset(submitted_types_values):
                    # All required docs still have ≥1 non-rejected copy → advance
                    if supplier.status == SupplierStatus.PENDING_KYC:
                        supplier.status = SupplierStatus.PENDING_APPROVAL
                        session.flush()
                else:
                    # A required doc was just rejected → step back to PENDING_KYC
                    if supplier.status == SupplierStatus.PENDING_APPROVAL:
                        supplier.status = SupplierStatus.PENDING_KYC
                        session.flush()

            session.refresh(doc)
            session.refresh(supplier)

            AuditLogService.write(
                session,
                actor_user_id=reviewer_id,
                action=f"kyc_document.{new_status.value.lower()}",
                entity_type="kyc_document",
                entity_id=document_id,
                metadata={
                    "doc_type": doc.doc_type.value,
                    "supplier_id": str(doc.supplier_id),
                    "remarks": remarks,
                },
            )

            return doc, supplier
