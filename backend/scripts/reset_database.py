"""
Reset database and apply all migrations from scratch
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, inspect
from app.config import settings

def reset_and_migrate():
    """Drop all tables and recreate from migrations"""
    print(f"Connecting to: {settings.DATABASE_URL.replace('Ratcat79', '***')}")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        print(f"\nFound {len(existing_tables)} existing tables: {existing_tables[:5]}...")
        
        if existing_tables:
            response = input("\n⚠️  DROP ALL TABLES and recreate from scratch? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted.")
                return
            
            print("\nDropping all tables...")
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
            print("✓ All tables dropped")
        
        print("\nDatabase is now empty. Run 'alembic upgrade head' to apply all migrations.")

if __name__ == "__main__":
    reset_and_migrate()
