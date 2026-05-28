"""add otp_codes

Revision ID: c3d4e5f6a7b8
Revises: 7f0b8a1b4c2d
Create Date: 2026-02-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c3d4e5f6a7b8"
down_revision = "7f0b8a1b4c2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_codes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hashed_otp", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "is_used",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_otp_codes_user_id", "otp_codes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_otp_codes_user_id", table_name="otp_codes")
    op.drop_table("otp_codes")
