"""
Syncs the local PharmaLake catalog cache from the upstream PharmaLake API.
Paginates through all active packs, then upserts into the local DB.
"""
import logging
from datetime import datetime, timezone

from app.repositories.catalog_cache_repository import CatalogCacheRepository
from app.services.pharmalake_auth_service import pharmalake_auth
from app.services.pharmalake_catalog_service import pharmalake_catalog

logger = logging.getLogger(__name__)

_SYNC_PAGE_SIZE = 200  # items per page when pulling from PharmaLake


class CatalogSyncService:
    def __init__(self) -> None:
        self._repo = CatalogCacheRepository()

    async def sync_all(
        self, is_active: bool = True
    ) -> dict:
        """
        Page through PharmaLake /catalog/search and upsert every pack into the
        local cache. Returns sync statistics.
        """
        now_utc = datetime.now(timezone.utc)
        synced = 0
        pages = 0
        offset = 0

        logger.info("Starting PharmaLake catalog sync (is_active=%s)", is_active)

        while True:
            result = await pharmalake_catalog.search_catalog(
                is_active=is_active,
                limit=_SYNC_PAGE_SIZE,
                offset=offset,
                q=None,  # no filter — pull everything
            )

            items = result.items  # PharmaLakeCatalogResponse is a Pydantic model
            if not items:
                break

            rows = [
                {
                    "pack_id": item.pack_id,
                    "brand_name": item.brand_name,
                    "barcode": item.barcode,
                    "sku": item.sku,
                    "org_id": item.org_id,
                    "org_name": item.org_name,
                    "dosage_form_name": item.dosage_form_name,
                    "route_name": item.route_name,
                    "pack_qty_value": item.pack_qty_value,
                    "pack_qty_unit_code": item.pack_qty_unit_code,
                    "pack_qty_unit_name": item.pack_qty_unit_name,
                    "ingredients_json": [ing.model_dump() for ing in item.ingredients],
                    "is_active": item.is_active if item.is_active is not None else is_active,
                    "synced_at": now_utc,
                    # first_seen_at is provided here but the upsert COALESCE
                    # preserves the existing DB value for rows already known.
                    "first_seen_at": now_utc,
                }
                for item in items
            ]

            self._repo.upsert_batch(rows)
            synced += len(rows)
            pages += 1

            logger.info(
                "Sync page %d: upserted %d items (total so far: %d)",
                pages,
                len(rows),
                synced,
            )

            # Stop if we've consumed all pages
            total = result.total
            offset += _SYNC_PAGE_SIZE
            if offset >= total:
                break

        logger.info(
            "PharmaLake catalog sync complete: %d items across %d pages",
            synced,
            pages,
        )
        return {"synced": synced, "pages": pages, "is_active": is_active}


catalog_sync = CatalogSyncService()
