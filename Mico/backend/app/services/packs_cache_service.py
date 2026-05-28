"""
Per-supplier packs-cache sync service.
Fetches pack metadata from PharmaLake for the supplier's listed pack_ids,
then delegates a transactional bulk-upsert + reconciliation to the repository.
"""
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Iterator, Optional

from fastapi import HTTPException, status

from app.repositories.listing_repository import ListingRepository
from app.repositories.packs_cache_repository import ConcurrentSyncError, PacksCacheRepository
from app.schemas.packs_cache import PacksCacheItem, PacksCacheListResponse, PacksCacheSyncResponse
from app.services.pharmalake_catalog_service import pharmalake_catalog
from app.db.session import get_sync_session

logger = logging.getLogger(__name__)

_BATCH_SIZE = 100  # pack_ids per PharmaLake /catalog/batch call


def _advisory_lock_key(supplier_id: uuid.UUID) -> int:
    """
    Derive a stable signed int64 advisory lock key from a supplier UUID.
    Uses the first 8 bytes of SHA-256 so the distribution is uniform.
    """
    digest = hashlib.sha256(str(supplier_id).encode()).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def _chunks(items: list, size: int) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


class PacksCacheService:
    def __init__(self) -> None:
        self._repo = PacksCacheRepository()
        self._listing_repo = ListingRepository(get_sync_session)

    # ── Sync ──────────────────────────────────────────────────────────────────

    async def sync(self, supplier_id: uuid.UUID) -> PacksCacheSyncResponse:
        """
        Full sync flow:
        1. Resolve the supplier's current listing pack_ids from the local DB.
        2. Fetch full pack metadata from PharmaLake in batches of 100.
        3. Upsert all returned packs + deactivate missing ones (single txn).
        Returns a PacksCacheSyncResponse summary.
        """
        started_at = datetime.now(timezone.utc)
        lock_key = _advisory_lock_key(supplier_id)

        logger.info("packs-cache sync started — supplier=%s", supplier_id)

        # ── 1. Get all pack_ids the supplier has listed ───────────────────────
        pack_ids = self._listing_repo.get_all_pack_ids(supplier_id)
        logger.info(
            "packs-cache sync — supplier=%s has %d listed pack_ids",
            supplier_id,
            len(pack_ids),
        )

        # ── 2. Fetch metadata from PharmaLake in chunks ───────────────────────
        all_packs: list[dict] = []
        for idx, chunk in enumerate(_chunks(pack_ids, _BATCH_SIZE), start=1):
            try:
                batch = await pharmalake_catalog.batch_lookup(chunk)
                all_packs.extend(batch)
                logger.debug(
                    "packs-cache sync chunk %d: received %d packs (supplier=%s)",
                    idx,
                    len(batch),
                    supplier_id,
                )
            except Exception as exc:
                logger.error(
                    "packs-cache sync — PharmaLake batch_lookup failed for chunk %d "
                    "(supplier=%s): %s",
                    idx,
                    supplier_id,
                    exc,
                    exc_info=True,
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to fetch pack metadata from PharmaLake: {exc}",
                ) from exc

        logger.info(
            "packs-cache sync — fetched %d packs from PharmaLake (supplier=%s)",
            len(all_packs),
            supplier_id,
        )

        # ── 3. Upsert + reconcile in one DB transaction ───────────────────────
        try:
            summary = self._repo.sync_bulk(
                supplier_id=supplier_id,
                lock_key=lock_key,
                raw_packs=all_packs,
                started_at=started_at,
            )
        except ConcurrentSyncError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sync already in progress for this supplier.",
            )

        logger.info(
            "packs-cache sync complete — supplier=%s upserted=%d deactivated=%d",
            supplier_id,
            summary["upserted_count"],
            summary["deactivated_count"],
        )

        return PacksCacheSyncResponse(**summary)

    # ── List ──────────────────────────────────────────────────────────────────

    def list_cached(
        self,
        supplier_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        active_only: bool = True,
    ) -> PacksCacheListResponse:
        items, total = self._repo.list_by_supplier(
            supplier_id=supplier_id,
            page=page,
            page_size=page_size,
            search=search,
            active_only=active_only,
        )
        return PacksCacheListResponse(
            items=[_row_to_schema(row) for row in items],
            total=total,
            page=page,
            page_size=page_size,
        )


def _row_to_schema(row) -> PacksCacheItem:
    return PacksCacheItem(
        id=str(row.id),
        supplier_id=str(row.supplier_id),
        pack_id=str(row.pack_id),
        product_id=str(row.product_id) if row.product_id else None,
        presentation_id=str(row.presentation_id) if row.presentation_id else None,
        org_id=str(row.org_id) if row.org_id else None,
        org_name=row.org_name,
        brand_name=row.brand_name,
        sku=row.sku,
        barcode=row.barcode,
        pack_qty_value=str(row.pack_qty_value) if row.pack_qty_value is not None else None,
        pack_qty_unit_code=row.pack_qty_unit_code,
        pack_qty_unit_name=row.pack_qty_unit_name,
        dosage_form_name=row.dosage_form_name,
        route_name=row.route_name,
        description=row.description,
        ingredients=row.ingredients or [],
        is_active=row.is_active,
        source_synced_at=row.source_synced_at.isoformat(),
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


# Module-level singleton
packs_cache_service = PacksCacheService()
