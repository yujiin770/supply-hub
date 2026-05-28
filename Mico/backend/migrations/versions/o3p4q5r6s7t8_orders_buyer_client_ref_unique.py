"""orders: unique (buyer_id, client_reference_id) partial index

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
Create Date: 2026-02-27 00:00:00.000000

Adds a partial unique index so the combination of buyer_id + client_reference_id
is unique when client_reference_id is NOT NULL. Orders without a client_reference_id
are unaffected.
"""
from alembic import op

revision = "o3p4q5r6s7t8"
down_revision = "n2o3p4q5r6s7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove duplicate (buyer_id, client_reference_id) pairs keeping only the
    # most recent order (highest created_at) per combination.
    op.execute(
        """
        DELETE FROM orders
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY buyer_id, client_reference_id
                           ORDER BY created_at DESC
                       ) AS rn
                FROM orders
                WHERE client_reference_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        )
        """
    )

    op.execute(
        """
        CREATE UNIQUE INDEX uq_orders_buyer_client_ref
        ON orders (buyer_id, client_reference_id)
        WHERE client_reference_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_orders_buyer_client_ref")
