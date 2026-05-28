"""orders: widen status column from VARCHAR(20) to VARCHAR(30)

AWAITING_CONFIRMATION is 22 chars and exceeds the original VARCHAR(20) limit,
causing a 500 on any status update that sets that value.

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
Create Date: 2026-02-27 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "q5r6s7t8u9v0"
down_revision = "p4q5r6s7t8u9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "orders",
        "status",
        existing_type=sa.String(20),
        type_=sa.String(30),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Shorten back — will fail if any rows contain values > 20 chars.
    op.alter_column(
        "orders",
        "status",
        existing_type=sa.String(30),
        type_=sa.String(20),
        existing_nullable=False,
    )
