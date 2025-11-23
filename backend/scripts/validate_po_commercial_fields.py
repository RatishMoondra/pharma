#!/usr/bin/env python
"""
PO Commercial Fields - Validation Script

This script validates that the PO commercial fields implementation is working correctly.
Run this after migration to verify everything is set up properly.

Usage:
    python scripts/validate_po_commercial_fields.py
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import inspect, text
from app.database.session import SessionLocal
from app.models.po import PurchaseOrder, POItem
from decimal import Decimal


def print_success(message):
    print(f"✅ {message}")


def print_error(message):
    print(f"❌ {message}")


def print_info(message):
    print(f"ℹ️  {message}")


def validate_schema():
    """Validate that all required columns exist"""
    print("\n" + "="*60)
    print("1. VALIDATING DATABASE SCHEMA")
    print("="*60)
    
    db = SessionLocal()
    inspector = inspect(db.bind)
    
    # Check po_items columns
    print("\n📋 Checking po_items table...")
    po_items_columns = [col['name'] for col in inspector.get_columns('po_items')]
    
    required_po_item_fields = [
        'rate_per_unit',
        'value_amount',
        'gst_amount',
        'total_amount',
        'delivery_schedule',
        'delivery_location'
    ]
    
    for field in required_po_item_fields:
        if field in po_items_columns:
            print_success(f"Column '{field}' exists in po_items")
        else:
            print_error(f"Column '{field}' MISSING from po_items")
            return False
    
    # Check purchase_orders columns
    print("\n📋 Checking purchase_orders table...")
    purchase_orders_columns = [col['name'] for col in inspector.get_columns('purchase_orders')]
    
    required_po_fields = [
        'total_value_amount',
        'total_gst_amount',
        'total_invoice_amount',
        'ship_to_manufacturer_id',
        'ship_to_address',
        'amendment_reason',
        'currency_exchange_rate'
    ]
    
    for field in required_po_fields:
        if field in purchase_orders_columns:
            print_success(f"Column '{field}' exists in purchase_orders")
        else:
            print_error(f"Column '{field}' MISSING from purchase_orders")
            return False
    
    # Check constraint
    print("\n📋 Checking constraints...")
    constraints = inspector.get_check_constraints('po_items')
    constraint_names = [c['name'] for c in constraints]
    
    if 'chk_po_item_one_material_type' in constraint_names:
        print_success("Constraint 'chk_po_item_one_material_type' exists")
    else:
        print_error("Constraint 'chk_po_item_one_material_type' MISSING")
        return False
    
    db.close()
    return True


def validate_models():
    """Validate that SQLAlchemy models have all required fields"""
    print("\n" + "="*60)
    print("2. VALIDATING SQLALCHEMY MODELS")
    print("="*60)
    
    # Check POItem model
    print("\n📋 Checking POItem model...")
    po_item_attrs = dir(POItem)
    
    required_po_item_attrs = [
        'rate_per_unit',
        'value_amount',
        'gst_amount',
        'total_amount',
        'delivery_schedule',
        'delivery_location'
    ]
    
    for attr in required_po_item_attrs:
        if attr in po_item_attrs:
            print_success(f"POItem has attribute '{attr}'")
        else:
            print_error(f"POItem MISSING attribute '{attr}'")
            return False
    
    # Check PurchaseOrder model
    print("\n📋 Checking PurchaseOrder model...")
    po_attrs = dir(PurchaseOrder)
    
    required_po_attrs = [
        'total_value_amount',
        'total_gst_amount',
        'total_invoice_amount',
        'ship_to_manufacturer_id',
        'ship_to_address',
        'amendment_reason',
        'currency_exchange_rate'
    ]
    
    for attr in required_po_attrs:
        if attr in po_attrs:
            print_success(f"PurchaseOrder has attribute '{attr}'")
        else:
            print_error(f"PurchaseOrder MISSING attribute '{attr}'")
            return False
    
    return True


def validate_calculations():
    """Validate auto-calculation functions"""
    print("\n" + "="*60)
    print("3. VALIDATING AUTO-CALCULATION FUNCTIONS")
    print("="*60)
    
    from app.services.po_service import calculate_po_item_amounts, calculate_po_totals
    
    # Test calculate_po_item_amounts
    print("\n📋 Testing calculate_po_item_amounts...")
    
    test_item = POItem(
        po_id=1,
        medicine_id=1,
        ordered_quantity=Decimal('100'),
        rate_per_unit=Decimal('1500.00'),
        gst_rate=Decimal('18.00')
    )
    
    calculated = calculate_po_item_amounts(test_item)
    
    expected_value = Decimal('150000.00')
    expected_gst = Decimal('27000.00')
    expected_total = Decimal('177000.00')
    
    if calculated.value_amount == expected_value:
        print_success(f"Value calculation correct: {calculated.value_amount}")
    else:
        print_error(f"Value calculation WRONG: {calculated.value_amount} (expected {expected_value})")
        return False
    
    if calculated.gst_amount == expected_gst:
        print_success(f"GST calculation correct: {calculated.gst_amount}")
    else:
        print_error(f"GST calculation WRONG: {calculated.gst_amount} (expected {expected_gst})")
        return False
    
    if calculated.total_amount == expected_total:
        print_success(f"Total calculation correct: {calculated.total_amount}")
    else:
        print_error(f"Total calculation WRONG: {calculated.total_amount} (expected {expected_total})")
        return False
    
    # Test calculate_po_totals
    print("\n📋 Testing calculate_po_totals...")
    
    from datetime import date
    from app.models.po import POType, POStatus
    
    test_po = PurchaseOrder(
        po_number='TEST/001',
        po_date=date.today(),
        po_type=POType.RM,
        eopa_id=1,
        status=POStatus.DRAFT,
        created_by=1
    )
    
    item1 = POItem(
        po_id=1,
        raw_material_id=1,
        ordered_quantity=100,
        value_amount=Decimal('100000.00'),
        gst_amount=Decimal('18000.00'),
        total_amount=Decimal('118000.00')
    )
    
    item2 = POItem(
        po_id=1,
        raw_material_id=2,
        ordered_quantity=50,
        value_amount=Decimal('50000.00'),
        gst_amount=Decimal('9000.00'),
        total_amount=Decimal('59000.00')
    )
    
    test_po.items = [item1, item2]
    calculated_po = calculate_po_totals(test_po)
    
    expected_total_value = Decimal('150000.00')
    expected_total_gst = Decimal('27000.00')
    expected_total_invoice = Decimal('177000.00')
    
    if calculated_po.total_value_amount == expected_total_value:
        print_success(f"Total value correct: {calculated_po.total_value_amount}")
    else:
        print_error(f"Total value WRONG: {calculated_po.total_value_amount} (expected {expected_total_value})")
        return False
    
    if calculated_po.total_gst_amount == expected_total_gst:
        print_success(f"Total GST correct: {calculated_po.total_gst_amount}")
    else:
        print_error(f"Total GST WRONG: {calculated_po.total_gst_amount} (expected {expected_total_gst})")
        return False
    
    if calculated_po.total_invoice_amount == expected_total_invoice:
        print_success(f"Total invoice correct: {calculated_po.total_invoice_amount}")
    else:
        print_error(f"Total invoice WRONG: {calculated_po.total_invoice_amount} (expected {expected_total_invoice})")
        return False
    
    return True


def validate_material_type_validation():
    """Validate material type validation function"""
    print("\n" + "="*60)
    print("4. VALIDATING MATERIAL TYPE VALIDATION")
    print("="*60)
    
    from app.services.po_service import validate_po_item_material_type
    from app.exceptions.base import AppException
    
    # Test valid cases
    print("\n📋 Testing valid material types...")
    
    valid_cases = [
        {'medicine_id': 1, 'raw_material_id': None, 'packing_material_id': None},
        {'medicine_id': None, 'raw_material_id': 1, 'packing_material_id': None},
        {'medicine_id': None, 'raw_material_id': None, 'packing_material_id': 1}
    ]
    
    for i, case in enumerate(valid_cases, 1):
        try:
            validate_po_item_material_type(case)
            print_success(f"Valid case {i} passed")
        except AppException as e:
            print_error(f"Valid case {i} FAILED: {e.message}")
            return False
    
    # Test invalid cases
    print("\n📋 Testing invalid material types...")
    
    invalid_cases = [
        {'medicine_id': None, 'raw_material_id': None, 'packing_material_id': None},  # No material
        {'medicine_id': 1, 'raw_material_id': 2, 'packing_material_id': None},  # Multiple materials
        {'medicine_id': 1, 'raw_material_id': None, 'packing_material_id': 3}  # Multiple materials
    ]
    
    for i, case in enumerate(invalid_cases, 1):
        try:
            validate_po_item_material_type(case)
            print_error(f"Invalid case {i} should have FAILED but passed")
            return False
        except AppException as e:
            print_success(f"Invalid case {i} correctly rejected: {e.message}")
    
    return True


def main():
    """Run all validations"""
    print("\n" + "="*60)
    print("🔍 PO COMMERCIAL FIELDS VALIDATION")
    print("="*60)
    
    all_passed = True
    
    # Run validations
    if not validate_schema():
        all_passed = False
    
    if not validate_models():
        all_passed = False
    
    if not validate_calculations():
        all_passed = False
    
    if not validate_material_type_validation():
        all_passed = False
    
    # Final result
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL VALIDATIONS PASSED!")
        print("="*60)
        print("\n🎉 Your PO commercial fields implementation is working correctly!")
        print("\nNext steps:")
        print("1. Test the /po/{id}/recalculate endpoint")
        print("2. Test the POCreationForm component in the frontend")
        print("3. Run pytest: pytest tests/test_po_commercial_fields.py -v")
        return 0
    else:
        print("❌ SOME VALIDATIONS FAILED")
        print("="*60)
        print("\n⚠️ Please review the errors above and fix them.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
