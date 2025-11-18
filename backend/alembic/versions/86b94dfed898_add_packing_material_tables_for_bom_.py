"""add_packing_material_tables_for_bom_explosion

Revision ID: 86b94dfed898
Revises: 4bcb55c19216
Create Date: 2025-11-18 18:09:19.296606

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '86b94dfed898'
down_revision = '4bcb55c19216'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if tables already exist
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()
    
    # Create packing_material_master table if not exists
    if 'packing_material_master' not in existing_tables:
        op.create_table(
            'packing_material_master',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('pm_code', sa.String(length=50), nullable=False),
            sa.Column('pm_name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('pm_type', sa.String(length=50), nullable=True),
            sa.Column('language', sa.String(length=50), nullable=True),
            sa.Column('artwork_version', sa.String(length=50), nullable=True),
            sa.Column('artwork_file_url', sa.String(length=500), nullable=True),
            sa.Column('artwork_approval_ref', sa.String(length=100), nullable=True),
            sa.Column('gsm', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('ply', sa.Integer(), nullable=True),
            sa.Column('dimensions', sa.String(length=100), nullable=True),
            sa.Column('color_spec', sa.Text(), nullable=True),
            sa.Column('unit_of_measure', sa.String(length=20), nullable=False),
            sa.Column('hsn_code', sa.String(length=20), nullable=True),
            sa.Column('gst_rate', sa.Numeric(precision=5, scale=2), nullable=True),
            sa.Column('default_vendor_id', sa.Integer(), nullable=True),
            sa.Column('printing_instructions', sa.Text(), nullable=True),
            sa.Column('die_cut_info', sa.Text(), nullable=True),
            sa.Column('plate_charges', sa.Numeric(precision=15, scale=2), nullable=True),
            sa.Column('storage_conditions', sa.Text(), nullable=True),
            sa.Column('shelf_life_months', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['default_vendor_id'], ['vendors.id'], name='fk_packing_material_vendor'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_packing_material_master_id', 'packing_material_master', ['id'])
        op.create_index('ix_packing_material_master_pm_code', 'packing_material_master', ['pm_code'], unique=True)
        op.create_index('ix_packing_material_master_hsn_code', 'packing_material_master', ['hsn_code'])
    
    # Create medicine_packing_materials table (BOM) if not exists
    if 'medicine_packing_materials' not in existing_tables:
        op.create_table(
            'medicine_packing_materials',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('medicine_id', sa.Integer(), nullable=False),
            sa.Column('packing_material_id', sa.Integer(), nullable=False),
            sa.Column('vendor_id', sa.Integer(), nullable=True),
            sa.Column('qty_required_per_unit', sa.Numeric(precision=15, scale=4), nullable=False),
            sa.Column('uom', sa.String(length=20), nullable=False),
            sa.Column('artwork_override', sa.String(length=500), nullable=True),
            sa.Column('language_override', sa.String(length=50), nullable=True),
            sa.Column('artwork_version_override', sa.String(length=50), nullable=True),
            sa.Column('hsn_code', sa.String(length=20), nullable=True),
            sa.Column('gst_rate', sa.Numeric(precision=5, scale=2), nullable=True),
            sa.Column('pm_role', sa.String(length=50), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('is_critical', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('lead_time_days', sa.Integer(), nullable=True),
            sa.Column('wastage_percentage', sa.Numeric(precision=5, scale=2), nullable=True, server_default='0'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['medicine_id'], ['medicine_master.id'], name='fk_medicine_pm_medicine', ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['packing_material_id'], ['packing_material_master.id'], name='fk_medicine_pm_packing_material'),
            sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], name='fk_medicine_pm_vendor'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_medicine_packing_materials_id', 'medicine_packing_materials', ['id'])
        op.create_index('ix_medicine_packing_materials_medicine_id', 'medicine_packing_materials', ['medicine_id'])
        op.create_index('ix_medicine_packing_materials_packing_material_id', 'medicine_packing_materials', ['packing_material_id'])
    
    # Add packing_material_id to po_items if not exists
    columns = [col['name'] for col in inspector.get_columns('po_items')]
    if 'packing_material_id' not in columns:
        op.add_column('po_items', sa.Column('packing_material_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_po_item_packing_material', 'po_items', 'packing_material_master', ['packing_material_id'], ['id'])


def downgrade() -> None:
    # Reverse the changes
    op.drop_constraint('fk_po_item_packing_material', 'po_items', type_='foreignkey')
    op.drop_column('po_items', 'packing_material_id')
    
    op.drop_index('ix_medicine_packing_materials_packing_material_id', table_name='medicine_packing_materials')
    op.drop_index('ix_medicine_packing_materials_medicine_id', table_name='medicine_packing_materials')
    op.drop_index('ix_medicine_packing_materials_id', table_name='medicine_packing_materials')
    op.drop_table('medicine_packing_materials')
    
    op.drop_index('ix_packing_material_master_hsn_code', table_name='packing_material_master')
    op.drop_index('ix_packing_material_master_pm_code', table_name='packing_material_master')
    op.drop_index('ix_packing_material_master_id', table_name='packing_material_master')
    op.drop_table('packing_material_master')
