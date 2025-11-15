"""add FG dispatch and warehouse fields

Revision ID: add_fg_dispatch_warehouse_fields
Revises: add_unit_to_po_items
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_fg_dispatch_warehouse_fields'
down_revision = 'add_unit_to_po_items'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add FG-specific fields to vendor_invoices table
    op.add_column('vendor_invoices', sa.Column('dispatch_note_number', sa.String(100), nullable=True))
    op.add_column('vendor_invoices', sa.Column('dispatch_date', sa.Date(), nullable=True))
    op.add_column('vendor_invoices', sa.Column('warehouse_location', sa.String(200), nullable=True))
    op.add_column('vendor_invoices', sa.Column('warehouse_received_by', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('vendor_invoices', 'warehouse_received_by')
    op.drop_column('vendor_invoices', 'warehouse_location')
    op.drop_column('vendor_invoices', 'dispatch_date')
    op.drop_column('vendor_invoices', 'dispatch_note_number')
