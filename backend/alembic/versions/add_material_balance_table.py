"""
Add material_balance table for RM/PM ledger
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_material_balance_table'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'material_balance',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('raw_material_id', sa.Integer, sa.ForeignKey('raw_material_master.id'), nullable=False),
        sa.Column('vendor_id', sa.Integer, sa.ForeignKey('vendors.id'), nullable=False),
        sa.Column('po_id', sa.Integer, sa.ForeignKey('purchase_orders.id'), nullable=False),
        sa.Column('invoice_id', sa.Integer, sa.ForeignKey('vendor_invoices.id'), nullable=False),
        sa.Column('ordered_qty', sa.Numeric, nullable=False),
        sa.Column('received_qty', sa.Numeric, nullable=False),
        sa.Column('balance_qty', sa.Numeric, nullable=False),
        sa.Column('last_updated', sa.DateTime, server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_material_balance_id', 'material_balance', ['id'])

def downgrade():
    op.drop_index('ix_material_balance_id', table_name='material_balance')
    op.drop_table('material_balance')
