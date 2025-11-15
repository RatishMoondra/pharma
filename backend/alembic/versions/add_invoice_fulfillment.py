"""Add invoice tables and update PO for quantity-based fulfillment

Revision ID: add_invoice_fulfillment
Revises: 
Create Date: 2025-11-15

Changes:
1. Create vendor_invoices table
2. Create vendor_invoice_items table
3. Modify purchase_orders table:
   - Remove total_amount
   - Add total_ordered_qty, total_fulfilled_qty
   - Add PARTIAL status
4. Modify po_items table:
   - Remove unit_price, total_price, received_quantity
   - Add ordered_quantity, fulfilled_quantity
   - Add language, artwork_version (for PM items)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_invoice_fulfillment'
down_revision: Union[str, None] = 'remove_vendor_from_eopa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create vendor_invoices table
    op.create_table(
        'vendor_invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=100), nullable=False),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('invoice_type', sa.Enum('RM', 'PM', 'FG', name='invoicetype'), nullable=False),
        sa.Column('po_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSED', 'CANCELLED', name='invoicestatus'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('received_by', sa.Integer(), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['po_id'], ['purchase_orders.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
        sa.ForeignKeyConstraint(['received_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vendor_invoices_invoice_number', 'vendor_invoices', ['invoice_number'], unique=True)
    op.create_index('ix_vendor_invoices_po_id', 'vendor_invoices', ['po_id'])
    
    # Create vendor_invoice_items table
    op.create_table(
        'vendor_invoice_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('medicine_id', sa.Integer(), nullable=False),
        sa.Column('shipped_quantity', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_price', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('batch_number', sa.String(length=50), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['vendor_invoices.id'], ),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicine_master.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vendor_invoice_items_invoice_id', 'vendor_invoice_items', ['invoice_id'])
    
    # Modify purchase_orders table
    # Add PARTIAL to POStatus enum
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'PARTIAL'")
    
    # Add new quantity columns
    op.add_column('purchase_orders', sa.Column('total_ordered_qty', sa.Numeric(precision=15, scale=3), server_default='0', nullable=False))
    op.add_column('purchase_orders', sa.Column('total_fulfilled_qty', sa.Numeric(precision=15, scale=3), server_default='0', nullable=False))
    
    # Drop total_amount column (pricing now comes from invoices)
    op.drop_column('purchase_orders', 'total_amount')
    
    # Modify po_items table
    # Add new columns
    op.add_column('po_items', sa.Column('ordered_quantity', sa.Numeric(precision=15, scale=3), nullable=True))
    op.add_column('po_items', sa.Column('fulfilled_quantity', sa.Numeric(precision=15, scale=3), server_default='0', nullable=False))
    op.add_column('po_items', sa.Column('language', sa.String(length=50), nullable=True))
    op.add_column('po_items', sa.Column('artwork_version', sa.String(length=50), nullable=True))
    
    # Migrate data: quantity → ordered_quantity
    op.execute("UPDATE po_items SET ordered_quantity = quantity")
    
    # Make ordered_quantity NOT NULL after migration
    op.alter_column('po_items', 'ordered_quantity', nullable=False)
    
    # Drop old pricing columns
    op.drop_column('po_items', 'quantity')
    op.drop_column('po_items', 'unit_price')
    op.drop_column('po_items', 'total_price')
    op.drop_column('po_items', 'received_quantity')


def downgrade() -> None:
    # Reverse po_items changes
    op.add_column('po_items', sa.Column('quantity', sa.Numeric(precision=15, scale=3), nullable=True))
    op.add_column('po_items', sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('total_price', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('received_quantity', sa.Numeric(precision=15, scale=3), server_default='0', nullable=False))
    
    # Migrate back: ordered_quantity → quantity
    op.execute("UPDATE po_items SET quantity = ordered_quantity")
    op.alter_column('po_items', 'quantity', nullable=False)
    
    op.drop_column('po_items', 'artwork_version')
    op.drop_column('po_items', 'language')
    op.drop_column('po_items', 'fulfilled_quantity')
    op.drop_column('po_items', 'ordered_quantity')
    
    # Reverse purchase_orders changes
    op.add_column('purchase_orders', sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.drop_column('purchase_orders', 'total_fulfilled_qty')
    op.drop_column('purchase_orders', 'total_ordered_qty')
    
    # Drop invoice tables
    op.drop_index('ix_vendor_invoice_items_invoice_id', 'vendor_invoice_items')
    op.drop_table('vendor_invoice_items')
    
    op.drop_index('ix_vendor_invoices_po_id', 'vendor_invoices')
    op.drop_index('ix_vendor_invoices_invoice_number', 'vendor_invoices')
    op.drop_table('vendor_invoices')
    
    # Note: Cannot easily remove PARTIAL from enum, requires recreating the enum
