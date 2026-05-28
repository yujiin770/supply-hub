"""add catalog_imports

Revision ID: i7j8k9l0m1n2
Revises: h6i7j8k9l0m1
Create Date: 2026-02-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "i7j8k9l0m1n2"
down_revision: Union[str, None] = "h6i7j8k9l0m1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "catalog_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("suppliers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="submitted"),
        sa.Column("pharmalake_status_code", sa.Integer, nullable=True),
        sa.Column("pharmalake_response_json", postgresql.JSONB, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_catalog_imports_supplier_id",
        "catalog_imports",
        ["supplier_id"],
    )
    op.create_index(
        "ix_catalog_imports_status",
        "catalog_imports",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_catalog_imports_status", table_name="catalog_imports")
    op.drop_index("ix_catalog_imports_supplier_id", table_name="catalog_imports")
    op.drop_table("catalog_imports")
