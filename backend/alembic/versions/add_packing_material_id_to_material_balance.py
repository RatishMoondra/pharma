"""
Add packing_material_id column to material_balance table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = "09f50daeafed"  # Set to previous migration revision
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('material_balance', sa.Column('packing_material_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_material_balance_packing_material',
        'material_balance', 'packing_material_master',
        ['packing_material_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_material_balance_packing_material', 'material_balance', type_='foreignkey')
    op.drop_column('material_balance', 'packing_material_id')
