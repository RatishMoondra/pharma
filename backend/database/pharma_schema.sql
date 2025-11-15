--
-- PostgreSQL Database Schema for Pharma Procurement System
-- Updated: 2025-11-15 (Enhanced with HSN, GST, Packaging, Quality, Shipping fields)
-- 
-- This schema reflects the complete database structure including:
-- - User management with role-based access control
-- - Country master data
-- - Vendor management (PARTNER, RM, PM, MANUFACTURER) with regulatory fields
-- - Product and Medicine master data with HSN, pack size, packaging details
-- - PI (Proforma Invoice) workflow with HSN and pack size
-- - EOPA (PI-Item-Level) with vendor type selection
-- - Purchase Orders (RM/PM/FG) without pricing but with quality, shipping, approval metadata
-- - PO Items with HSN, GST, pack size, artwork, quality specs
-- - Vendor Invoices with fulfillment tracking, HSN, GST, batch tracking
-- - System Configuration with JSONB storage
-- - PO Terms & Conditions table
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS po_terms_conditions CASCADE;
DROP TABLE IF EXISTS vendor_invoice CASCADE;
DROP TABLE IF EXISTS po_item CASCADE;
DROP TABLE IF EXISTS purchase_order CASCADE;
DROP TABLE IF EXISTS eopa CASCADE;
DROP TABLE IF EXISTS pi_item CASCADE;
DROP TABLE IF EXISTS pi CASCADE;
DROP TABLE IF EXISTS medicine_master CASCADE;
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;
DROP TABLE IF EXISTS country_master CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_configuration CASCADE;
DROP TABLE IF EXISTS alembic_version CASCADE;

--
-- Table: users
-- Purpose: User authentication and role-based access control
--
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User authentication with RBAC (ADMIN, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER, ACCOUNTANT)';

