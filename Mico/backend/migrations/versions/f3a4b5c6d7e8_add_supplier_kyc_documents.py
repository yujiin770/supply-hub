"""add supplier_kyc_documents

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-02-26 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f3a4b5c6d7e8"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "supplier_kyc_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'SUBMITTED'"),
        ),
        sa.Column("remarks", sa.String(length=1000), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["supplier_id"], ["suppliers.id"], ondelete="CASCADE", name="fk_kycdocs_supplier_id"
        ),
    )
    op.create_index("ix_kycdocs_supplier_id", "supplier_kyc_documents", ["supplier_id"])
    op.execute(
        sa.text(
            "ALTER TABLE supplier_kyc_documents ADD CONSTRAINT ck_kycdocs_doc_type "
            "CHECK (doc_type IN ('DTI_SEC','BIR_COR','FDA_LTO','MAYORS_PERMIT',"
            "'VALID_ID','PROOF_OF_ADDRESS','OTHER'))"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE supplier_kyc_documents ADD CONSTRAINT ck_kycdocs_status "
            "CHECK (status IN ('SUBMITTED','APPROVED','REJECTED'))"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_kycdocs_supplier_id", table_name="supplier_kyc_documents")
    op.drop_table("supplier_kyc_documents")
