"""
Per-supplier local mirror of PharmaLake pack metadata.
Populated by POST /suppliers/me/packs-cache/sync on login.
"""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PharmaLakePackCache(Base):
    """
    One cached pack per supplier.
    UNIQUE(supplier_id, pack_id) allows each supplier to have their own
    metadata snapshot without affecting other suppliers' caches.
    """

    __tablename__ = "pharmalake_packs_caches"
    __table_args__ = (
        UniqueConstraint("supplier_id", "pack_id", name="uq_packs_cache_supplier_pack"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    pack_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # PharmaLake hierarchy IDs
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    presentation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Descriptive fields
    org_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand_name: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    sku: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    barcode: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    pack_qty_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    pack_qty_unit_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    pack_qty_unit_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    dosage_form_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    route_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Ingredient array — stored as exact JSONB array from PharmaLake
    ingredients: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )

    # Reflects is_active from PharmaLake response; set False for removed packs
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    # Full raw payload from PharmaLake preserved for future use
    raw_payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    # When this row was last fetched from PharmaLake
    source_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Kept current by DB trigger (trg_packs_cache_updated_at)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
