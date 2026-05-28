"""
Order routes.

Buyer routes  (any authenticated user OR API client):
  POST  /orders                           — place an order
  GET   /orders/me                        — list my orders / all orders (API client)
  GET   /orders/me/{order_id}             — order detail
  PATCH /orders/me/{order_id}/respond     — confirm or cancel an AWAITING_CONFIRMATION order
  PATCH /orders/me/{order_id}/payment     — attach payment proof to an AWAITING_PAYMENT order
  POST  /orders/me/{order_id}/cancel      — cancel a PENDING order

API-client-only routes:
  GET   /orders/buyer/{buyer_id}                              — list all orders for a given external buyer UUID
  PATCH /orders/buyer/{buyer_id}/{client_reference_id}/respond  — buyer responds to supplier edit

Supplier routes (SUPPLIER_OWNER / SUPPLIER_STAFF OR API client):
  GET   /suppliers/me/orders              — incoming orders / all orders (API client)
  GET   /suppliers/me/orders/{order_id}   — order detail
  PATCH /suppliers/me/orders/{order_id}/status — update status
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import OrderCaller, get_orders_caller, get_session
from app.core.rbac import Role
from app.core.response import success_response
from app.models.order import OrderStatus
from app.models.supplier import Supplier
from app.schemas.order import BuyerOrderRespond, BuyerPaymentAttach, DeclinePaymentRemarks, OrderCreate, OrderEdit, OrderStatusUpdate
from app.services import order_service

router = APIRouter(tags=["orders"])


# ── helpers ──────────────────────────────────────────────────────────────────

async def _resolve_supplier_id(caller: OrderCaller, session: AsyncSession) -> uuid.UUID:
    """
    For user callers: verify SUPPLIER_OWNER role and return their supplier.id.
    Raises 403 if role check fails or supplier is not linked/found.
    """
    user = caller.user
    if user.role != Role.SUPPLIER_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPPLIER_OWNER role required.",
        )
    if user.supplier_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not linked to a supplier.",
        )
    result = await session.execute(select(Supplier).where(Supplier.id == user.supplier_id))
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated supplier not found.",
        )
    return supplier.id


# ── Buyer endpoints ──────────────────────────────────────────────────────────


@router.post("/orders", tags=["orders-client"])
async def place_order(
    payload: OrderCreate,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """Place a new order against an approved supplier."""
    if caller.is_api_client:
        if payload.buyer_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="buyer_id is required when placing an order via API client credentials.",
            )
        result = order_service.create_order(payload, buyer_id=payload.buyer_id)
    else:
        result = order_service.create_order(payload, buyer_id=caller.user.id)
    return success_response(result.model_dump())


@router.get("/orders/me")
async def list_my_orders(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None),
    caller: OrderCaller = Depends(get_orders_caller),
):
    """List orders placed by the current user (or all orders for API clients)."""
    order_status: Optional[OrderStatus] = None
    if status:
        try:
            order_status = OrderStatus(status.upper())
        except ValueError:
            pass

    if caller.is_api_client:
        result = order_service.list_all_orders(limit=limit, offset=offset, status=order_status)
    else:
        result = order_service.list_buyer_orders(
            caller.user.id, limit=limit, offset=offset, status=order_status
        )
    return success_response(result.model_dump())


@router.get("/orders/me/{order_id}")
async def get_my_order(
    order_id: uuid.UUID,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """Get a single order by ID (buyer must own the order, or API client can access any)."""
    if caller.is_api_client:
        result = order_service.get_any_order(order_id)
    else:
        result = order_service.get_buyer_order(order_id, buyer_id=caller.user.id)
    return success_response(result.model_dump())


@router.patch("/orders/me/{order_id}/respond")
async def respond_to_order(
    order_id: uuid.UUID,
    payload: BuyerOrderRespond,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """
    Buyer responds to a supplier-edited (AWAITING_CONFIRMATION) order.
    action="confirm" moves it to CONFIRMED; action="cancel" cancels it.
    An optional notes/remarks field is stored as buyer_response_notes.
    """
    if caller.is_api_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Use /orders/buyer/{buyer_id}/{order_id}/respond for API client access.",
        )
    result = order_service.respond_to_order_edit(
        order_id, buyer_id=caller.user.id, payload=payload
    )
    return success_response(result.model_dump())


@router.patch("/orders/me/{order_id}/payment")
async def attach_payment(
    order_id: uuid.UUID,
    file: Annotated[
        UploadFile,
        File(description="Payment receipt image (JPEG, PNG, WebP, PDF — max 10 MB)"),
    ],
    payment_reference_no: str = Form(default=""),
    payment_amount: str = Form(default=""),
    payment_date: str = Form(default=""),
    caller: OrderCaller = Depends(get_orders_caller),
):
    """Buyer attaches a payment receipt image to an AWAITING_PAYMENT order."""
    _ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, WebP, GIF, PDF.",
        )
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB limit.",
        )
    filename = file.filename or "receipt"
    if caller.is_api_client:
        result = order_service.attach_any_order_payment(
            order_id,
            file_data=data,
            content_type=content_type,
            filename=filename,
            payment_reference_no=payment_reference_no,
            payment_amount=payment_amount,
            payment_date=payment_date,
        )
    else:
        result = order_service.attach_buyer_payment(
            order_id,
            buyer_id=caller.user.id,
            file_data=data,
            content_type=content_type,
            filename=filename,
            payment_reference_no=payment_reference_no,
            payment_amount=payment_amount,
            payment_date=payment_date,
        )
    return success_response(result.model_dump())


@router.post("/orders/me/{order_id}/cancel")
async def cancel_my_order(
    order_id: uuid.UUID,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """Cancel a PENDING order."""
    if caller.is_api_client:
        result = order_service.cancel_any_order(order_id)
    else:
        result = order_service.cancel_buyer_order(order_id, buyer_id=caller.user.id)
    return success_response(result.model_dump())


@router.patch("/orders/buyer/{buyer_id}/{client_reference_id}/respond", tags=["orders-client"])
async def respond_to_order_for_buyer(
    buyer_id: uuid.UUID,
    client_reference_id: str,
    payload: BuyerOrderRespond,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """
    API-client endpoint: buyer responds to a supplier-edited order.
    Looks up the order by (buyer_id, client_reference_id).
    action="confirm" → CONFIRMED; action="cancel" → CANCELLED.
    Optional notes stored as buyer_response_notes.
    """
    if not caller.is_api_client:
        raise HTTPException(
            status_code=403,
            detail="This endpoint requires API client credentials.",
        )
    result = order_service.respond_to_any_order_edit(
        client_reference_id, buyer_id=buyer_id, payload=payload
    )
    return success_response(result.model_dump())


@router.get("/orders/buyer/{buyer_id}", tags=["orders-client"])
async def list_orders_by_buyer(
    buyer_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None),
    caller: OrderCaller = Depends(get_orders_caller),
):
    """
    List all orders for a given external buyer UUID.
    Accessible via API client credentials only.
    """
    if not caller.is_api_client:
        raise HTTPException(
            status_code=403,
            detail="This endpoint requires API client credentials.",
        )
    order_status: Optional[OrderStatus] = None
    if status:
        try:
            order_status = OrderStatus(status.upper())
        except ValueError:
            pass
    result = order_service.list_buyer_orders(
        buyer_id, limit=limit, offset=offset, status=order_status
    )
    return success_response(result.model_dump())


@router.get("/orders/buyer/{buyer_id}/counts", tags=["orders-client"])
async def get_buyer_order_counts(
    buyer_id: uuid.UUID,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """
    Return per-status order counts for a buyer in a single optimised query.

    Response shape::

        {
          "PENDING": 3,
          "AWAITING_CONFIRMATION": 1,
          "AWAITING_PAYMENT": 0,
          ...
        }

    Accessible via API client credentials only.
    """
    if not caller.is_api_client:
        raise HTTPException(
            status_code=403,
            detail="This endpoint requires API client credentials.",
        )
    counts = order_service.get_buyer_order_counts(buyer_id)
    return success_response(counts)


@router.get("/orders/buyer/{buyer_id}/{client_reference_id}", tags=["orders-client"])
async def get_order_by_buyer_and_ref(
    buyer_id: uuid.UUID,
    client_reference_id: str,
    caller: OrderCaller = Depends(get_orders_caller),
):
    """
    Get the single order matching the unique (buyer_id, client_reference_id) pair.
    Accessible via API client credentials only.
    """
    if not caller.is_api_client:
        raise HTTPException(
            status_code=403,
            detail="This endpoint requires API client credentials.",
        )
    result = order_service.get_order_by_buyer_and_ref(buyer_id, client_reference_id)
    return success_response(result.model_dump())


# ── Supplier endpoints ───────────────────────────────────────────────────────


@router.get("/suppliers/me/orders")
async def list_incoming_orders(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None),
    caller: OrderCaller = Depends(get_orders_caller),
    session: AsyncSession = Depends(get_session),
):
    """List incoming orders for this supplier (or all orders for API clients)."""
    order_status: Optional[OrderStatus] = None
    if status:
        try:
            order_status = OrderStatus(status.upper())
        except ValueError:
            pass

    if caller.is_api_client:
        result = order_service.list_all_orders(limit=limit, offset=offset, status=order_status)
    else:
        supplier_id = await _resolve_supplier_id(caller, session)
        result = order_service.list_supplier_orders(
            supplier_id, limit=limit, offset=offset, status=order_status
        )
    return success_response(result.model_dump())


@router.get("/suppliers/me/orders/{order_id}")
async def get_incoming_order(
    order_id: uuid.UUID,
    caller: OrderCaller = Depends(get_orders_caller),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific incoming order detail."""
    if caller.is_api_client:
        result = order_service.get_any_order(order_id)
    else:
        supplier_id = await _resolve_supplier_id(caller, session)
        result = order_service.get_supplier_order(order_id, supplier_id=supplier_id)
    return success_response(result.model_dump())


