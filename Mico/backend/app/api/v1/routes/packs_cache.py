"""
Supplier packs-cache routes.

POST /suppliers/me/packs-cache/sync  — Sync pack metadata from PharmaLake
GET  /suppliers/me/packs-cache       — List cached packs (with search + pagination)
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import SupplierOwnerContext, get_current_supplier_owner
from app.schemas.packs_cache import PacksCacheListResponse, PacksCacheSyncResponse
from app.services.packs_cache_service import packs_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/suppliers/me/packs-cache", tags=["packs-cache"])


@router.post(
    "/sync",
    response_model=PacksCacheSyncResponse,
    status_code=200,
    summary="Sync supplier catalog packs from PharmaLake",
    description=(
        "Fetches full pack metadata for all of this supplier's listed packs "
        "from PharmaLake and upserts them into the local packs cache. "
        "Returns a summary of what was synced. "
        "Returns 409 if a sync is already in progress for this supplier."
    ),
)
async def sync_packs_cache(
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> PacksCacheSyncResponse:
    logger.info(
        "POST /suppliers/me/packs-cache/sync — user=%s supplier=%s",
        ctx.user.id,
        ctx.supplier.id,
    )
    return await packs_cache_service.sync(ctx.supplier.id)


@router.get(
    "",
    response_model=PacksCacheListResponse,
    summary="List cached packs for this supplier",
    description=(
        "Returns a paginated list of the supplier's cached packs. "
        "Use `search` to filter by brand_name, sku, or barcode (ILIKE). "
        "Set `active_only=false` to include packs deactivated during reconciliation."
    ),
)
def list_packs_cache(
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, description="ILIKE filter on brand_name, sku, barcode"),
    active_only: bool = Query(True, description="Return only active cached packs"),
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
) -> PacksCacheListResponse:
    return packs_cache_service.list_cached(
        supplier_id=ctx.supplier.id,
        page=page,
        page_size=page_size,
        search=search,
        active_only=active_only,
    )
