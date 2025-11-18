"""add_raw_material_tables_for_bom_explosion

Revision ID: 97d25ea63c7b
Revises: add_schema_enhancements
Create Date: 2025-11-18 17:39:14.295278

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '97d25ea63c7b'
down_revision = 'add_schema_enhancements'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create raw_material_master table (idempotent - check if exists)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    
    if 'raw_material_master' not in inspector.get_table_names():
        op.create_table(
            'raw_material_master',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rm_code', sa.String(length=50), nullable=False),
        sa.Column('rm_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('unit_of_measure', sa.String(length=20), nullable=False),
        sa.Column('standard_purity', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('hsn_code', sa.String(length=20), nullable=True),
        sa.Column('gst_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('default_vendor_id', sa.Integer(), nullable=True),
        sa.Column('cas_number', sa.String(length=50), nullable=True),
        sa.Column('storage_conditions', sa.Text(), nullable=True),
        sa.Column('shelf_life_months', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['default_vendor_id'], ['vendors.id'], name='fk_raw_material_vendor'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_raw_material_master_id', 'raw_material_master', ['id'])
        op.create_index('ix_raw_material_master_rm_code', 'raw_material_master', ['rm_code'], unique=True)
        op.create_index('ix_raw_material_master_hsn_code', 'raw_material_master', ['hsn_code'])
    
    # Create medicine_raw_materials table (BOM)
    if 'medicine_raw_materials' not in inspector.get_table_names():
        op.create_table(
            'medicine_raw_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('medicine_id', sa.Integer(), nullable=False),
        sa.Column('raw_material_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=True),
        sa.Column('qty_required_per_unit', sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column('uom', sa.String(length=20), nullable=False),
        sa.Column('purity_required', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('hsn_code', sa.String(length=20), nullable=True),
        sa.Column('gst_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_critical', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('lead_time_days', sa.Integer(), nullable=True),
        sa.Column('wastage_percentage', sa.Numeric(precision=5, scale=2), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicine_master.id'], name='fk_medicine_rm_medicine', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['raw_material_id'], ['raw_material_master.id'], name='fk_medicine_rm_raw_material'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], name='fk_medicine_rm_vendor'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_medicine_raw_materials_id', 'medicine_raw_materials', ['id'])
        op.create_index('ix_medicine_raw_materials_medicine_id', 'medicine_raw_materials', ['medicine_id'])
        op.create_index('ix_medicine_raw_materials_raw_material_id', 'medicine_raw_materials', ['raw_material_id'])


def downgrade() -> None:
    op.drop_index('ix_medicine_raw_materials_raw_material_id', table_name='medicine_raw_materials')
    op.drop_index('ix_medicine_raw_materials_medicine_id', table_name='medicine_raw_materials')
    op.drop_index('ix_medicine_raw_materials_id', table_name='medicine_raw_materials')
    op.drop_table('medicine_raw_materials')
    
    op.drop_index('ix_raw_material_master_hsn_code', table_name='raw_material_master')
    op.drop_index('ix_raw_material_master_rm_code', table_name='raw_material_master')
    op.drop_index('ix_raw_material_master_id', table_name='raw_material_master')
    op.drop_table('raw_material_master')
