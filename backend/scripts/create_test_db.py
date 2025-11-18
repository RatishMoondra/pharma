"""
Create pharma_test database for pytest
Run this once before running tests
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_test_database():
    """Create pharma_test database if it doesn't exist"""
    # Connect to postgres database
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )
    
    # Set autocommit to allow database creation
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Drop existing test database if it exists
    try:
        cursor.execute("DROP DATABASE IF EXISTS pharma_test;")
        print("✓ Dropped existing pharma_test database")
    except Exception as e:
        print(f"Note: {e}")
    
    # Create test database
    try:
        cursor.execute("CREATE DATABASE pharma_test;")
        print("✓ Created pharma_test database")
    except Exception as e:
        print(f"Note: {e}")
    
    cursor.close()
    conn.close()
    
    print("\n✓ Test database setup complete!")
    print("  Database: pharma_test")
    print("  Connection: postgresql://postgres:postgres@localhost:5432/pharma_test")

if __name__ == "__main__":
    create_test_database()
