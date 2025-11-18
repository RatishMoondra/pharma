"""add_po_approval_workflow

Revision ID: add_po_approval_workflow
Revises: 86b94dfed898
Create Date: 2025-11-18 10:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_po_approval_workflow'
down_revision = '86b94dfed898'  # Latest migration: add_packing_material_tables_for_bom_explosion
branch_labels = None
depends_on = None


def upgrade():
    # Add new statuses to POStatus enum
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'DRAFT'")
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL'")
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'APPROVED'")
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'READY'")
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'SENT'")
    op.execute("ALTER TYPE postatus ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED'")
    
    # Add approval timestamp columns
    op.add_column('purchase_orders', sa.Column('prepared_at', sa.DateTime(), nullable=True))
    op.add_column('purchase_orders', sa.Column('checked_at', sa.DateTime(), nullable=True))
    op.add_column('purchase_orders', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('purchase_orders', sa.Column('verified_at', sa.DateTime(), nullable=True))
    op.add_column('purchase_orders', sa.Column('sent_at', sa.DateTime(), nullable=True))
    op.add_column('purchase_orders', sa.Column('acknowledged_at', sa.DateTime(), nullable=True))


def downgrade():
    # Remove approval timestamp columns
    op.drop_column('purchase_orders', 'acknowledged_at')
    op.drop_column('purchase_orders', 'sent_at')
    op.drop_column('purchase_orders', 'verified_at')
    op.drop_column('purchase_orders', 'approved_at')
    op.drop_column('purchase_orders', 'checked_at')
    op.drop_column('purchase_orders', 'prepared_at')
    
    # Note: Cannot remove enum values in PostgreSQL, would need to recreate the type

