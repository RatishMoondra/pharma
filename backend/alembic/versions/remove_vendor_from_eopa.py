"""Remove vendor fields from EOPA - make it vendor-agnostic

Revision ID: remove_vendor_from_eopa
Revises: add_country_master
Create Date: 2025-11-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'remove_vendor_from_eopa'
down_revision = 'add_country_master'
branch_labels = None
depends_on = None


def upgrade():
    """
    Remove vendor_id and vendor_type from EOPA table.
    EOPA should now only contain medicine/product details without vendor info.
    Vendor resolution happens during PO generation from Medicine Master.
    """
    # Drop foreign key constraint first
    op.drop_constraint('eopa_vendor_id_fkey', 'eopa', type_='foreignkey')
    
    # Drop the vendor columns
    op.drop_column('eopa', 'vendor_id')
    op.drop_column('eopa', 'vendor_type')
    
    # Drop the unique constraint on eopa_number if it depends on vendor columns
    # The eopa_number should remain unique system-wide
    
    print("✓ Removed vendor_id and vendor_type from EOPA table")
    print("✓ EOPA is now vendor-agnostic")


def downgrade():
    """
    Restore vendor_id and vendor_type to EOPA table.
    This is for rollback purposes only.
    """
    # Add vendor_type column back
    op.add_column('eopa', sa.Column('vendor_type', sa.String(20), nullable=True))
    
    # Add vendor_id column back
    op.add_column('eopa', sa.Column('vendor_id', sa.Integer(), nullable=True))
    
    # Recreate foreign key constraint
    op.create_foreign_key(
        'eopa_vendor_id_fkey',
        'eopa',
        'vendors',
        ['vendor_id'],
        ['id']
    )
    
    print("✓ Restored vendor_id and vendor_type to EOPA table")

