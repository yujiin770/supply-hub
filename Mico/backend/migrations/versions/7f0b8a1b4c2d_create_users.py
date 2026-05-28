"""create users

Revision ID: 7f0b8a1b4c2d
Revises: e0fa051ee959
Create Date: 2026-02-26 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "7f0b8a1b4c2d"
down_revision = "e0fa051ee959"
branch_labels = None
depends_on = None

_VALID_ROLES = ("SUPERADMIN", "ADMIN", "SUPPLIER_OWNER", "SUPPLIER_STAFF")

# Use a simple VARCHAR to store the role string.
# This avoids any PostgreSQL ENUM type management complexity
# and is fully compatible with native_enum=False on the model.
role_col_type = sa.String(50)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("mobile_number", sa.String(length=50), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", role_col_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    # Enforce valid role values via a CHECK constraint
    op.execute(
        sa.text(
            "ALTER TABLE users ADD CONSTRAINT ck_users_role "
            "CHECK (role IN ('SUPERADMIN', 'ADMIN', 'SUPPLIER_OWNER', 'SUPPLIER_STAFF'))"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
