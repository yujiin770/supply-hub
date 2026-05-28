import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class KycDocType(str, Enum):
    DTI_SEC = "DTI_SEC"
    BIR_COR = "BIR_COR"
    FDA_LTO = "FDA_LTO"
    MAYORS_PERMIT = "MAYORS_PERMIT"
    VALID_ID = "VALID_ID"
    PROOF_OF_ADDRESS = "PROOF_OF_ADDRESS"
    OTHER = "OTHER"


class KycDocStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class SupplierKycDocument(Base):
    __tablename__ = "supplier_kyc_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_type: Mapped[KycDocType] = mapped_column(
        SAEnum(KycDocType, name="kycdoctype", native_enum=False),
        nullable=False,
    )
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[KycDocStatus] = mapped_column(
        SAEnum(KycDocStatus, name="kycdocstatus", native_enum=False),
        nullable=False,
        server_default=text("'SUBMITTED'"),
    )
    remarks: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="kyc_documents")  # type: ignore[name-defined]
