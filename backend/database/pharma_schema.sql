--
-- PostgreSQL Database Schema for Pharma Procurement System
-- Updated: 2025-11-15
-- 
-- This schema reflects the complete database structure including:
-- - User management with role-based access control
-- - Country master data
-- - Vendor management (PARTNER, RM, PM, MANUFACTURER)
-- - Product and Medicine master data with vendor mappings
-- - PI (Proforma Invoice) workflow
-- - EOPA (PI-Item-Level) with vendor type selection
-- - Purchase Orders (RM/PM/FG) without pricing
-- - Vendor Invoices with fulfillment tracking
-- - System Configuration with JSONB storage
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

--
-- Table: country_master
-- Purpose: Country reference data
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

--
-- Table: vendor
-- Purpose: Vendor/supplier management with country linkage
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
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_code ON vendor(vendor_code);
CREATE INDEX idx_vendor_type ON vendor(vendor_type);
CREATE INDEX idx_vendor_country ON vendor(country_id);

--
-- Table: product_master
-- Purpose: Product catalog
--
CREATE TABLE product_master (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_code ON product_master(product_code);

--
-- Table: medicine_master
-- Purpose: Medicine catalog with vendor mappings for manufacturer, RM, PM
--
CREATE TABLE medicine_master (
    id SERIAL PRIMARY KEY,
    medicine_code VARCHAR(50) UNIQUE NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    manufacturer_vendor_id INTEGER REFERENCES vendor(id),
    rm_vendor_id INTEGER REFERENCES vendor(id),
    pm_vendor_id INTEGER REFERENCES vendor(id),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medicine_code ON medicine_master(medicine_code);
CREATE INDEX idx_medicine_manufacturer ON medicine_master(manufacturer_vendor_id);
CREATE INDEX idx_medicine_rm ON medicine_master(rm_vendor_id);
CREATE INDEX idx_medicine_pm ON medicine_master(pm_vendor_id);

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

--
-- Table: pi_item
-- Purpose: Line items for PI with pricing
--
CREATE TABLE pi_item (
    id SERIAL PRIMARY KEY,
    pi_id INTEGER REFERENCES pi(id) ON DELETE CASCADE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2),
    total_price NUMERIC(15, 2),
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pi_item_pi ON pi_item(pi_id);
CREATE INDEX idx_pi_item_medicine ON pi_item(medicine_id);

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

--
-- Table: purchase_order
-- Purpose: Purchase Orders (RM/PM/FG) WITHOUT pricing
-- Pricing comes from vendor tax invoices
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
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_number ON purchase_order(po_number);
CREATE INDEX idx_po_type ON purchase_order(po_type);
CREATE INDEX idx_po_vendor ON purchase_order(vendor_id);
CREATE INDEX idx_po_status ON purchase_order(status);
CREATE INDEX idx_po_date ON purchase_order(po_date);

--
-- Table: po_item
-- Purpose: PO line items WITHOUT pricing (only quantities)
--
CREATE TABLE po_item (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_order(id) ON DELETE CASCADE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    ordered_quantity NUMERIC(15, 3) NOT NULL,
    fulfilled_quantity NUMERIC(15, 3) DEFAULT 0,
    unit VARCHAR(20),
    language VARCHAR(10),
    artwork_version VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_item_po ON po_item(po_id);
CREATE INDEX idx_po_item_medicine ON po_item(medicine_id);

--
-- Table: vendor_invoice
-- Purpose: Vendor tax invoices with pricing and fulfillment tracking
-- Updates PO fulfilled_quantity when invoice is created
--
CREATE TABLE vendor_invoice (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    po_id INTEGER REFERENCES purchase_order(id) NOT NULL,
    invoice_date DATE NOT NULL,
    medicine_id INTEGER REFERENCES medicine_master(id) NOT NULL,
    shipped_quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2),
    discount_amount NUMERIC(15, 2),
    net_amount NUMERIC(15, 2),
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

--
-- Table: alembic_version
-- Purpose: Track database migrations
--
CREATE TABLE alembic_version (
    version_num VARCHAR(32) PRIMARY KEY
);

-- End of schema
