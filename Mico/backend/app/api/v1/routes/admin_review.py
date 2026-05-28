"""
Admin review routes — supplier onboarding workflow.

Endpoints:
  GET  /admin/suppliers/pending               — list suppliers awaiting review
  GET  /admin/suppliers/{id}/kyc              — supplier + KYC documents detail
  POST /admin/suppliers/{id}/approve          — approve supplier
  POST /admin/suppliers/{id}/reject           — reject supplier with reason
  POST /admin/kyc/documents/{doc_id}/review   — approve/reject a single KYC doc
"""
import uuid

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_roles
from app.core.azure_storage import kyc_doc_to_response
from app.core.rbac import Role
from app.db.session import get_sync_session
from app.models.user import User
from app.schemas.admin_review import (
    ApproveSupplierResponse,
    PendingSupplierListResponse,
    RejectSupplierRequest,
    RejectSupplierResponse,
    ReviewKycDocumentRequest,
    SupplierWithKycResponse,
)
from app.schemas.kyc import KycDocumentResponse
from app.schemas.supplier import SupplierResponse
from app.services.admin_review_service import AdminReviewService

router = APIRouter(prefix="/admin", tags=["admin-review"])

_service = AdminReviewService(session_factory=get_sync_session)

_reviewer_dep = Depends(require_roles([Role.ADMIN, Role.SUPERADMIN]))


# ── List pending suppliers ────────────────────────────────────────────────────

@router.get(
    "/suppliers/pending",
    response_model=PendingSupplierListResponse,
    summary="List suppliers pending review (ADMIN+)",
    description=(
        "Returns suppliers whose status is `PENDING_KYC` or `PENDING_APPROVAL`."
        " Optionally search by legal name, trade name, email, or supplier code via `q`."
    ),
)
async def list_pending_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Full-text search filter"),
    reviewer: User = _reviewer_dep,
) -> PendingSupplierListResponse:
    items, total = _service.list_pending(skip=skip, limit=limit, q=q)
    return PendingSupplierListResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total,
        skip=skip,
        limit=limit,
    )


# ── Get supplier + KYC detail ─────────────────────────────────────────────────

@router.get(
    "/suppliers/{supplier_id}/kyc",
    response_model=SupplierWithKycResponse,
    summary="Get supplier KYC detail (ADMIN+)",
)
async def get_supplier_kyc(
    supplier_id: uuid.UUID,
    reviewer: User = _reviewer_dep,
) -> SupplierWithKycResponse:
    supplier, docs, kyc_complete = _service.get_supplier_kyc(supplier_id)
    return SupplierWithKycResponse(
        supplier=SupplierResponse.model_validate(supplier),
        kyc_documents=[kyc_doc_to_response(d) for d in docs],
        kyc_complete=kyc_complete,
    )


# ── Approve supplier ──────────────────────────────────────────────────────────

@router.post(
    "/suppliers/{supplier_id}/approve",
    response_model=ApproveSupplierResponse,
    summary="Approve a supplier (ADMIN+)",
    description=(
        "Sets supplier status to `APPROVED` and activates all linked user accounts."
        " Only valid for suppliers in `PENDING_KYC` or `PENDING_APPROVAL` status."
    ),
)
async def approve_supplier(
    supplier_id: uuid.UUID,
    reviewer: User = Depends(require_roles([Role.ADMIN, Role.SUPERADMIN])),
) -> ApproveSupplierResponse:
    supplier = _service.approve(supplier_id=supplier_id, reviewer_id=reviewer.id)
    return ApproveSupplierResponse(
        message="Supplier approved successfully.",
        supplier_id=supplier.id,
        status=supplier.status,
        approved_at=supplier.approved_at,
        approved_by=supplier.approved_by,
    )


# ── Reject supplier ───────────────────────────────────────────────────────────

@router.post(
    "/suppliers/{supplier_id}/reject",
    response_model=RejectSupplierResponse,
    summary="Reject a supplier (ADMIN+)",
    description=(
        "Sets supplier status to `REJECTED`. Linked user accounts remain inactive."
        " Only valid for suppliers in `PENDING_KYC` or `PENDING_APPROVAL` status."
    ),
)
async def reject_supplier(
    supplier_id: uuid.UUID,
    body: RejectSupplierRequest,
    reviewer: User = Depends(require_roles([Role.ADMIN, Role.SUPERADMIN])),
) -> RejectSupplierResponse:
    supplier = _service.reject(
        supplier_id=supplier_id,
        reviewer_id=reviewer.id,
        reason=body.reason,
    )
    return RejectSupplierResponse(
        message="Supplier rejected.",
        supplier_id=supplier.id,
        status=supplier.status,
        rejected_at=supplier.rejected_at,
        rejected_by=supplier.rejected_by,
        rejection_reason=supplier.rejection_reason,
    )


# ── Review KYC document ───────────────────────────────────────────────────────

@router.post(
    "/kyc/documents/{document_id}/review",
    response_model=KycDocumentResponse,
    summary="Approve or reject a KYC document (ADMIN+)",
    description=(
        "Updates the document's status to `APPROVED` or `REJECTED` and records remarks."
        "\n\n"
        "Side effects:\n"
        "- If a required doc type is rejected and supplier was `PENDING_APPROVAL`,"
        "  supplier reverts to `PENDING_KYC`.\n"
        "- If all required doc types become satisfied, supplier advances to `PENDING_APPROVAL`."
    ),
)
async def review_kyc_document(
    document_id: uuid.UUID,
    body: ReviewKycDocumentRequest,
    reviewer: User = Depends(require_roles([Role.ADMIN, Role.SUPERADMIN])),
) -> KycDocumentResponse:
    doc, _supplier = _service.review_kyc_document(
        document_id=document_id,
        reviewer_id=reviewer.id,
        new_status=body.status,
        remarks=body.remarks,
    )
    return kyc_doc_to_response(doc)
