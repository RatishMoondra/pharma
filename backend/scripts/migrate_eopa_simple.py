"""
Simple EOPA Restructuring: ONE EOPA per PI

Run: python scripts/migrate_eopa_simple.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database.session import engine


def migrate():
    print("="*80)
    print("EOPA RESTRUCTURING: ONE EOPA PER PI")
    print("="*80)
    print()
    
    with engine.connect() as conn:
        try:
            # Backup
            print("🔄 Step 1: Backing up...")
            conn.execute(text("CREATE TABLE eopa_backup AS SELECT * FROM eopa"))
            conn.commit()
            print("   ✓ Backup created")
            
            # Create new tables WITHOUT foreign keys
            print("\n🔄 Step 2: Creating new tables...")
            conn.execute(text("""
                CREATE TABLE eopa_new (
                    id SERIAL PRIMARY KEY,
                    eopa_number VARCHAR(50) UNIQUE NOT NULL,
                    eopa_date DATE NOT NULL,
                    pi_id INTEGER NOT NULL,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    remarks TEXT,
                    approved_by INTEGER,
                    approved_at TIMESTAMP,
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE eopa_items (
                    id SERIAL PRIMARY KEY,
                    eopa_id INTEGER NOT NULL,
                    pi_item_id INTEGER NOT NULL,
                    quantity NUMERIC(15,3) NOT NULL,
                    estimated_unit_price NUMERIC(15,2) NOT NULL,
                    estimated_total NUMERIC(15,2) NOT NULL,
                    created_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("   ✓ Tables created")
            
            # Migrate data
            print("\n🔄 Step 3: Migrating data...")
            result = conn.execute(text("SELECT * FROM eopa_backup"))
            old_eopas = result.fetchall()
            
            if old_eopas:
                # Group by PI
                eopas_by_pi = {}
                for eopa in old_eopas:
                    pi_result = conn.execute(text("""
                        SELECT pi_id FROM pi_items WHERE id = :pi_item_id
                    """), {"pi_item_id": eopa[3]})
                    pi_id = pi_result.fetchone()[0]
                    
                    if pi_id not in eopas_by_pi:
                        eopas_by_pi[pi_id] = []
                    eopas_by_pi[pi_id].append(eopa)
                
                # Create one EOPA per PI
                for pi_id, pi_eopas in eopas_by_pi.items():
                    first = pi_eopas[0]
                    
                    # Insert new EOPA
                    new_eopa = conn.execute(text("""
                        INSERT INTO eopa_new (eopa_number, eopa_date, pi_id, status, remarks,
                                            approved_by, approved_at, created_by, created_at, updated_at)
                        VALUES (:eopa_number, :eopa_date, :pi_id, :status, :remarks,
                                :approved_by, :approved_at, :created_by, :created_at, :updated_at)
                        RETURNING id
                    """), {
                        "eopa_number": first[1],
                        "eopa_date": first[2],
                        "pi_id": pi_id,
                        "status": first[4],
                        "remarks": first[8],
                        "approved_by": first[9],
                        "approved_at": first[10],
                        "created_by": first[11],
                        "created_at": first[12],
                        "updated_at": first[13]
                    })
                    new_eopa_id = new_eopa.fetchone()[0]
                    
                    # Insert EOPA items
                    for old_eopa in pi_eopas:
                        conn.execute(text("""
                            INSERT INTO eopa_items (eopa_id, pi_item_id, quantity,
                                                  estimated_unit_price, estimated_total,
                                                  created_by, created_at, updated_at)
                            VALUES (:eopa_id, :pi_item_id, :quantity,
                                   :unit_price, :total, :created_by, :created_at, :updated_at)
                        """), {
                            "eopa_id": new_eopa_id,
                            "pi_item_id": old_eopa[3],
                            "quantity": old_eopa[5],
                            "unit_price": old_eopa[6],
                            "total": old_eopa[7],
                            "created_by": old_eopa[11],
                            "created_at": old_eopa[12],
                            "updated_at": old_eopa[13]
                        })
                
                conn.commit()
                print(f"   ✓ Created {len(eopas_by_pi)} EOPAs with {len(old_eopas)} items")
            
            # Replace old table
            print("\n🔄 Step 4: Replacing old table...")
            conn.execute(text("DROP TABLE eopa CASCADE"))
            conn.execute(text("ALTER TABLE eopa_new RENAME TO eopa"))
            conn.commit()
            print("   ✓ Table replaced")
            
            # Add foreign keys
            print("\n🔄 Step 5: Adding constraints...")
            conn.execute(text("ALTER TABLE eopa ADD FOREIGN KEY (pi_id) REFERENCES pi(id)"))
            conn.execute(text("ALTER TABLE eopa ADD FOREIGN KEY (created_by) REFERENCES users(id)"))
            conn.execute(text("ALTER TABLE eopa ADD FOREIGN KEY (approved_by) REFERENCES users(id)"))
            conn.execute(text("ALTER TABLE eopa_items ADD FOREIGN KEY (eopa_id) REFERENCES eopa(id) ON DELETE CASCADE"))
            conn.execute(text("ALTER TABLE eopa_items ADD FOREIGN KEY (pi_item_id) REFERENCES pi_items(id)"))
            conn.execute(text("ALTER TABLE eopa_items ADD FOREIGN KEY (created_by) REFERENCES users(id)"))
            conn.commit()
            print("   ✓ Constraints added")
            
            # Indexes
            print("\n🔄 Step 6: Creating indexes...")
            conn.execute(text("CREATE INDEX idx_eopa_pi_id ON eopa(pi_id)"))
            conn.execute(text("CREATE INDEX idx_eopa_status ON eopa(status)"))
            conn.execute(text("CREATE INDEX idx_eopa_items_eopa_id ON eopa_items(eopa_id)"))
            conn.execute(text("CREATE INDEX idx_eopa_items_pi_item_id ON eopa_items(pi_item_id)"))
            conn.commit()
            print("   ✓ Indexes created")
            
            print("\n" + "="*80)
            print("✅ MIGRATION COMPLETED")
            print("="*80)
            print("\nONE EOPA per PI with line items in eopa_items table")
            print("Backup saved in eopa_backup table")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("\nWARNING: This will restructure EOPA!")
    choice = input("Type 'yes' to proceed: ")
    if choice.lower() == 'yes':
        migrate()
    else:
        print("Cancelled")
