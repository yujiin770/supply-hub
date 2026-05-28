"""orders: add buyer_response_notes column

Buyer can provide a short note when confirming or cancelling a
AWAITING_CONFIRMATION order (supplier-edited order response).

Revision ID: r6s7t8u9v0w1
Revises: q5r6s7t8u9v0
Create Date: 2026-02-27 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "r6s7t8u9v0w1"
down_revision = "q5r6s7t8u9v0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("buyer_response_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "buyer_response_notes")
