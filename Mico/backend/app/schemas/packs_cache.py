"""
Pydantic schemas for the pharmalake_packs_caches endpoints.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_serializer


class PacksCacheSyncResponse(BaseModel):
    """Summary returned from POST /suppliers/me/packs-cache/sync."""

    supplier_id: str
    received_count: int
    upserted_count: int
    deactivated_count: int
    started_at: str
    finished_at: str


class PacksCacheItem(BaseModel):
    """One row from the pharmalake_packs_caches table."""

    id: str
    supplier_id: str
    pack_id: str
    product_id: Optional[str] = None
    presentation_id: Optional[str] = None
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    brand_name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    # Returned as string to preserve decimal precision in JSON
    pack_qty_value: Optional[str] = None
    pack_qty_unit_code: Optional[str] = None
    pack_qty_unit_name: Optional[str] = None
    dosage_form_name: Optional[str] = None
    route_name: Optional[str] = None
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]] = []
    is_active: bool
    source_synced_at: str
    created_at: str
    updated_at: str


class PacksCacheListResponse(BaseModel):
    """Paginated response from GET /suppliers/me/packs-cache."""

    items: List[PacksCacheItem]
    total: int
    page: int
    page_size: int
