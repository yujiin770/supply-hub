"""
Supplier listing routes — the commerce layer on top of PharmaLake.

All endpoints require SUPPLIER_OWNER (active-only: listings are post-approval).
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_api_client, get_current_supplier_owner, SupplierOwnerContext
from app.db.session import get_sync_session
from app.repositories.catalog_cache_repository import CatalogCacheRepository
from app.schemas.listing import (
    ListingCreate,
    ListingDetailResponse,
    ListingResponse,
    ListingUpdate,
    PaginatedListingsResponse,
    PaginatedRecentListingsOut,
    StockUpdate,
)
from app.services.listing_service import ListingService
from app.services.pharmalake_catalog_service import pharmalake_catalog

logger = logging.getLogger(__name__)
_cache_repo = CatalogCacheRepository()

router = APIRouter(prefix="/suppliers/me/listings", tags=["listings"])

_listing_service = ListingService(session_factory=get_sync_session)


@router.post(
    "",
    response_model=ListingResponse,
    status_code=201,
    summary="Add a PharmaLake pack to my catalog",
)
def create_listing(
    data: ListingCreate,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> ListingResponse:
    return _listing_service.create(ctx.supplier.id, data)


@router.get(
    "",
    response_model=PaginatedListingsResponse,
    summary="List my catalog",
)
def list_listings(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Search brand, form, route, barcode, SKU"),
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> PaginatedListingsResponse:
    return _listing_service.list(ctx.supplier.id, limit=limit, offset=offset, q=q)


@router.get(
    "/pack-ids",
    response_model=list[str],
    summary="Get pack_ids currently in my catalog (for 'Added' badge)",
)
def get_my_pack_ids(
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> list[str]:
    return sorted(_listing_service.get_active_pack_ids(ctx.supplier.id))


@router.get(
    "/recently-added",
    response_model=PaginatedRecentListingsOut,
    summary="List items I recently added to my catalog",
)
async def list_recently_added(
    days: int = Query(7, ge=1, le=365, description="Look-back window in days"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> PaginatedRecentListingsOut:
    result = _listing_service.list_recently_added(
        ctx.supplier.id, days=days, limit=limit, offset=offset
    )

    # For items still missing product info (pack was added from live PharmaLake
    # feed before auto-cache was in place), live-fetch and cache them now.
    missing_ids = [
        str(item.pack_id)
        for item in result.items
        if item.brand_name is None and item.inn_name is None
    ]
    if missing_ids:
        try:
            raw_packs = await pharmalake_catalog.batch_lookup(missing_ids)
        except Exception as exc:
            logger.warning("batch_lookup failed for missing cache entries: %s", exc)
            raw_packs = []

        if raw_packs:
            now = datetime.now(timezone.utc)
            cache_rows = [
                {
                    "pack_id": uuid.UUID(str(r["pack_id"])),
                    "brand_name": r.get("brand_name"),
                    "barcode": r.get("barcode"),
                    "sku": r.get("sku"),
                    "org_id": r.get("org_id"),
                    "org_name": r.get("org_name"),
                    "dosage_form_name": r.get("dosage_form_name"),
                    "route_name": r.get("route_name"),
                    "pack_qty_value": str(r["pack_qty_value"]) if r.get("pack_qty_value") is not None else None,
                    "pack_qty_unit_code": r.get("pack_qty_unit_code"),
                    "pack_qty_unit_name": r.get("pack_qty_unit_name"),
                    "ingredients_json": r.get("ingredients"),
                    "is_active": r.get("is_active", True),
                    "synced_at": now,
                    "first_seen_at": now,
                }
                for r in raw_packs
                if r.get("pack_id")
            ]
            if cache_rows:
                _cache_repo.upsert_batch(cache_rows)
                # Re-run with freshly cached data
                result = _listing_service.list_recently_added(
                    ctx.supplier.id, days=days, limit=limit, offset=offset
                )

    return result


@router.get(
    "/{listing_id}",
    response_model=ListingDetailResponse,
    summary="Get a single listing with PharmaLake pack details merged",
)
def get_listing(
    listing_id: uuid.UUID,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> ListingDetailResponse:
    return _listing_service.get_detail(ctx.supplier.id, listing_id)


@router.put(
    "/{listing_id}",
    response_model=ListingResponse,
    summary="Update listing commercial terms",
)
def update_listing(
    listing_id: uuid.UUID,
    data: ListingUpdate,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> ListingResponse:
    return _listing_service.update(ctx.supplier.id, listing_id, data)


@router.delete(
    "/{listing_id}",
    response_model=ListingResponse,
    summary="Disable (soft-delete) a listing",
)
def disable_listing(
    listing_id: uuid.UUID,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> ListingResponse:
    return _listing_service.disable(ctx.supplier.id, listing_id)


@router.patch(
    "/{listing_id}/stock",
    response_model=ListingResponse,
    summary="Update stock quantity for a listing",
)
def update_listing_stock(
    listing_id: uuid.UUID,
    data: StockUpdate,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> ListingResponse:
    return _listing_service.update_stock(ctx.supplier.id, listing_id, data.stock_qty)


# ── Machine-to-machine: PharmaLake integration ─────────────────────────────────

_client_router = APIRouter(prefix="/suppliers", tags=["listings"])


@_client_router.post(
    "/{supplier_id}/listings",
    response_model=ListingResponse,
    status_code=201,
    summary="Create listing on behalf of a supplier (API client only)",
    description=(
        "Machine-to-machine endpoint called by PharmaLake after approving a "
        "batch-import draft.  Requires a valid API client token.  The "
        "``supplier_id`` in the path identifies which supplier the listing "
        "belongs to."
    ),
)
def create_listing_for_supplier(
    supplier_id: uuid.UUID,
    data: ListingCreate,
    _client=Depends(get_current_api_client),
) -> ListingResponse:
    """Create a listing directly for the given supplier (no user session needed)."""
    return _listing_service.create(supplier_id, data)
