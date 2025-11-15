"""
Test the complete EOPA → PO workflow
1. Approve EOPA #2
2. Generate POs from EOPA #2
3. Verify POs created
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.eopa import EOPA, EOPAStatus
from app.models.po import PurchaseOrder
from app.services.po_service import POGenerationService
from datetime import datetime

def test_po_workflow():
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("EOPA → PO Workflow Test")
        print("=" * 70)
        
        # Step 1: Get EOPA #2
        eopa = db.query(EOPA).filter(EOPA.id == 2).first()
        if not eopa:
            print("❌ EOPA #2 not found")
            return
        
        print(f"\n📋 EOPA Status:")
        print(f"  EOPA Number: {eopa.eopa_number}")
        print(f"  Current Status: {eopa.status}")
        print(f"  Items: {len(eopa.items)}")
        
        # Step 2: Approve EOPA if pending
        if eopa.status == EOPAStatus.PENDING:
            print(f"\n✅ Approving EOPA {eopa.eopa_number}...")
            eopa.status = EOPAStatus.APPROVED
            eopa.approved_by = 1  # Admin user
            eopa.approved_at = datetime.utcnow()
            db.commit()
            print(f"  Status updated to: {eopa.status}")
        elif eopa.status == EOPAStatus.APPROVED:
            print(f"\n✅ EOPA already approved")
        else:
            print(f"\n❌ EOPA status is {eopa.status}, cannot generate POs")
            return
        
        # Step 3: Check existing POs
        existing_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.eopa_id == 2
        ).all()
        
        print(f"\n📦 Existing POs for this EOPA: {len(existing_pos)}")
        for po in existing_pos:
            print(f"  - {po.po_number} ({po.po_type})")
        
        # Step 4: Generate POs
        if len(existing_pos) > 0:
            print(f"\n⚠️  POs already exist for this EOPA")
            print(f"  Skipping PO generation to avoid duplicates")
        else:
            print(f"\n🚀 Generating POs from EOPA {eopa.eopa_number}...")
            
            service = POGenerationService(db)
            result = service.generate_pos_from_eopa(eopa.id, current_user_id=1)
            
            print(f"\n✅ PO Generation Complete!")
            print(f"  Total POs Created: {result['total_pos_created']}")
            print(f"  PO Numbers:")
            for po_data in result['purchase_orders']:
                print(f"    - {po_data['po_number']} ({po_data['po_type']}) - Items: {po_data['items_count']} - ₹{po_data['total_amount']}")
        
        # Step 5: Verify final state
        print(f"\n📊 Final Summary:")
        all_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.eopa_id == 2
        ).all()
        print(f"  Total POs for EOPA #2: {len(all_pos)}")
        for po in all_pos:
            print(f"    {po.po_number} | Type: {po.po_type} | Items: {len(po.items)} | Total: ₹{po.total_amount}")
        
        print("\n" + "=" * 70)
        print("✅ Workflow Test Complete!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_po_workflow()
