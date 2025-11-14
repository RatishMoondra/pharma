-- PHARMA WORKFLOW DATABASE SCHEMA
-- Database: pharma_db
-- This schema matches the actual PostgreSQL database created by Alembic migrations

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS warehouse_grn CASCADE;
DROP TABLE IF EXISTS dispatch_advice CASCADE;
DROP TABLE IF EXISTS material_receipts CASCADE;
DROP TABLE IF EXISTS material_balance CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS eopa_items CASCADE;
DROP TABLE IF EXISTS eopa CASCADE;
DROP TABLE IF EXISTS pi_items CASCADE;
DROP TABLE IF EXISTS pi CASCADE;
DROP TABLE IF EXISTS medicine_master CASCADE;
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS vendortype CASCADE;
DROP TYPE IF EXISTS potype CASCADE;
DROP TYPE IF EXISTS postatus CASCADE;
DROP TYPE IF EXISTS eopastatus CASCADE;

-- Create custom enum types
CREATE TYPE userrole AS ENUM ('ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT');
CREATE TYPE vendortype AS ENUM ('PARTNER', 'RM', 'PM', 'MANUFACTURER');
CREATE TYPE potype AS ENUM ('RM', 'PM', 'FG');
CREATE TYPE postatus AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE eopastatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role userrole NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_type vendortype NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRODUCT MASTER TABLE
-- ============================================================================
CREATE TABLE product_master (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) DEFAULT 'UNIT' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MEDICINE MASTER TABLE (Links Product to Vendor)
-- ============================================================================
CREATE TABLE medicine_master (
    id SERIAL PRIMARY KEY,
    medicine_code VARCHAR(50) UNIQUE NOT NULL,
    medicine_name VARCHAR(200) NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(id),
    vendor_id INT NOT NULL REFERENCES vendors(id),
    strength VARCHAR(50),
    dosage_form VARCHAR(50),
    pack_size VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PI (PROFORMA INVOICE) TABLE
-- ============================================================================
CREATE TABLE pi (
    id SERIAL PRIMARY KEY,
    pi_number VARCHAR(50) UNIQUE NOT NULL,
    pi_date DATE NOT NULL,
    partner_vendor_id INT NOT NULL REFERENCES vendors(id),
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    remarks TEXT,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PI ITEMS TABLE
-- ============================================================================
CREATE TABLE pi_items (
    id SERIAL PRIMARY KEY,
    pi_id INT NOT NULL REFERENCES pi(id) ON DELETE CASCADE,
    medicine_id INT NOT NULL REFERENCES medicine_master(id),
    quantity NUMERIC(15,3) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EOPA (ESTIMATED ORDER & PRICE APPROVAL) TABLE
-- ============================================================================
CREATE TABLE eopa (
    id SERIAL PRIMARY KEY,
    eopa_number VARCHAR(50) UNIQUE NOT NULL,
    eopa_date DATE NOT NULL,
    pi_id INT NOT NULL UNIQUE REFERENCES pi(id),
    status eopastatus NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EOPA ITEMS TABLE
-- ============================================================================
CREATE TABLE eopa_items (
    id SERIAL PRIMARY KEY,
    eopa_id INT NOT NULL REFERENCES eopa(id) ON DELETE CASCADE,
    medicine_id INT NOT NULL REFERENCES medicine_master(id),
    quantity NUMERIC(15,3) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PURCHASE ORDERS TABLE (RM/PM/FG)
-- ============================================================================
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    po_type potype NOT NULL,
    eopa_id INT NOT NULL REFERENCES eopa(id),
    vendor_id INT NOT NULL REFERENCES vendors(id),
    status postatus NOT NULL DEFAULT 'OPEN',
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    delivery_date DATE,
    remarks TEXT,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PURCHASE ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    medicine_id INT NOT NULL REFERENCES medicine_master(id),
    quantity NUMERIC(15,3) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    received_quantity NUMERIC(15,3) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MATERIAL RECEIPTS TABLE
-- ============================================================================
CREATE TABLE material_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    po_id INT NOT NULL REFERENCES purchase_orders(id),
    medicine_id INT NOT NULL REFERENCES medicine_master(id),
    quantity_received NUMERIC(15,3) NOT NULL,
    batch_number VARCHAR(50),
    remarks TEXT,
    received_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MATERIAL BALANCE TABLE (Inventory at Warehouse)
-- ============================================================================
CREATE TABLE material_balance (
    id SERIAL PRIMARY KEY,
    medicine_id INT NOT NULL UNIQUE REFERENCES medicine_master(id),
    available_quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DISPATCH ADVICE TABLE (From Manufacturer/Vendor)
-- ============================================================================
CREATE TABLE dispatch_advice (
    id SERIAL PRIMARY KEY,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    dispatch_date DATE NOT NULL,
    medicine_id INT NOT NULL REFERENCES medicine_master(id),
    quantity_dispatched NUMERIC(15,3) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    remarks TEXT,
    dispatched_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WAREHOUSE GRN (GOODS RECEIPT NOTE) TABLE
-- ============================================================================
CREATE TABLE warehouse_grn (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    grn_date DATE NOT NULL,
    dispatch_advice_id INT NOT NULL REFERENCES dispatch_advice(id),
    quantity_received NUMERIC(15,3) NOT NULL,
    remarks TEXT,
    received_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_active ON vendors(is_active);

CREATE INDEX idx_product_master_code ON product_master(product_code);
CREATE INDEX idx_product_master_active ON product_master(is_active);

CREATE INDEX idx_medicine_master_code ON medicine_master(medicine_code);
CREATE INDEX idx_medicine_master_product ON medicine_master(product_id);
CREATE INDEX idx_medicine_master_vendor ON medicine_master(vendor_id);
CREATE INDEX idx_medicine_master_active ON medicine_master(is_active);

CREATE INDEX idx_pi_number ON pi(pi_number);
CREATE INDEX idx_pi_partner_vendor ON pi(partner_vendor_id);
CREATE INDEX idx_pi_created_by ON pi(created_by);
CREATE INDEX idx_pi_date ON pi(pi_date);

CREATE INDEX idx_pi_items_pi ON pi_items(pi_id);
CREATE INDEX idx_pi_items_medicine ON pi_items(medicine_id);

CREATE INDEX idx_eopa_number ON eopa(eopa_number);
CREATE INDEX idx_eopa_pi ON eopa(pi_id);
CREATE INDEX idx_eopa_status ON eopa(status);
CREATE INDEX idx_eopa_created_by ON eopa(created_by);

CREATE INDEX idx_eopa_items_eopa ON eopa_items(eopa_id);
CREATE INDEX idx_eopa_items_medicine ON eopa_items(medicine_id);

CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_eopa ON purchase_orders(eopa_id);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_type ON purchase_orders(po_type);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_created_by ON purchase_orders(created_by);

CREATE INDEX idx_po_items_po ON po_items(po_id);
CREATE INDEX idx_po_items_medicine ON po_items(medicine_id);

CREATE INDEX idx_material_receipts_number ON material_receipts(receipt_number);
CREATE INDEX idx_material_receipts_po ON material_receipts(po_id);
CREATE INDEX idx_material_receipts_medicine ON material_receipts(medicine_id);
CREATE INDEX idx_material_receipts_date ON material_receipts(receipt_date);

CREATE INDEX idx_material_balance_medicine ON material_balance(medicine_id);

CREATE INDEX idx_dispatch_advice_number ON dispatch_advice(dispatch_number);
CREATE INDEX idx_dispatch_advice_medicine ON dispatch_advice(medicine_id);
CREATE INDEX idx_dispatch_advice_date ON dispatch_advice(dispatch_date);

CREATE INDEX idx_warehouse_grn_number ON warehouse_grn(grn_number);
CREATE INDEX idx_warehouse_grn_dispatch ON warehouse_grn(dispatch_advice_id);
CREATE INDEX idx_warehouse_grn_date ON warehouse_grn(grn_date);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE vendors IS 'Vendors: PARTNER, RM (Raw Material), PM (Packing Material), MANUFACTURER';
COMMENT ON TABLE product_master IS 'Generic product catalog';
COMMENT ON TABLE medicine_master IS 'Specific medicines mapped to products and vendors';
COMMENT ON TABLE pi IS 'Proforma Invoices from partner vendors';
COMMENT ON TABLE eopa IS 'Estimated Order & Price Approval - links PI to POs';
COMMENT ON TABLE purchase_orders IS 'Purchase Orders branched into RM/PM/FG types';
COMMENT ON TABLE material_receipts IS 'Material receipts against purchase orders';
COMMENT ON TABLE material_balance IS 'Real-time inventory balance';
COMMENT ON TABLE dispatch_advice IS 'Dispatch notifications from vendors/manufacturers';
COMMENT ON TABLE warehouse_grn IS 'Goods Receipt Notes at warehouse';
