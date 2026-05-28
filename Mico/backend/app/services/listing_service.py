"""
Supplier listing service — CRUD for the commerce layer on top of PharmaLake.
"""
import uuid
from contextlib import AbstractContextManager
from datetime import datetime, timezone
from decimal import Decimal
from typing import Callable, Optional

from fastapi import HTTPException, status

from app.models.pharmalake_cache import PharmaLakeCatalogCache
from app.models.pharmalake_pack_cache import PharmaLakePackCache as SupplierPackCache
from app.models.supplier_listing import SupplierListing
from app.repositories.catalog_cache_repository import CatalogCacheRepository
from app.repositories.listing_repository import ListingRepository
from app.repositories.packs_cache_repository import PacksCacheRepository
from app.schemas.listing import (
    ListingCreate,
    ListingDetailResponse,
    ListingResponse,
    ListingUpdate,
    PackCacheSummary,
    PaginatedListingsResponse,
    PaginatedRecentListingsOut,
    RecentListingOut,
)
from app.schemas.pharmalake import PharmaLakeIngredient, PharmaLakePack
from app.services.pharmalake_catalog_service import pharmalake_catalog

_cache_repo = CatalogCacheRepository()
_packs_cache_repo = PacksCacheRepository()


def _pack_cache_to_summary(cache: SupplierPackCache) -> PackCacheSummary:
    """Convert a pharmalake_packs_caches ORM row to the inline PackCacheSummary schema."""
    return PackCacheSummary(
        pack_id=str(cache.pack_id),
        product_id=str(cache.product_id) if cache.product_id else None,
        presentation_id=str(cache.presentation_id) if cache.presentation_id else None,
        org_id=str(cache.org_id) if cache.org_id else None,
        org_name=cache.org_name,
        brand_name=cache.brand_name,
        sku=cache.sku,
        barcode=cache.barcode,
        pack_qty_value=str(cache.pack_qty_value) if cache.pack_qty_value is not None else None,
        pack_qty_unit_code=cache.pack_qty_unit_code,
        pack_qty_unit_name=cache.pack_qty_unit_name,
        dosage_form_name=cache.dosage_form_name,
        route_name=cache.route_name,
        description=cache.description,
        ingredients=cache.ingredients or [],
        is_active=cache.is_active,
    )


def _listing_with_pack(
    listing: SupplierListing, cache: Optional[SupplierPackCache]
) -> ListingResponse:
    """Build a ListingResponse with joined pack metadata (None when not synced)."""
    pack = _pack_cache_to_summary(cache) if cache is not None else None
    return ListingResponse(
        id=listing.id,
        supplier_id=listing.supplier_id,
        pack_id=listing.pack_id,
        is_enabled=listing.is_enabled,
        base_price=listing.base_price,
        moq=listing.moq,
        lead_time_days=listing.lead_time_days,
        stock_qty=listing.stock_qty,
        created_at=listing.created_at.isoformat(),
        updated_at=listing.updated_at.isoformat(),
        pack=pack,
    )


def _cache_to_pack(cached: PharmaLakeCatalogCache) -> PharmaLakePack:
    """Convert a cache ORM row to the PharmaLakePack Pydantic schema."""
    ingredients = []
    if cached.ingredients_json:
        raw = cached.ingredients_json
        if isinstance(raw, list):
            ingredients = [PharmaLakeIngredient.model_validate(i) for i in raw]
    return PharmaLakePack(
        pack_id=str(cached.pack_id),
        brand_name=cached.brand_name,
        org_id=cached.org_id,
        org_name=cached.org_name,
        dosage_form_name=cached.dosage_form_name,
        route_name=cached.route_name,
        pack_qty_value=cached.pack_qty_value,
        pack_qty_unit_code=cached.pack_qty_unit_code,
        pack_qty_unit_name=cached.pack_qty_unit_name,
        barcode=cached.barcode,
        sku=cached.sku,
        is_active=cached.is_active,
        ingredients=ingredients,
    )


