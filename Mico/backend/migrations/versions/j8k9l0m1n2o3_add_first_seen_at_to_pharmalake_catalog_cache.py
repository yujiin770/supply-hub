"""add first_seen_at to pharmalake_catalog_cache

Revision ID: j8k9l0m1n2o3
Revises: i7j8k9l0m1n2
Create Date: 2026-02-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j8k9l0m1n2o3"
down_revision: Union[str, None] = "i7j8k9l0m1n2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pharmalake_catalog_cache",
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_pharmalake_catalog_cache_first_seen_at",
        "pharmalake_catalog_cache",
        ["first_seen_at"],
    )
    # Back-fill: treat existing rows as first seen at their current synced_at
    op.execute(
        "UPDATE pharmalake_catalog_cache SET first_seen_at = synced_at "
        "WHERE first_seen_at IS NULL"
    )


def downgrade() -> None:
    op.drop_index(
        "ix_pharmalake_catalog_cache_first_seen_at",
        table_name="pharmalake_catalog_cache",
    )
    op.drop_column("pharmalake_catalog_cache", "first_seen_at")
