"""
Make raw_material_id and packing_material_id nullable in material_balance table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'make_material_ids_nullable'
down_revision = 'a1b2c3d4e5f6'  # Set to previous migration revision
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('material_balance', 'raw_material_id', nullable=True)
    op.alter_column('material_balance', 'packing_material_id', nullable=True)

def downgrade():
    op.alter_column('material_balance', 'raw_material_id', nullable=False)
    op.alter_column('material_balance', 'packing_material_id', nullable=False)
