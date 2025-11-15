"""
Export current database schema and seed data to SQL files
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import inspect, text
from app.database.session import engine, SessionLocal
from app.models.base import Base
import app.models  # Import all models

def export_schema():
    """Export database schema to pharma_schema.sql"""
    
    schema_sql = """--
-- PostgreSQL Database Schema for Pharma Procurement System
-- Generated: 2025-11-15
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Drop existing tables
DROP TABLE IF EXISTS vendor_invoice CASCADE;
DROP TABLE IF EXISTS po_item CASCADE;
DROP TABLE IF EXISTS purchase_order CASCADE;
DROP TABLE IF EXISTS eopa CASCADE;
DROP TABLE IF EXISTS pi_item CASCADE;
DROP TABLE IF EXISTS pi CASCADE;
DROP TABLE IF EXISTS medicine_master CASCADE;
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;
DROP TABLE IF EXISTS country_master CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_configuration CASCADE;
DROP TABLE IF EXISTS alembic_version CASCADE;

-- Create tables using SQLAlchemy metadata
"""
    
    db = SessionLocal()
    
    try:
        # Get table creation statements from PostgreSQL
        inspector = inspect(engine)
        
        for table_name in Base.metadata.sorted_tables:
            result = db.execute(text(f"""
                SELECT 
                    'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
                    string_agg(
                        quote_ident(column_name) || ' ' || 
                        data_type ||
                        CASE 
                            WHEN character_maximum_length IS NOT NULL 
                            THEN '(' || character_maximum_length || ')'
                            ELSE ''
                        END ||
                        CASE 
                            WHEN is_nullable = 'NO' THEN ' NOT NULL'
                            ELSE ''
                        END ||
                        CASE 
                            WHEN column_default IS NOT NULL 
                            THEN ' DEFAULT ' || column_default
                            ELSE ''
                        END,
                        ', '
                    ) || 
                    ');' as create_statement
                FROM information_schema.columns
                WHERE table_name = '{table_name.name}'
                GROUP BY table_name;
            """))
            
            row = result.fetchone()
            if row:
                schema_sql += f"\n{row[0]}\n"
        
        # Add constraints and indexes
        result = db.execute(text("""
            SELECT 
                'ALTER TABLE ' || quote_ident(tc.table_name) || 
                ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name) ||
                ' ' || tc.constraint_type || 
                ' (' || string_agg(quote_ident(kcu.column_name), ', ') || ');'
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public'
            GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type;
        """))
        
        for row in result:
            schema_sql += f"\n{row[0]}\n"
        
        # Write to file
        schema_file = backend_dir / 'database' / 'pharma_schema.sql'
        schema_file.write_text(schema_sql, encoding='utf-8')
        
        print(f"✅ Schema exported to {schema_file}")
        
    finally:
        db.close()

def export_seed_data():
    """Export essential seed data to seeds.sql"""
    
    db = SessionLocal()
    
    seed_sql = """--
-- Seed Data for Pharma Procurement System
-- Generated: 2025-11-15
--

"""
    
    try:
        # Export users
        seed_sql += "\n-- Users\n"
        result = db.execute(text("""
            SELECT 
                'INSERT INTO users (username, hashed_password, email, role, is_active) VALUES ' ||
                '(' || quote_literal(username) || ', ' || 
                quote_literal(hashed_password) || ', ' || 
                quote_literal(email) || ', ' || 
                quote_literal(role) || ', ' || 
                is_active || ');'
            FROM users
            ORDER BY id;
        """))
        
        for row in result:
            seed_sql += f"{row[0]}\n"
        
        # Export countries
        seed_sql += "\n-- Countries\n"
        result = db.execute(text("""
            SELECT 
                'INSERT INTO country_master (country_code, country_name, region, currency) VALUES ' ||
                '(' || quote_literal(country_code) || ', ' || 
                quote_literal(country_name) || ', ' || 
                COALESCE(quote_literal(region), 'NULL') || ', ' || 
                COALESCE(quote_literal(currency), 'NULL') || ');'
            FROM country_master
            ORDER BY id;
        """))
        
        for row in result:
            seed_sql += f"{row[0]}\n"
        
        # Export system configuration
        seed_sql += "\n-- System Configuration\n"
        result = db.execute(text("""
            SELECT 
                'INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES ' ||
                '(' || quote_literal(config_key) || ', ' || 
                quote_literal(config_value::text) || '::json, ' || 
                COALESCE(quote_literal(description), 'NULL') || ', ' || 
                quote_literal(category) || ', ' || 
                is_sensitive || ');'
            FROM system_configuration
            ORDER BY id;
        """))
        
        for row in result:
            seed_sql += f"{row[0]}\n"
        
        # Write to file
        seed_file = backend_dir / 'database' / 'seeds.sql'
        seed_file.write_text(seed_sql, encoding='utf-8')
        
        print(f"✅ Seed data exported to {seed_file}")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("Exporting database schema and seed data...")
    print("=" * 60)
    export_schema()
    export_seed_data()
    print("=" * 60)
    print("✅ Export completed!")
