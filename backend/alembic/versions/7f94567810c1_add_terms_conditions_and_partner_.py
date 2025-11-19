"""Add terms conditions and partner medicines tables

Revision ID: 7f94567810c1
Revises: 7796a025aa4f
Create Date: 2025-11-19 06:32:29.277150

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7f94567810c1'
down_revision = '7796a025aa4f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create terms_conditions_master table
    op.create_table('terms_conditions_master',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('term_text', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('priority', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_terms_conditions_master_category'), 'terms_conditions_master', ['category'], unique=False)
    op.create_index(op.f('ix_terms_conditions_master_id'), 'terms_conditions_master', ['id'], unique=False)
    op.create_index(op.f('ix_terms_conditions_master_is_active'), 'terms_conditions_master', ['is_active'], unique=False)
    op.create_index(op.f('ix_terms_conditions_master_priority'), 'terms_conditions_master', ['priority'], unique=False)
    
    # Create vendor_terms_conditions table
    op.create_table('vendor_terms_conditions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vendor_id', sa.Integer(), nullable=False),
    sa.Column('term_id', sa.Integer(), nullable=False),
    sa.Column('priority_override', sa.Integer(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['term_id'], ['terms_conditions_master.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_terms_conditions_id'), 'vendor_terms_conditions', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_terms_conditions_term_id'), 'vendor_terms_conditions', ['term_id'], unique=False)
    op.create_index(op.f('ix_vendor_terms_conditions_vendor_id'), 'vendor_terms_conditions', ['vendor_id'], unique=False)
    
    # Create partner_vendor_medicines table
    op.create_table('partner_vendor_medicines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vendor_id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicine_master.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_partner_vendor_medicines_id'), 'partner_vendor_medicines', ['id'], unique=False)
    op.create_index(op.f('ix_partner_vendor_medicines_medicine_id'), 'partner_vendor_medicines', ['medicine_id'], unique=False)
    op.create_index(op.f('ix_partner_vendor_medicines_vendor_id'), 'partner_vendor_medicines', ['vendor_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # Drop partner_vendor_medicines table
    op.drop_index(op.f('ix_partner_vendor_medicines_vendor_id'), table_name='partner_vendor_medicines')
    op.drop_index(op.f('ix_partner_vendor_medicines_medicine_id'), table_name='partner_vendor_medicines')
    op.drop_index(op.f('ix_partner_vendor_medicines_id'), table_name='partner_vendor_medicines')
    op.drop_table('partner_vendor_medicines')
    
    # Drop vendor_terms_conditions table
    op.drop_index(op.f('ix_vendor_terms_conditions_vendor_id'), table_name='vendor_terms_conditions')
    op.drop_index(op.f('ix_vendor_terms_conditions_term_id'), table_name='vendor_terms_conditions')
    op.drop_index(op.f('ix_vendor_terms_conditions_id'), table_name='vendor_terms_conditions')
    op.drop_table('vendor_terms_conditions')
    
    # Drop terms_conditions_master table
    op.drop_index(op.f('ix_terms_conditions_master_priority'), table_name='terms_conditions_master')
    op.drop_index(op.f('ix_terms_conditions_master_is_active'), table_name='terms_conditions_master')
    op.drop_index(op.f('ix_terms_conditions_master_id'), table_name='terms_conditions_master')
    op.drop_index(op.f('ix_terms_conditions_master_category'), table_name='terms_conditions_master')
    op.drop_table('terms_conditions_master')
