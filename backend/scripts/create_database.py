"""
Create PostgreSQL database
Run this script: python scripts/create_database.py
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection parameters
DB_HOST = "localhost"
DB_USER = "postgres"
DB_PASSWORD = "Ratcat79"  # No encoding needed for direct psycopg2 connection
DB_NAME = "pharma_db"

def create_database():
    try:
        # Connect to PostgreSQL server (default 'postgres' database)
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"Database '{DB_NAME}' already exists!")
        else:
            # Create database
            cursor.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"Database '{DB_NAME}' created successfully!")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Error creating database: {e}")
        print("\nPlease check:")
        print("1. PostgreSQL is running")
        print("2. Username and password are correct")
        print("3. PostgreSQL is accessible on localhost:5432")


if __name__ == "__main__":
    create_database()
