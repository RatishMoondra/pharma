"""add unit to po items

Revision ID: add_unit_to_po_items
Revises: make_po_vendor_nullable
Create Date: 2025-11-15 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_unit_to_po_items'
down_revision = 'make_po_vendor_nullable'
branch_labels = None
depends_on = None


def upgrade():
    # Add unit column to po_items (for RM/PM: kg, liters, boxes, labels, etc.)
    op.add_column('po_items', sa.Column('unit', sa.String(50), nullable=True))


def downgrade():
    # Remove unit column
    op.drop_column('po_items', 'unit')
