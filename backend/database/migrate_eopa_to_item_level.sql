-- Migration: Restructure EOPA to work at PI item level
-- Date: 2025-11-15
-- Description: Change EOPA from PI-level to PI-item-level with vendor-specific EOPAs

-- Step 1: Drop existing EOPA tables (if they have data, backup first!)
DROP TABLE IF EXISTS eopa_items CASCADE;
DROP TABLE IF EXISTS eopa CASCADE;

-- Step 2: Create new EOPA table structure (one EOPA per PI item per vendor type)
CREATE TABLE eopa (
    id SERIAL PRIMARY KEY,
    eopa_number VARCHAR(50) UNIQUE NOT NULL,
    eopa_date DATE NOT NULL,
    pi_item_id INTEGER NOT NULL REFERENCES pi_items(id) ON DELETE CASCADE,
    vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('MANUFACTURER', 'RM', 'PM')),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    quantity NUMERIC(15, 3) NOT NULL,
    estimated_unit_price NUMERIC(15, 2) NOT NULL,
    estimated_total NUMERIC(15, 2) NOT NULL,
    remarks TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes
CREATE INDEX idx_eopa_pi_item_id ON eopa(pi_item_id);
CREATE INDEX idx_eopa_vendor_id ON eopa(vendor_id);
CREATE INDEX idx_eopa_vendor_type ON eopa(vendor_type);
CREATE INDEX idx_eopa_status ON eopa(status);
CREATE INDEX idx_eopa_number ON eopa(eopa_number);

-- Step 4: Add unique constraint to prevent duplicate EOPAs for same PI item + vendor type
CREATE UNIQUE INDEX idx_eopa_pi_item_vendor_type ON eopa(pi_item_id, vendor_type);

-- Step 5: Add comment
COMMENT ON TABLE eopa IS 'Estimated Order & Price Approval - One EOPA per PI item per vendor type (MANUFACTURER, RM, PM)';
COMMENT ON COLUMN eopa.vendor_type IS 'Type of vendor: MANUFACTURER (finished goods), RM (raw materials), PM (packing materials)';
COMMENT ON COLUMN eopa.estimated_total IS 'Calculated as quantity * estimated_unit_price';
