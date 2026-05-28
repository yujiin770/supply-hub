"""
Pydantic schemas for Orders and OrderItems.
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, field_serializer

from app.models.order import OrderStatus


# ── Request schemas ────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    pack_id: uuid.UUID
    quantity: int  # must be > 0


class OrderCreate(BaseModel):
    supplier_id: uuid.UUID
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    # Required when placing an order via API client credentials (no user session).
    buyer_id: Optional[uuid.UUID] = None
    # Opaque key from the external consumer app (e.g. patient ID, order ref).
    client_reference_id: Optional[str] = None
    # Buyer's email address — used to notify them when the supplier edits the order.
    buyer_email: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    cancel_remarks: Optional[str] = None  # supplier reason when cancelling


class OrderEditItem(BaseModel):
    """One item in a supplier's edit-order request."""
    pack_id: uuid.UUID
    quantity: int  # >0


class OrderEdit(BaseModel):
    """Supplier edits a PENDING order — modifies items and must supply remarks."""
    items: List[OrderEditItem]
    supplier_edit_notes: str  # required — reason for the modification


class BuyerOrderRespond(BaseModel):
    """Buyer responds to a supplier-edited (AWAITING_CONFIRMATION) order."""
    action: Literal["confirm", "cancel"]  # confirm → AWAITING_PAYMENT, cancel → CANCELLED
    notes: Optional[str] = None           # buyer's optional remarks


class BuyerPaymentAttach(BaseModel):
    """Buyer attaches payment proof to an AWAITING_PAYMENT order."""
    payment_reference: str  # e.g. bank transfer ref, GCash ref, receipt number


class DeclinePaymentRemarks(BaseModel):
    """Supplier declines a submitted payment receipt."""
    remarks: str


# ── Response schemas ───────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    listing_id: uuid.UUID
    pack_id: uuid.UUID
    # Denormalized display info (populated by service from cache)
    brand_name: Optional[str] = None
    dosage_form_name: Optional[str] = None
    quantity: int
    unit_price: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None

    @field_serializer("unit_price", "subtotal")
    def serialize_decimal(self, v: Optional[Decimal]) -> Optional[str]:
        return str(v) if v is not None else None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    buyer_id: uuid.UUID
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    supplier_edit_notes: Optional[str] = None
    buyer_response_notes: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_reference_no: Optional[str] = None
    payment_amount: Optional[str] = None
    payment_date: Optional[str] = None
    payment_declined_remarks: Optional[str] = None
    cancel_remarks: Optional[str] = None
    client_reference_id: Optional[str] = None
    total: Optional[Decimal] = None
    items: List[OrderItemOut] = []
    created_at: str
    updated_at: str

    @field_serializer("total")
    def serialize_total(self, v: Optional[Decimal]) -> Optional[str]:
        return str(v) if v is not None else None


class PaginatedOrdersOut(BaseModel):
    items: List[OrderOut]
    total: int
    limit: int
    offset: int
