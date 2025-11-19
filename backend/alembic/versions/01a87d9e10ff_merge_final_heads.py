"""merge final heads

Revision ID: 01a87d9e10ff
Revises: 09f50daeafed, add_packing_material_id_to_material_balance
Create Date: 2025-11-19 20:38:08.158080

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '01a87d9e10ff'
down_revision = ('09f50daeafed', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
