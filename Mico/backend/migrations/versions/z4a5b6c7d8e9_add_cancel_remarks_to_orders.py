"""add cancel_remarks to orders

Revision ID: z4a5b6c7d8e9
Revises: y3z4a5b6c7d8
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa

revision = "z4a5b6c7d8e9"
down_revision = "y3z4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("cancel_remarks", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "cancel_remarks")
