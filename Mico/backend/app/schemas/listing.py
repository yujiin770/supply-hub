"""
Pydantic schemas for supplier listing endpoints.
"""
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.pharmalake import PharmaLakePack


# ── Request bodies ─────────────────────────────────────────────────────────────

class PackMetaIn(BaseModel):
    """Optional pack metadata the frontend can supply at listing-create time
    so we can auto-populate the local PharmaLake cache for packs that haven't
    been bulk-synced yet."""
    brand_name: Optional[str] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    dosage_form_name: Optional[str] = None
    route_name: Optional[str] = None
    pack_qty_value: Optional[str] = None
    pack_qty_unit_code: Optional[str] = None
    pack_qty_unit_name: Optional[str] = None
    ingredients_json: Optional[list] = None


class PackCacheSummary(BaseModel):
    """Pack metadata joined inline from pharmalake_packs_caches.
    Shape intentionally matches the frontend PharmaLakePack / BatchPack interface
    so existing display helpers (batchStrengthSummary, etc.) keep working."""

    pack_id: str
    product_id: Optional[str] = None
    presentation_id: Optional[str] = None
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    brand_name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    # Returned as string to preserve decimal precision and match frontend type
    pack_qty_value: Optional[str] = None
    pack_qty_unit_code: Optional[str] = None
    pack_qty_unit_name: Optional[str] = None
    dosage_form_name: Optional[str] = None
    route_name: Optional[str] = None
    description: Optional[str] = None
    ingredients: list = []
    is_active: bool = True


class ListingCreate(BaseModel):
    pack_id: UUID
    base_price: Optional[Decimal] = Field(None, ge=0, decimal_places=4)
    moq: Optional[Decimal] = Field(None, ge=0, decimal_places=4)
    lead_time_days: Optional[int] = Field(None, ge=0)
    stock_qty: Optional[int] = Field(None, ge=0)
    # Optional metadata so the backend can auto-populate the local catalog cache
    # when the pack was fetched from the live PharmaLake feed (not yet synced).
    pack_meta: Optional[PackMetaIn] = None


class ListingUpdate(BaseModel):
    base_price: Optional[Decimal] = Field(default=None, ge=0, decimal_places=4)
    moq: Optional[Decimal] = Field(default=None, ge=0, decimal_places=4)
    lead_time_days: Optional[int] = Field(default=None, ge=0)
    is_enabled: Optional[bool] = None
    stock_qty: Optional[int] = Field(default=None, ge=0)

    model_config = {"populate_by_name": True}


# ── Response bodies ────────────────────────────────────────────────────────────

class ListingResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    pack_id: UUID
    is_enabled: bool
    base_price: Optional[Decimal]
    moq: Optional[Decimal]
    lead_time_days: Optional[int]
    stock_qty: Optional[int]
    created_at: str
    updated_at: str
    # Joined from pharmalake_packs_caches — None when the supplier hasn't synced yet
    pack: Optional[PackCacheSummary] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_listing(cls, row: object) -> "ListingResponse":
        """ORM → schema, converting datetimes to ISO strings."""
        from app.models.supplier_listing import SupplierListing
        obj: SupplierListing = row  # type: ignore[assignment]
        return cls(
            id=obj.id,
            supplier_id=obj.supplier_id,
            pack_id=obj.pack_id,
            is_enabled=obj.is_enabled,
            base_price=obj.base_price,
            moq=obj.moq,
            lead_time_days=obj.lead_time_days,
            stock_qty=obj.stock_qty,
            created_at=obj.created_at.isoformat(),
            updated_at=obj.updated_at.isoformat(),
        )


class ListingDetailResponse(ListingResponse):
    """Includes merged PharmaLake pack details."""
    pack: Optional[PharmaLakePack] = None


class PaginatedListingsResponse(BaseModel):
    items: List[ListingResponse]
    total: int
    limit: int
    offset: int


class StockUpdate(BaseModel):
    """Body for the dedicated PATCH /stock endpoint."""
    stock_qty: Optional[int] = Field(None, ge=0, description="Set to null to disable stock tracking (unlimited).")


class RecentListingOut(BaseModel):
    """A supplier's own listing enriched with PharmaLake pack metadata."""
    id: UUID
    pack_id: UUID
    is_enabled: bool
    base_price: Optional[Decimal]
    moq: Optional[Decimal]
    lead_time_days: Optional[int]
    stock_qty: Optional[int]
    added_at: str
    # PharmaLake-derived fields (may be None if not in cache)
    brand_name: Optional[str]
    inn_name: Optional[str]
    org_name: Optional[str]
    dosage_form_name: Optional[str]
    route_name: Optional[str]
    pack_qty_value: Optional[str]
    pack_qty_unit_code: Optional[str]
    strength_summary: Optional[str]


class PaginatedRecentListingsOut(BaseModel):
    items: List[RecentListingOut]
    total: int
    limit: int
    offset: int
