"""
Add status fields to PI table and auto-generate EOPAs on approval
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from sqlalchemy import text


def migrate():
    """Add status, approved_by, approved_at to PI table"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("PI STATUS FIELDS MIGRATION")
        print("=" * 80)
        print()
        
        # Check if PI table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pi'
            );
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            print("❌ PI table does not exist.")
            return False
        
        # Check if status column already exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pi' 
            AND column_name IN ('status', 'approved_by', 'approved_at')
        """))
        existing_columns = [row[0] for row in result]
        
        if 'status' in existing_columns:
            print("✓ Status fields already exist in PI table")
            return True
        
        print("🔄 Adding status fields to PI table...")
        print()
        
        # Step 1: Create ENUM type for PI status
        print("   Creating PIStatus ENUM type...")
        db.execute(text("""
            DO $$ BEGIN
                CREATE TYPE pistatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("   ✓ ENUM type created")
        
        # Step 2: Add status column with default PENDING
        print("   Adding status column...")
        db.execute(text("""
            ALTER TABLE pi 
            ADD COLUMN IF NOT EXISTS status pistatus DEFAULT 'PENDING'
        """))
        print("   ✓ status column added")
        
        # Step 3: Add approved_by column
        print("   Adding approved_by column...")
        db.execute(text("""
            ALTER TABLE pi 
            ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)
        """))
        print("   ✓ approved_by column added")
        
        # Step 4: Add approved_at column
        print("   Adding approved_at column...")
        db.execute(text("""
            ALTER TABLE pi 
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
        """))
        print("   ✓ approved_at column added")
        
        # Step 5: Update existing PIs to PENDING status
        result = db.execute(text("UPDATE pi SET status = 'PENDING' WHERE status IS NULL"))
        updated_count = result.rowcount
        print(f"   ✓ Updated {updated_count} existing PIs to PENDING status")
        
        db.commit()
        
        print()
        print("=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print()
        print("PI table now supports approval workflow:")
        print("- status: PENDING | APPROVED | REJECTED")
        print("- approved_by: User who approved/rejected")
        print("- approved_at: Timestamp of approval/rejection")
        print()
        print("When PI is approved, EOPAs will be auto-generated!")
        print()
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def rollback():
    """Remove status fields from PI table"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("ROLLBACK: REMOVE PI STATUS FIELDS")
        print("=" * 80)
        print()
        
        print("🔄 Removing status fields from PI table...")
        print()
        
        # Remove columns
        print("   Dropping approved_at column...")
        db.execute(text("ALTER TABLE pi DROP COLUMN IF EXISTS approved_at"))
        print("   ✓ approved_at column removed")
        
        print("   Dropping approved_by column...")
        db.execute(text("ALTER TABLE pi DROP COLUMN IF EXISTS approved_by"))
        print("   ✓ approved_by column removed")
        
        print("   Dropping status column...")
        db.execute(text("ALTER TABLE pi DROP COLUMN IF EXISTS status"))
        print("   ✓ status column removed")
        
        # Drop ENUM type
        print("   Dropping PIStatus ENUM type...")
        db.execute(text("DROP TYPE IF EXISTS pistatus CASCADE"))
        print("   ✓ ENUM type removed")
        
        db.commit()
        
        print()
        print("=" * 80)
        print("✅ ROLLBACK COMPLETED")
        print("=" * 80)
        print()
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Rollback failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        success = rollback()
    else:
        success = migrate()
    
    sys.exit(0 if success else 1)

