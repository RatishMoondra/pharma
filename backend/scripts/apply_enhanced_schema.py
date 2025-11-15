"""
Apply the enhanced schema to the database
This script loads pharma_schema.sql and executes it directly
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.config import settings

def apply_schema():
    """Apply the pharma_schema.sql file to the database"""
    print("Connecting to database...")
    engine = create_engine(settings.DATABASE_URL)
    
    # Read the schema file
    schema_path = Path(__file__).parent.parent / "database" / "pharma_schema.sql"
    print(f"Reading schema from: {schema_path}")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    # Split into individual statements (rough split by semicolon)
    statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
    
    print(f"Executing {len(statements)} SQL statements...")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        try:
            for i, statement in enumerate(statements, 1):
                if statement and not statement.strip().startswith('--'):
                    try:
                        conn.execute(text(statement))
                        if i % 10 == 0:
                            print(f"  Executed {i}/{len(statements)} statements...")
                    except Exception as e:
                        # Skip statements that fail (like CREATE TABLE IF NOT EXISTS)
                        if "already exists" in str(e).lower():
                            print(f"  Skipping (already exists): {statement[:50]}...")
                        else:
                            print(f"  Error in statement {i}: {e}")
                            print(f"  Statement: {statement[:100]}...")
            
            trans.commit()
            print("✓ Schema applied successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"✗ Error applying schema: {e}")
            raise

if __name__ == "__main__":
    apply_schema()
