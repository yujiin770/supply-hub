"""add pharmalake_catalog_cache

Revision ID: h6i7j8k9l0m1
Revises: g5h6i7j8k9l0
Create Date: 2026-02-26 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "h6i7j8k9l0m1"
down_revision = "g5h6i7j8k9l0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pharmalake_catalog_cache",
        sa.Column(
            "pack_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("brand_name", sa.String(500), nullable=True),
        sa.Column("barcode", sa.String(200), nullable=True),
        sa.Column("sku", sa.String(200), nullable=True),
        sa.Column("org_id", sa.String(200), nullable=True),
        sa.Column("org_name", sa.String(500), nullable=True),
        sa.Column("dosage_form_name", sa.String(200), nullable=True),
        sa.Column("route_name", sa.String(200), nullable=True),
        sa.Column("pack_qty_value", sa.String(100), nullable=True),
        sa.Column("pack_qty_unit_code", sa.String(50), nullable=True),
        sa.Column("pack_qty_unit_name", sa.String(100), nullable=True),
        sa.Column("ingredients_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Trigram / ILIKE-friendly indexes
    op.create_index("ix_plcache_brand_name", "pharmalake_catalog_cache", ["brand_name"])
    op.create_index("ix_plcache_barcode", "pharmalake_catalog_cache", ["barcode"])
    op.create_index("ix_plcache_sku", "pharmalake_catalog_cache", ["sku"])
    op.create_index("ix_plcache_is_active", "pharmalake_catalog_cache", ["is_active"])
    op.create_index("ix_plcache_synced_at", "pharmalake_catalog_cache", ["synced_at"])


def downgrade() -> None:
    op.drop_index("ix_plcache_synced_at", table_name="pharmalake_catalog_cache")
    op.drop_index("ix_plcache_is_active", table_name="pharmalake_catalog_cache")
    op.drop_index("ix_plcache_sku", table_name="pharmalake_catalog_cache")
    op.drop_index("ix_plcache_barcode", table_name="pharmalake_catalog_cache")
    op.drop_index("ix_plcache_brand_name", table_name="pharmalake_catalog_cache")
    op.drop_table("pharmalake_catalog_cache")
