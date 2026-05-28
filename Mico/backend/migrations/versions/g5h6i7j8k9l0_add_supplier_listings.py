"""add supplier_listings

Revision ID: g5h6i7j8k9l0
Revises: f3a4b5c6d7e8
Create Date: 2026-02-26 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "g5h6i7j8k9l0"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "supplier_listings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "pack_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("base_price", sa.Numeric(18, 4), nullable=True),
        sa.Column("moq", sa.Numeric(18, 4), nullable=True),
        sa.Column("lead_time_days", sa.Integer(), nullable=True),
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
            ["supplier_id"],
            ["suppliers.id"],
            ondelete="CASCADE",
            name="fk_listings_supplier_id",
        ),
        sa.UniqueConstraint("supplier_id", "pack_id", name="uq_supplier_pack"),
    )
    op.create_index("ix_listings_supplier_id", "supplier_listings", ["supplier_id"])
    op.create_index("ix_listings_pack_id", "supplier_listings", ["pack_id"])


def downgrade() -> None:
    op.drop_index("ix_listings_pack_id", table_name="supplier_listings")
    op.drop_index("ix_listings_supplier_id", table_name="supplier_listings")
    op.drop_table("supplier_listings")
