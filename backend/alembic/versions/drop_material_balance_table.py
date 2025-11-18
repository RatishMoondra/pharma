"""drop_material_balance_table

Revision ID: drop_material_balance
Revises: 
Create Date: 2025-11-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'drop_material_balance'
down_revision = None  # Update this to the latest migration ID if needed

def upgrade():
    """Drop material_balance table - no longer needed"""
    op.drop_table('material_balance')


def downgrade():
    """Recreate material_balance table if needed to rollback"""
    op.create_table(
        'material_balance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medicine_id', sa.Integer(), nullable=False),
        sa.Column('available_quantity', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicine_master.id'], ),
        sa.UniqueConstraint('medicine_id')
    )
    op.create_index('ix_material_balance_id', 'material_balance', ['id'])
