"""
Repository for the per-supplier PharmaLake packs cache.
All writes go through sync_bulk which acquires a per-supplier advisory lock,
bulk-upserts the payload, and reconciles removed packs — all in one transaction.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional

from sqlalchemy import or_, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import get_sync_session
from app.models.pharmalake_pack_cache import PharmaLakePackCache


class ConcurrentSyncError(Exception):
    """Raised when the per-supplier advisory lock cannot be acquired."""


def _parse_uuid(value: Optional[str]) -> Optional[uuid.UUID]:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


def _parse_numeric(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        return None


def _pack_to_row(supplier_id: uuid.UUID, raw: dict, now: datetime) -> dict:
    """Convert a raw PharmaLake pack dict → upsert-ready column dict."""
    return {
        "supplier_id": supplier_id,
        "pack_id": _parse_uuid(raw.get("pack_id")),
        "product_id": _parse_uuid(raw.get("product_id")),
        "presentation_id": _parse_uuid(raw.get("presentation_id")),
        "org_id": _parse_uuid(raw.get("org_id")),
        "org_name": raw.get("org_name"),
        "brand_name": raw.get("brand_name"),
        "sku": raw.get("sku"),
        "barcode": raw.get("barcode"),
        "pack_qty_value": _parse_numeric(raw.get("pack_qty_value")),
        "pack_qty_unit_code": raw.get("pack_qty_unit_code"),
        "pack_qty_unit_name": raw.get("pack_qty_unit_name"),
        "dosage_form_name": raw.get("dosage_form_name"),
        "route_name": raw.get("route_name"),
        "description": raw.get("description"),
        # Store the full ingredients array as-is (strings stay strings)
        "ingredients": raw.get("ingredients") or [],
        "is_active": bool(raw.get("is_active", True)),
        # Full raw payload preserved
        "raw_payload": raw,
        "source_synced_at": now,
        "updated_at": now,
    }


class PacksCacheRepository:
    """Uses the sync session factory (get_sync_session)."""

    # ── Sync ──────────────────────────────────────────────────────────────────

    def sync_bulk(
        self,
        supplier_id: uuid.UUID,
        lock_key: int,
        raw_packs: list[dict],
        started_at: datetime,
    ) -> dict:
        """
        Within a single transaction:
        1. Acquire a per-supplier advisory xact lock (409 if busy).
        2. Bulk-upsert all raw_packs using ON CONFLICT DO UPDATE.
        3. Mark any previously cached packs NOT in this batch as is_active=False.
        4. Return a summary dict matching PacksCacheSyncResponse.
        """
        now = datetime.now(timezone.utc)

        with get_sync_session() as session:
            # ── 1. Advisory lock (transaction-scoped) ──────────────────────
            acquired: bool = session.execute(
                text("SELECT pg_try_advisory_xact_lock(:key)"),
                {"key": lock_key},
            ).scalar()  # type: ignore[assignment]

            if not acquired:
                raise ConcurrentSyncError(
                    f"Sync already in progress for supplier {supplier_id}"
                )

            received = len(raw_packs)
            upserted = 0
            deactivated = 0

            if raw_packs:
                # ── 2. Bulk upsert ─────────────────────────────────────────
                rows = [_pack_to_row(supplier_id, p, now) for p in raw_packs]
                stmt = pg_insert(PharmaLakePackCache).values(rows)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_packs_cache_supplier_pack",
                    set_={
                        "product_id": stmt.excluded.product_id,
                        "presentation_id": stmt.excluded.presentation_id,
                        "org_id": stmt.excluded.org_id,
                        "org_name": stmt.excluded.org_name,
                        "brand_name": stmt.excluded.brand_name,
                        "sku": stmt.excluded.sku,
                        "barcode": stmt.excluded.barcode,
                        "pack_qty_value": stmt.excluded.pack_qty_value,
                        "pack_qty_unit_code": stmt.excluded.pack_qty_unit_code,
                        "pack_qty_unit_name": stmt.excluded.pack_qty_unit_name,
                        "dosage_form_name": stmt.excluded.dosage_form_name,
                        "route_name": stmt.excluded.route_name,
                        "description": stmt.excluded.description,
                        "ingredients": stmt.excluded.ingredients,
                        "is_active": stmt.excluded.is_active,
                        "raw_payload": stmt.excluded.raw_payload,
                        "source_synced_at": stmt.excluded.source_synced_at,
                        "updated_at": stmt.excluded.updated_at,
                    },
                )
                session.execute(stmt)
                upserted = received

                # ── 3. Deactivate packs not returned by PharmaLake ─────────
                present_ids = [
                    _parse_uuid(p.get("pack_id"))
                    for p in raw_packs
                    if p.get("pack_id")
                ]
                result = session.execute(
                    update(PharmaLakePackCache)
                    .where(
                        PharmaLakePackCache.supplier_id == supplier_id,
                        PharmaLakePackCache.pack_id.not_in(present_ids),
                        PharmaLakePackCache.is_active.is_(True),
                    )
                    .values(is_active=False, updated_at=now)
                )
                deactivated = result.rowcount  # type: ignore[assignment]

            else:
                # No packs at all — deactivate everything for this supplier
                result = session.execute(
                    update(PharmaLakePackCache)
                    .where(
                        PharmaLakePackCache.supplier_id == supplier_id,
                        PharmaLakePackCache.is_active.is_(True),
                    )
                    .values(is_active=False, updated_at=now)
                )
                deactivated = result.rowcount  # type: ignore[assignment]

        return {
            "supplier_id": str(supplier_id),
            "received_count": received,
            "upserted_count": upserted,
            "deactivated_count": deactivated,
            "started_at": started_at.isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── List / Search ─────────────────────────────────────────────────────────

    def upsert_one(self, supplier_id: uuid.UUID, raw: dict) -> None:
        """
        Insert or update a single pack row for a supplier.
        Called when a supplier adds a listing from the live catalog browser
        so the pack is immediately searchable / displayable without a full sync.
        """
        now = datetime.now(timezone.utc)
        row = _pack_to_row(supplier_id, raw, now)
        stmt = pg_insert(PharmaLakePackCache).values([row])
        stmt = stmt.on_conflict_do_update(
            constraint="uq_packs_cache_supplier_pack",
            set_={
                "product_id": stmt.excluded.product_id,
                "presentation_id": stmt.excluded.presentation_id,
                "org_id": stmt.excluded.org_id,
                "org_name": stmt.excluded.org_name,
                "brand_name": stmt.excluded.brand_name,
                "sku": stmt.excluded.sku,
                "barcode": stmt.excluded.barcode,
                "pack_qty_value": stmt.excluded.pack_qty_value,
                "pack_qty_unit_code": stmt.excluded.pack_qty_unit_code,
                "pack_qty_unit_name": stmt.excluded.pack_qty_unit_name,
                "dosage_form_name": stmt.excluded.dosage_form_name,
                "route_name": stmt.excluded.route_name,
                "description": stmt.excluded.description,
                "ingredients": stmt.excluded.ingredients,
                "is_active": stmt.excluded.is_active,
                "raw_payload": stmt.excluded.raw_payload,
                "source_synced_at": stmt.excluded.source_synced_at,
                "updated_at": stmt.excluded.updated_at,
            },
        )
        with get_sync_session() as session:
            session.execute(stmt)

    def list_by_supplier(
        self,
        supplier_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        active_only: bool = True,
    ) -> tuple[list[PharmaLakePackCache], int]:
        """
        Return a paginated slice of cached packs for a supplier.
        `search` performs ILIKE matching on brand_name, sku, barcode.
        """
        with get_sync_session() as session:
            q = session.query(PharmaLakePackCache).filter(
                PharmaLakePackCache.supplier_id == supplier_id
            )

            if active_only:
                q = q.filter(PharmaLakePackCache.is_active.is_(True))

            if search and search.strip():
                needle = f"%{search.strip()}%"
                q = q.filter(
                    or_(
                        PharmaLakePackCache.brand_name.ilike(needle),
                        PharmaLakePackCache.sku.ilike(needle),
                        PharmaLakePackCache.barcode.ilike(needle),
                    )
                )

            total = q.count()
            offset = (page - 1) * page_size
            items = (
                q.order_by(PharmaLakePackCache.brand_name.asc().nullslast())
                .offset(offset)
                .limit(page_size)
                .all()
            )
            return items, total
