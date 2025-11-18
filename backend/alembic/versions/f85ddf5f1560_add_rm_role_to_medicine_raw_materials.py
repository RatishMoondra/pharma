"""add_rm_role_to_medicine_raw_materials

Revision ID: f85ddf5f1560
Revises: 97d25ea63c7b
Create Date: 2025-11-18 17:59:16.015073

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f85ddf5f1560'
down_revision = '97d25ea63c7b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('medicine_raw_materials', sa.Column('rm_role', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('medicine_raw_materials', 'rm_role')