@router.patch("/suppliers/me/orders/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    caller: OrderCaller = Depends(get_orders_caller),
    session: AsyncSession = Depends(get_session),
):
    """
    Advance an order through the fulfilment workflow.
    Allowed transitions: PENDING→CONFIRMED or CANCELLED, CONFIRMED→SHIPPED, SHIPPED→DELIVERED.
    """
    if caller.is_api_client:
        result = order_service.update_any_order_status(order_id, payload=payload)
    else:
        supplier_id = await _resolve_supplier_id(caller, session)
        result = order_service.update_supplier_order_status(
            order_id, supplier_id=supplier_id, payload=payload
        )
    return success_response(result.model_dump())


@router.patch("/suppliers/me/orders/{order_id}/edit")
async def edit_order(
    order_id: uuid.UUID,
    payload: OrderEdit,
    caller: OrderCaller = Depends(get_orders_caller),
    session: AsyncSession = Depends(get_session),
):
    """
    Supplier edits a PENDING order (modify items / quantities).
    Requires supplier_edit_notes explaining the change.
    Moves order to AWAITING_CONFIRMATION so the buyer must re-confirm.
    """
    if caller.is_api_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order editing must be done by the supplier user.",
        )
    supplier_id = await _resolve_supplier_id(caller, session)
    result = order_service.edit_order_by_supplier(
        order_id, supplier_id=supplier_id, payload=payload
    )
    return success_response(result.model_dump())


@router.patch("/suppliers/me/orders/{order_id}/decline-payment")
async def decline_payment(
    order_id: uuid.UUID,
    payload: DeclinePaymentRemarks,
    caller: OrderCaller = Depends(get_orders_caller),
    session: AsyncSession = Depends(get_session),
):
    """Supplier declines a submitted payment receipt — clears proof so buyer can re-upload."""
    if caller.is_api_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payment decline must be done by the supplier user.",
        )
    supplier_id = await _resolve_supplier_id(caller, session)
    result = order_service.decline_payment_by_supplier(
        order_id, supplier_id=supplier_id, remarks=payload.remarks
    )
    return success_response(result.model_dump())
