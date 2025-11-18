--
-- PostgreSQL Database Schema for Pharma Procurement System
-- Auto-generated from actual pharma_db database: 2025-11-18
--
-- This schema reflects the ACTUAL running PostgreSQL database structure
-- Use this as the source of truth for all test fixtures and migrations
--

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: countries
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) UNIQUE NOT NULL,
    language VARCHAR(50) NOT NULL,
    currency VARCHAR(3),
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: vendors
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_type VARCHAR(50) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(15),
    country_id INTEGER NOT NULL REFERENCES countries(id),
    drug_license_number VARCHAR(100),
    gmp_certified BOOLEAN DEFAULT FALSE,
    iso_certified BOOLEAN DEFAULT FALSE,
    credit_days INTEGER,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: product_master
CREATE TABLE product_master (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL,
    hsn_code VARCHAR(20),
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: medicine_master
CREATE TABLE medicine_master (
    id SERIAL PRIMARY KEY,
    medicine_code VARCHAR(50) UNIQUE NOT NULL,
    medicine_name VARCHAR(200) NOT NULL,
    product_id INTEGER NOT NULL REFERENCES product_master(id),
    strength VARCHAR(50),
    dosage_form VARCHAR(50) NOT NULL,
    pack_size VARCHAR(50),
    composition TEXT,
    manufacturer_vendor_id INTEGER REFERENCES vendors(id),
    rm_vendor_id INTEGER REFERENCES vendors(id),
    pm_vendor_id INTEGER REFERENCES vendors(id),
    hsn_code VARCHAR(20),
    primary_unit VARCHAR(50),
    secondary_unit VARCHAR(50),
    conversion_factor NUMERIC(10, 4),
    primary_packaging VARCHAR(100),
    secondary_packaging VARCHAR(100),
    units_per_pack INTEGER,
    regulatory_approvals JSONB,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: pi
CREATE TABLE pi (
    id SERIAL PRIMARY KEY,
    pi_number VARCHAR(50) UNIQUE NOT NULL,
    pi_date DATE NOT NULL,
    partner_vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    country_id INTEGER NOT NULL REFERENCES countries(id),
    total_amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    remarks TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: pi_items
CREATE TABLE pi_items (
    id SERIAL PRIMARY KEY,
    pi_id INTEGER NOT NULL REFERENCES pi(id),
    medicine_id INTEGER NOT NULL REFERENCES medicine_master(id),
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    hsn_code VARCHAR(20),
    pack_size VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: eopa (PI-level)
CREATE TABLE eopa (
    id SERIAL PRIMARY KEY,
    eopa_number VARCHAR(50) UNIQUE NOT NULL,
    eopa_date DATE NOT NULL,
    pi_id INTEGER NOT NULL REFERENCES pi(id),
    status VARCHAR(20) DEFAULT 'PENDING',
    remarks TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: eopa_items (EOPA line items with vendor selection)
CREATE TABLE eopa_items (
    id SERIAL PRIMARY KEY,
    eopa_id INTEGER NOT NULL REFERENCES eopa(id) ON DELETE CASCADE,
    pi_item_id INTEGER NOT NULL REFERENCES pi_items(id),
    quantity NUMERIC(15, 3) NOT NULL,
    estimated_unit_price NUMERIC(15, 2) NOT NULL,
    estimated_total NUMERIC(15, 2) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: purchase_orders
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    po_type VARCHAR(10) NOT NULL,
    eopa_id INTEGER NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    status VARCHAR(20) NOT NULL,
    delivery_date DATE,
    remarks TEXT,
    total_ordered_qty NUMERIC(15, 3) DEFAULT 0 NOT NULL,
    total_fulfilled_qty NUMERIC(15, 3) DEFAULT 0 NOT NULL,
    require_coa BOOLEAN DEFAULT FALSE,
    require_bmr BOOLEAN DEFAULT FALSE,
    require_msds BOOLEAN DEFAULT FALSE,
    sample_quantity NUMERIC(10, 2),
    shelf_life_minimum INTEGER,
    ship_to TEXT,
    bill_to TEXT,
    buyer_reference_no VARCHAR(100),
    buyer_contact_person VARCHAR(200),
    transport_mode VARCHAR(50),
    freight_terms VARCHAR(100),
    payment_terms TEXT,
    currency_code VARCHAR(10),
    amendment_number INTEGER DEFAULT 0,
    amendment_date DATE,
    original_po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    prepared_by VARCHAR(200),
    checked_by VARCHAR(200),
    approved_by VARCHAR(200),
    verified_by VARCHAR(200),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: po_items
CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
    medicine_id INTEGER NOT NULL REFERENCES medicine_master(id),
    ordered_quantity NUMERIC(15, 3) NOT NULL,
    fulfilled_quantity NUMERIC(15, 3) DEFAULT 0 NOT NULL,
    unit VARCHAR(50),
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2),
    pack_size VARCHAR(100),
    language VARCHAR(50),
    artwork_version VARCHAR(50),
    artwork_file_url VARCHAR(500),
    artwork_approval_ref VARCHAR(100),
    gsm NUMERIC(8, 2),
    ply INTEGER,
    box_dimensions VARCHAR(100),
    color_spec VARCHAR(200),
    printing_instructions TEXT,
    die_cut_info VARCHAR(200),
    plate_charges NUMERIC(15, 2),
    specification_reference VARCHAR(100),
    test_method VARCHAR(100),
    delivery_schedule_type VARCHAR(50),
    delivery_date DATE,
    delivery_window_start DATE,
    delivery_window_end DATE,
    quantity_tolerance_percentage NUMERIC(5, 2),
    price_tolerance_percentage NUMERIC(5, 2),
    discount_percentage NUMERIC(5, 2),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: vendor_invoices
CREATE TABLE vendor_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_type VARCHAR(20) NOT NULL,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    subtotal NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    remarks TEXT,
    received_by INTEGER NOT NULL REFERENCES users(id),
    received_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    dispatch_note_number VARCHAR(100),
    dispatch_date DATE,
    warehouse_location VARCHAR(200),
    warehouse_received_by VARCHAR(100),
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2),
    gst_amount NUMERIC(15, 2),
    freight_charges NUMERIC(15, 2),
    insurance_charges NUMERIC(15, 2),
    currency_code VARCHAR(10),
    exchange_rate NUMERIC(15, 6),
    base_currency_amount NUMERIC(15, 2),
    batch_number VARCHAR(100),
    manufacturing_date DATE,
    expiry_date DATE
);

-- Table: vendor_invoice_items
CREATE TABLE vendor_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES vendor_invoices(id),
    medicine_id INTEGER NOT NULL REFERENCES medicine_master(id),
    shipped_quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    manufacturing_date DATE,
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2),
    gst_amount NUMERIC(15, 2),
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: po_terms_conditions
CREATE TABLE po_terms_conditions (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    term_text TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: system_configuration
CREATE TABLE system_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_sensitive BOOLEAN NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: material_balance
CREATE TABLE material_balance (
    id SERIAL PRIMARY KEY,
    medicine_id INTEGER UNIQUE NOT NULL REFERENCES medicine_master(id),
    available_quantity NUMERIC(15, 3) NOT NULL,
    last_updated TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: material_receipts
CREATE TABLE material_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
    medicine_id INTEGER NOT NULL REFERENCES medicine_master(id),
    quantity_received NUMERIC(15, 3) NOT NULL,
    batch_number VARCHAR(50),
    remarks TEXT,
    received_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: dispatch_advice
CREATE TABLE dispatch_advice (
    id SERIAL PRIMARY KEY,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    dispatch_date DATE NOT NULL,
    medicine_id INTEGER NOT NULL REFERENCES medicine_master(id),
    quantity_dispatched NUMERIC(15, 3) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    remarks TEXT,
    dispatched_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Table: warehouse_grn
CREATE TABLE warehouse_grn (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    grn_date DATE NOT NULL,
    dispatch_advice_id INTEGER NOT NULL REFERENCES dispatch_advice(id),
    quantity_received NUMERIC(15, 3) NOT NULL,
    remarks TEXT,
    received_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);
