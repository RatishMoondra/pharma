"""
Test PO Generation from EOPA
"""
import sys
sys.path.insert(0, 'C:\\Ratish\\Pawan\\backend')

from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("\n" + "="*70)
print("EOPA & PO Generation Test")
print("="*70)

# Check EOPAs
result = db.execute(text('''
    SELECT 
        e.id,
        e.eopa_number,
        e.status,
        e.pi_id,
        COUNT(ei.id) as item_count
    FROM eopa e
    LEFT JOIN eopa_items ei ON e.id = ei.eopa_id
    GROUP BY e.id, e.eopa_number, e.status, e.pi_id
    ORDER BY e.id
'''))

print("\n📋 Available EOPAs:")
print("-" * 70)
eopas = []
for row in result:
    eopas.append(row)
    print(f"  ID: {row.id} | Number: {row.eopa_number} | Status: {row.status} | Items: {row.item_count}")

# Check if any POs exist
result = db.execute(text('''
    SELECT 
        po.id,
        po.po_number,
        po.po_type,
        po.eopa_id,
        v.vendor_name,
        po.total_amount,
        COUNT(poi.id) as item_count
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    LEFT JOIN po_items poi ON po.id = poi.po_id
    GROUP BY po.id, po.po_number, po.po_type, po.eopa_id, v.vendor_name, po.total_amount
    ORDER BY po.id
'''))

print("\n📦 Existing Purchase Orders:")
print("-" * 70)
pos = list(result)
if pos:
    for row in pos:
        print(f"  {row.po_number} | Type: {row.po_type} | EOPA: {row.eopa_id} | Vendor: {row.vendor_name}")
        print(f"    Amount: ₹{row.total_amount} | Items: {row.item_count}")
else:
    print("  No Purchase Orders found")

# Check medicine vendor mappings
print("\n🏥 Medicine Vendor Mappings:")
print("-" * 70)
result = db.execute(text('''
    SELECT 
        mm.id,
        mm.medicine_name,
        mv.vendor_name as manufacturer,
        rv.vendor_name as rm_vendor,
        pv.vendor_name as pm_vendor
    FROM medicine_master mm
    LEFT JOIN vendors mv ON mm.manufacturer_vendor_id = mv.id
    LEFT JOIN vendors rv ON mm.rm_vendor_id = rv.id
    LEFT JOIN vendors pv ON mm.pm_vendor_id = pv.id
    WHERE mm.id IN (
        SELECT DISTINCT pi_item.medicine_id 
        FROM eopa_items ei
        JOIN pi_items pi_item ON ei.pi_item_id = pi_item.id
    )
'''))

for row in result:
    print(f"  {row.medicine_name}:")
    print(f"    Manufacturer: {row.manufacturer or 'NOT SET'}")
    print(f"    RM Vendor: {row.rm_vendor or 'NOT SET'}")
    print(f"    PM Vendor: {row.pm_vendor or 'NOT SET'}")

print("\n" + "="*70)
print("Test Summary:")
print("="*70)
print(f"  Total EOPAs: {len(eopas)}")
print(f"  Total POs: {len(pos)}")
print(f"  EOPAs ready for PO generation: {len([e for e in eopas if e.status == 'APPROVED' and e.item_count > 0])}")
print("="*70 + "\n")

db.close()