--
-- Table: country_master
-- Purpose: Country reference data with currency
--
CREATE TABLE country_master (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    currency VARCHAR(3),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_country_code ON country_master(country_code);

COMMENT ON TABLE country_master IS 'Country master data for vendor mapping and currency defaults';

--
-- Table: vendor
-- Purpose: Vendor/supplier management with regulatory compliance fields
-- Enhanced: Added drug_license_number, GMP/ISO certification, credit terms
--
CREATE TABLE vendor (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50) NOT NULL CHECK (vendor_type IN ('PARTNER', 'RM', 'PM', 'MANUFACTURER')),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    country_id INTEGER REFERENCES country_master(id),
    
    -- Regulatory compliance (NEW)
    drug_license_number VARCHAR(100),
    gmp_certified BOOLEAN DEFAULT false,
    iso_certified BOOLEAN DEFAULT false,
    
    -- Payment terms (NEW)
    credit_days INTEGER DEFAULT 30,
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_code ON vendor(vendor_code);
CREATE INDEX idx_vendor_type ON vendor(vendor_type);
CREATE INDEX idx_vendor_country ON vendor(country_id);

COMMENT ON TABLE vendor IS 'Vendor master with 4 types: PARTNER (customer), RM, PM, MANUFACTURER';
COMMENT ON COLUMN vendor.drug_license_number IS 'Required for RM/PM/Manufacturer vendors in pharma';
COMMENT ON COLUMN vendor.credit_days IS 'Standard payment terms in days';

--
-- Table: product_master
-- Purpose: Product catalog with HSN code
-- Enhanced: Added hsn_code for tax compliance
--
CREATE TABLE product_master (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    
    -- Tax compliance (NEW)
    hsn_code VARCHAR(20),
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_code ON product_master(product_code);
CREATE INDEX idx_product_hsn ON product_master(hsn_code);

COMMENT ON TABLE product_master IS 'Product catalog for non-medicine items';
COMMENT ON COLUMN product_master.hsn_code IS 'HSN code for tax and customs';

--
-- Table: medicine_master
-- Purpose: Medicine catalog with vendor mappings, HSN, pack size, packaging details
-- Enhanced: Added hsn_code, pack_size, packaging details, unit standardization, regulatory approvals
--
CREATE TABLE medicine_master (
    id SERIAL PRIMARY KEY,
    medicine_code VARCHAR(50) UNIQUE NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Unit of measurement (NEW)
    primary_unit VARCHAR(20),
    secondary_unit VARCHAR(20),
    conversion_factor NUMERIC(10, 4),
    
    -- Tax compliance (NEW)
    hsn_code VARCHAR(20),
    
    -- Pack size (NEW)
    pack_size VARCHAR(50),
    
    -- Packaging details (NEW)
    primary_packaging VARCHAR(255),
    secondary_packaging VARCHAR(255),
    units_per_pack INTEGER,
    
    -- Regulatory (NEW)
    regulatory_approvals JSON,
    
    -- Vendor mappings (existing)
    manufacturer_vendor_id INTEGER REFERENCES vendor(id),
    rm_vendor_id INTEGER REFERENCES vendor(id),
    pm_vendor_id INTEGER REFERENCES vendor(id),
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medicine_code ON medicine_master(medicine_code);
CREATE INDEX idx_medicine_hsn ON medicine_master(hsn_code);
CREATE INDEX idx_medicine_manufacturer ON medicine_master(manufacturer_vendor_id);
CREATE INDEX idx_medicine_rm ON medicine_master(rm_vendor_id);
CREATE INDEX idx_medicine_pm ON medicine_master(pm_vendor_id);

COMMENT ON TABLE medicine_master IS 'Medicine catalog with vendor mappings (MANUFACTURER, RM, PM)';
COMMENT ON COLUMN medicine_master.hsn_code IS 'HSN code for tax and customs compliance';
COMMENT ON COLUMN medicine_master.pack_size IS 'Pack size (e.g., 10x10 blister, 100ml bottle)';
COMMENT ON COLUMN medicine_master.primary_packaging IS 'Primary packaging type (blister, bottle, strip, vial)';
COMMENT ON COLUMN medicine_master.secondary_packaging IS 'Secondary packaging (carton, box, shipper)';
COMMENT ON COLUMN medicine_master.conversion_factor IS 'Conversion between primary and secondary units (e.g., 1 kg = 1000 g)';
COMMENT ON COLUMN medicine_master.regulatory_approvals IS 'JSONB: USFDA, EMA, WHO, TGA approvals';

--
-- Table: pi (Proforma Invoice)
-- Purpose: Customer order workflow entry point
--
CREATE TABLE pi (
    id SERIAL PRIMARY KEY,
    pi_number VARCHAR(50) UNIQUE NOT NULL,
    pi_date DATE NOT NULL,
    partner_vendor_id INTEGER REFERENCES vendor(id) NOT NULL,
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pi_number ON pi(pi_number);
CREATE INDEX idx_pi_partner ON pi(partner_vendor_id);
CREATE INDEX idx_pi_date ON pi(pi_date);

COMMENT ON TABLE pi IS 'Proforma Invoice - starting point of procurement workflow';

--
-- Table: pi_item
-- Purpose: Line items for PI with pricing, HSN, pack size
-- Enhanced: Added hsn_code, pack_size
--
CREATE TABLE pi_item (
    id SERIAL PRIMARY KEY,
    pi_id INTEGER REFERENCES pi(id) ON DELETE CASCADE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2),
    total_price NUMERIC(15, 2),
    
    -- Tax compliance (NEW)
    hsn_code VARCHAR(20),
    
    -- Pack size (NEW)
    pack_size VARCHAR(50),
    
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pi_item_pi ON pi_item(pi_id);
CREATE INDEX idx_pi_item_medicine ON pi_item(medicine_id);
CREATE INDEX idx_pi_item_hsn ON pi_item(hsn_code);

COMMENT ON TABLE pi_item IS 'PI line items with pricing and pack size';
COMMENT ON COLUMN pi_item.hsn_code IS 'HSN code copied from medicine_master or overridden';
COMMENT ON COLUMN pi_item.pack_size IS 'Pack size for this PI item';

--
-- Table: eopa (Estimated Order & Price Approval)
-- Purpose: PI-Item-Level EOPA with vendor type selection
-- Architecture: Each PI Item can have up to 3 EOPAs (MANUFACTURER, RM, PM)
--
CREATE TABLE eopa (
    id SERIAL PRIMARY KEY,
    eopa_number VARCHAR(50) UNIQUE NOT NULL,
    pi_item_id INTEGER REFERENCES pi_item(id) ON DELETE CASCADE NOT NULL,
    vendor_type VARCHAR(50) NOT NULL CHECK (vendor_type IN ('MANUFACTURER', 'RM', 'PM')),
    vendor_id INTEGER REFERENCES vendor(id) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    estimated_unit_price NUMERIC(15, 2),
    estimated_total NUMERIC(15, 2),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approval_date DATE,
    approved_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_eopa_pi_item_vendor_type UNIQUE (pi_item_id, vendor_type)
);

CREATE INDEX idx_eopa_number ON eopa(eopa_number);
CREATE INDEX idx_eopa_pi_item ON eopa(pi_item_id);
CREATE INDEX idx_eopa_vendor_type ON eopa(vendor_type);
CREATE INDEX idx_eopa_vendor ON eopa(vendor_id);
CREATE INDEX idx_eopa_status ON eopa(status);

COMMENT ON TABLE eopa IS 'PI-Item-Level EOPA: Each PI Item can have max 3 EOPAs (one per vendor type)';
COMMENT ON CONSTRAINT uq_eopa_pi_item_vendor_type ON eopa IS 'Ensures only one EOPA per PI Item per vendor type';

--
-- Table: purchase_order
-- Purpose: Purchase Orders (RM/PM/FG) WITHOUT pricing
-- Pricing comes from vendor tax invoices
-- Enhanced: Added quality requirements, shipping/billing info, approval metadata, 
--           payment terms, amendment tracking, freight terms, currency
--
CREATE TABLE purchase_order (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    po_type VARCHAR(10) NOT NULL CHECK (po_type IN ('RM', 'PM', 'FG')),
    vendor_id INTEGER REFERENCES vendor(id),
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'CLOSED', 'CANCELLED')),
    remarks TEXT,
    
    -- Quality requirements (NEW)
    require_coa BOOLEAN DEFAULT false,
    require_bmr BOOLEAN DEFAULT false,
    require_msds BOOLEAN DEFAULT false,
    sample_quantity INTEGER,
    shelf_life_minimum INTEGER,
    
    -- Shipping & billing information (NEW)
    ship_to TEXT,
    bill_to TEXT,
    buyer_reference_no VARCHAR(100),
    buyer_contact_person VARCHAR(100),
    transport_mode VARCHAR(50),
    
    -- Freight terms (NEW)
    freight_terms VARCHAR(50),
    
    -- Payment terms (NEW)
    payment_terms VARCHAR(255),
    
    -- Currency support (NEW)
    currency_code VARCHAR(3) DEFAULT 'INR',
    
    -- Amendment tracking (NEW)
    amendment_number INTEGER DEFAULT 0,
    amendment_date DATE,
    original_po_id INTEGER REFERENCES purchase_order(id),
    
    -- Approval metadata (NEW)
    prepared_by INTEGER REFERENCES users(id),
    checked_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    verified_by INTEGER REFERENCES users(id),
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_number ON purchase_order(po_number);
CREATE INDEX idx_po_type ON purchase_order(po_type);
CREATE INDEX idx_po_vendor ON purchase_order(vendor_id);
CREATE INDEX idx_po_status ON purchase_order(status);
CREATE INDEX idx_po_date ON purchase_order(po_date);
CREATE INDEX idx_po_original ON purchase_order(original_po_id);

COMMENT ON TABLE purchase_order IS 'PO (RM/PM/FG) without pricing - pricing from vendor invoices';
COMMENT ON COLUMN purchase_order.require_coa IS 'Require Certificate of Analysis from vendor';
COMMENT ON COLUMN purchase_order.require_bmr IS 'Require Batch Manufacturing Record';
COMMENT ON COLUMN purchase_order.require_msds IS 'Require Material Safety Data Sheet';
COMMENT ON COLUMN purchase_order.freight_terms IS 'FOB, CIF, Ex-Works, DDP, etc.';
COMMENT ON COLUMN purchase_order.payment_terms IS 'e.g., "30 days from invoice date", "Advance 50%, Balance on delivery"';
COMMENT ON COLUMN purchase_order.amendment_number IS 'PO revision number (0 = original)';
COMMENT ON COLUMN purchase_order.original_po_id IS 'Reference to original PO if this is an amendment';

--
-- Table: po_item
-- Purpose: PO line items WITHOUT pricing (only quantities)
-- Enhanced: Added HSN, GST rate, pack size, artwork & packaging specs, 
--           quality specs, delivery schedule, tolerances, discounts
--
CREATE TABLE po_item (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_order(id) ON DELETE CASCADE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    ordered_quantity NUMERIC(15, 3) NOT NULL,
    fulfilled_quantity NUMERIC(15, 3) DEFAULT 0,
    unit VARCHAR(20),
    
    -- Tax compliance (NEW)
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2),
    
    -- Pack size (NEW)
    pack_size VARCHAR(50),
    
    -- Artwork & packaging specifications (NEW - for PM/Printing)
    language VARCHAR(10),
    artwork_version VARCHAR(20),
    artwork_file_url TEXT,
    artwork_approval_ref VARCHAR(100),
    gsm NUMERIC(10, 2),
    ply VARCHAR(20),
    box_dimensions VARCHAR(100),
    color_spec VARCHAR(255),
    printing_instructions TEXT,
    die_cut_info TEXT,
    plate_charges NUMERIC(15, 2),
    
    -- Quality specifications (NEW)
    specification_reference VARCHAR(100),
    test_method VARCHAR(255),
    
    -- Delivery schedule (NEW)
    delivery_schedule_type VARCHAR(50),
    delivery_date DATE,
    delivery_window_start DATE,
    delivery_window_end DATE,
    
    -- Tolerances (NEW)
    quantity_tolerance_percentage NUMERIC(5, 2),
    price_tolerance_percentage NUMERIC(5, 2),
    
    -- Discount (NEW)
    discount_percentage NUMERIC(5, 2),
    
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_item_po ON po_item(po_id);
CREATE INDEX idx_po_item_medicine ON po_item(medicine_id);
CREATE INDEX idx_po_item_hsn ON po_item(hsn_code);

COMMENT ON TABLE po_item IS 'PO line items without pricing - fulfillment driven by vendor invoices';
COMMENT ON COLUMN po_item.hsn_code IS 'HSN code copied from medicine_master for tax compliance';
COMMENT ON COLUMN po_item.gst_rate IS 'GST rate percentage (5%, 12%, 18%, 28%) - for reference only';
COMMENT ON COLUMN po_item.pack_size IS 'Pack size for this PO item';
COMMENT ON COLUMN po_item.language IS 'PM language (EN, FR, AR, SP, HI)';
COMMENT ON COLUMN po_item.artwork_version IS 'Artwork version (v1.0, v1.1, v2.0)';
COMMENT ON COLUMN po_item.gsm IS 'GSM for paper/cardboard (printing/PM)';
COMMENT ON COLUMN po_item.ply IS 'Ply count for corrugated boxes';
COMMENT ON COLUMN po_item.box_dimensions IS 'Dimensions (LxWxH in mm)';
COMMENT ON COLUMN po_item.color_spec IS 'Color specification (CMYK, Pantone codes)';
COMMENT ON COLUMN po_item.delivery_schedule_type IS 'Immediately, Within X days, Custom schedule';
COMMENT ON COLUMN po_item.quantity_tolerance_percentage IS 'Acceptable quantity variance (±5%, ±10%)';
COMMENT ON COLUMN po_item.specification_reference IS 'Reference to internal specification document';
COMMENT ON COLUMN po_item.test_method IS 'Testing standards (USP, BP, IP, Ph.Eur)';

--
-- Table: vendor_invoice
-- Purpose: Vendor tax invoices with pricing and fulfillment tracking
-- Updates PO fulfilled_quantity when invoice is created
-- Enhanced: Added HSN, GST fields, batch tracking, freight/insurance, currency support
--
CREATE TABLE vendor_invoice (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    po_id INTEGER REFERENCES purchase_order(id) NOT NULL,
    invoice_date DATE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    
    -- Quantity & pricing
    shipped_quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    
    -- Tax compliance (NEW)
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2),
    gst_amount NUMERIC(15, 2),
    
    tax_amount NUMERIC(15, 2),
    discount_amount NUMERIC(15, 2),
    
    -- Freight & insurance (NEW)
    freight_charges NUMERIC(15, 2),
    insurance_charges NUMERIC(15, 2),
    
    net_amount NUMERIC(15, 2),
    
    -- Currency support (NEW)
    currency_code VARCHAR(3) DEFAULT 'INR',
    exchange_rate NUMERIC(12, 6),
    base_currency_amount NUMERIC(15, 2),
    
    -- Batch tracking (NEW - critical for pharma)
    batch_number VARCHAR(100),
    manufacturing_date DATE,
    expiry_date DATE,
    
    payment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL')),
    payment_date DATE,
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_invoice_number ON vendor_invoice(invoice_number);
CREATE INDEX idx_vendor_invoice_po ON vendor_invoice(po_id);
CREATE INDEX idx_vendor_invoice_date ON vendor_invoice(invoice_date);
CREATE INDEX idx_vendor_invoice_payment_status ON vendor_invoice(payment_status);
CREATE INDEX idx_vendor_invoice_batch ON vendor_invoice(batch_number);
CREATE INDEX idx_vendor_invoice_hsn ON vendor_invoice(hsn_code);

COMMENT ON TABLE vendor_invoice IS 'Vendor tax invoices - source of truth for pricing and PO fulfillment';
COMMENT ON COLUMN vendor_invoice.hsn_code IS 'HSN code for tax compliance (must match PO item)';
COMMENT ON COLUMN vendor_invoice.gst_rate IS 'GST rate percentage applied';
COMMENT ON COLUMN vendor_invoice.gst_amount IS 'GST amount calculated';
COMMENT ON COLUMN vendor_invoice.batch_number IS 'Vendor batch/lot number for traceability';
COMMENT ON COLUMN vendor_invoice.manufacturing_date IS 'Manufacturing date of the batch';
COMMENT ON COLUMN vendor_invoice.expiry_date IS 'Expiry date of the batch';
COMMENT ON COLUMN vendor_invoice.exchange_rate IS 'Exchange rate if invoice is in foreign currency';
COMMENT ON COLUMN vendor_invoice.base_currency_amount IS 'Amount in base currency (INR) after conversion';

--
-- Table: po_terms_conditions
-- Purpose: Store PO Terms & Conditions (multi-line)
-- NEW table for managing T&Cs separately
--
CREATE TABLE po_terms_conditions (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_order(id) ON DELETE CASCADE NOT NULL,
    term_text TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_terms_po ON po_terms_conditions(po_id);
CREATE INDEX idx_po_terms_priority ON po_terms_conditions(priority);

COMMENT ON TABLE po_terms_conditions IS 'Purchase Order Terms & Conditions with priority ordering';
COMMENT ON COLUMN po_terms_conditions.priority IS 'Display order (1 = first, 2 = second, etc.)';

--
-- Table: system_configuration
-- Purpose: Store all system settings with JSONB for flexibility
-- Categories: system, workflow, numbering, vendor, email, security, ui, integration
--
CREATE TABLE system_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'workflow', 'numbering', 'vendor', 'email', 'security', 'ui', 'integration')),
    is_sensitive BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_key ON system_configuration(config_key);
CREATE INDEX idx_config_category ON system_configuration(category);

COMMENT ON TABLE system_configuration IS 'System configuration with JSONB storage - 42 configs across 8 categories';

--
-- Table: alembic_version
-- Purpose: Track database migrations
--
CREATE TABLE alembic_version (
    version_num VARCHAR(32) PRIMARY KEY
);

-- End of schema
