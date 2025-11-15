"""make po vendor nullable

Revision ID: make_po_vendor_nullable
Revises: update_po_for_invoices
Create Date: 2025-11-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'make_po_vendor_nullable'
down_revision = 'update_po_for_invoices'
branch_labels = None
depends_on = None


def upgrade():
    # Make vendor_id nullable in purchase_orders
    op.alter_column('purchase_orders', 'vendor_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)


def downgrade():
    # Make vendor_id NOT NULL again
    op.alter_column('purchase_orders', 'vendor_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
