"""
Repository for the local PharmaLake catalog cache.
Supports upsert (INSERT … ON CONFLICT DO UPDATE) and fast ILIKE text search.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import cast, func, or_, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import get_sync_session
from app.models.pharmalake_cache import PharmaLakeCatalogCache

_ILIKE_MAX_WORDS = 3  # prevent runaway wildcard expansion


def _ilike(value: str) -> str:
    return f"%{value}%"


class CatalogCacheRepository:
    """Uses the sync session factory (get_sync_session context manager)."""

    # ── Upsert ────────────────────────────────────────────────────────────────

    def upsert_batch(self, rows: list[dict]) -> int:
        """
        Bulk-upsert a list of pack dicts into the cache.
        Uses PostgreSQL INSERT … ON CONFLICT (pack_id) DO UPDATE.
        Returns the number of rows processed.
        """
        if not rows:
            return 0
        with get_sync_session() as session:
            stmt = pg_insert(PharmaLakeCatalogCache).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["pack_id"],
                set_={
                    "brand_name": stmt.excluded.brand_name,
                    "barcode": stmt.excluded.barcode,
                    "sku": stmt.excluded.sku,
                    "org_id": stmt.excluded.org_id,
                    "org_name": stmt.excluded.org_name,
                    "dosage_form_name": stmt.excluded.dosage_form_name,
                    "route_name": stmt.excluded.route_name,
                    "pack_qty_value": stmt.excluded.pack_qty_value,
                    "pack_qty_unit_code": stmt.excluded.pack_qty_unit_code,
                    "pack_qty_unit_name": stmt.excluded.pack_qty_unit_name,
                    "ingredients_json": stmt.excluded.ingredients_json,
                    "is_active": stmt.excluded.is_active,
                    "synced_at": stmt.excluded.synced_at,
                    # Preserve the original first_seen_at — never overwrite it.
                    # COALESCE keeps the existing DB value when it is not NULL.
                    "first_seen_at": func.coalesce(
                        PharmaLakeCatalogCache.first_seen_at,
                        stmt.excluded.first_seen_at,
                    ),
                },
            )
            session.execute(stmt)
            session.flush()
        return len(rows)

    # ── Get by pack_id ─────────────────────────────────────────────────────────

    def get_by_pack_id(self, pack_id: uuid.UUID) -> Optional[PharmaLakeCatalogCache]:
        """Return the cached pack row or None if not found."""
        with get_sync_session() as session:
            return session.get(PharmaLakeCatalogCache, pack_id)

    # ── Search ──────────────────────────────────────────────────────────────

    def search(
        self,
        q: Optional[str] = None,
        is_active: Optional[bool] = True,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PharmaLakeCatalogCache], int]:
        with get_sync_session() as session:
            query = session.query(PharmaLakeCatalogCache)

            if is_active is not None:
                query = query.filter(
                    PharmaLakeCatalogCache.is_active.is_(is_active)
                )

            if q and q.strip():
                needle = _ilike(q.strip())
                # Cast ingredients_json to text for a simple ILIKE match on inn_name
                ing_text = cast(
                    PharmaLakeCatalogCache.ingredients_json, text("TEXT")
                )
                query = query.filter(
                    or_(
                        PharmaLakeCatalogCache.brand_name.ilike(needle),
                        PharmaLakeCatalogCache.barcode.ilike(needle),
                        PharmaLakeCatalogCache.sku.ilike(needle),
                        PharmaLakeCatalogCache.org_name.ilike(needle),
                        func.cast(
                            PharmaLakeCatalogCache.ingredients_json,
                            text("text"),
                        ).ilike(needle),
                    )
                )

            total: int = query.count()
            items = (
                query.order_by(PharmaLakeCatalogCache.brand_name.asc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return items, total

    # ── Recently added ─────────────────────────────────────────────────────────

    def get_recently_added(
        self,
        days: int = 7,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PharmaLakeCatalogCache], int]:
        """
        Items first seen in the cache within the last `days` days,
        ordered newest-first.
        """
        with get_sync_session() as session:
            cutoff = func.now() - text(f"interval '{days} days'")
            q = (
                session.query(PharmaLakeCatalogCache)
                .filter(
                    PharmaLakeCatalogCache.first_seen_at.isnot(None),
                    PharmaLakeCatalogCache.first_seen_at >= cutoff,
                    PharmaLakeCatalogCache.is_active.is_(True),
                )
            )
            total = q.count()
            items = (
                q.order_by(PharmaLakeCatalogCache.first_seen_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return items, total
