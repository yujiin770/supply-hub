"""add stock_qty to supplier_listings

Revision ID: l0m1n2o3p4q5
Revises: k9l0m1n2o3p4
Create Date: 2026-02-26

"""
from alembic import op
import sqlalchemy as sa

revision = "l0m1n2o3p4q5"
down_revision = "k9l0m1n2o3p4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "supplier_listings",
        sa.Column("stock_qty", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("supplier_listings", "stock_qty")
