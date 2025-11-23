"""add_commercial_fields_to_po

Revision ID: 5374a7ebec48
Revises: 161c7a03d98b
Create Date: 2025-11-23 14:07:31.594495

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5374a7ebec48'
down_revision = '161c7a03d98b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add commercial fields to po_items
    op.add_column('po_items', sa.Column('rate_per_unit', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('value_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('gst_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('po_items', sa.Column('delivery_schedule', sa.Text(), nullable=True))
    op.add_column('po_items', sa.Column('delivery_location', sa.Text(), nullable=True))
    
    # Add commercial totals and shipping fields to purchase_orders
    op.add_column('purchase_orders', sa.Column('total_value_amount', sa.Numeric(precision=15, scale=2), server_default='0', nullable=True))
    op.add_column('purchase_orders', sa.Column('total_gst_amount', sa.Numeric(precision=15, scale=2), server_default='0', nullable=True))
    op.add_column('purchase_orders', sa.Column('total_invoice_amount', sa.Numeric(precision=15, scale=2), server_default='0', nullable=True))
    op.add_column('purchase_orders', sa.Column('ship_to_manufacturer_id', sa.Integer(), nullable=True))
    op.add_column('purchase_orders', sa.Column('ship_to_address', sa.Text(), nullable=True))
    op.add_column('purchase_orders', sa.Column('amendment_reason', sa.Text(), nullable=True))
    op.add_column('purchase_orders', sa.Column('currency_exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=True))
    
    # Add foreign key constraint for ship_to_manufacturer_id
    op.create_foreign_key(
        'fk_ship_to_manufacturer',
        'purchase_orders', 'vendors',
        ['ship_to_manufacturer_id'], ['id']
    )
    
    # Add check constraint to ensure only ONE material type per po_item
    op.create_check_constraint(
        'chk_po_item_one_material_type',
        'po_items',
        '((medicine_id IS NOT NULL)::integer + (raw_material_id IS NOT NULL)::integer + (packing_material_id IS NOT NULL)::integer) = 1'
    )
    
    # Create indexes for performance
    op.create_index('idx_po_items_rate_per_unit', 'po_items', ['rate_per_unit'])
    op.create_index('idx_po_items_total_amount', 'po_items', ['total_amount'])
    op.create_index('idx_purchase_orders_ship_to_manufacturer', 'purchase_orders', ['ship_to_manufacturer_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_purchase_orders_ship_to_manufacturer', 'purchase_orders')
    op.drop_index('idx_po_items_total_amount', 'po_items')
    op.drop_index('idx_po_items_rate_per_unit', 'po_items')
    
    # Drop check constraint
    op.drop_constraint('chk_po_item_one_material_type', 'po_items', type_='check')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_ship_to_manufacturer', 'purchase_orders', type_='foreignkey')
    
    # Remove columns from purchase_orders
    op.drop_column('purchase_orders', 'currency_exchange_rate')
    op.drop_column('purchase_orders', 'amendment_reason')
    op.drop_column('purchase_orders', 'ship_to_address')
    op.drop_column('purchase_orders', 'ship_to_manufacturer_id')
    op.drop_column('purchase_orders', 'total_invoice_amount')
    op.drop_column('purchase_orders', 'total_gst_amount')
    op.drop_column('purchase_orders', 'total_value_amount')
    
    # Remove columns from po_items
    op.drop_column('po_items', 'delivery_location')
    op.drop_column('po_items', 'delivery_schedule')
    op.drop_column('po_items', 'total_amount')
    op.drop_column('po_items', 'gst_amount')
    op.drop_column('po_items', 'value_amount')
    op.drop_column('po_items', 'rate_per_unit')
