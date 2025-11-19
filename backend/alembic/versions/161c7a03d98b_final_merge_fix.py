"""final merge fix

Revision ID: 161c7a03d98b
Revises: 01a87d9e10ff, make_material_ids_nullable
Create Date: 2025-11-19 20:53:10.834422

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '161c7a03d98b'
down_revision = ('01a87d9e10ff', 'make_material_ids_nullable')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
