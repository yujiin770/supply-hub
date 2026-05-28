"""add payment detail fields to orders

Revision ID: x2y3z4a5b6c7
Revises: w1x2y3z4a5b6
Create Date: 2026-03-05 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "x2y3z4a5b6c7"
down_revision: Union[str, None] = "w1x2y3z4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("payment_reference_no", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("payment_amount", sa.String(50), nullable=True))
    op.add_column("orders", sa.Column("payment_date", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "payment_date")
    op.drop_column("orders", "payment_amount")
    op.drop_column("orders", "payment_reference_no")
