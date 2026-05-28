"""orders: drop buyer FK, add client_reference_id

Revision ID: n2o3p4q5r6s7
Revises: m1n2o3p4q5r6
Create Date: 2026-02-27 00:00:00.000000

buyer_id is now an opaque UUID from an external application — no longer a
foreign key to the users table.
client_reference_id is a free-form string the external consumer can pass to
correlate the order back to their own records (e.g. patient ID, cart ref).
"""
from alembic import op
import sqlalchemy as sa

revision = "n2o3p4q5r6s7"
down_revision = "m1n2o3p4q5r6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the foreign-key constraint so buyer_id is a plain UUID column
    op.drop_constraint("fk_orders_buyer_id", "orders", type_="foreignkey")

    # Add client_reference_id for the external consumer's own identifier
    op.add_column(
        "orders",
        sa.Column("client_reference_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_orders_client_reference_id", "orders", ["client_reference_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_orders_client_reference_id", table_name="orders")
    op.drop_column("orders", "client_reference_id")

    op.create_foreign_key(
        "fk_orders_buyer_id",
        "orders",
        "users",
        ["buyer_id"],
        ["id"],
        ondelete="RESTRICT",
    )
