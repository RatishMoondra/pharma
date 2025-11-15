"""merge_heads

Revision ID: 28f9d84671af
Revises: add_invoice_fulfillment, update_medicine_001
Create Date: 2025-11-15 12:26:11.702276

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '28f9d84671af'
down_revision = ('add_invoice_fulfillment', 'update_medicine_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
