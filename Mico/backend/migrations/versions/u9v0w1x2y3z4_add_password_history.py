"""add_password_history

Revision ID: u9v0w1x2y3z4
Revises: t8u9v0w1x2y3
Create Date: 2026-03-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "u9v0w1x2y3z4"
down_revision = "t8u9v0w1x2y3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_history",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_password_history_user_id",
        "password_history",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_password_history_user_id", table_name="password_history")
    op.drop_table("password_history")
