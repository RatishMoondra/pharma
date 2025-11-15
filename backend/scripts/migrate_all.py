"""
Master Migration Script: Complete EOPA Vendor-Agnostic Workflow
This script runs all migrations in the correct order.
"""

import sys
import os
import subprocess

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_migration(script_name, description):
    """Run a migration script"""
    print()
    print("=" * 80)
    print(f"RUNNING: {description}")
    print("=" * 80)
    print()
    
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - COMPLETED")
            return True
        else:
            print(f"❌ {description} - FAILED")
            return False
            
    except Exception as e:
        print(f"❌ {description} - ERROR: {e}")
        return False


def main():
    """Run all migrations"""
    print()
    print("=" * 80)
    print("PHARMA SYSTEM: EOPA VENDOR-AGNOSTIC WORKFLOW MIGRATION")
    print("=" * 80)
    print()
    print("This migration will:")
    print("1. Add PI status fields (PENDING/APPROVED/REJECTED)")
    print("2. Remove vendor fields from EOPA (vendor-agnostic)")
    print("3. Enable auto-generation of EOPAs when PI is approved")
    print()
    
    confirm = input("Do you want to continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Migration cancelled by user.")
        return False
    
    # Migration 1: Add PI status fields
    if not run_migration("migrate_pi_status.py", "Add PI Status Fields"):
        print()
        print("❌ Migration aborted due to error in PI status migration.")
        return False
    
    # Migration 2: Remove vendor from EOPA
    if not run_migration("migrate_eopa_vendor_agnostic.py", "Make EOPA Vendor-Agnostic"):
        print()
        print("❌ Migration aborted due to error in EOPA vendor migration.")
        print("⚠️  PI status fields have been added. You may want to rollback.")
        return False
    
    print()
    print("=" * 80)
    print("✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print()
    print("New Workflow Enabled:")
    print()
    print("  1. Create PI (status: PENDING)")
    print("  2. Approve PI → Auto-generates EOPAs (vendor-agnostic)")
    print("  3. EOPAs contain only medicine/product details")
    print("  4. Generate POs from EOPAs (vendors from Medicine Master)")
    print()
    print("Next steps:")
    print("  1. Restart backend server")
    print("  2. Update frontend (PI approval button, EOPA display)")
    print("  3. Test the complete workflow")
    print()
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

