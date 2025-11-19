"""merge material balance with main branch

Revision ID: 09f50daeafed
Revises: 7f94567810c1, add_material_balance_table
Create Date: 2025-11-19 19:40:49.350847

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '09f50daeafed'
down_revision = ('7f94567810c1', 'add_material_balance_table')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