class ListingService:
    def __init__(
        self, session_factory: Callable[[], AbstractContextManager]
    ) -> None:
        self.repo = ListingRepository(session_factory)

    # ── Create ─────────────────────────────────────────────────────────────────

    def create(
        self, supplier_id: uuid.UUID, data: ListingCreate
    ) -> ListingResponse:
        # 1. Verify pack_id against local cache if present.
        #    If not in cache (possible when Browse Catalog is using the live
        #    PharmaLake feed and a sync hasn't run yet), we trust the pack_id —
        #    the UI only shows items returned by PharmaLake directly.
        #    We only hard-reject if the pack is explicitly marked inactive.
        cached = _cache_repo.get_by_pack_id(data.pack_id)
        if cached is not None and not cached.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"pack_id '{data.pack_id}' is not active in the catalog.",
            )

        # Auto-populate the local cache when the pack came from the live
        # PharmaLake feed (frontend passes pack_meta for packs not yet synced).
        if cached is None and data.pack_meta is not None:
            meta = data.pack_meta
            now = datetime.now(timezone.utc)
            _cache_repo.upsert_batch([{
                "pack_id": data.pack_id,
                "brand_name": meta.brand_name,
                "barcode": meta.barcode,
                "sku": meta.sku,
                "org_id": meta.org_id,
                "org_name": meta.org_name,
                "dosage_form_name": meta.dosage_form_name,
                "route_name": meta.route_name,
                "pack_qty_value": meta.pack_qty_value,
                "pack_qty_unit_code": meta.pack_qty_unit_code,
                "pack_qty_unit_name": meta.pack_qty_unit_name,
                "ingredients_json": meta.ingredients_json,
                "is_active": True,
                "synced_at": now,
                "first_seen_at": now,
            }])

        # Always upsert into the per-supplier packs cache so the listing
        # immediately has pack metadata without needing a full sync run.
        if data.pack_meta is not None:
            meta = data.pack_meta
            _packs_cache_repo.upsert_one(supplier_id, {
                "pack_id": str(data.pack_id),
                "org_id": meta.org_id,
                "org_name": meta.org_name,
                "brand_name": meta.brand_name,
                "sku": meta.sku,
                "barcode": meta.barcode,
                "pack_qty_value": meta.pack_qty_value,
                "pack_qty_unit_code": meta.pack_qty_unit_code,
                "pack_qty_unit_name": meta.pack_qty_unit_name,
                "dosage_form_name": meta.dosage_form_name,
                "route_name": meta.route_name,
                "ingredients": meta.ingredients_json or [],
                "is_active": True,
            })

        # 2. Enforce unique constraint (friendly error before DB raises it)
        existing = self.repo.get_by_supplier_and_pack(supplier_id, data.pack_id)
        if existing:
            if existing.is_enabled:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This product is already in your catalog.",
                )
            # Re-enable a previously disabled listing instead of creating a new one
            updated = self.repo.update(
                existing,
                base_price=data.base_price,
                moq=data.moq,
                lead_time_days=data.lead_time_days,
                is_enabled=True,
            )
            return ListingResponse.from_orm_listing(updated)

        # 3. Create
        listing = SupplierListing(
            id=uuid.uuid4(),
            supplier_id=supplier_id,
            pack_id=data.pack_id,
            base_price=data.base_price,
            moq=data.moq,
            lead_time_days=data.lead_time_days,
            stock_qty=data.stock_qty,
        )
        created = self.repo.create(listing)
        return ListingResponse.from_orm_listing(created)

    # ── List (paginated) ───────────────────────────────────────────────────────

    def list(
        self,
        supplier_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
        q: Optional[str] = None,
    ) -> PaginatedListingsResponse:
        rows, total = self.repo.list_by_supplier(
            supplier_id, limit=limit, offset=offset, include_disabled=True, q=q
        )
        return PaginatedListingsResponse(
            items=[_listing_with_pack(listing, cache) for listing, cache in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # ── Get single with PharmaLake details ────────────────────────────────────

    def get_detail(
        self, supplier_id: uuid.UUID, listing_id: uuid.UUID
    ) -> ListingDetailResponse:
        listing = self._get_owned_or_404(supplier_id, listing_id)
        cached = _cache_repo.get_by_pack_id(listing.pack_id)
        pack = _cache_to_pack(cached) if cached else None
        base = ListingResponse.from_orm_listing(listing)
        return ListingDetailResponse(**base.model_dump(), pack=pack)

    # ── Update ─────────────────────────────────────────────────────────────────

    def update(
        self,
        supplier_id: uuid.UUID,
        listing_id: uuid.UUID,
        data: ListingUpdate,
    ) -> ListingResponse:
        listing = self._get_owned_or_404(supplier_id, listing_id)
        kwargs = data.model_dump(exclude_unset=True)
        updated = self.repo.update(
            listing,
            base_price=kwargs.get("base_price", ...),  # type: ignore[arg-type]
            moq=kwargs.get("moq", ...),  # type: ignore[arg-type]
            lead_time_days=kwargs.get("lead_time_days", ...),  # type: ignore[arg-type]
            stock_qty=kwargs.get("stock_qty", ...),  # type: ignore[arg-type]
            is_enabled=kwargs.get("is_enabled"),
        )
        return ListingResponse.from_orm_listing(updated)

    # ── Dedicated stock update ──────────────────────────────────────────────────

    def update_stock(
        self,
        supplier_id: uuid.UUID,
        listing_id: uuid.UUID,
        stock_qty: Optional[int],
    ) -> ListingResponse:
        """
        Set the stock quantity for a listing.
        stock_qty=None means unlimited / stop tracking.
        stock_qty=0 means out of stock.
        """
        listing = self._get_owned_or_404(supplier_id, listing_id)
        updated = self.repo.update(listing, stock_qty=stock_qty)
        return ListingResponse.from_orm_listing(updated)

    # ── Recently added (by this supplier) ───────────────────────────────────

    def list_recently_added(
        self,
        supplier_id: uuid.UUID,
        days: int = 7,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedRecentListingsOut:
        items, total = self.repo.list_recently_added(
            supplier_id, days=days, limit=limit, offset=offset
        )
        out: list[RecentListingOut] = []
        for listing in items:
            cached = _cache_repo.get_by_pack_id(listing.pack_id)
            strength: Optional[str] = None
            inn_name: Optional[str] = None
            if cached and cached.ingredients_json:
                parts = []
                inn_parts = []
                for ing in (cached.ingredients_json or []):
                    if not isinstance(ing, dict):
                        continue
                    # INN name
                    name = ing.get("inn_name")
                    if name:
                        inn_parts.append(str(name))
                    # Strength
                    strength_data = ing.get("strength", {})
                    val = strength_data.get("numerator_value") if strength_data else None
                    unit = strength_data.get("numerator_unit_code") if strength_data else None
                    if val:
                        v = float(val)
                        v_str = str(int(v)) if v == int(v) else f"{v:.2f}"
                        parts.append(f"{v_str}{(' ' + unit) if unit else ''}")
                strength = " / ".join(parts) or None
                inn_name = " / ".join(inn_parts) or None
            out.append(
                RecentListingOut(
                    id=listing.id,
                    pack_id=listing.pack_id,
                    is_enabled=listing.is_enabled,
                    base_price=listing.base_price,
                    moq=listing.moq,
                    lead_time_days=listing.lead_time_days,
                    stock_qty=listing.stock_qty,
                    added_at=listing.created_at.isoformat(),
                    brand_name=cached.brand_name if cached else None,
                    inn_name=inn_name,
                    org_name=cached.org_name if cached else None,
                    dosage_form_name=cached.dosage_form_name if cached else None,
                    route_name=cached.route_name if cached else None,
                    pack_qty_value=cached.pack_qty_value if cached else None,
                    pack_qty_unit_code=cached.pack_qty_unit_code if cached else None,
                    strength_summary=strength,
                )
            )
        return PaginatedRecentListingsOut(
            items=out, total=total, limit=limit, offset=offset
        )

    # ── Soft-delete (disable) ─────────────────────────────────────────────────

    def disable(
        self, supplier_id: uuid.UUID, listing_id: uuid.UUID
    ) -> ListingResponse:
        listing = self._get_owned_or_404(supplier_id, listing_id)
        updated = self.repo.update(listing, is_enabled=False)
        return ListingResponse.from_orm_listing(updated)

    # ── Get active pack_id set (used by FE to show "Added" badges) ─────────────

    def get_active_pack_ids(self, supplier_id: uuid.UUID) -> set[str]:
        return self.repo.get_active_pack_ids(supplier_id)

    # ── Internal helper ────────────────────────────────────────────────────────

    def _get_owned_or_404(
        self, supplier_id: uuid.UUID, listing_id: uuid.UUID
    ) -> SupplierListing:
        listing = self.repo.get(listing_id)
        if listing is None or listing.supplier_id != supplier_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found.",
            )
        return listing
