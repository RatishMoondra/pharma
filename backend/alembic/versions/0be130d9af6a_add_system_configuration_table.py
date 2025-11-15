"""add_system_configuration_table

Revision ID: 0be130d9af6a
Revises: add_fg_dispatch_warehouse_fields
Create Date: 2025-11-15 15:36:36.058867

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '0be130d9af6a'
down_revision = 'add_fg_dispatch_warehouse_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create system_configuration table for storing all system settings"""
    op.create_table(
        'system_configuration',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('config_key', sa.String(length=255), nullable=False),
        sa.Column('config_value', JSON, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('is_sensitive', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('config_key', name='uq_config_key')
    )
    
    # Create indexes for fast lookups
    op.create_index('idx_config_key', 'system_configuration', ['config_key'])
    op.create_index('idx_config_category', 'system_configuration', ['category'])


def downgrade() -> None:
    """Drop system_configuration table"""
    op.drop_index('idx_config_category', table_name='system_configuration')
    op.drop_index('idx_config_key', table_name='system_configuration')
    op.drop_table('system_configuration')
