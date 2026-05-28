import uuid
from contextlib import AbstractContextManager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Callable, Optional

from sqlalchemy import String, func, nullslast, or_
from sqlalchemy.orm import Session

from app.models.pharmalake_pack_cache import PharmaLakePackCache
from app.models.supplier_listing import SupplierListing


class ListingRepository:
    def __init__(
        self, session_factory: Callable[[], AbstractContextManager[Session]]
    ) -> None:
        self.session_factory = session_factory

    def create(self, listing: SupplierListing) -> SupplierListing:
        with self.session_factory() as session:
            session.add(listing)
            session.flush()
            session.refresh(listing)
            return listing

    def get(self, listing_id: uuid.UUID) -> Optional[SupplierListing]:
        with self.session_factory() as session:
            return session.get(SupplierListing, listing_id)

    def get_by_supplier_and_pack(
        self, supplier_id: uuid.UUID, pack_id: uuid.UUID
    ) -> Optional[SupplierListing]:
        with self.session_factory() as session:
            return (
                session.query(SupplierListing)
                .filter(
                    SupplierListing.supplier_id == supplier_id,
                    SupplierListing.pack_id == pack_id,
                )
                .first()
            )

    def list_by_supplier(
        self,
        supplier_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
        include_disabled: bool = False,
        q: Optional[str] = None,
    ) -> tuple[list[tuple], int]:
        """
        LEFT OUTER JOIN with pharmalake_packs_caches so each listing is returned
        together with its cached pack metadata (or None if not yet synced).
        Supports optional ILIKE text search across the joined pack columns.
        """
        with self.session_factory() as session:
            join_cond = (
                (PharmaLakePackCache.supplier_id == SupplierListing.supplier_id)
                & (PharmaLakePackCache.pack_id == SupplierListing.pack_id)
            )
            base_filter = [SupplierListing.supplier_id == supplier_id]
            if not include_disabled:
                base_filter.append(SupplierListing.is_enabled.is_(True))

            search_filter = None
            if q and q.strip():
                needle = f"%{q.strip()}%"
                search_filter = or_(
                    PharmaLakePackCache.brand_name.ilike(needle),
                    PharmaLakePackCache.org_name.ilike(needle),
                    PharmaLakePackCache.dosage_form_name.ilike(needle),
                    PharmaLakePackCache.route_name.ilike(needle),
                    PharmaLakePackCache.barcode.ilike(needle),
                    PharmaLakePackCache.sku.ilike(needle),
                    # Cast JSONB array to text so ILIKE matches inn_name / substance names
                    func.cast(PharmaLakePackCache.ingredients, String).ilike(needle),
                )

            # Count (always includes JOIN so search filter applies correctly)
            count_q = (
                session.query(func.count(SupplierListing.id))
                .outerjoin(PharmaLakePackCache, join_cond)
                .filter(*base_filter)
            )
            if search_filter is not None:
                count_q = count_q.filter(search_filter)
            total: int = count_q.scalar() or 0

            # Fetch rows
            rows_q = (
                session.query(SupplierListing, PharmaLakePackCache)
                .outerjoin(PharmaLakePackCache, join_cond)
                .filter(*base_filter)
            )
            if search_filter is not None:
                rows_q = rows_q.filter(search_filter)

            rows = (
                rows_q.order_by(
                    nullslast(func.lower(PharmaLakePackCache.brand_name).asc())
                )
                .offset(offset)
                .limit(limit)
                .all()
            )
            return rows, total

    def update(
        self,
        listing: SupplierListing,
        *,
        base_price: Optional[Decimal] = ...,  # type: ignore[assignment]
        moq: Optional[Decimal] = ...,  # type: ignore[assignment]
        lead_time_days: Optional[int] = ...,  # type: ignore[assignment]
        stock_qty: Optional[int] = ...,  # type: ignore[assignment]
        is_enabled: Optional[bool] = None,
    ) -> SupplierListing:
        """Partial update — only fields explicitly passed (not sentinel) are changed."""
        _SENTINEL = ...
        with self.session_factory() as session:
            obj = session.merge(listing)
            if base_price is not _SENTINEL:
                obj.base_price = base_price  # type: ignore[assignment]
            if moq is not _SENTINEL:
                obj.moq = moq  # type: ignore[assignment]
            if lead_time_days is not _SENTINEL:
                obj.lead_time_days = lead_time_days  # type: ignore[assignment]
            if stock_qty is not _SENTINEL:
                obj.stock_qty = stock_qty  # type: ignore[assignment]
            if is_enabled is not None:
                obj.is_enabled = is_enabled
            session.flush()
            session.refresh(obj)
            return obj

    def get_active_pack_ids(self, supplier_id: uuid.UUID) -> set[str]:
        """Return pack_id strings for all enabled listings of a supplier."""
        with self.session_factory() as session:
            rows = (
                session.query(SupplierListing.pack_id)
                .filter(
                    SupplierListing.supplier_id == supplier_id,
                    SupplierListing.is_enabled.is_(True),
                )
                .all()
            )
            return {str(row[0]) for row in rows}

    def get_all_pack_ids(self, supplier_id: uuid.UUID) -> list[str]:
        """
        Return ALL distinct pack_id strings for a supplier regardless of
        is_enabled state.  Used by the packs-cache sync to know which packs
        to fetch from PharmaLake.
        """
        with self.session_factory() as session:
            rows = (
                session.query(SupplierListing.pack_id)
                .filter(SupplierListing.supplier_id == supplier_id)
                .distinct()
                .all()
            )
            return [str(row[0]) for row in rows]

    def list_recently_added(
        self,
        supplier_id: uuid.UUID,
        days: int = 7,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[SupplierListing], int]:
        """Return listings this supplier added within the last `days` days."""
        since = datetime.now(tz=timezone.utc) - timedelta(days=days)
        with self.session_factory() as session:
            q = (
                session.query(SupplierListing)
                .filter(
                    SupplierListing.supplier_id == supplier_id,
                    SupplierListing.created_at >= since,
                )
            )
            total: int = q.count()
            items = (
                q.order_by(SupplierListing.created_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return items, total