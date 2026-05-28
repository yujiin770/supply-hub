import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.kyc_document import KycDocStatus
from app.models.supplier import SupplierStatus
from app.schemas.kyc import KycDocumentResponse
from app.schemas.supplier import SupplierResponse


# ── Request bodies ────────────────────────────────────────────────────────────

class RejectSupplierRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)


class ReviewKycDocumentRequest(BaseModel):
    status: KycDocStatus = Field(..., description="APPROVED or REJECTED (not SUBMITTED)")
    remarks: Optional[str] = Field(None, max_length=1000)


# ── Response bodies ───────────────────────────────────────────────────────────

class SupplierWithKycResponse(BaseModel):
    """Supplier detail view enriched with KYC documents for the admin review panel."""
    supplier: SupplierResponse
    kyc_documents: list[KycDocumentResponse]
    kyc_complete: bool  # True when all required doc types have ≥1 non-rejected doc


class ApproveSupplierResponse(BaseModel):
    message: str
    supplier_id: uuid.UUID
    status: SupplierStatus
    approved_at: datetime
    approved_by: uuid.UUID


class RejectSupplierResponse(BaseModel):
    message: str
    supplier_id: uuid.UUID
    status: SupplierStatus
    rejected_at: datetime
    rejected_by: uuid.UUID
    rejection_reason: str


class PendingSupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int
