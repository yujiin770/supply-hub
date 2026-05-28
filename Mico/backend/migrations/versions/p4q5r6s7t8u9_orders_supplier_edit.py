"""orders: add supplier_edit_notes + AWAITING_CONFIRMATION status support

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
Create Date: 2026-02-27 00:00:00.000000

Notes:
  - orderstatus is stored as VARCHAR (native_enum=False), so no TYPE alteration needed.
  - Just adds the supplier_edit_notes column.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "p4q5r6s7t8u9"
down_revision = "o3p4q5r6s7t8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("supplier_edit_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "supplier_edit_notes")
