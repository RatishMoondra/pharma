"""Update PO tables for quantity-based fulfillment

Revision ID: update_po_for_invoices
Revises: 28f9d84671af
Create Date: 2025-11-15

Changes:
1. Modify purchase_orders table:
   - Remove total_amount
   - Add total_ordered_qty, total_fulfilled_qty
   - Update POStatus enum to include PARTIAL
2. Modify po_items table:
   - Rename quantity to ordered_quantity
   - Remove unit_price, total_price, received_quantity
   - Add fulfilled_quantity
   - Add language, artwork_version (for PM items)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'update_po_for_invoices'
down_revision: Union[str, None] = '28f9d84671af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Modify purchase_orders table
    
    # Add PARTIAL to POStatus enum if not exists
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'PARTIAL' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'postatus')
            ) THEN
                ALTER TYPE postatus ADD VALUE 'PARTIAL';
            END IF;
        END $$;
    """)
    
    # Add new quantity tracking columns
    op.add_column('purchase_orders', 
        sa.Column('total_ordered_qty', sa.Numeric(precision=15, scale=3), 
                  server_default='0', nullable=False))
    op.add_column('purchase_orders', 
        sa.Column('total_fulfilled_qty', sa.Numeric(precision=15, scale=3), 
                  server_default='0', nullable=False))
    
    # Drop total_amount column
    op.drop_column('purchase_orders', 'total_amount')
    
    # Step 2: Modify po_items table
    
    # Add new columns
    op.add_column('po_items', 
        sa.Column('ordered_quantity', sa.Numeric(precision=15, scale=3), nullable=True))
    op.add_column('po_items', 
        sa.Column('fulfilled_quantity', sa.Numeric(precision=15, scale=3), 
                  server_default='0', nullable=False))
    op.add_column('po_items', 
        sa.Column('language', sa.String(length=50), nullable=True))
    op.add_column('po_items', 
        sa.Column('artwork_version', sa.String(length=50), nullable=True))
    
    # Migrate data: quantity → ordered_quantity
    op.execute("UPDATE po_items SET ordered_quantity = quantity WHERE quantity IS NOT NULL")
    
    # Make ordered_quantity NOT NULL after migration
    op.alter_column('po_items', 'ordered_quantity', nullable=False)
    
    # Drop old columns
    op.drop_column('po_items', 'quantity')
    op.drop_column('po_items', 'unit_price')
    op.drop_column('po_items', 'total_price')
    op.drop_column('po_items', 'received_quantity')


def downgrade() -> None:
    # Reverse po_items changes
    op.add_column('po_items', 
        sa.Column('quantity', sa.Numeric(precision=15, scale=3), nullable=True))
    op.add_column('po_items', 
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', 
        sa.Column('total_price', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', 
        sa.Column('received_quantity', sa.Numeric(precision=15, scale=3), 
                  server_default='0', nullable=False))
    
    # Migrate back: ordered_quantity → quantity
    op.execute("UPDATE po_items SET quantity = ordered_quantity WHERE ordered_quantity IS NOT NULL")
    op.alter_column('po_items', 'quantity', nullable=False)
    
    op.drop_column('po_items', 'artwork_version')
    op.drop_column('po_items', 'language')
    op.drop_column('po_items', 'fulfilled_quantity')
    op.drop_column('po_items', 'ordered_quantity')
    
    # Reverse purchase_orders changes
    op.add_column('purchase_orders', 
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.drop_column('purchase_orders', 'total_fulfilled_qty')
    op.drop_column('purchase_orders', 'total_ordered_qty')
