"""Check database state"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"\n{'='*60}")
print(f"DATABASE TABLES ({len(tables)} total):")
print(f"{'='*60}")
for table in sorted(tables):
    columns = inspector.get_columns(table)
    print(f"\n✓ {table} ({len(columns)} columns)")
    for col in columns[:5]:  # Show first 5 columns
        print(f"    - {col['name']}: {col['type']}")
    if len(columns) > 5:
        print(f"    ... and {len(columns) - 5} more columns")

print(f"\n{'='*60}\n")
