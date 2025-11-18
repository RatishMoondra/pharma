"""add_raw_material_id_to_po_items

Revision ID: 4bcb55c19216
Revises: f85ddf5f1560
Create Date: 2025-11-18 18:04:43.845090

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4bcb55c19216'
down_revision = 'f85ddf5f1560'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add raw_material_id to po_items for RM PO line items
    op.add_column('po_items', sa.Column('raw_material_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_po_item_raw_material', 'po_items', 'raw_material_master', ['raw_material_id'], ['id'])
    
    # Make medicine_id nullable (for RM POs, only raw_material_id will be set)
    op.alter_column('po_items', 'medicine_id', nullable=True)


def downgrade() -> None:
    # Reverse the changes
    op.alter_column('po_items', 'medicine_id', nullable=False)
    op.drop_constraint('fk_po_item_raw_material', 'po_items', type_='foreignkey')
    op.drop_column('po_items', 'raw_material_id')
