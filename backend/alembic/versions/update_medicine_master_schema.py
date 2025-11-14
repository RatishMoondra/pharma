"""update_medicine_master_schema

Revision ID: update_medicine_001
Revises: 8cf320b2c8b4
Create Date: 2025-11-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_medicine_001'
down_revision = '8cf320b2c8b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns
    op.add_column('medicine_master', sa.Column('composition', sa.Text(), nullable=True))
    op.add_column('medicine_master', sa.Column('manufacturer_vendor_id', sa.Integer(), nullable=True))
    op.add_column('medicine_master', sa.Column('rm_vendor_id', sa.Integer(), nullable=True))
    op.add_column('medicine_master', sa.Column('pm_vendor_id', sa.Integer(), nullable=True))
    
    # Create foreign key constraints
    op.create_foreign_key('fk_medicine_manufacturer_vendor', 'medicine_master', 'vendors', ['manufacturer_vendor_id'], ['id'])
    op.create_foreign_key('fk_medicine_rm_vendor', 'medicine_master', 'vendors', ['rm_vendor_id'], ['id'])
    op.create_foreign_key('fk_medicine_pm_vendor', 'medicine_master', 'vendors', ['pm_vendor_id'], ['id'])
    
    # Make dosage_form non-nullable
    op.alter_column('medicine_master', 'dosage_form', nullable=False)
    
    # Drop old vendor_id column if it exists (after migrating data if needed)
    # op.drop_constraint('medicine_master_vendor_id_fkey', 'medicine_master', type_='foreignkey')
    # op.drop_column('medicine_master', 'vendor_id')


def downgrade() -> None:
    # Reverse the changes
    op.drop_constraint('fk_medicine_pm_vendor', 'medicine_master', type_='foreignkey')
    op.drop_constraint('fk_medicine_rm_vendor', 'medicine_master', type_='foreignkey')
    op.drop_constraint('fk_medicine_manufacturer_vendor', 'medicine_master', type_='foreignkey')
    
    op.drop_column('medicine_master', 'pm_vendor_id')
    op.drop_column('medicine_master', 'rm_vendor_id')
    op.drop_column('medicine_master', 'manufacturer_vendor_id')
    op.drop_column('medicine_master', 'composition')
    
    op.alter_column('medicine_master', 'dosage_form', nullable=True)
