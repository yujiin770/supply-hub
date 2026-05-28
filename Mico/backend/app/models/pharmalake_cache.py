"""
Local mirror of PharmaLake catalog items.
Updated by the sync service (POST /admin/catalog/sync).
Enables fast ILIKE search without real-time calls to PharmaLake.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PharmaLakeCatalogCache(Base):
    __tablename__ = "pharmalake_catalog_cache"

    pack_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    brand_name: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    sku: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    org_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    org_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dosage_form_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    route_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pack_qty_value: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pack_qty_unit_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pack_qty_unit_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Full ingredient list stored as JSONB for flexible inn_name search
    ingredients_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    # Set once on first INSERT; never overwritten on subsequent syncs.
    # Used to identify items that are genuinely new to the catalog.
    first_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
