"""
Restructure EOPA: ONE EOPA per PI with multiple line items

This migration:
1. Creates eopa_items table
2. Migrates existing EOPA data to new structure
3. Updates EOPA table to use pi_id instead of pi_item_id
4. Removes quantity/price fields from EOPA table

Run: python scripts/migrate_eopa_pi_level.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database.session import engine


def migrate():
    print("="*80)
    print("EOPA RESTRUCTURING: ONE EOPA PER PI WITH LINE ITEMS")
    print("="*80)
    print()
    
    with engine.connect() as conn:
        try:
            print("🔄 Step 1: Backing up old EOPA table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS eopa_old_backup AS 
                SELECT * FROM eopa
            """))
            print("   ✓ Backup created: eopa_old_backup")
            
            print("\n🔄 Step 2: Creating eopa_items table (without FK constraint yet)...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS eopa_items (
                    id SERIAL PRIMARY KEY,
                    eopa_id INTEGER NOT NULL,
                    pi_item_id INTEGER NOT NULL REFERENCES pi_items(id),
                    quantity NUMERIC(15,3) NOT NULL,
                    estimated_unit_price NUMERIC(15,2) NOT NULL,
                    estimated_total NUMERIC(15,2) NOT NULL,
                    created_by INTEGER NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("   ✓ eopa_items table created (FK constraint will be added later)")
            
            print("\n🔄 Step 3: Creating new EOPA table structure...")
            conn.execute(text("DROP TABLE IF EXISTS eopa_new CASCADE"))
            conn.execute(text("""
                CREATE TABLE eopa_new (
                    id SERIAL PRIMARY KEY,
                    eopa_number VARCHAR(50) UNIQUE NOT NULL,
                    eopa_date DATE NOT NULL,
                    pi_id INTEGER NOT NULL REFERENCES pi(id),
                    status VARCHAR(20) DEFAULT 'PENDING',
                    remarks TEXT,
                    approved_by INTEGER REFERENCES users(id),
                    approved_at TIMESTAMP,
                    created_by INTEGER NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("   ✓ New EOPA table created")
            
            print("\n🔄 Step 4: Migrating existing EOPA data...")
            
            # Get all existing EOPAs
            result = conn.execute(text("""
                SELECT id, eopa_number, eopa_date, pi_item_id, status, 
                       quantity, estimated_unit_price, estimated_total,
                       remarks, approved_by, approved_at, created_by, created_at, updated_at
                FROM eopa_old_backup
            """))
            existing_eopas = result.fetchall()
            
            if existing_eopas:
                print(f"   Found {len(existing_eopas)} existing EOPAs to migrate")
                
                # Group EOPAs by PI
                eopas_by_pi = {}
                for eopa in existing_eopas:
                    # Get PI ID from PI item
                    pi_result = conn.execute(text("""
                        SELECT pi_id FROM pi_items WHERE id = :pi_item_id
                    """), {"pi_item_id": eopa[3]})
                    pi_id = pi_result.fetchone()[0]
                    
                    if pi_id not in eopas_by_pi:
                        eopas_by_pi[pi_id] = []
                    eopas_by_pi[pi_id].append(eopa)
                
                print(f"   Grouped into {len(eopas_by_pi)} PIs")
                
                # Create new structure
                new_eopa_id_map = {}  # old_eopa_id -> new_eopa_id
                
                for pi_id, pi_eopas in eopas_by_pi.items():
                    # Use first EOPA's details for the new PI-level EOPA
                    first_eopa = pi_eopas[0]
                    
                    # Insert new EOPA (pi-level)
                    new_eopa = conn.execute(text("""
                        INSERT INTO eopa_new (eopa_number, eopa_date, pi_id, status, remarks, 
                                         approved_by, approved_at, created_by, created_at, updated_at)
                        VALUES (:eopa_number, :eopa_date, :pi_id, :status, :remarks,
                                :approved_by, :approved_at, :created_by, :created_at, :updated_at)
                        RETURNING id
                    """), {
                        "eopa_number": first_eopa[1],
                        "eopa_date": first_eopa[2],
                        "pi_id": pi_id,
                        "status": first_eopa[4],
                        "remarks": first_eopa[8],
                        "approved_by": first_eopa[9],
                        "approved_at": first_eopa[10],
                        "created_by": first_eopa[11],
                        "created_at": first_eopa[12],
                        "updated_at": first_eopa[13]
                    })
                    new_eopa_id = new_eopa.fetchone()[0]
                    
                    # Insert EOPA items for each old EOPA
                    for old_eopa in pi_eopas:
                        conn.execute(text("""
                            INSERT INTO eopa_items (eopa_id, pi_item_id, quantity, 
                                                   estimated_unit_price, estimated_total,
                                                   created_by, created_at, updated_at)
                            VALUES (:eopa_id, :pi_item_id, :quantity, 
                                   :estimated_unit_price, :estimated_total,
                                   :created_by, :created_at, :updated_at)
                        """), {
                            "eopa_id": new_eopa_id,
                            "pi_item_id": old_eopa[3],
                            "quantity": old_eopa[5],
                            "estimated_unit_price": old_eopa[6],
                            "estimated_total": old_eopa[7],
                            "created_by": old_eopa[11],
                            "created_at": old_eopa[12],
                            "updated_at": old_eopa[13]
                        })
                        
                        new_eopa_id_map[old_eopa[0]] = new_eopa_id
                
                print(f"   ✓ Created {len(eopas_by_pi)} new PI-level EOPAs")
                print(f"   ✓ Created {len(existing_eopas)} EOPA items")
            else:
                print("   No existing EOPAs to migrate")
            
            print("\n🔄 Step 5: Replacing old EOPA table with new one...")
            conn.execute(text("DROP TABLE eopa CASCADE"))
            conn.execute(text("ALTER TABLE eopa_new RENAME TO eopa"))
            print("   ✓ Old EOPA table replaced")
            
            print("\n🔄 Step 6: Adding foreign key constraints...")
            conn.execute(text("""
                ALTER TABLE eopa_items 
                ADD CONSTRAINT eopa_items_eopa_id_fkey 
                FOREIGN KEY (eopa_id) REFERENCES eopa(id) ON DELETE CASCADE
            """))
            print("   ✓ Foreign keys added")
            
            print("\n🔄 Step 7: Creating indexes...")
            conn.execute(text("CREATE INDEX idx_eopa_pi_id ON eopa(pi_id)"))
            conn.execute(text("CREATE INDEX idx_eopa_status ON eopa(status)"))
            conn.execute(text("CREATE INDEX idx_eopa_items_eopa_id ON eopa_items(eopa_id)"))
            conn.execute(text("CREATE INDEX idx_eopa_items_pi_item_id ON eopa_items(pi_item_id)"))
            print("   ✓ Indexes created")
            
            conn.commit()
            
            print("\n" + "="*80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("="*80)
            print()
            print("New Structure:")
            print("  • ONE EOPA per PI (not per PI item)")
            print("  • EOPA items table stores line-level details")
            print("  • Old data preserved in eopa_old_backup table")
            print()
            print("Next steps:")
            print("  1. Restart backend server")
            print("  2. Test PI approval workflow")
            print("  3. Verify EOPA creation and display")
            print()
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ ERROR: {e}")
            print("\nMigration failed. Database rolled back.")
            import traceback
            traceback.print_exc()


def rollback():
    print("="*80)
    print("ROLLING BACK EOPA RESTRUCTURING")
    print("="*80)
    print()
    
    with engine.connect() as conn:
        try:
            print("🔄 Restoring from backup...")
            
            # Drop new tables
            conn.execute(text("DROP TABLE IF EXISTS eopa_items CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS eopa CASCADE"))
            
            # Restore old EOPA table
            conn.execute(text("""
                CREATE TABLE eopa AS SELECT * FROM eopa_old_backup
            """))
            
            # Recreate constraints and indexes
            conn.execute(text("""
                ALTER TABLE eopa ADD PRIMARY KEY (id)
            """))
            conn.execute(text("""
                ALTER TABLE eopa ADD CONSTRAINT eopa_pi_item_id_fkey 
                FOREIGN KEY (pi_item_id) REFERENCES pi_items(id)
            """))
            
            conn.commit()
            
            print("✅ Rollback completed successfully")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Rollback failed: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("\nWARNING: This will restructure the EOPA table!")
    print("Please backup your database before proceeding.")
    print()
    choice = input("Type 'migrate' to proceed, 'rollback' to restore, or 'cancel' to exit: ").lower()
    
    if choice == "migrate":
        migrate()
    elif choice == "rollback":
        rollback()
    else:
        print("Migration cancelled")
