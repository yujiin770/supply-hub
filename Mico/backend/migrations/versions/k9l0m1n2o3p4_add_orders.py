"""add orders and order_items

Revision ID: k9l0m1n2o3p4
Revises: j8k9l0m1n2o3
Create Date: 2026-02-26 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "k9l0m1n2o3p4"
down_revision = "j8k9l0m1n2o3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Sequence for order_number
    op.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1")

    op.create_table(
        "orders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "order_number",
            sa.String(30),
            nullable=False,
            server_default=sa.text(
                "'ORD-' || LPAD(nextval('order_number_seq')::text, 7, '0')"
            ),
        ),
        sa.Column(
            "buyer_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'PENDING'"),
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("total", sa.Numeric(18, 4), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name="fk_orders_buyer_id",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
            ondelete="RESTRICT",
            name="fk_orders_supplier_id",
        ),
        sa.UniqueConstraint("order_number", name="uq_order_number"),
    )
    op.create_index("ix_orders_buyer_id", "orders", ["buyer_id"])
    op.create_index("ix_orders_supplier_id", "orders", ["supplier_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "order_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("pack_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 4), nullable=True),
        sa.Column("subtotal", sa.Numeric(18, 4), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="CASCADE",
            name="fk_order_items_order_id",
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["supplier_listings.id"],
            ondelete="RESTRICT",
            name="fk_order_items_listing_id",
        ),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_supplier_id", table_name="orders")
    op.drop_index("ix_orders_buyer_id", table_name="orders")
    op.drop_table("orders")
    op.execute("DROP SEQUENCE IF EXISTS order_number_seq")
