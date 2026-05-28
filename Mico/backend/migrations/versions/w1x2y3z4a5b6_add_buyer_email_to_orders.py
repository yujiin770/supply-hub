"""add buyer_email to orders

Revision ID: w1x2y3z4a5b6
Revises: v0w1x2y3z4a5
Create Date: 2026-03-04 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "w1x2y3z4a5b6"
down_revision: Union[str, None] = "v0w1x2y3z4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("buyer_email", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "buyer_email")
