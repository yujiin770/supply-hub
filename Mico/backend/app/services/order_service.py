"""
Order service — business logic for creating and managing orders.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status as http_status

from app.db.session import get_sync_session
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from sqlalchemy import select as sa_select
from app.models.supplier import SupplierStatus
from app.models.supplier_listing import SupplierListing
from app.repositories.catalog_cache_repository import CatalogCacheRepository
from app.repositories.order_repository import OrderRepository
from app.core.azure_storage import generate_sas_url, upload_blob
from app.schemas.order import (
    BuyerOrderRespond,
    BuyerPaymentAttach,
    OrderCreate,
    OrderEdit,
    OrderItemOut,
    OrderOut,
    OrderStatusUpdate,
    PaginatedOrdersOut,
)

_cache_repo = CatalogCacheRepository()
_order_repo = OrderRepository()

# Status transition rules
_BUYER_CANCEL_FROM = {OrderStatus.PENDING, OrderStatus.AWAITING_CONFIRMATION, OrderStatus.AWAITING_PAYMENT}
_SUPPLIER_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED},
    OrderStatus.AWAITING_CONFIRMATION: {OrderStatus.CANCELLED},
    OrderStatus.AWAITING_PAYMENT: {OrderStatus.CONFIRMED},
    OrderStatus.CONFIRMED: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
}


_RECEIPT_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}


def _upload_receipt(order_id: uuid.UUID, data: bytes, content_type: str, filename: str) -> str:
    """
    Upload a payment receipt to Azure Blob Storage under receipts/{order_id}_{uuid}.{ext}.
    Returns the blob name (not the full URL) to store in the database.
    """
    ext = _RECEIPT_CONTENT_TYPES.get(content_type) or os.path.splitext(filename)[-1] or ".bin"
    blob_name = f"receipts/{order_id}_{uuid.uuid4().hex}{ext}"
    upload_blob(blob_name, data, content_type)
    return blob_name


def _restore_stock_in_session(session, items) -> None:
    """Restore stock quantities for all items of a cancelled order (same session)."""
    for item in items:
        listing = session.get(SupplierListing, item.listing_id)
        if listing is not None and listing.stock_qty is not None:
            listing.stock_qty += item.quantity


def _order_to_out(order: Order) -> OrderOut:
    """Convert an ORM Order to an OrderOut schema (includes denormalized names)."""
    items_out = []
    for item in order.items:
        cached = _cache_repo.get_by_pack_id(item.pack_id)
        items_out.append(
            OrderItemOut(
                id=item.id,
                order_id=item.order_id,
                listing_id=item.listing_id,
                pack_id=item.pack_id,
                brand_name=cached.brand_name if cached else None,
                dosage_form_name=cached.dosage_form_name if cached else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
        )

    supplier_name = None
    if hasattr(order, "supplier") and order.supplier:
        supplier_name = order.supplier.trade_name or order.supplier.legal_name

    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        buyer_id=order.buyer_id,
        client_reference_id=order.client_reference_id,
        supplier_id=order.supplier_id,
        supplier_name=supplier_name,
        status=order.status.value if isinstance(order.status, OrderStatus) else order.status,
        notes=order.notes,
        supplier_edit_notes=order.supplier_edit_notes,
        buyer_response_notes=order.buyer_response_notes,
        payment_reference=_resolve_payment_reference(order.payment_reference),
        payment_reference_no=order.payment_reference_no,
        payment_amount=order.payment_amount,
        payment_date=order.payment_date,
        payment_declined_remarks=order.payment_declined_remarks,
        cancel_remarks=order.cancel_remarks,
        total=order.total,
        items=items_out,
        created_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
    )


def _resolve_payment_reference(value: Optional[str]) -> Optional[str]:
    """Return a fresh 120-minute SAS URL if value is a receipt blob path, else return as-is."""
    if value and value.startswith("receipts/"):
        return generate_sas_url(value, expiry_minutes=120)
    return value


def create_order(payload: OrderCreate, buyer_id: uuid.UUID) -> OrderOut:
    """
    Validate listing availability, snapshot prices, persist order + items.
    """
    if not payload.items:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order must contain at least one item.",
        )

    with get_sync_session() as session:
        # Validate supplier is approved
        from app.models.supplier import Supplier
        supplier = session.get(Supplier, payload.supplier_id)
        if not supplier or supplier.status != SupplierStatus.APPROVED:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Supplier is not available.",
            )

        # Enforce unique (buyer_id, client_reference_id) when ref is provided
        if payload.client_reference_id is not None:
            existing = session.execute(
                sa_select(Order).where(
                    Order.buyer_id == buyer_id,
                    Order.client_reference_id == payload.client_reference_id,
                )
            ).scalar_one_or_none()
            if existing is not None:
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail=(
                        f"An order with client_reference_id '{payload.client_reference_id}' "
                        f"already exists for this buyer (order {existing.order_number})."
                    ),
                )

        # Validate and snapshot each listing
        total = Decimal("0")
        order_items: list[OrderItem] = []
        resolved_listings: list[SupplierListing] = []

        for item_create in payload.items:
            if item_create.quantity <= 0:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Quantity for pack {item_create.pack_id} must be greater than 0.",
                )

            listing = session.execute(
                sa_select(SupplierListing).where(
                    SupplierListing.supplier_id == payload.supplier_id,
                    SupplierListing.pack_id == item_create.pack_id,
                )
            ).scalar_one_or_none()
            if not listing:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Pack {item_create.pack_id} not found for the specified supplier.",
                )
            if not listing.is_enabled:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Pack {item_create.pack_id} is not currently available.",
                )
            # Stock check
            if (
                listing.stock_qty is not None
                and listing.stock_qty < item_create.quantity
            ):
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Insufficient stock for pack {item_create.pack_id}. "
                        f"Available: {listing.stock_qty}, requested: {item_create.quantity}."
                    ),
                )

            unit_price = Decimal(str(listing.base_price)) if listing.base_price else None
            subtotal = (
                unit_price * Decimal(str(item_create.quantity))
                if unit_price is not None
                else None
            )
            if subtotal is not None:
                total += subtotal

            order_items.append(
                OrderItem(
                    id=uuid.uuid4(),
                    listing_id=listing.id,
                    pack_id=listing.pack_id,
                    quantity=item_create.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )
            resolved_listings.append(listing)

        # Decrement stock using the already-resolved listings (same session — safe to mutate)
        for listing in resolved_listings:
            if listing.stock_qty is not None:
                listing.stock_qty -= next(
                    ic.quantity for ic in payload.items if ic.pack_id == listing.pack_id
                )

        # Build Order ORM object
        order = Order(
            id=uuid.uuid4(),
            buyer_id=buyer_id,
            supplier_id=payload.supplier_id,
            status=OrderStatus.PENDING,
            notes=payload.notes,
            client_reference_id=payload.client_reference_id,
            buyer_email=payload.buyer_email,
            total=total if total > 0 else None,
            items=order_items,
        )

        session.add(order)
        session.flush()

        # Re-fetch with relationships for serialization
        from sqlalchemy.orm import joinedload
        refreshed = (
            session.query(Order)
            .options(
                joinedload(Order.items),
                joinedload(Order.supplier),
            )
            .filter(Order.id == order.id)
            .first()
        )
        return _order_to_out(refreshed)  # type: ignore[arg-type]


def get_buyer_order(order_id: uuid.UUID, buyer_id: uuid.UUID) -> OrderOut:
    order = _order_repo.get_for_buyer(order_id, buyer_id)
    if not order:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _order_to_out(order)


def list_buyer_orders(
    buyer_id: uuid.UUID,
    *,
    limit: int = 20,
    offset: int = 0,
    status: Optional[OrderStatus] = None,
) -> PaginatedOrdersOut:
    items, total = _order_repo.list_by_buyer(
        buyer_id, limit=limit, offset=offset, status=status
    )
    return PaginatedOrdersOut(
        items=[_order_to_out(o) for o in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def get_buyer_order_counts(buyer_id: uuid.UUID) -> dict[str, int]:
    """Return per-status order counts for a buyer in a single optimized query."""
    return _order_repo.count_by_buyer_status(buyer_id)


def get_order_by_buyer_and_ref(
    buyer_id: uuid.UUID,
    client_reference_id: str,
) -> OrderOut:
    order = _order_repo.get_by_buyer_and_ref(buyer_id, client_reference_id)
    if not order:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Order not found for the given buyer and client reference.",
        )
    return _order_to_out(order)


def edit_order_by_supplier(
    order_id: uuid.UUID,
    supplier_id: uuid.UUID,
    payload: OrderEdit,
) -> OrderOut:
    """
    Supplier edits a PENDING order: updates items, records remarks, and moves
    the order to AWAITING_CONFIRMATION so the buyer must re-confirm.
    """
    from sqlalchemy.orm import joinedload

    if not payload.items:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Edited order must contain at least one item.",
        )
    if not payload.supplier_edit_notes or not payload.supplier_edit_notes.strip():
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="supplier_edit_notes (remarks) is required when editing an order.",
        )

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id, Order.supplier_id == supplier_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")

        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.PENDING:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Only PENDING orders can be edited by the supplier. Current status: {current.value}.",
            )

        # ── Restore stock for ALL existing items first ─────────────────────────
        _restore_stock_in_session(session, order.items)

        # ── Delete all existing items ──────────────────────────────────────────
        for item in list(order.items):
            session.delete(item)
        session.flush()

        # ── Rebuild items from payload ─────────────────────────────────────────
        total = Decimal("0")
        new_items: list[OrderItem] = []

        for item_req in payload.items:
            if item_req.quantity <= 0:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Quantity for pack {item_req.pack_id} must be greater than 0.",
                )
            listing = session.execute(
                sa_select(SupplierListing).where(
                    SupplierListing.supplier_id == supplier_id,
                    SupplierListing.pack_id == item_req.pack_id,
                )
            ).scalar_one_or_none()
            if not listing:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Pack {item_req.pack_id} not found for this supplier.",
                )
            if not listing.is_enabled:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Pack {item_req.pack_id} is not currently available.",
                )
            if listing.stock_qty is not None and listing.stock_qty < item_req.quantity:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Insufficient stock for pack {item_req.pack_id}. "
                        f"Available: {listing.stock_qty}, requested: {item_req.quantity}."
                    ),
                )

            unit_price = Decimal(str(listing.base_price)) if listing.base_price else None
            subtotal = unit_price * Decimal(str(item_req.quantity)) if unit_price is not None else None
            if subtotal is not None:
                total += subtotal

            new_items.append(
                OrderItem(
                    id=uuid.uuid4(),
                    order_id=order.id,
                    listing_id=listing.id,
                    pack_id=listing.pack_id,
                    quantity=item_req.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )
            # Decrement stock
            if listing.stock_qty is not None:
                listing.stock_qty -= item_req.quantity

        for item in new_items:
            session.add(item)

        order.total = total if total > 0 else None
        order.supplier_edit_notes = payload.supplier_edit_notes.strip()
        order.status = OrderStatus.AWAITING_CONFIRMATION
        session.flush()

        # Re-fetch for serialization
        refreshed = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order.id)
            .first()
        )
        result = _order_to_out(refreshed)  # type: ignore[arg-type]

        # Capture email-relevant values before session closes
        _buyer_email: str | None = refreshed.buyer_email if refreshed else None  # type: ignore[union-attr]
        _supplier_display: str = (
            (refreshed.supplier.trade_name or refreshed.supplier.legal_name)  # type: ignore[union-attr]
            if refreshed and refreshed.supplier  # type: ignore[union-attr]
            else "Your supplier"
        )
        # Snapshot new items as plain dicts before ORM objects expire on session close
        _new_items_snapshot = [
            {
                "pack_id": item.pack_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": item.subtotal,
            }
            for item in new_items
        ]

    # Log clearly when buyer email is missing so it's easy to diagnose
    if not _buyer_email:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "edit_order_by_supplier: buyer_email is NULL for order %s — no notification will be sent. "
            "Was this order placed before the buyer_email migration?",
            order_id,
        )

    # ── Notify buyer via email (outside session, non-fatal) ───────────────
    try:
        if _buyer_email:
            from app.services.email_service import EmailService
            # Build from new_items (not result.items) to guarantee the updated
            # items are used — the session identity map may still hold old items.
            items_payload = [
                {
                    "brand_name": (lambda c: c.brand_name if c else None)(
                        _cache_repo.get_by_pack_id(item["pack_id"])
                    ),
                    "quantity": item["quantity"],
                    "unit_price": str(item["unit_price"]) if item["unit_price"] is not None else None,
                    "subtotal": str(item["subtotal"]) if item["subtotal"] is not None else None,
                }
                for item in _new_items_snapshot
            ]
            EmailService().send_order_edited_notification(
                to_email=_buyer_email,
                buyer_name=_buyer_email,
                order_number=result.order_number,
                supplier_name=_supplier_display,
                items=items_payload,
                total=str(result.total) if result.total is not None else "0.00",
                supplier_edit_notes=payload.supplier_edit_notes.strip(),
            )
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Failed to send order-edited email for order %s: %s", order_id, exc
        )

    return result


def respond_to_order_edit(
    order_id: uuid.UUID,
    buyer_id: uuid.UUID,
    payload: BuyerOrderRespond,
) -> OrderOut:
    """
    Buyer responds to a supplier-edited (AWAITING_CONFIRMATION) order.
    action="confirm" → AWAITING_PAYMENT (buyer must now attach payment proof)
    action="cancel"  → CANCELLED (restores stock)
    Optional notes saved as buyer_response_notes.
    """
    from sqlalchemy.orm import joinedload

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id, Order.buyer_id == buyer_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.AWAITING_CONFIRMATION:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=(
                    f"Only AWAITING_CONFIRMATION orders can be responded to. "
                    f"Current status: {current.value}."
                ),
            )
        if payload.notes and payload.notes.strip():
            order.buyer_response_notes = payload.notes.strip()
        if payload.action == "confirm":
            order.status = OrderStatus.AWAITING_PAYMENT
        else:
            order.status = OrderStatus.CANCELLED
            _restore_stock_in_session(session, order.items)
        session.flush()

        # Snapshot values for email before session closes
        _buyer_email: str | None = order.buyer_email  # type: ignore[union-attr]
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _supplier_email: str | None = _supplier.email if _supplier else None
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        _action = payload.action
        result = _order_to_out(order)

    # ── Email notifications (non-fatal) ────────────────────────────────────────────
    try:
        from app.services.email_service import EmailService
        svc = EmailService()
        if _action == "confirm":
            if _buyer_email:
                svc.send_buyer_confirmed_edit_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_snapshot,
                    total=_total,
                )
        else:
            if _buyer_email:
                svc.send_buyer_cancelled_order_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_snapshot,
                    total=_total,
                )
            if _supplier_email:
                svc.send_supplier_order_cancelled_by_buyer_notification(
                    to_email=_supplier_email,
                    supplier_name=_supplier_name,
                    buyer_email=_buyer_email or "the buyer",
                    order_number=_order_number,
                    items=_items_snapshot,
                    total=_total,
                )
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Failed to send respond_to_order_edit email for order %s: %s", order_id, exc
        )

    return result


def respond_to_any_order_edit(
    client_reference_id: str,
    buyer_id: uuid.UUID,
    payload: BuyerOrderRespond,
) -> OrderOut:
    """
    API-client version: looks up the order by (buyer_id, client_reference_id).
    Same confirm/cancel logic as respond_to_order_edit.
    """
    from sqlalchemy.orm import joinedload

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(
                Order.buyer_id == buyer_id,
                Order.client_reference_id == client_reference_id,
            )
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.AWAITING_CONFIRMATION:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=(
                    f"Only AWAITING_CONFIRMATION orders can be responded to. "
                    f"Current status: {current.value}."
                ),
            )
        if payload.notes and payload.notes.strip():
            order.buyer_response_notes = payload.notes.strip()
        if payload.action == "confirm":
            order.status = OrderStatus.AWAITING_PAYMENT
        else:
            order.status = OrderStatus.CANCELLED
            _restore_stock_in_session(session, order.items)
        session.flush()

        # Snapshot values for email before session closes
        _buyer_email: str | None = order.buyer_email  # type: ignore[union-attr]
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _supplier_email: str | None = _supplier.email if _supplier else None
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        _action = payload.action
        result = _order_to_out(order)

    # ── Email notifications (non-fatal) ────────────────────────────────────────────
    try:
        from app.services.email_service import EmailService
        svc = EmailService()
        if _action == "confirm":
            if _buyer_email:
                svc.send_buyer_confirmed_edit_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_snapshot,
                    total=_total,
                )
        else:
            if _buyer_email:
                svc.send_buyer_cancelled_order_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_snapshot,
                    total=_total,
                )
            if _supplier_email:
                svc.send_supplier_order_cancelled_by_buyer_notification(
                    to_email=_supplier_email,
                    supplier_name=_supplier_name,
                    buyer_email=_buyer_email or "the buyer",
                    order_number=_order_number,
                    items=_items_snapshot,
                    total=_total,
                )
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Failed to send respond_to_any_order_edit email for order %s: %s", client_reference_id, exc
        )

    return result


def attach_buyer_payment(
    order_id: uuid.UUID,
    buyer_id: uuid.UUID,
    file_data: bytes,
    content_type: str,
    filename: str,
    payment_reference_no: str = "",
    payment_amount: str = "",
    payment_date: str = "",
) -> OrderOut:
    """
    Buyer attaches a payment receipt image to an AWAITING_PAYMENT order.
    Uploads the file to Azure Blob Storage and stores the blob name.
    Status stays AWAITING_PAYMENT until the supplier confirms it.
    """
    from sqlalchemy.orm import joinedload

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id, Order.buyer_id == buyer_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.AWAITING_PAYMENT:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Payment can only be attached to AWAITING_PAYMENT orders. Current status: {current.value}.",
            )
        if not file_data:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Receipt file is required.",
            )
        blob_name = _upload_receipt(order_id, file_data, content_type, filename)
        order.payment_reference = blob_name
        if payment_reference_no:
            order.payment_reference_no = payment_reference_no.strip()
        if payment_amount:
            order.payment_amount = payment_amount.strip()
        if payment_date:
            order.payment_date = payment_date.strip()
        session.flush()

        # Snapshot for email before session closes
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_email: str | None = _supplier.email if _supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _buyer_email: str | None = order.buyer_email
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        result = _order_to_out(order)

    # ── Email notification to supplier (non-fatal) ──────────────────────────────
    if _supplier_email:
        try:
            from app.services.email_service import EmailService
            EmailService().send_payment_submitted_notification(
                to_email=_supplier_email,
                supplier_name=_supplier_name,
                buyer_email=_buyer_email or "the buyer",
                order_number=_order_number,
                items=_items_snapshot,
                total=_total,
                payment_reference_no=payment_reference_no,
                payment_amount=payment_amount,
                payment_date=payment_date,
            )
        except Exception as exc:  # noqa: BLE001
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "Failed to send payment-submitted email for order %s: %s", order_id, exc
            )

    return result


def attach_any_order_payment(
    order_id: uuid.UUID,
    file_data: bytes,
    content_type: str,
    filename: str,
    payment_reference_no: str = "",
    payment_amount: str = "",
    payment_date: str = "",
) -> OrderOut:
    """API-client version: attach payment receipt image without buyer ownership check."""
    from sqlalchemy.orm import joinedload

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.AWAITING_PAYMENT:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Payment can only be attached to AWAITING_PAYMENT orders. Current status: {current.value}.",
            )
        blob_name = _upload_receipt(order_id, file_data, content_type, filename)
        order.payment_reference = blob_name
        if payment_reference_no:
            order.payment_reference_no = payment_reference_no.strip()
        if payment_amount:
            order.payment_amount = payment_amount.strip()
        if payment_date:
            order.payment_date = payment_date.strip()
        session.flush()

        # Snapshot for email before session closes
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_email: str | None = _supplier.email if _supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _buyer_email: str | None = order.buyer_email
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        result = _order_to_out(order)

    # ── Email notification to supplier (non-fatal) ──────────────────────────────
    if _supplier_email:
        try:
            from app.services.email_service import EmailService
            EmailService().send_payment_submitted_notification(
                to_email=_supplier_email,
                supplier_name=_supplier_name,
                buyer_email=_buyer_email or "the buyer",
                order_number=_order_number,
                items=_items_snapshot,
                total=_total,
                payment_reference_no=payment_reference_no,
                payment_amount=payment_amount,
                payment_date=payment_date,
            )
        except Exception as exc:  # noqa: BLE001
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "Failed to send payment-submitted email for order %s: %s", order_id, exc
            )

    return result


def decline_payment_by_supplier(
    order_id: uuid.UUID,
    supplier_id: uuid.UUID,
    remarks: str,
) -> OrderOut:
    """
    Supplier declines a submitted payment receipt.
    Clears payment proof fields so the buyer can re-upload.
    Order remains in AWAITING_PAYMENT.
    """
    from sqlalchemy.orm import joinedload

    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id, Order.supplier_id == supplier_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current != OrderStatus.AWAITING_PAYMENT:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Payment can only be declined on AWAITING_PAYMENT orders. Current status: {current.value}.",
            )
        if not order.payment_reference:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="No payment receipt has been submitted yet.",
            )
        order.payment_reference = None
        order.payment_reference_no = None
        order.payment_amount = None
        order.payment_date = None
        order.payment_declined_remarks = remarks.strip()
        session.flush()

        # Capture values for email before session closes
        _buyer_email: str | None = order.buyer_email  # type: ignore[union-attr]
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier_name: str = (
            (order.supplier.trade_name or order.supplier.legal_name)
            if hasattr(order, "supplier") and order.supplier
            else "Supplier"
        )
        _decline_remarks: str = remarks.strip()
        result = _order_to_out(order)
        _items_payload = [
            {
                "brand_name": item.brand_name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in result.items
        ]

    # ── Send email notification outside session (non-fatal) ───────────────────
    if _buyer_email:
        try:
            from app.services.email_service import EmailService
            svc = EmailService()
            svc.send_payment_declined_notification(
                to_email=_buyer_email,
                buyer_name=_buyer_email,
                order_number=_order_number,
                supplier_name=_supplier_name,
                items=_items_payload,
                total=_total,
                decline_remarks=_decline_remarks,
            )
        except Exception as exc:  # noqa: BLE001
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "Failed to send payment-declined email for order %s: %s", order_id, exc
            )

    return result


# Keep these for backward compat with the /orders/me/{id}/cancel route
def cancel_buyer_order(order_id: uuid.UUID, buyer_id: uuid.UUID) -> OrderOut:
    """Cancel a PENDING, AWAITING_CONFIRMATION, or AWAITING_PAYMENT order (buyer user)."""
    from sqlalchemy.orm import joinedload
    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id, Order.buyer_id == buyer_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current not in _BUYER_CANCEL_FROM:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Order cannot be cancelled in its current status: {current.value}.",
            )
        order.status = OrderStatus.CANCELLED
        _restore_stock_in_session(session, order.items)
        session.flush()

        # Snapshot for email
        _buyer_email: str | None = order.buyer_email
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _supplier_email: str | None = _supplier.email if _supplier else None
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        result = _order_to_out(order)

    # ── Email notifications (non-fatal) ────────────────────────────────────────────
    try:
        from app.services.email_service import EmailService
        svc = EmailService()
        if _buyer_email:
            svc.send_buyer_cancelled_order_notification(
                to_email=_buyer_email,
                buyer_name=_buyer_email,
                order_number=_order_number,
                supplier_name=_supplier_name,
                items=_items_snapshot,
                total=_total,
            )
        if _supplier_email:
            svc.send_supplier_order_cancelled_by_buyer_notification(
                to_email=_supplier_email,
                supplier_name=_supplier_name,
                buyer_email=_buyer_email or "the buyer",
                order_number=_order_number,
                items=_items_snapshot,
                total=_total,
            )
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Failed to send cancel_buyer_order email for order %s: %s", order_id, exc
        )

    return result


def cancel_any_order(order_id: uuid.UUID) -> OrderOut:
    """Cancel any order without buyer ownership check (API client use)."""
    from sqlalchemy.orm import joinedload
    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(joinedload(Order.items), joinedload(Order.supplier))
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        if current not in _BUYER_CANCEL_FROM:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Order cannot be cancelled in its current status: {current.value}.",
            )
        order.status = OrderStatus.CANCELLED
        _restore_stock_in_session(session, order.items)
        session.flush()

        # Snapshot for email
        _buyer_email: str | None = order.buyer_email
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier = order.supplier if hasattr(order, "supplier") and order.supplier else None
        _supplier_name: str = (_supplier.trade_name or _supplier.legal_name) if _supplier else "Supplier"
        _supplier_email: str | None = _supplier.email if _supplier else None
        _items_snapshot = [
            {
                "brand_name": (lambda c: c.brand_name if c else None)(_cache_repo.get_by_pack_id(item.pack_id)),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in order.items
        ]
        result = _order_to_out(order)

    # ── Email notifications (non-fatal) ────────────────────────────────────────────
    try:
        from app.services.email_service import EmailService
        svc = EmailService()
        if _buyer_email:
            svc.send_buyer_cancelled_order_notification(
                to_email=_buyer_email,
                buyer_name=_buyer_email,
                order_number=_order_number,
                supplier_name=_supplier_name,
                items=_items_snapshot,
                total=_total,
            )
        if _supplier_email:
            svc.send_supplier_order_cancelled_by_buyer_notification(
                to_email=_supplier_email,
                supplier_name=_supplier_name,
                buyer_email=_buyer_email or "the buyer",
                order_number=_order_number,
                items=_items_snapshot,
                total=_total,
            )
    except Exception as exc:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Failed to send cancel_any_order email for order %s: %s", order_id, exc
        )

    return result


def get_supplier_order(order_id: uuid.UUID, supplier_id: uuid.UUID) -> OrderOut:
    order = _order_repo.get_for_supplier(order_id, supplier_id)
    if not order:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _order_to_out(order)


def get_any_order(order_id: uuid.UUID) -> OrderOut:
    """Get any order without ownership filter (API client use)."""
    order = _order_repo.get_any(order_id)
    if not order:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _order_to_out(order)


def list_all_orders(
    *,
    limit: int = 20,
    offset: int = 0,
    status: Optional[OrderStatus] = None,
) -> PaginatedOrdersOut:
    """List all orders without buyer/supplier filter (API client use)."""
    items, total = _order_repo.list_all(limit=limit, offset=offset, status=status)
    return PaginatedOrdersOut(
        items=[_order_to_out(o) for o in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def list_supplier_orders(
    supplier_id: uuid.UUID,
    *,
    limit: int = 20,
    offset: int = 0,
    status: Optional[OrderStatus] = None,
) -> PaginatedOrdersOut:
    items, total = _order_repo.list_by_supplier(
        supplier_id, limit=limit, offset=offset, status=status
    )
    return PaginatedOrdersOut(
        items=[_order_to_out(o) for o in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def update_supplier_order_status(
    order_id: uuid.UUID,
    supplier_id: uuid.UUID,
    payload: OrderStatusUpdate,
) -> OrderOut:
    from sqlalchemy.orm import joinedload
    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(
                joinedload(Order.items),
                joinedload(Order.supplier),
            )
            .filter(Order.id == order_id, Order.supplier_id == supplier_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")

        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        allowed = _SUPPLIER_TRANSITIONS.get(current, set())
        if payload.status not in allowed:
            allowed_labels = ", ".join(s.value for s in allowed) if allowed else "none"
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Cannot transition from {current.value} to {payload.status.value}. Allowed: {allowed_labels}.",
            )

        order.status = payload.status
        if payload.status == OrderStatus.CANCELLED:
            _restore_stock_in_session(session, order.items)
            if payload.cancel_remarks:
                order.cancel_remarks = payload.cancel_remarks.strip()
        session.flush()

        # Capture values needed for email outside the session
        _buyer_email: str | None = order.buyer_email  # type: ignore[union-attr]
        _order_number: str = order.order_number
        _total: str = str(order.total) if order.total is not None else "0.00"
        _supplier_name: str = (
            (order.supplier.trade_name or order.supplier.legal_name)
            if hasattr(order, "supplier") and order.supplier
            else "Supplier"
        )
        _cancel_remarks: str = (payload.cancel_remarks or "").strip()
        _new_status = payload.status
        result = _order_to_out(order)
        _items_payload = [
            {
                "brand_name": item.brand_name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "subtotal": str(item.subtotal) if item.subtotal is not None else None,
            }
            for item in result.items
        ]

    # ── Send email notification outside session (non-fatal) ───────────────────
    if _buyer_email:
        try:
            from app.services.email_service import EmailService
            svc = EmailService()
            if _new_status == OrderStatus.AWAITING_PAYMENT:
                svc.send_order_confirmed_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_payload,
                    total=_total,
                )
            elif _new_status == OrderStatus.CONFIRMED:
                svc.send_payment_confirmed_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_payload,
                    total=_total,
                )
            elif _new_status == OrderStatus.SHIPPED:
                svc.send_order_shipped_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_payload,
                    total=_total,
                    ship_remarks=_cancel_remarks,
                )
            elif _new_status == OrderStatus.DELIVERED:
                svc.send_order_delivered_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_payload,
                    total=_total,
                    delivery_remarks=_cancel_remarks,
                )
            elif _new_status == OrderStatus.CANCELLED:
                svc.send_order_cancelled_notification(
                    to_email=_buyer_email,
                    buyer_name=_buyer_email,
                    order_number=_order_number,
                    supplier_name=_supplier_name,
                    items=_items_payload,
                    total=_total,
                    cancel_remarks=_cancel_remarks or "No reason provided.",
                )
        except Exception as exc:  # noqa: BLE001
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "Failed to send order status email for order %s: %s", order_id, exc
            )
    else:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "update_supplier_order_status: buyer_email is NULL for order %s — no notification sent.",
            order_id,
        )

    return result


def update_any_order_status(order_id: uuid.UUID, payload: OrderStatusUpdate) -> OrderOut:
    """Update order status without supplier ownership check (API client use)."""
    from sqlalchemy.orm import joinedload
    with get_sync_session() as session:
        order = (
            session.query(Order)
            .options(
                joinedload(Order.items),
                joinedload(Order.supplier),
            )
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found.")
        current = order.status if isinstance(order.status, OrderStatus) else OrderStatus(order.status)
        allowed = _SUPPLIER_TRANSITIONS.get(current, set())
        if payload.status not in allowed:
            allowed_labels = ", ".join(s.value for s in allowed) if allowed else "none"
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Cannot transition from {current.value} to {payload.status.value}. Allowed: {allowed_labels}.",
            )
        order.status = payload.status
        if payload.status == OrderStatus.CANCELLED:
            _restore_stock_in_session(session, order.items)
        session.flush()
        return _order_to_out(order)
