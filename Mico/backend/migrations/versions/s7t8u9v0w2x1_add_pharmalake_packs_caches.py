"""add pharmalake_packs_caches

Revision ID: s7t8u9v0w2x1
Revises: r6s7t8u9v0w1
Create Date: 2026-03-03 00:00:00.000000

Per-supplier mirror of PharmaLake pack metadata fetched on login.
Replaces the older per-supplier hack of storing packs in supplier_listings.
The unique constraint (supplier_id, pack_id) supports upsert and reconciliation.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "s7t8u9v0w2x1"
down_revision = "r6s7t8u9v0w1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pharmalake_packs_caches",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "pack_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("presentation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("org_name", sa.Text(), nullable=True),
        sa.Column("brand_name", sa.Text(), nullable=True),
        sa.Column("sku", sa.Text(), nullable=True),
        sa.Column("barcode", sa.Text(), nullable=True),
        sa.Column("pack_qty_value", sa.Numeric(18, 4), nullable=True),
        sa.Column("pack_qty_unit_code", sa.Text(), nullable=True),
        sa.Column("pack_qty_unit_name", sa.Text(), nullable=True),
        sa.Column("dosage_form_name", sa.Text(), nullable=True),
        sa.Column("route_name", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "ingredients",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "source_synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
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
        sa.UniqueConstraint("supplier_id", "pack_id", name="uq_packs_cache_supplier_pack"),
    )

    # -- Indexes --
    op.create_index(
        "ix_packs_cache_supplier_id",
        "pharmalake_packs_caches",
        ["supplier_id"],
    )
    op.create_index(
        "ix_packs_cache_supplier_active",
        "pharmalake_packs_caches",
        ["supplier_id", "is_active"],
    )
    op.create_index(
        "ix_packs_cache_brand_name",
        "pharmalake_packs_caches",
        ["brand_name"],
    )
    op.create_index(
        "ix_packs_cache_sku",
        "pharmalake_packs_caches",
        ["sku"],
    )
    op.create_index(
        "ix_packs_cache_barcode",
        "pharmalake_packs_caches",
        ["barcode"],
    )
    # GIN indexes for JSONB full-document search
    op.create_index(
        "ix_packs_cache_ingredients_gin",
        "pharmalake_packs_caches",
        ["ingredients"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_packs_cache_raw_payload_gin",
        "pharmalake_packs_caches",
        ["raw_payload"],
        postgresql_using="gin",
    )

    # -- Trigger to auto-update updated_at on row change --
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_packs_cache_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_packs_cache_updated_at
        BEFORE UPDATE ON pharmalake_packs_caches
        FOR EACH ROW EXECUTE FUNCTION set_packs_cache_updated_at();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_packs_cache_updated_at ON pharmalake_packs_caches;")
    op.execute("DROP FUNCTION IF EXISTS set_packs_cache_updated_at;")

    op.drop_index("ix_packs_cache_raw_payload_gin", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_ingredients_gin", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_barcode", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_sku", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_brand_name", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_supplier_active", table_name="pharmalake_packs_caches")
    op.drop_index("ix_packs_cache_supplier_id", table_name="pharmalake_packs_caches")
    op.drop_table("pharmalake_packs_caches")
