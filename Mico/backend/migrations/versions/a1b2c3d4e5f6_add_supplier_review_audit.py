"""add supplier review audit columns

Revision ID: a1b2c3d4e5f6
Revises: f3a4b5c6d7e8
Create Date: 2026-02-26 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("suppliers", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "suppliers",
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("suppliers", sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "suppliers",
        sa.Column("rejected_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("suppliers", sa.Column("rejection_reason", sa.String(length=1000), nullable=True))

    op.create_foreign_key(
        "fk_suppliers_approved_by",
        "suppliers", "users",
        ["approved_by"], ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_suppliers_rejected_by",
        "suppliers", "users",
        ["rejected_by"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_suppliers_rejected_by", "suppliers", type_="foreignkey")
    op.drop_constraint("fk_suppliers_approved_by", "suppliers", type_="foreignkey")
    op.drop_column("suppliers", "rejection_reason")
    op.drop_column("suppliers", "rejected_by")
    op.drop_column("suppliers", "rejected_at")
    op.drop_column("suppliers", "approved_by")
    op.drop_column("suppliers", "approved_at")
