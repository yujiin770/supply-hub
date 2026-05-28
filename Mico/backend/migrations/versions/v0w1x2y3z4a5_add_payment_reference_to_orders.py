"""add payment_reference to orders

Revision ID: v0w1x2y3z4a5
Revises: u9v0w1x2y3z4
Create Date: 2026-03-03 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "v0w1x2y3z4a5"
down_revision: Union[str, None] = "u9v0w1x2y3z4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("payment_reference", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_reference")
