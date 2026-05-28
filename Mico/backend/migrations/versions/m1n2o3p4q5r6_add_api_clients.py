"""add api_clients

Revision ID: m1n2o3p4q5r6
Revises: l0m1n2o3p4q5
Create Date: 2026-02-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "m1n2o3p4q5r6"
down_revision = "l0m1n2o3p4q5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_clients",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("client_id", sa.String(100), nullable=False),
        sa.Column("hashed_secret", sa.String(255), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
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
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="SET NULL",
            name="fk_api_clients_created_by_id",
        ),
        sa.UniqueConstraint("client_id", name="uq_api_clients_client_id"),
    )
    op.create_index("ix_api_clients_client_id", "api_clients", ["client_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_api_clients_client_id", table_name="api_clients")
    op.drop_table("api_clients")
