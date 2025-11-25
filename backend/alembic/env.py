from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os

# Import your SQLAlchemy Base and all models so Alembic can autogenerate migrations
from app.models.base import Base
from app.models.user import User
from app.models.vendor import Vendor
from app.models.product import ProductMaster, MedicineMaster
from app.models.pi import PI, PIItem
from app.models.eopa import EOPA, EOPAItem
from app.models.po import PurchaseOrder, POItem
from app.models.material import MaterialReceipt, DispatchAdvice, WarehouseGRN
from app.models.terms_conditions import (
    TermsConditionsMaster,
    VendorTermsConditions,
    PartnerVendorMedicines,
)

# -----------------------------------------------------------
# Alembic Config Setup
# -----------------------------------------------------------
config = context.config

# Override sqlalchemy.url with DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable not set. "
        "Alembic requires DATABASE_URL to run migrations."
    )

# Replace sqlalchemy.url inside alembic.ini dynamically
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Logging configuration
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for Alembic's autogenerate
target_metadata = Base.metadata


# -----------------------------------------------------------
# Migration Runners
# -----------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = DATABASE_URL

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    # Use the overridden URL, not the alembic.ini file
    config_section = config.get_section(config.config_ini_section)
    config_section["sqlalchemy.url"] = DATABASE_URL

    connectable = engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


# Entry point called by Alembic CLI
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
