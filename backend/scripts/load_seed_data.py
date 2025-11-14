"""
Load seed data into the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database.session import get_db
from app.models.vendor import Vendor
from app.models.product import ProductMaster, MedicineMaster
from app.models.pi import PI, PIItem
from app.models.eopa import EOPA, EOPAItem
from app.models.po import PurchaseOrder, POItem
from app.auth.utils import hash_password
from datetime import date, datetime
from sqlalchemy.orm import Session

def load_seed_data():
    """Load sample seed data into the database"""
    
    db = next(get_db())
    
    try:
        print("Loading seed data...")
        
        # 1. Create Vendors
        print("Creating vendors...")
        partner_vendor = Vendor(
            name="Global Pharma Partners",
            vendor_type="PARTNER",
            contact_person="John Doe",
            phone="+91-9999990001",
            email="partner@example.com",
            address="123 Commerce Street, Mumbai, India",
            gst_number="27AABCU9603R1ZM",
            pan_number="AABCU9603R"
        )
        
        rm_vendor = Vendor(
            name="ChemSource Raw Materials",
            vendor_type="RM",
            contact_person="Sarah Smith",
            phone="+91-8888880001",
            email="rmvendor@example.com",
            address="55 Industrial Zone, Pune, India",
            gst_number="27AABCR9603R1ZM",
            pan_number="AABCR9603R"
        )
        
        pm_vendor = Vendor(
            name="Prime Packaging Solutions",
            vendor_type="PM",
            contact_person="Mike Johnson",
            phone="+91-7777770001",
            email="pmvendor@example.com",
            address="Plot 22 Packaging Park, Delhi, India",
            gst_number="27AABCP9603R1ZM",
            pan_number="AABCP9603R"
        )
        
        manufacturer_vendor = Vendor(
            name="MediCure Manufacturing",
            vendor_type="MANUFACTURER",
            contact_person="Dr. Amit Patel",
            phone="+91-6666660001",
            email="mfg@example.com",
            address="Sector 14 Biotech Hub, Hyderabad, India",
            gst_number="27AABCM9603R1ZM",
            pan_number="AABCM9603R"
        )
        
        db.add_all([partner_vendor, rm_vendor, pm_vendor, manufacturer_vendor])
        db.commit()
        print(f"✓ Created 4 vendors")
        
        # 2. Create Products
        print("Creating products...")
        product1 = ProductMaster(
            product_code="PROD001",
            product_name="Paracetamol",
            category="Analgesic",
            description="Pain relief and fever reduction"
        )
        
        product2 = ProductMaster(
            product_code="PROD002",
            product_name="Amoxicillin",
            category="Antibiotic",
            description="Bacterial infection treatment"
        )
        
        db.add_all([product1, product2])
        db.commit()
        print(f"✓ Created 2 products")
        
        # 3. Create Medicines
        print("Creating medicines...")
        medicine1 = MedicineMaster(
            product_id=product1.id,
            medicine_name="Paracetamol 500mg Tablets",
            composition="Paracetamol 500mg",
            dosage_form="Tablet",
            strength="500mg",
            pack_size="10x10",
            manufacturer_vendor_id=manufacturer_vendor.id,
            rm_vendor_id=rm_vendor.id,
            pm_vendor_id=pm_vendor.id
        )
        
        medicine2 = MedicineMaster(
            product_id=product2.id,
            medicine_name="Amoxicillin 250mg Capsules",
            composition="Amoxicillin Trihydrate 250mg",
            dosage_form="Capsule",
            strength="250mg",
            pack_size="10x10",
            manufacturer_vendor_id=manufacturer_vendor.id,
            rm_vendor_id=rm_vendor.id,
            pm_vendor_id=pm_vendor.id
        )
        
        db.add_all([medicine1, medicine2])
        db.commit()
        print(f"✓ Created 2 medicines")
        
        # 4. Create PI
        print("Creating Proforma Invoice...")
        pi = PI(
            pi_number="PI/24-25/0001",
            partner_vendor_id=partner_vendor.id,
            pi_date=date(2024, 11, 1),
            total_amount=2450.00,
            status="PENDING",
            remarks="First sample PI for testing",
            created_by=1  # admin user
        )
        db.add(pi)
        db.commit()
        
        # Add PI Items
        pi_item1 = PIItem(
            pi_id=pi.id,
            medicine_id=medicine1.id,
            quantity=1000,
            unit_price=1.20,
            total_price=1200.00
        )
        
        pi_item2 = PIItem(
            pi_id=pi.id,
            medicine_id=medicine2.id,
            quantity=500,
            unit_price=2.50,
            total_price=1250.00
        )
        
        db.add_all([pi_item1, pi_item2])
        db.commit()
        print(f"✓ Created PI with 2 items")
        
        # 5. Create EOPA
        print("Creating EOPA...")
        eopa = EOPA(
            eopa_number="EOPA/24-25/0001",
            pi_id=pi.id,
            eopa_date=date(2024, 11, 5),
            estimated_total=2450.00,
            status="APPROVED",
            remarks="Approved for PO generation",
            created_by=1,
            approved_by=1,
            approved_at=datetime(2024, 11, 6, 10, 30, 0)
        )
        db.add(eopa)
        db.commit()
        
        # Add EOPA Items
        eopa_item1 = EOPAItem(
            eopa_id=eopa.id,
            medicine_id=medicine1.id,
            quantity=1000,
            estimated_unit_price=1.20,
            estimated_total=1200.00
        )
        
        eopa_item2 = EOPAItem(
            eopa_id=eopa.id,
            medicine_id=medicine2.id,
            quantity=500,
            estimated_unit_price=2.50,
            estimated_total=1250.00
        )
        
        db.add_all([eopa_item1, eopa_item2])
        db.commit()
        print(f"✓ Created EOPA with 2 items")
        
        # 6. Create Purchase Orders
        print("Creating Purchase Orders...")
        
        # RM PO
        po_rm = PurchaseOrder(
            po_number="PO/RM/24-25/0001",
            po_type="RM",
            vendor_id=rm_vendor.id,
            eopa_id=eopa.id,
            po_date=date(2024, 11, 10),
            total_amount=1200.00,
            status="PENDING",
            created_by=1
        )
        
        # PM PO
        po_pm = PurchaseOrder(
            po_number="PO/PM/24-25/0001",
            po_type="PM",
            vendor_id=pm_vendor.id,
            eopa_id=eopa.id,
            po_date=date(2024, 11, 10),
            total_amount=800.00,
            status="PENDING",
            created_by=1
        )
        
        # FG PO
        po_fg = PurchaseOrder(
            po_number="PO/FG/24-25/0001",
            po_type="FG",
            vendor_id=manufacturer_vendor.id,
            eopa_id=eopa.id,
            po_date=date(2024, 11, 10),
            total_amount=2450.00,
            status="PENDING",
            created_by=1
        )
        
        db.add_all([po_rm, po_pm, po_fg])
        db.commit()
        
        # Add PO Items
        po_rm_item1 = POItem(
            po_id=po_rm.id,
            medicine_id=medicine1.id,
            quantity=1000,
            unit_price=1.20,
            total_price=1200.00
        )
        
        po_pm_item1 = POItem(
            po_id=po_pm.id,
            medicine_id=medicine1.id,
            quantity=1000,
            unit_price=0.80,
            total_price=800.00
        )
        
        po_fg_item1 = POItem(
            po_id=po_fg.id,
            medicine_id=medicine1.id,
            quantity=1000,
            unit_price=1.20,
            total_price=1200.00
        )
        
        po_fg_item2 = POItem(
            po_id=po_fg.id,
            medicine_id=medicine2.id,
            quantity=500,
            unit_price=2.50,
            total_price=1250.00
        )
        
        db.add_all([po_rm_item1, po_pm_item1, po_fg_item1, po_fg_item2])
        db.commit()
        print(f"✓ Created 3 Purchase Orders (RM, PM, FG)")
        
        print("\n" + "="*50)
        print("✓ Seed data loaded successfully!")
        print("="*50)
        print("\nSummary:")
        print(f"  - 4 Vendors (1 Partner, 1 RM, 1 PM, 1 Manufacturer)")
        print(f"  - 2 Products")
        print(f"  - 2 Medicines")
        print(f"  - 1 PI with 2 items")
        print(f"  - 1 EOPA with 2 items (Approved)")
        print(f"  - 3 Purchase Orders (RM, PM, FG)")
        print("\nYou can now:")
        print("  1. View Vendors in the Vendors page")
        print("  2. View Products/Medicines in the Products page")
        print("  3. View PI in the PI page")
        print("  4. View EOPA in the EOPA page")
        print("  5. View POs in the Purchase Orders page")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error loading seed data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    load_seed_data()
