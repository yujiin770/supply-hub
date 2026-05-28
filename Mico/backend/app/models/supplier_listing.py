import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SupplierListing(Base):
    """
    Commerce layer linking a supplier to a PharmaLake pack_id.
    One row = one product the supplier wants to sell.
    """
    __tablename__ = "supplier_listings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # FK to our suppliers table
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # PharmaLake master catalog reference (not a FK — external system)
    pack_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Soft-delete / enable toggle
    is_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    # Commercial terms (all optional)
    base_price: Mapped[float | None] = mapped_column(
        Numeric(18, 4), nullable=True
    )
    moq: Mapped[float | None] = mapped_column(
        Numeric(18, 4), nullable=True
    )
    lead_time_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    stock_qty: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("supplier_id", "pack_id", name="uq_supplier_pack"),
    )
