"""
Script to add country master and update existing records
Run this script to migrate the database to support country-based vendor filtering
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def run_migration():
    """Run the country master migration"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("Starting Country Master migration...")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Create countries table
            print("Creating countries table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS countries (
                    id SERIAL PRIMARY KEY,
                    country_code VARCHAR(3) UNIQUE NOT NULL,
                    country_name VARCHAR(100) UNIQUE NOT NULL,
                    language VARCHAR(50) NOT NULL,
                    currency VARCHAR(3),
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_countries_id ON countries (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_countries_country_code ON countries (country_code)"))
            
            # Insert seed countries
            print("Inserting seed country data...")
            conn.execute(text("""
                INSERT INTO countries (country_code, country_name, language, currency, is_active, created_at, updated_at)
                VALUES 
                    ('IND', 'India', 'English', 'INR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('ZAF', 'South Africa', 'English', 'ZAR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('NGA', 'Nigeria', 'English', 'NGN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('KEN', 'Kenya', 'English', 'KES', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('EGY', 'Egypt', 'Arabic', 'EGP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('MAR', 'Morocco', 'Arabic', 'MAD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('TZA', 'Tanzania', 'English', 'TZS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('UGA', 'Uganda', 'English', 'UGX', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('GHA', 'Ghana', 'English', 'GHS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('ETH', 'Ethiopia', 'English', 'ETB', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('CIV', 'Ivory Coast', 'French', 'XOF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('CMR', 'Cameroon', 'French', 'XAF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('SEN', 'Senegal', 'French', 'XOF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('ZWE', 'Zimbabwe', 'English', 'ZWL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('RWA', 'Rwanda', 'English', 'RWF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (country_code) DO NOTHING
            """))
            
            # Add country_id to vendors table if not exists
            print("Adding country_id to vendors table...")
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='vendors' AND column_name='country_id'
                    ) THEN
                        ALTER TABLE vendors ADD COLUMN country_id INTEGER;
                    END IF;
                END $$;
            """))
            
            # Set default country for existing vendors (India)
            print("Setting default country for existing vendors...")
            conn.execute(text("""
                UPDATE vendors 
                SET country_id = (SELECT id FROM countries WHERE country_code = 'IND')
                WHERE country_id IS NULL
            """))
            
            # Make country_id non-nullable and add foreign key
            print("Adding constraints to vendors table...")
            conn.execute(text("""
                DO $$ 
                BEGIN
                    ALTER TABLE vendors ALTER COLUMN country_id SET NOT NULL;
                EXCEPTION
                    WHEN others THEN NULL;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_country_id'
                    ) THEN
                        ALTER TABLE vendors ADD CONSTRAINT fk_vendors_country_id 
                        FOREIGN KEY (country_id) REFERENCES countries(id);
                    END IF;
                END $$;
            """))
            
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_vendors_country_id ON vendors (country_id)"))
            
            # Add country_id to pi table if not exists
            print("Adding country_id to pi table...")
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='pi' AND column_name='country_id'
                    ) THEN
                        ALTER TABLE pi ADD COLUMN country_id INTEGER;
                    END IF;
                END $$;
            """))
            
            # Set default country for existing PIs (India)
            print("Setting default country for existing PIs...")
            conn.execute(text("""
                UPDATE pi 
                SET country_id = (SELECT id FROM countries WHERE country_code = 'IND')
                WHERE country_id IS NULL
            """))
            
            # Make country_id non-nullable and add foreign key
            print("Adding constraints to pi table...")
            conn.execute(text("""
                DO $$ 
                BEGIN
                    ALTER TABLE pi ALTER COLUMN country_id SET NOT NULL;
                EXCEPTION
                    WHEN others THEN NULL;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pi_country_id'
                    ) THEN
                        ALTER TABLE pi ADD CONSTRAINT fk_pi_country_id 
                        FOREIGN KEY (country_id) REFERENCES countries(id);
                    END IF;
                END $$;
            """))
            
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_pi_country_id ON pi (country_id)"))
            
            # Commit transaction
            trans.commit()
            print("\n✓ Migration completed successfully!")
            
            # Display inserted countries
            print("\nCountries in database:")
            result = conn.execute(text("""
                SELECT country_code, country_name, language, currency 
                FROM countries 
                ORDER BY country_name
            """))
            for row in result:
                print(f"  - {row[1]} ({row[0]}) | Language: {row[2]} | Currency: {row[3]}")
            
        except Exception as e:
            trans.rollback()
            print(f"\n✗ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    run_migration()
