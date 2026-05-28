import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.order_item import OrderItem
    from app.models.supplier import Supplier


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        server_default=text(
            "'ORD-' || LPAD(nextval('order_number_seq')::text, 7, '0')"
        ),
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    # Opaque identifier supplied by the external consumer application.
    client_reference_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="orderstatus", native_enum=False),
        nullable=False,
        server_default=text("'PENDING'"),
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplier_edit_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    buyer_response_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_reference_no: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_amount: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    buyer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_declined_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    total: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    supplier: Mapped["Supplier"] = relationship("Supplier", foreign_keys=[supplier_id])

    __table_args__ = (
        # Partial unique index: (buyer_id, client_reference_id) must be unique
        # only when client_reference_id is NOT NULL.
        Index(
            "uq_orders_buyer_client_ref",
            "buyer_id",
            "client_reference_id",
            unique=True,
            postgresql_where=text("client_reference_id IS NOT NULL"),
        ),
    )
