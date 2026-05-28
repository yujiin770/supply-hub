"""
Repository for Order + OrderItem CRUD using the sync session factory.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.db.session import get_sync_session
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem


class OrderRepository:
    """Uses the sync session factory (get_sync_session context manager)."""

    # ── Create ─────────────────────────────────────────────────────────────────

    def create(self, order: Order) -> Order:
        with get_sync_session() as session:
            session.add(order)
            session.flush()
            # Re-query with items eager-loaded
            obj = (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.id == order.id)
                .first()
            )
            session.refresh(obj)
            return obj  # type: ignore[return-value]

    # ── Read ───────────────────────────────────────────────────────────────────

    def get(self, order_id: uuid.UUID) -> Optional[Order]:
        with get_sync_session() as session:
            return (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.id == order_id)
                .first()
            )

    def get_for_buyer(
        self, order_id: uuid.UUID, buyer_id: uuid.UUID
    ) -> Optional[Order]:
        with get_sync_session() as session:
            return (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.id == order_id, Order.buyer_id == buyer_id)
                .first()
            )

    def get_for_supplier(
        self, order_id: uuid.UUID, supplier_id: uuid.UUID
    ) -> Optional[Order]:
        with get_sync_session() as session:
            return (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.id == order_id, Order.supplier_id == supplier_id)
                .first()
            )

    def get_any(self, order_id: uuid.UUID) -> Optional[Order]:
        """Retrieve any order by ID with no ownership check (API client use)."""
        with get_sync_session() as session:
            return (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.id == order_id)
                .first()
            )

    # ── List ───────────────────────────────────────────────────────────────────

    def list_by_buyer(
        self,
        buyer_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
        status: Optional[OrderStatus] = None,
    ) -> tuple[list[Order], int]:
        with get_sync_session() as session:
            q = (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.buyer_id == buyer_id)
            )
            if status:
                q = q.filter(Order.status == status)
            total: int = q.count()
            items = (
                q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
            )
            return items, total

    def count_by_buyer_status(self, buyer_id: uuid.UUID) -> dict[str, int]:
        """Return a {status_value: count} dict for all orders of a given buyer.

        Uses a single GROUP BY query — no items are loaded.
        """
        with get_sync_session() as session:
            rows = (
                session.query(Order.status, func.count(Order.id).label("cnt"))
                .filter(Order.buyer_id == buyer_id)
                .group_by(Order.status)
                .all()
            )
            return {row.status.value: row.cnt for row in rows}

    def get_by_buyer_and_ref(
        self,
        buyer_id: uuid.UUID,
        client_reference_id: str,
    ) -> Optional[Order]:
        with get_sync_session() as session:
            return (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(
                    Order.buyer_id == buyer_id,
                    Order.client_reference_id == client_reference_id,
                )
                .first()
            )

    def list_by_supplier(
        self,
        supplier_id: uuid.UUID,
        *,
        limit: int = 20,
        offset: int = 0,
        status: Optional[OrderStatus] = None,
    ) -> tuple[list[Order], int]:
        with get_sync_session() as session:
            q = (
                session.query(Order)
                .options(joinedload(Order.items), joinedload(Order.supplier))
                .filter(Order.supplier_id == supplier_id)
            )
            if status:
                q = q.filter(Order.status == status)
            total: int = q.count()
            items = (
                q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
            )
            return items, total

    def list_all(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        status: Optional[OrderStatus] = None,
    ) -> tuple[list[Order], int]:
        """Return all orders across all buyers / suppliers (API client use)."""
        with get_sync_session() as session:
            q = session.query(Order).options(joinedload(Order.items), joinedload(Order.supplier))
            if status:
                q = q.filter(Order.status == status)
            total: int = q.count()
            items = (
                q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
            )
            return items, total

    # ── Update ─────────────────────────────────────────────────────────────────

    def update_status(self, order: Order, status: OrderStatus) -> Order:
        with get_sync_session() as session:
            obj = session.merge(order)
            obj.status = status
            session.flush()
            session.refresh(obj)
            return obj
