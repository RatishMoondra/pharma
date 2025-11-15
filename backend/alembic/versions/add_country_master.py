"""Add country master and link vendors and PIs to countries

Revision ID: add_country_master
Revises: 8cf320b2c8b4
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_country_master'
down_revision = '8cf320b2c8b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create countries table
    op.create_table(
        'countries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('country_code', sa.String(length=3), nullable=False),
        sa.Column('country_name', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_countries_id'), 'countries', ['id'], unique=False)
    op.create_index(op.f('ix_countries_country_code'), 'countries', ['country_code'], unique=True)
    op.create_unique_constraint('uq_countries_country_name', 'countries', ['country_name'])
    
    # Insert default country (India)
    op.execute("""
        INSERT INTO countries (country_code, country_name, language, currency, is_active)
        VALUES ('IND', 'India', 'English', 'INR', true)
    """)
    
    # Add country_id to vendors table
    op.add_column('vendors', sa.Column('country_id', sa.Integer(), nullable=True))
    
    # Set default country for existing vendors (India)
    op.execute("""
        UPDATE vendors 
        SET country_id = (SELECT id FROM countries WHERE country_code = 'IND')
    """)
    
    # Make country_id non-nullable after setting defaults
    op.alter_column('vendors', 'country_id', nullable=False)
    op.create_index(op.f('ix_vendors_country_id'), 'vendors', ['country_id'], unique=False)
    op.create_foreign_key('fk_vendors_country_id', 'vendors', 'countries', ['country_id'], ['id'])
    
    # Add country_id to pi table
    op.add_column('pi', sa.Column('country_id', sa.Integer(), nullable=True))
    
    # Set default country for existing PIs (India)
    op.execute("""
        UPDATE pi 
        SET country_id = (SELECT id FROM countries WHERE country_code = 'IND')
    """)
    
    # Make country_id non-nullable after setting defaults
    op.alter_column('pi', 'country_id', nullable=False)
    op.create_index(op.f('ix_pi_country_id'), 'pi', ['country_id'], unique=False)
    op.create_foreign_key('fk_pi_country_id', 'pi', 'countries', ['country_id'], ['id'])


def downgrade() -> None:
    # Remove foreign keys and columns from pi
    op.drop_constraint('fk_pi_country_id', 'pi', type_='foreignkey')
    op.drop_index(op.f('ix_pi_country_id'), table_name='pi')
    op.drop_column('pi', 'country_id')
    
    # Remove foreign keys and columns from vendors
    op.drop_constraint('fk_vendors_country_id', 'vendors', type_='foreignkey')
    op.drop_index(op.f('ix_vendors_country_id'), table_name='vendors')
    op.drop_column('vendors', 'country_id')
    
    # Drop countries table
    op.drop_index(op.f('ix_countries_country_code'), table_name='countries')
    op.drop_index(op.f('ix_countries_id'), table_name='countries')
    op.drop_table('countries')
