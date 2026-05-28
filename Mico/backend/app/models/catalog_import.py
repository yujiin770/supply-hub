import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CatalogImport(Base):
    """
    Tracks every CSV import request a supplier sends to PharmaLake.
    One row = one file upload attempt.
    """
    __tablename__ = "catalog_imports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # FK to the supplier who submitted the file
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Original filename as provided by the browser
    original_filename: Mapped[str] = mapped_column(
        String(500), nullable=False
    )

    # Status of the upload attempt
    # Values: "submitted" | "failed"
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default=text("'submitted'")
    )

    # HTTP status code returned by the PharmaLake API
    pharmalake_status_code: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    # Full JSON response body from PharmaLake (may contain errors, import_id, etc.)
    pharmalake_response_json: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # Optional: error message summary if the upload failed
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
