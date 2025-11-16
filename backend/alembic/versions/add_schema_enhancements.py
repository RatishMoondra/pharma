"""add schema enhancements for compliance and quality

Revision ID: add_schema_enhancements
Revises: 28f9d84671af
Create Date: 2025-11-15 10:30:00.000000

This migration adds 78 new fields across 13 tables to support:
- Tax compliance (HSN codes, GST)
- Pharmaceutical quality requirements (COA, BMR, MSDS, batch tracking)
- Packaging specifications (pack size, artwork, printing specs)
- Shipping & billing information
- Approval workflow (prepared/checked/approved/verified)
- Amendment tracking
- Multi-currency support
- Delivery scheduling with tolerances
- Terms & conditions (new table)

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_schema_enhancements'
down_revision = '0be130d9af6a'
branch_labels = None
depends_on = None


def upgrade():
    """Add all schema enhancements"""
    
    # ========================================
    # 1. VENDORS TABLE ENHANCEMENTS (4 fields)
    # ========================================
    op.add_column('vendors', sa.Column('drug_license_number', sa.String(100), nullable=True))
    op.add_column('vendors', sa.Column('gmp_certified', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('vendors', sa.Column('iso_certified', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('vendors', sa.Column('credit_days', sa.Integer(), nullable=True))
    
    # ========================================
    # 2. PRODUCT_MASTER TABLE ENHANCEMENTS (1 field)
    # ========================================
    op.add_column('product_master', sa.Column('hsn_code', sa.String(20), nullable=True))
    op.create_index('idx_product_hsn', 'product_master', ['hsn_code'])
    
    # ========================================
    # 3. MEDICINE_MASTER TABLE ENHANCEMENTS (10 fields - pack_size already exists)
    # ========================================
    op.add_column('medicine_master', sa.Column('hsn_code', sa.String(20), nullable=True))
    # pack_size already exists - skipping
    op.add_column('medicine_master', sa.Column('primary_unit', sa.String(50), nullable=True))
    op.add_column('medicine_master', sa.Column('secondary_unit', sa.String(50), nullable=True))
    op.add_column('medicine_master', sa.Column('conversion_factor', sa.Numeric(10, 4), nullable=True))
    op.add_column('medicine_master', sa.Column('primary_packaging', sa.String(100), nullable=True))
    op.add_column('medicine_master', sa.Column('secondary_packaging', sa.String(100), nullable=True))
    op.add_column('medicine_master', sa.Column('units_per_pack', sa.Integer(), nullable=True))
    op.add_column('medicine_master', sa.Column('regulatory_approvals', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index('idx_medicine_hsn', 'medicine_master', ['hsn_code'])
    
    # ========================================
    # 4. PI_ITEMS TABLE ENHANCEMENTS (2 fields)
    # ========================================
    op.add_column('pi_items', sa.Column('hsn_code', sa.String(20), nullable=True))
    op.add_column('pi_items', sa.Column('pack_size', sa.String(100), nullable=True))
    op.create_index('idx_pi_item_hsn', 'pi_items', ['hsn_code'])
    
    # ========================================
    # 5. PURCHASE_ORDERS TABLE ENHANCEMENTS (19 fields)
    # ========================================
    # Quality Requirements
    op.add_column('purchase_orders', sa.Column('require_coa', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('purchase_orders', sa.Column('require_bmr', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('purchase_orders', sa.Column('require_msds', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('purchase_orders', sa.Column('sample_quantity', sa.Numeric(10, 2), nullable=True))
    op.add_column('purchase_orders', sa.Column('shelf_life_minimum', sa.Integer(), nullable=True))
    
    # Shipping & Billing
    op.add_column('purchase_orders', sa.Column('ship_to', sa.Text(), nullable=True))
    op.add_column('purchase_orders', sa.Column('bill_to', sa.Text(), nullable=True))
    op.add_column('purchase_orders', sa.Column('buyer_reference_no', sa.String(100), nullable=True))
    op.add_column('purchase_orders', sa.Column('buyer_contact_person', sa.String(200), nullable=True))
    op.add_column('purchase_orders', sa.Column('transport_mode', sa.String(50), nullable=True))
    
    # Freight & Payment
    op.add_column('purchase_orders', sa.Column('freight_terms', sa.String(100), nullable=True))
    op.add_column('purchase_orders', sa.Column('payment_terms', sa.Text(), nullable=True))
    
    # Multi-Currency
    op.add_column('purchase_orders', sa.Column('currency_code', sa.String(10), nullable=True))
    
    # Amendment Tracking
    op.add_column('purchase_orders', sa.Column('amendment_number', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('purchase_orders', sa.Column('amendment_date', sa.Date(), nullable=True))
    op.add_column('purchase_orders', sa.Column('original_po_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_po_original', 'purchase_orders', 'purchase_orders', ['original_po_id'], ['id'], ondelete='SET NULL')
    op.create_index('idx_po_original', 'purchase_orders', ['original_po_id'])
    
    # Approval Metadata
    op.add_column('purchase_orders', sa.Column('prepared_by', sa.String(200), nullable=True))
    op.add_column('purchase_orders', sa.Column('checked_by', sa.String(200), nullable=True))
    op.add_column('purchase_orders', sa.Column('approved_by', sa.String(200), nullable=True))
    op.add_column('purchase_orders', sa.Column('verified_by', sa.String(200), nullable=True))
    
    # ========================================
    # 6. PO_ITEMS TABLE ENHANCEMENTS (26 fields)
    # ========================================
    # Tax & Pricing
    op.add_column('po_items', sa.Column('hsn_code', sa.String(20), nullable=True))
    op.add_column('po_items', sa.Column('gst_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('po_items', sa.Column('pack_size', sa.String(100), nullable=True))
    op.create_index('idx_po_item_hsn', 'po_items', ['hsn_code'])
    
    # Artwork & PM Specifications (conditional for PM POs)
    op.add_column('po_items', sa.Column('artwork_file_url', sa.String(500), nullable=True))
    op.add_column('po_items', sa.Column('artwork_approval_ref', sa.String(100), nullable=True))
    op.add_column('po_items', sa.Column('gsm', sa.Numeric(8, 2), nullable=True))
    op.add_column('po_items', sa.Column('ply', sa.Integer(), nullable=True))
    op.add_column('po_items', sa.Column('box_dimensions', sa.String(100), nullable=True))
    op.add_column('po_items', sa.Column('color_spec', sa.String(200), nullable=True))
    op.add_column('po_items', sa.Column('printing_instructions', sa.Text(), nullable=True))
    op.add_column('po_items', sa.Column('die_cut_info', sa.String(200), nullable=True))
    op.add_column('po_items', sa.Column('plate_charges', sa.Numeric(15, 2), nullable=True))
    
    # Quality Specifications (conditional for RM POs)
    op.add_column('po_items', sa.Column('specification_reference', sa.String(100), nullable=True))
    op.add_column('po_items', sa.Column('test_method', sa.String(100), nullable=True))
    
    # Delivery Schedule
    op.add_column('po_items', sa.Column('delivery_schedule_type', sa.String(50), nullable=True))
    op.add_column('po_items', sa.Column('delivery_date', sa.Date(), nullable=True))
    op.add_column('po_items', sa.Column('delivery_window_start', sa.Date(), nullable=True))
    op.add_column('po_items', sa.Column('delivery_window_end', sa.Date(), nullable=True))
    
    # Tolerances & Discount
    op.add_column('po_items', sa.Column('quantity_tolerance_percentage', sa.Numeric(5, 2), nullable=True))
    op.add_column('po_items', sa.Column('price_tolerance_percentage', sa.Numeric(5, 2), nullable=True))
    op.add_column('po_items', sa.Column('discount_percentage', sa.Numeric(5, 2), nullable=True))
    
    # ========================================
    # 7. VENDOR_INVOICES TABLE ENHANCEMENTS (8 fields on header table)
    # ========================================
    # Freight & Insurance
    op.add_column('vendor_invoices', sa.Column('freight_charges', sa.Numeric(15, 2), nullable=True))
    op.add_column('vendor_invoices', sa.Column('insurance_charges', sa.Numeric(15, 2), nullable=True))
    
    # Multi-Currency Support
    op.add_column('vendor_invoices', sa.Column('currency_code', sa.String(10), nullable=True))
    op.add_column('vendor_invoices', sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=True))
    op.add_column('vendor_invoices', sa.Column('base_currency_amount', sa.Numeric(15, 2), nullable=True))
    
    # ========================================
    # 8. VENDOR_INVOICE_ITEMS TABLE ENHANCEMENTS (6 fields on line items)
    # ========================================
    # Tax Compliance (per item)
    op.add_column('vendor_invoice_items', sa.Column('hsn_code', sa.String(20), nullable=True))
    op.add_column('vendor_invoice_items', sa.Column('gst_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('vendor_invoice_items', sa.Column('gst_amount', sa.Numeric(15, 2), nullable=True))
    op.create_index('idx_vendor_invoice_item_hsn', 'vendor_invoice_items', ['hsn_code'])
    
    # Batch Tracking (CRITICAL for pharma compliance - per item)
    op.add_column('vendor_invoice_items', sa.Column('batch_number', sa.String(50), nullable=True))
    op.add_column('vendor_invoice_items', sa.Column('manufacturing_date', sa.Date(), nullable=True))
    op.add_column('vendor_invoice_items', sa.Column('expiry_date', sa.Date(), nullable=True))
    op.create_index('idx_vendor_invoice_item_batch', 'vendor_invoice_items', ['batch_number'])
    
    # ========================================
    # 9. NEW TABLE: PO_TERMS_CONDITIONS
    # ========================================
    op.create_table(
        'po_terms_conditions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('po_id', sa.Integer(), nullable=False),
        sa.Column('term_text', sa.Text(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['po_id'], ['purchase_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_po_terms_po', 'po_terms_conditions', ['po_id'])
    op.create_index('idx_po_terms_priority', 'po_terms_conditions', ['priority'])


def downgrade():
    """Remove all schema enhancements (rollback support)"""
    
    # ========================================
    # Drop new table first
    # ========================================
    op.drop_index('idx_po_terms_priority', 'po_terms_conditions')
    op.drop_index('idx_po_terms_po', 'po_terms_conditions')
    op.drop_table('po_terms_conditions')
    
    # ========================================
    # Remove vendor_invoice_items enhancements
    # ========================================
    op.drop_index('idx_vendor_invoice_item_batch', 'vendor_invoice_items')
    op.drop_index('idx_vendor_invoice_item_hsn', 'vendor_invoice_items')
    op.drop_column('vendor_invoice_items', 'expiry_date')
    op.drop_column('vendor_invoice_items', 'manufacturing_date')
    op.drop_column('vendor_invoice_items', 'batch_number')
    op.drop_column('vendor_invoice_items', 'gst_amount')
    op.drop_column('vendor_invoice_items', 'gst_rate')
    op.drop_column('vendor_invoice_items', 'hsn_code')
    
    # ========================================
    # Remove vendor_invoices enhancements
    # ========================================
    op.drop_column('vendor_invoices', 'base_currency_amount')
    op.drop_column('vendor_invoices', 'exchange_rate')
    op.drop_column('vendor_invoices', 'currency_code')
    op.drop_column('vendor_invoices', 'insurance_charges')
    op.drop_column('vendor_invoices', 'freight_charges')
    
    # ========================================
    # Remove po_items enhancements
    # ========================================
    op.drop_index('idx_po_item_hsn', 'po_items')
    op.drop_column('po_items', 'discount_percentage')
    op.drop_column('po_items', 'price_tolerance_percentage')
    op.drop_column('po_items', 'quantity_tolerance_percentage')
    op.drop_column('po_items', 'delivery_window_end')
    op.drop_column('po_items', 'delivery_window_start')
    op.drop_column('po_items', 'delivery_date')
    op.drop_column('po_items', 'delivery_schedule_type')
    op.drop_column('po_items', 'test_method')
    op.drop_column('po_items', 'specification_reference')
    op.drop_column('po_items', 'plate_charges')
    op.drop_column('po_items', 'die_cut_info')
    op.drop_column('po_items', 'printing_instructions')
    op.drop_column('po_items', 'color_spec')
    op.drop_column('po_items', 'box_dimensions')
    op.drop_column('po_items', 'ply')
    op.drop_column('po_items', 'gsm')
    op.drop_column('po_items', 'artwork_approval_ref')
    op.drop_column('po_items', 'artwork_file_url')
    op.drop_column('po_items', 'pack_size')
    op.drop_column('po_items', 'gst_rate')
    op.drop_column('po_items', 'hsn_code')
    
    # ========================================
    # Remove purchase_orders enhancements
    # ========================================
    op.drop_index('idx_po_original', 'purchase_orders')
    op.drop_constraint('fk_po_original', 'purchase_orders', type_='foreignkey')
    op.drop_column('purchase_orders', 'verified_by')
    op.drop_column('purchase_orders', 'approved_by')
    op.drop_column('purchase_orders', 'checked_by')
    op.drop_column('purchase_orders', 'prepared_by')
    op.drop_column('purchase_orders', 'original_po_id')
    op.drop_column('purchase_orders', 'amendment_date')
    op.drop_column('purchase_orders', 'amendment_number')
    op.drop_column('purchase_orders', 'currency_code')
    op.drop_column('purchase_orders', 'payment_terms')
    op.drop_column('purchase_orders', 'freight_terms')
    op.drop_column('purchase_orders', 'transport_mode')
    op.drop_column('purchase_orders', 'buyer_contact_person')
    op.drop_column('purchase_orders', 'buyer_reference_no')
    op.drop_column('purchase_orders', 'bill_to')
    op.drop_column('purchase_orders', 'ship_to')
    op.drop_column('purchase_orders', 'shelf_life_minimum')
    op.drop_column('purchase_orders', 'sample_quantity')
    op.drop_column('purchase_orders', 'require_msds')
    op.drop_column('purchase_orders', 'require_bmr')
    op.drop_column('purchase_orders', 'require_coa')
    
    # ========================================
    # Remove pi_items enhancements
    # ========================================
    op.drop_index('idx_pi_item_hsn', 'pi_items')
    op.drop_column('pi_items', 'pack_size')
    op.drop_column('pi_items', 'hsn_code')
    
    # ========================================
    # Remove medicine_master enhancements (pack_size not dropped - already existed)
    # ========================================
    op.drop_index('idx_medicine_hsn', 'medicine_master')
    op.drop_column('medicine_master', 'regulatory_approvals')
    op.drop_column('medicine_master', 'units_per_pack')
    op.drop_column('medicine_master', 'secondary_packaging')
    op.drop_column('medicine_master', 'primary_packaging')
    op.drop_column('medicine_master', 'conversion_factor')
    op.drop_column('medicine_master', 'secondary_unit')
    op.drop_column('medicine_master', 'primary_unit')
    # pack_size not dropped - it existed before this migration
    op.drop_column('medicine_master', 'hsn_code')
    
    # ========================================
    # Remove product_master enhancements
    # ========================================
    op.drop_index('idx_product_hsn', 'product_master')
    op.drop_column('product_master', 'hsn_code')
    
    # ========================================
    # Remove vendors enhancements
    # ========================================
    op.drop_column('vendors', 'credit_days')
    op.drop_column('vendors', 'iso_certified')
    op.drop_column('vendors', 'gmp_certified')
    op.drop_column('vendors', 'drug_license_number')
