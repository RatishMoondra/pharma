from app.database.session import SessionLocal
from app.models.eopa import EOPA, EOPAItem
from app.models.pi import PIItem
from app.models.product import MedicineMaster
from sqlalchemy.orm import joinedload

db = SessionLocal()

# Load EOPA with all relationships
eopa = db.query(EOPA).options(
    joinedload(EOPA.items)
        .joinedload(EOPAItem.pi_item)
        .joinedload(PIItem.medicine)
).filter(EOPA.eopa_number == 'EOPA/25-26/0002').first()

print(f"EOPA: {eopa.eopa_number}")
print(f"Items: {len(eopa.items)}\n")

for idx, item in enumerate(eopa.items, 1):
    medicine = item.pi_item.medicine
    print(f"{idx}. {medicine.medicine_name}")
    print(f"   Manufacturer ID: {medicine.manufacturer_vendor_id}")
    print(f"   RM Vendor ID: {medicine.rm_vendor_id}")
    print(f"   PM Vendor ID: {medicine.pm_vendor_id}")
    print()

db.close()
