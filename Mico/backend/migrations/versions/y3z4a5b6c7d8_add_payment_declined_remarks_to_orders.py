"""add payment declined remarks to orders

Revision ID: y3z4a5b6c7d8
Revises: x2y3z4a5b6c7
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa

revision = "y3z4a5b6c7d8"
down_revision = "x2y3z4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("payment_declined_remarks", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_declined_remarks")
