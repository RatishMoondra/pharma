"""
Database Migration Script: Make EOPA Vendor-Agnostic
This script removes vendor_id and vendor_type from EOPA table.
Vendors are now resolved during PO generation from Medicine Master.
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import engine, SessionLocal
from sqlalchemy import text


def migrate():
    """Execute migration to remove vendor fields from EOPA"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("EOPA VENDOR-AGNOSTIC MIGRATION")
        print("=" * 80)
        print()
        
        # Check if EOPA table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'eopa'
            );
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            print("❌ EOPA table does not exist. Please run initial migrations first.")
            return False
        
        # Check current EOPA count
        result = db.execute(text("SELECT COUNT(*) FROM eopa"))
        eopa_count = result.scalar()
        print(f"📊 Current EOPA records: {eopa_count}")
        
        if eopa_count > 0:
            print()
            print("⚠️  WARNING: Existing EOPA data detected!")
            print("   The migration will:")
            print("   1. Remove vendor_id and vendor_type columns from EOPA")
            print("   2. Existing EOPAs will lose vendor association")
            print("   3. You'll need to regenerate POs from EOPAs after migration")
            print()
            confirm = input("   Do you want to continue? (yes/no): ")
            if confirm.lower() != 'yes':
                print("❌ Migration cancelled by user.")
                return False
        
        print()
        print("🔄 Starting migration...")
        print()
        
        # Step 1: Check if columns exist
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'eopa' 
            AND column_name IN ('vendor_id', 'vendor_type')
        """))
        existing_columns = [row[0] for row in result]
        
        if not existing_columns:
            print("✓ Vendor columns already removed from EOPA table")
            return True
        
        print(f"   Found columns to remove: {', '.join(existing_columns)}")
        
        # Step 2: Drop foreign key constraint on vendor_id
        if 'vendor_id' in existing_columns:
            print("   Dropping foreign key constraint eopa_vendor_id_fkey...")
            try:
                db.execute(text("ALTER TABLE eopa DROP CONSTRAINT IF EXISTS eopa_vendor_id_fkey CASCADE"))
                print("   ✓ Foreign key constraint dropped")
            except Exception as e:
                print(f"   ⚠️  Constraint drop skipped: {e}")
        
        # Step 3: Drop vendor_id column
        if 'vendor_id' in existing_columns:
            print("   Dropping vendor_id column...")
            db.execute(text("ALTER TABLE eopa DROP COLUMN IF EXISTS vendor_id"))
            print("   ✓ vendor_id column removed")
        
        # Step 4: Drop vendor_type column  
        if 'vendor_type' in existing_columns:
            print("   Dropping vendor_type column...")
            db.execute(text("ALTER TABLE eopa DROP COLUMN IF EXISTS vendor_type"))
            print("   ✓ vendor_type column removed")
        
        # Commit changes
        db.commit()
        
        print()
        print("=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print()
        print("EOPA is now vendor-agnostic!")
        print("Vendor resolution will happen during PO generation from Medicine Master.")
        print()
        print("Next steps:")
        print("1. Restart your backend server")
        print("2. Update your frontend to remove vendor selection from EOPA forms")
        print("3. PO generation will now auto-select vendors from Medicine Master")
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
    """Rollback migration - restore vendor fields to EOPA"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("ROLLBACK: RESTORE VENDOR FIELDS TO EOPA")
        print("=" * 80)
        print()
        
        print("⚠️  This will restore vendor_id and vendor_type columns to EOPA.")
        print("   However, existing EOPA records will have NULL values for these fields.")
        print()
        confirm = input("   Do you want to continue with rollback? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Rollback cancelled.")
            return False
        
        print()
        print("🔄 Starting rollback...")
        print()
        
        # Add vendor_type column
        print("   Adding vendor_type column...")
        db.execute(text("ALTER TABLE eopa ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(20)"))
        print("   ✓ vendor_type column added")
        
        # Add vendor_id column
        print("   Adding vendor_id column...")
        db.execute(text("ALTER TABLE eopa ADD COLUMN IF NOT EXISTS vendor_id INTEGER"))
        print("   ✓ vendor_id column added")
        
        # Recreate foreign key
        print("   Creating foreign key constraint...")
        db.execute(text("""
            ALTER TABLE eopa 
            ADD CONSTRAINT eopa_vendor_id_fkey 
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        """))
        print("   ✓ Foreign key constraint created")
        
        db.commit()
        
        print()
        print("=" * 80)
        print("✅ ROLLBACK COMPLETED")
        print("=" * 80)
        print()
        print("⚠️  NOTE: Existing EOPA records will have NULL vendor values.")
        print("   You'll need to manually update them or recreate EOPAs.")
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

