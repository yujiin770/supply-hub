"""
Pydantic schemas for the marketplace (buyer-facing read APIs).
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class MarketplaceSupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    supplier_id: uuid.UUID
    supplier_code: str
    legal_name: str
    trade_name: Optional[str]
    contact_email: Optional[str]
    city: Optional[str]
    province: Optional[str]
    status: str


class PaginatedMarketplaceSuppliers(BaseModel):
    items: List[MarketplaceSupplierOut]
    total: int
    limit: int
    offset: int


class MarketplacePackageOut(BaseModel):
    """A supplier listing joined with PharmaLake cache data."""

    listing_id: uuid.UUID
    pack_id: uuid.UUID
    brand_name: Optional[str]
    dosage_form_name: Optional[str]
    route_name: Optional[str]
    pack_qty_value: Optional[str]
    pack_qty_unit_code: Optional[str]
    barcode: Optional[str]
    sku: Optional[str]
    ingredients: List[Any]
    base_price: Optional[Decimal]
    moq: Optional[Decimal]
    lead_time_days: Optional[int]
    stock_qty: Optional[int]
    is_enabled: bool

    @field_serializer("base_price", "moq")
    def serialize_decimal(self, v: Optional[Decimal]) -> Optional[str]:
        return str(v) if v is not None else None


class PaginatedMarketplacePackages(BaseModel):
    items: List[MarketplacePackageOut]
    total: int
    limit: int
    offset: int
