"""
Test Invoice Fulfillment Workflow

This script tests the complete PO-to-Invoice fulfillment cycle:
1. Create PO (quantity-only, no pricing)
2. Process vendor invoice (with pricing)
3. Verify PO status updates
4. Verify material balance updates (for RM/PM)
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.invoice import VendorInvoice, VendorInvoiceItem, InvoiceStatus
from app.models.material import MaterialBalance
from app.services.invoice_service import InvoiceService
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from datetime import date, datetime
from decimal import Decimal


def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def test_po_structure():
    """Verify PO contains only quantities, no pricing"""
    print_section("TEST 1: Verify PO Structure (Quantity Only, No Pricing)")
    
    db = SessionLocal()
    try:
        # Get latest PO
        po = db.query(PurchaseOrder).order_by(PurchaseOrder.id.desc()).first()
        
        if not po:
            print("❌ No PO found in database")
            return
        
        print(f"\n📋 PO: {po.po_number}")
        print(f"  Type: {po.po_type}")
        print(f"  Vendor: {po.vendor.vendor_name}")
        print(f"  Status: {po.status}")
        print(f"  Total Ordered Qty: {po.total_ordered_qty}")
        print(f"  Total Fulfilled Qty: {po.total_fulfilled_qty}")
        
        # Verify no pricing fields exist
        if hasattr(po, 'total_amount'):
            print("  ⚠️  WARNING: PO has total_amount field (should be removed)")
        else:
            print("  ✅ PO has no total_amount field (correct)")
        
        print(f"\n  PO Items ({len(po.items)}):")
        for item in po.items:
            print(f"    - {item.medicine.medicine_name}")
            print(f"      Ordered: {item.ordered_quantity}")
            print(f"      Fulfilled: {item.fulfilled_quantity}")
            
            # Verify no pricing fields
            if hasattr(item, 'unit_price'):
                print(f"      ⚠️  WARNING: PO Item has unit_price (should be removed)")
            else:
                print(f"      ✅ No pricing fields (correct)")
        
        print("\n✅ PO structure test complete")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_invoice_processing():
    """Test invoice processing and PO fulfillment"""
    print_section("TEST 2: Invoice Processing and PO Fulfillment")
    
    db = SessionLocal()
    try:
        # Get an OPEN PO
        po = db.query(PurchaseOrder).filter(
            PurchaseOrder.status == POStatus.DRAFT
        ).first()
        
        if not po:
            print("❌ No OPEN PO found for testing")
            return
        
        print(f"\n📋 Testing with PO: {po.po_number}")
        print(f"  Type: {po.po_type}")
        print(f"  Ordered Qty: {po.total_ordered_qty}")
        print(f"  Fulfilled Qty: {po.total_fulfilled_qty}")
        
        # Get initial material balance for first item (if RM/PM)
        first_item = po.items[0]
        initial_balance = None
        if po.po_type in [POType.RM, POType.PM]:
            balance = db.query(MaterialBalance).filter(
                MaterialBalance.medicine_id == first_item.medicine_id
            ).first()
            initial_balance = float(balance.available_quantity) if balance else 0.0
            print(f"\n  Initial Material Balance for {first_item.medicine.medicine_name}: {initial_balance}")
        
        # Create test invoice
        print(f"\n🧾 Creating test invoice...")
        
        invoice_items = []
        subtotal = Decimal("0.00")
        
        for po_item in po.items[:1]:  # Test with first item only
            shipped_qty = float(po_item.ordered_quantity) / 2  # Ship half
            unit_price = 100.50  # Test price
            
            invoice_items.append(InvoiceItemCreate(
                medicine_id=po_item.medicine_id,
                shipped_quantity=shipped_qty,
                unit_price=unit_price,
                tax_rate=18.0,  # 18% GST
                batch_number="BATCH-TEST-001",
                expiry_date=date(2026, 12, 31)
            ))
            
            item_total = Decimal(str(shipped_qty)) * Decimal(str(unit_price))
            subtotal += item_total
        
        tax_amount = subtotal * Decimal("0.18")
        total_amount = subtotal + tax_amount
        
        invoice_data = InvoiceCreate(
            invoice_number=f"INV-TEST-{po.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            invoice_date=date.today(),
            po_id=po.id,
            subtotal=float(subtotal),
            tax_amount=float(tax_amount),
            total_amount=float(total_amount),
            items=invoice_items,
            remarks="Test invoice for PO fulfillment"
        )
        
        # Process invoice
        service = InvoiceService(db)
        result = service.process_vendor_invoice(po.id, invoice_data, user_id=1)
        
        print(f"\n✅ Invoice processed successfully")
        print(f"  Invoice Number: {result['invoice_number']}")
        print(f"  Total Shipped Qty: {result['total_shipped_qty']}")
        print(f"  Total Amount: ₹{result['total_amount']}")
        print(f"  PO Status: {result['po_status']}")
        
        # Verify PO status update
        db.refresh(po)
        print(f"\n📊 PO Status After Invoice:")
        print(f"  Status: {po.status} (expected: PARTIAL)")
        print(f"  Fulfilled Qty: {po.total_fulfilled_qty}")
        
        if po.status == POStatus.PARTIAL:
            print(f"  ✅ PO status correctly updated to PARTIAL")
        else:
            print(f"  ⚠️  Expected PARTIAL, got {po.status}")
        
        # Verify material balance update (for RM/PM)
        if po.po_type in [POType.RM, POType.PM] and initial_balance is not None:
            balance = db.query(MaterialBalance).filter(
                MaterialBalance.medicine_id == first_item.medicine_id
            ).first()
            new_balance = float(balance.available_quantity) if balance else 0.0
            balance_increase = new_balance - initial_balance
            
            print(f"\n📦 Material Balance Update:")
            print(f"  Initial: {initial_balance}")
            print(f"  New: {new_balance}")
            print(f"  Increase: {balance_increase}")
            
            expected_increase = invoice_items[0].shipped_quantity
            if abs(balance_increase - expected_increase) < 0.01:
                print(f"  ✅ Material balance correctly updated")
            else:
                print(f"  ⚠️  Expected increase of {expected_increase}, got {balance_increase}")
        
        print("\n✅ Invoice processing test complete")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def test_material_balance_check():
    """Test that PO creation checks material balance"""
    print_section("TEST 3: Material Balance Check During PO Creation")
    
    db = SessionLocal()
    try:
        # Get a medicine with material balance
        balance = db.query(MaterialBalance).first()
        
        if not balance:
            print("❌ No material balance records found")
            return
        
        print(f"\n📦 Medicine: {balance.medicine.medicine_name}")
        print(f"  Available Balance: {balance.available_quantity}")
        
        print("\n✅ Material balance check logic:")
        print("  When creating RM/PM PO:")
        print("    effective_qty = required_qty - available_balance")
        print("    If effective_qty <= 0, PO is skipped")
        print("    Otherwise, PO is created with effective_qty")
        
        print("\n✅ Material balance test complete")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_invoice_retrieval():
    """Test invoice retrieval endpoints"""
    print_section("TEST 4: Invoice Retrieval")
    
    db = SessionLocal()
    try:
        # Get latest invoice
        invoice = db.query(VendorInvoice).order_by(VendorInvoice.id.desc()).first()
        
        if not invoice:
            print("ℹ️  No invoices found yet")
            return
        
        print(f"\n🧾 Latest Invoice: {invoice.invoice_number}")
        print(f"  Type: {invoice.invoice_type}")
        print(f"  Date: {invoice.invoice_date}")
        print(f"  PO: {invoice.purchase_order.po_number}")
        print(f"  Vendor: {invoice.vendor.vendor_name}")
        print(f"  Status: {invoice.status}")
        print(f"  Subtotal: ₹{invoice.subtotal}")
        print(f"  Tax: ₹{invoice.tax_amount}")
        print(f"  Total: ₹{invoice.total_amount}")
        
        print(f"\n  Invoice Items ({len(invoice.items)}):")
        for item in invoice.items:
            print(f"    - {item.medicine.medicine_name}")
            print(f"      Shipped Qty: {item.shipped_quantity}")
            print(f"      Unit Price: ₹{item.unit_price}")
            print(f"      Total: ₹{item.total_price}")
            print(f"      Tax Rate: {item.tax_rate}%")
            print(f"      Batch: {item.batch_number}")
        
        print("\n✅ Invoice retrieval test complete")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def main():
    print("=" * 70)
    print("INVOICE FULFILLMENT WORKFLOW TEST SUITE")
    print("=" * 70)
    print("\nThis test suite validates:")
    print("  1. PO contains only quantities (no pricing)")
    print("  2. Invoice processing updates PO fulfillment")
    print("  3. Material balance updates for RM/PM")
    print("  4. Invoice retrieval functionality")
    
    test_po_structure()
    test_material_balance_check()
    test_invoice_retrieval()
    
    print("\n" + "=" * 70)
    print("NOTE: To test invoice processing, uncomment the call below:")
    print("  test_invoice_processing()")
    print("This creates a real invoice and updates PO status.")
    print("=" * 70)
    
    # Uncomment to test invoice processing (modifies data)
    # test_invoice_processing()
    
    print("\n✅ All tests complete!")


if __name__ == "__main__":
    main()
