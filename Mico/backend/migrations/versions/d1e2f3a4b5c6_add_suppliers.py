"""add suppliers

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6a7b8
Create Date: 2026-02-26 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d1e2f3a4b5c6"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None

_VALID_STATUSES = (
    "DRAFT",
    "PENDING_KYC",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
)


def upgrade() -> None:
    # 1. Create the auto-increment sequence for supplier_code
    op.execute("CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1")

    # 2. Create suppliers table
    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "supplier_code",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text(
                "'SUP-' || LPAD(nextval('supplier_code_seq')::text, 6, '0')"
            ),
        ),
        sa.Column("legal_name", sa.String(length=255), nullable=False),
        sa.Column("trade_name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("mobile_number", sa.String(length=50), nullable=True),
        sa.Column("address_line1", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("province", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column(
            "country",
            sa.String(length=100),
            nullable=False,
            server_default=sa.text("'Philippines'"),
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'DRAFT'"),
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
    )
    op.create_index("ix_suppliers_supplier_code", "suppliers", ["supplier_code"], unique=True)
    op.execute(
        sa.text(
            "ALTER TABLE suppliers ADD CONSTRAINT ck_suppliers_status "
            "CHECK (status IN ('DRAFT','PENDING_KYC','PENDING_APPROVAL','APPROVED','REJECTED','SUSPENDED'))"
        )
    )

    # 3. Add supplier_id FK to users (nullable — not all users belong to a supplier)
    op.add_column(
        "users",
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_users_supplier_id",
        "users",
        "suppliers",
        ["supplier_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_supplier_id", "users", type_="foreignkey")
    op.drop_column("users", "supplier_id")
    op.drop_index("ix_suppliers_supplier_code", table_name="suppliers")
    op.drop_table("suppliers")
    op.execute("DROP SEQUENCE IF EXISTS supplier_code_seq")
