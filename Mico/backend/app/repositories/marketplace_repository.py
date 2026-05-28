"""
Repository for buyer-facing marketplace queries.
Joins SupplierListing with pharmalake_packs_caches (per-supplier, preferred)
and pharmalake_catalog_cache (global, fallback) for package lookups.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import String, func, or_

from app.db.session import get_sync_session
from app.models.pharmalake_cache import PharmaLakeCatalogCache
from app.models.pharmalake_pack_cache import PharmaLakePackCache
from app.models.supplier import Supplier, SupplierStatus
from app.models.supplier_listing import SupplierListing
from app.schemas.marketplace import (
    MarketplacePackageOut,
    MarketplaceSupplierOut,
    PaginatedMarketplacePackages,
    PaginatedMarketplaceSuppliers,
)


def _ilike(v: str) -> str:
    return f"%{v}%"


def _coalesce(*values):
    """Return the first non-None value."""
    for v in values:
        if v is not None:
            return v
    return None


class MarketplaceRepository:
    """Uses the sync session factory (get_sync_session context manager)."""

    # ── Suppliers ──────────────────────────────────────────────────────────────

    def list_suppliers(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        q: Optional[str] = None,
    ) -> PaginatedMarketplaceSuppliers:
        with get_sync_session() as session:
            query = session.query(Supplier).filter(
                Supplier.status == SupplierStatus.APPROVED
            )

            if q:
                pattern = _ilike(q)
                query = query.filter(
                    or_(
                        Supplier.trade_name.ilike(pattern),
                        Supplier.legal_name.ilike(pattern),
                        Supplier.city.ilike(pattern),
                        Supplier.province.ilike(pattern),
                    )
                )

            total: int = query.count()
            rows = (
                query.order_by(Supplier.trade_name.asc(), Supplier.legal_name.asc())
                .offset(offset)
                .limit(limit)
                .all()
            )

            items = [
                MarketplaceSupplierOut(
                    supplier_id=row.id,
                    supplier_code=row.supplier_code,
                    legal_name=row.legal_name,
                    trade_name=row.trade_name,
                    contact_email=row.email,
                    city=row.city,
                    province=row.province,
                    status=row.status.value,
                )
                for row in rows
            ]

            return PaginatedMarketplaceSuppliers(
                items=items, total=total, limit=limit, offset=offset
            )

    def get_supplier(
        self, supplier_id: uuid.UUID
    ) -> Optional[MarketplaceSupplierOut]:
        with get_sync_session() as session:
            row = session.query(Supplier).filter(Supplier.id == supplier_id).first()
            if not row:
                return None
            return MarketplaceSupplierOut(
                supplier_id=row.id,
                supplier_code=row.supplier_code,
                legal_name=row.legal_name,
                trade_name=row.trade_name,
                contact_email=row.email,
                city=row.city,
                province=row.province,
                status=row.status.value,
            )

    # ── Packages ───────────────────────────────────────────────────────────────

    def list_packages(
        self,
        supplier_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
        q: Optional[str] = None,
        is_enabled: bool = True,
    ) -> PaginatedMarketplacePackages:
        with get_sync_session() as session:
            # LEFT JOIN per-supplier cache (preferred — populated on listing create
            # and during sync). Also LEFT JOIN global cache as fallback.
            query = (
                session.query(SupplierListing, PharmaLakePackCache, PharmaLakeCatalogCache)
                .outerjoin(
                    PharmaLakePackCache,
                    (SupplierListing.pack_id == PharmaLakePackCache.pack_id)
                    & (PharmaLakePackCache.supplier_id == supplier_id),
                )
                .outerjoin(
                    PharmaLakeCatalogCache,
                    SupplierListing.pack_id == PharmaLakeCatalogCache.pack_id,
                )
                .filter(SupplierListing.supplier_id == supplier_id)
                .filter(SupplierListing.is_enabled == is_enabled)
                .filter(SupplierListing.base_price.isnot(None))
            )

            if q:
                pattern = _ilike(q)
                query = query.filter(
                    or_(
                        # Per-supplier cache — text fields
                        PharmaLakePackCache.brand_name.ilike(pattern),
                        PharmaLakePackCache.barcode.ilike(pattern),
                        PharmaLakePackCache.sku.ilike(pattern),
                        # Per-supplier cache — ingredient JSONB cast to text
                        func.cast(PharmaLakePackCache.ingredients, String).ilike(pattern),
                        # Global cache — text fields
                        PharmaLakeCatalogCache.brand_name.ilike(pattern),
                        PharmaLakeCatalogCache.barcode.ilike(pattern),
                        PharmaLakeCatalogCache.sku.ilike(pattern),
                        # Global cache — ingredient JSONB cast to text
                        func.cast(PharmaLakeCatalogCache.ingredients_json, String).ilike(pattern),
                    )
                )

            total: int = query.count()
            rows = (
                query.order_by(
                    # Prefer per-supplier cache brand_name, fall back to global
                    func.coalesce(
                        PharmaLakePackCache.brand_name,
                        PharmaLakeCatalogCache.brand_name,
                    ).asc(),
                    SupplierListing.created_at.desc(),
                )
                .offset(offset)
                .limit(limit)
                .all()
            )

            items = []
            for listing, pack_cache, global_cache in rows:
                # Prefer per-supplier cache, fall back to global catalog cache
                brand_name = _coalesce(
                    pack_cache.brand_name if pack_cache else None,
                    global_cache.brand_name if global_cache else None,
                )
                dosage_form_name = _coalesce(
                    pack_cache.dosage_form_name if pack_cache else None,
                    global_cache.dosage_form_name if global_cache else None,
                )
                route_name = _coalesce(
                    pack_cache.route_name if pack_cache else None,
                    global_cache.route_name if global_cache else None,
                )
                pack_qty_value = _coalesce(
                    str(pack_cache.pack_qty_value) if (pack_cache and pack_cache.pack_qty_value is not None) else None,
                    global_cache.pack_qty_value if global_cache else None,
                )
                pack_qty_unit_code = _coalesce(
                    pack_cache.pack_qty_unit_code if pack_cache else None,
                    global_cache.pack_qty_unit_code if global_cache else None,
                )
                barcode = _coalesce(
                    pack_cache.barcode if pack_cache else None,
                    global_cache.barcode if global_cache else None,
                )
                sku = _coalesce(
                    pack_cache.sku if pack_cache else None,
                    global_cache.sku if global_cache else None,
                )
                # Ingredients: per-supplier cache stores as plain list,
                # global cache stores as ingredients_json JSONB
                ingredients = _coalesce(
                    (pack_cache.ingredients if pack_cache and pack_cache.ingredients else None),
                    (global_cache.ingredients_json if global_cache and global_cache.ingredients_json else None),
                ) or []

                items.append(
                    MarketplacePackageOut(
                        listing_id=listing.id,
                        pack_id=listing.pack_id,
                        brand_name=brand_name,
                        dosage_form_name=dosage_form_name,
                        route_name=route_name,
                        pack_qty_value=pack_qty_value,
                        pack_qty_unit_code=pack_qty_unit_code,
                        barcode=barcode,
                        sku=sku,
                        ingredients=ingredients,
                        base_price=listing.base_price,
                        moq=listing.moq,
                        lead_time_days=listing.lead_time_days,
                        stock_qty=listing.stock_qty,
                        is_enabled=listing.is_enabled,
                    )
                )

            return PaginatedMarketplacePackages(
                items=items, total=total, limit=limit, offset=offset
            )
