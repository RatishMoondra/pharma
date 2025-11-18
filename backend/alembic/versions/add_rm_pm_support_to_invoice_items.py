"""Add raw_material_id and packing_material_id to invoice items

Revision ID: add_rm_pm_support_invoice
Revises: update_po_for_invoices
Create Date: 2025-11-18

Changes:
1. Add raw_material_id column to vendor_invoice_items table
2. Add packing_material_id column to vendor_invoice_items table
3. Make medicine_id nullable (since invoices can be for RM, PM, or FG)
4. Add foreign key constraints for raw_material_id and packing_material_id
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_rm_pm_support_invoice'
down_revision: Union[str, None] = 'add_po_approval_workflow'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add raw_material_id column
    op.add_column('vendor_invoice_items', 
        sa.Column('raw_material_id', sa.Integer(), nullable=True)
    )
    
    # Add packing_material_id column
    op.add_column('vendor_invoice_items', 
        sa.Column('packing_material_id', sa.Integer(), nullable=True)
    )
    
    # Make medicine_id nullable (currently required, but should be optional)
    op.alter_column('vendor_invoice_items', 'medicine_id',
        existing_type=sa.Integer(),
        nullable=True
    )
    
    # Add foreign key constraint for raw_material_id
    op.create_foreign_key(
        'fk_invoice_item_raw_material',
        'vendor_invoice_items', 'raw_material_master',
        ['raw_material_id'], ['id']
    )
    
    # Add foreign key constraint for packing_material_id
    op.create_foreign_key(
        'fk_invoice_item_packing_material',
        'vendor_invoice_items', 'packing_material_master',
        ['packing_material_id'], ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraints
    op.drop_constraint('fk_invoice_item_packing_material', 'vendor_invoice_items', type_='foreignkey')
    op.drop_constraint('fk_invoice_item_raw_material', 'vendor_invoice_items', type_='foreignkey')
    
    # Make medicine_id not nullable again
    op.alter_column('vendor_invoice_items', 'medicine_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    
    # Drop columns
    op.drop_column('vendor_invoice_items', 'packing_material_id')
    op.drop_column('vendor_invoice_items', 'raw_material_id')
