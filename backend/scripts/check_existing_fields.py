"""Check which enhancement fields already exist"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)

# Expected new fields per table
expected_fields = {
    'vendors': ['drug_license_number', 'gmp_certified', 'iso_certified', 'credit_days'],
    'product_master': ['hsn_code'],
    'medicine_master': ['hsn_code', 'pack_size', 'primary_unit', 'secondary_unit', 'conversion_factor', 
                       'primary_packaging', 'secondary_packaging', 'units_per_pack', 'regulatory_approvals'],
    'pi_items': ['hsn_code', 'pack_size'],
    'purchase_orders': ['require_coa', 'require_bmr', 'require_msds', 'sample_quantity', 'shelf_life_minimum',
                       'ship_to', 'bill_to', 'buyer_reference_no', 'buyer_contact_person', 'transport_mode',
                       'freight_terms', 'payment_terms', 'currency_code', 'amendment_number', 'amendment_date',
                       'original_po_id', 'prepared_by', 'checked_by', 'approved_by', 'verified_by'],
    'po_items': ['hsn_code', 'gst_rate', 'pack_size', 'artwork_file_url', 'artwork_approval_ref',
                'gsm', 'ply', 'box_dimensions', 'color_spec', 'printing_instructions', 'die_cut_info',
                'plate_charges', 'specification_reference', 'test_method', 'delivery_schedule_type',
                'delivery_date', 'delivery_window_start', 'delivery_window_end', 'quantity_tolerance_percentage',
                'price_tolerance_percentage', 'discount_percentage'],
    'vendor_invoices': ['hsn_code', 'gst_rate', 'gst_amount', 'freight_charges', 'insurance_charges',
                       'currency_code', 'exchange_rate', 'base_currency_amount', 'batch_number',
                       'manufacturing_date', 'expiry_date']
}

print("\n" + "="*80)
print("FIELD EXISTENCE CHECK")
print("="*80)

for table_name, fields in expected_fields.items():
    existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
    print(f"\n✓ {table_name.upper()}:")
    
    existing_new_fields = []
    missing_fields = []
    
    for field in fields:
        if field in existing_columns:
            existing_new_fields.append(field)
        else:
            missing_fields.append(field)
    
    if existing_new_fields:
        print(f"  ALREADY EXISTS ({len(existing_new_fields)}): {', '.join(existing_new_fields)}")
    if missing_fields:
        print(f"  MISSING ({len(missing_fields)}): {', '.join(missing_fields)}")
    if not missing_fields:
        print(f"  ✓ All {len(fields)} fields already exist!")

print("\n" + "="*80 + "\n")
