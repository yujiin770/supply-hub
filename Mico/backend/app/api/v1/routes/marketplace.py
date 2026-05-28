"""
Marketplace (buyer-facing) routes — read-only catalog of approved suppliers and their
enabled listings.

Routes:
  GET /marketplace/suppliers                      — list approved suppliers (search + pagination)
  GET /marketplace/suppliers/{supplier_id}/packages — list enabled listings for a supplier
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_orders_caller, OrderCaller
from app.core.response import success_response
from app.repositories.marketplace_repository import MarketplaceRepository

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

_repo = MarketplaceRepository()


# ── Suppliers ──────────────────────────────────────────────────────────────────


@router.get("/suppliers")
async def list_marketplace_suppliers(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: Optional[str] = Query(default=None, max_length=200),
    _caller: OrderCaller = Depends(get_orders_caller),
):
    """
    List approved suppliers visible on the marketplace.
    Any authenticated user may call this endpoint.
    """
    result = _repo.list_suppliers(limit=limit, offset=offset, q=q)
    return success_response(result.model_dump())


@router.get("/suppliers/{supplier_id}", response_model=None)
async def get_marketplace_supplier(
    supplier_id: uuid.UUID,
    _caller: OrderCaller = Depends(get_orders_caller),
):
    """Return a single supplier's public profile."""
    supplier = _repo.get_supplier(supplier_id)
    if not supplier:
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Supplier not found.",
        )
    return success_response(supplier.model_dump())


# ── Packages ───────────────────────────────────────────────────────────────────


@router.get("/suppliers/{supplier_id}/packages")
async def list_supplier_packages(
    supplier_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: Optional[str] = Query(default=None, max_length=200),
    is_enabled: bool = Query(default=True),
    _caller: OrderCaller = Depends(get_orders_caller),
):
    """
    List enabled product listings for a specific supplier.
    Returns listing data joined with PharmaLake cache metadata.
    Any authenticated user may call this endpoint.
    """
    result = _repo.list_packages(
        supplier_id,
        limit=limit,
        offset=offset,
        q=q,
        is_enabled=is_enabled,
    )
    return success_response(result.model_dump())
