"""Merge invoice and material balance migrations

Revision ID: 7796a025aa4f
Revises: add_rm_pm_support_invoice, drop_material_balance
Create Date: 2025-11-19 06:32:17.953426

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7796a025aa4f'
down_revision = ('add_rm_pm_support_invoice', 'drop_material_balance')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
