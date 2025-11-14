-- PHARMA WORKFLOW SEED DATA
-- Sample data for testing and development

-- ============================================================================
-- 1. INSERT USERS
-- ============================================================================
-- Password for all users: admin123 (hashed with bcrypt)
INSERT INTO users (username, email, hashed_password, full_name, role, is_active, created_at, updated_at)
VALUES 
    ('admin', 'admin@pharma.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'System Administrator', 'ADMIN', true, NOW(), NOW()),
    ('procurement_officer', 'procurement@pharma.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'John Procurement', 'PROCUREMENT_OFFICER', true, NOW(), NOW()),
    ('warehouse_mgr', 'warehouse@pharma.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'Sarah Warehouse', 'WAREHOUSE_MANAGER', true, NOW(), NOW()),
    ('accountant', 'accounts@pharma.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'Mike Accountant', 'ACCOUNTANT', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 2. INSERT VENDORS
-- ============================================================================
INSERT INTO vendors (vendor_code, vendor_name, vendor_type, contact_person, email, phone, address, gst_number, is_active, created_at, updated_at)
VALUES 
    ('VEN-PART-001', 'Global Pharma Partners Ltd', 'PARTNER', 'John Smith', 'partner@globalpharma.com', '+91-9999990001', '123 Commerce Street, Mumbai, Maharashtra 400001, India', '27AABCU9603R1ZM', true, NOW(), NOW()),
    ('VEN-RM-001', 'ChemSource Raw Materials Pvt Ltd', 'RM', 'Sarah Johnson', 'sales@chemsource.com', '+91-8888880001', '55 Industrial Zone, Pune, Maharashtra 411001, India', '27AABCR9603R1ZM', true, NOW(), NOW()),
    ('VEN-PM-001', 'Prime Packaging Solutions', 'PM', 'Mike Wilson', 'info@primepack.com', '+91-7777770001', 'Plot 22 Packaging Park, Delhi 110001, India', '27AABCP9603R1ZM', true, NOW(), NOW()),
    ('VEN-MFG-001', 'MediCure Manufacturing Co', 'MANUFACTURER', 'Dr. Amit Patel', 'contact@medicure.com', '+91-6666660001', 'Sector 14 Biotech Hub, Hyderabad, Telangana 500001, India', '27AABCM9603R1ZM', true, NOW(), NOW()),
    ('VEN-PART-002', 'HealthCare Distributors', 'PARTNER', 'Emily Davis', 'emily@healthcare.com', '+91-5555550001', '78 Medical Plaza, Bangalore, Karnataka 560001, India', '29AABHC9603R1ZV', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

-- ============================================================================
-- 3. INSERT PRODUCT MASTER
-- ============================================================================
INSERT INTO product_master (product_code, product_name, description, unit_of_measure, is_active, created_at, updated_at)
VALUES 
    ('PROD-001', 'Paracetamol', 'Pain relief and fever reduction medication', 'TABLET', true, NOW(), NOW()),
    ('PROD-002', 'Amoxicillin', 'Antibiotic for bacterial infections', 'CAPSULE', true, NOW(), NOW()),
    ('PROD-003', 'Ibuprofen', 'Non-steroidal anti-inflammatory drug', 'TABLET', true, NOW(), NOW()),
    ('PROD-004', 'Cetirizine', 'Antihistamine for allergy relief', 'TABLET', true, NOW(), NOW()),
    ('PROD-005', 'Omeprazole', 'Proton pump inhibitor for acid reflux', 'CAPSULE', true, NOW(), NOW())
ON CONFLICT (product_code) DO NOTHING;

-- ============================================================================
-- 4. INSERT MEDICINE MASTER
-- ============================================================================
INSERT INTO medicine_master (medicine_code, medicine_name, product_id, composition, dosage_form, strength, pack_size, manufacturer_vendor_id, rm_vendor_id, pm_vendor_id, is_active, created_at, updated_at)
VALUES 
    ('MED-001', 'Paracetamol 500mg Tablets', 
        (SELECT id FROM product_master WHERE product_code = 'PROD-001'), 
        'Paracetamol IP 500mg',
        'Tablet', '500mg', '10x10',
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        true, NOW(), NOW()),
    
    ('MED-002', 'Amoxicillin 250mg Capsules', 
        (SELECT id FROM product_master WHERE product_code = 'PROD-002'), 
        'Amoxicillin Trihydrate IP equivalent to Amoxicillin 250mg',
        'Capsule', '250mg', '10x10',
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        true, NOW(), NOW()),
    
    ('MED-003', 'Ibuprofen 400mg Tablets', 
        (SELECT id FROM product_master WHERE product_code = 'PROD-003'), 
        'Ibuprofen IP 400mg',
        'Tablet', '400mg', '10x15',
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        true, NOW(), NOW()),
    
    ('MED-004', 'Cetirizine 10mg Tablets', 
        (SELECT id FROM product_master WHERE product_code = 'PROD-004'), 
        'Cetirizine Dihydrochloride IP 10mg',
        'Tablet', '10mg', '10x10',
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        true, NOW(), NOW()),
    
    ('MED-005', 'Omeprazole 20mg Capsules', 
        (SELECT id FROM product_master WHERE product_code = 'PROD-005'), 
        'Omeprazole IP 20mg',
        'Capsule', '20mg', '10x10',
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        true, NOW(), NOW())
ON CONFLICT (medicine_code) DO NOTHING;

-- ============================================================================
-- 5. INSERT PROFORMA INVOICES (PI)
-- ============================================================================
INSERT INTO pi (pi_number, pi_date, partner_vendor_id, total_amount, currency, remarks, created_by, created_at, updated_at)
VALUES 
    ('PI/24-25/0001', '2024-11-01', 
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PART-001'), 
        2450.00, 'INR', 'First order for Q4 2024', 
        (SELECT id FROM users WHERE username = 'admin'), 
        NOW(), NOW()),
    
    ('PI/24-25/0002', '2024-11-15', 
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PART-002'), 
        3800.00, 'INR', 'Bulk order for winter season', 
        (SELECT id FROM users WHERE username = 'procurement_officer'), 
        NOW(), NOW())
ON CONFLICT (pi_number) DO NOTHING;

-- ============================================================================
-- 6. INSERT PI ITEMS
-- ============================================================================
INSERT INTO pi_items (pi_id, medicine_id, quantity, unit_price, total_price, created_at)
VALUES 
    -- PI/24-25/0001 items
    ((SELECT id FROM pi WHERE pi_number = 'PI/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
     1000, 1.20, 1200.00, NOW()),
    
    ((SELECT id FROM pi WHERE pi_number = 'PI/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-002'),
     500, 2.50, 1250.00, NOW()),
    
    -- PI/24-25/0002 items
    ((SELECT id FROM pi WHERE pi_number = 'PI/24-25/0002'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-003'),
     800, 2.00, 1600.00, NOW()),
    
    ((SELECT id FROM pi WHERE pi_number = 'PI/24-25/0002'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-004'),
     1000, 1.50, 1500.00, NOW()),
    
    ((SELECT id FROM pi WHERE pi_number = 'PI/24-25/0002'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-005'),
     500, 1.40, 700.00, NOW());

-- ============================================================================
-- 7. INSERT EOPA (Estimated Order & Price Approval)
-- ============================================================================
INSERT INTO eopa (eopa_number, eopa_date, pi_id, status, total_amount, remarks, approved_by, approved_at, created_by, created_at, updated_at)
VALUES 
    ('EOPA/24-25/0001', '2024-11-05', 
        (SELECT id FROM pi WHERE pi_number = 'PI/24-25/0001'),
        'APPROVED', 2450.00, 'Approved for PO generation', 
        (SELECT id FROM users WHERE username = 'admin'),
        '2024-11-06 10:30:00',
        (SELECT id FROM users WHERE username = 'procurement_officer'),
        NOW(), NOW())
ON CONFLICT (pi_id) DO NOTHING;

-- ============================================================================
-- 8. INSERT EOPA ITEMS
-- ============================================================================
INSERT INTO eopa_items (eopa_id, medicine_id, quantity, unit_price, total_price, created_at)
VALUES 
    ((SELECT id FROM eopa WHERE eopa_number = 'EOPA/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
     1000, 1.20, 1200.00, NOW()),
    
    ((SELECT id FROM eopa WHERE eopa_number = 'EOPA/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-002'),
     500, 2.50, 1250.00, NOW());

-- ============================================================================
-- 9. INSERT PURCHASE ORDERS
-- ============================================================================
INSERT INTO purchase_orders (po_number, po_date, po_type, eopa_id, vendor_id, status, total_amount, delivery_date, remarks, created_by, created_at, updated_at)
VALUES 
    -- RM Purchase Order
    ('PO/RM/24-25/0001', '2024-11-10', 'RM',
        (SELECT id FROM eopa WHERE eopa_number = 'EOPA/24-25/0001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-RM-001'),
        'OPEN', 1200.00, '2024-11-25', 'Raw materials for Paracetamol production',
        (SELECT id FROM users WHERE username = 'procurement_officer'),
        NOW(), NOW()),
    
    -- PM Purchase Order
    ('PO/PM/24-25/0001', '2024-11-10', 'PM',
        (SELECT id FROM eopa WHERE eopa_number = 'EOPA/24-25/0001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-PM-001'),
        'OPEN', 800.00, '2024-11-25', 'Packaging materials for medicines',
        (SELECT id FROM users WHERE username = 'procurement_officer'),
        NOW(), NOW()),
    
    -- FG Purchase Order
    ('PO/FG/24-25/0001', '2024-11-10', 'FG',
        (SELECT id FROM eopa WHERE eopa_number = 'EOPA/24-25/0001'),
        (SELECT id FROM vendors WHERE vendor_code = 'VEN-MFG-001'),
        'OPEN', 2450.00, '2024-12-01', 'Finished goods delivery',
        (SELECT id FROM users WHERE username = 'procurement_officer'),
        NOW(), NOW())
ON CONFLICT (po_number) DO NOTHING;

-- ============================================================================
-- 10. INSERT PO ITEMS
-- ============================================================================
INSERT INTO po_items (po_id, medicine_id, quantity, unit_price, total_price, received_quantity, created_at)
VALUES 
    -- RM PO items
    ((SELECT id FROM purchase_orders WHERE po_number = 'PO/RM/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
     1000, 1.20, 1200.00, 0, NOW()),
    
    -- PM PO items
    ((SELECT id FROM purchase_orders WHERE po_number = 'PO/PM/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
     1000, 0.80, 800.00, 0, NOW()),
    
    -- FG PO items
    ((SELECT id FROM purchase_orders WHERE po_number = 'PO/FG/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
     1000, 1.20, 1200.00, 0, NOW()),
    
    ((SELECT id FROM purchase_orders WHERE po_number = 'PO/FG/24-25/0001'),
     (SELECT id FROM medicine_master WHERE medicine_code = 'MED-002'),
     500, 2.50, 1250.00, 0, NOW());

-- ============================================================================
-- 11. INSERT MATERIAL RECEIPTS (Sample)
-- ============================================================================
INSERT INTO material_receipts (receipt_number, receipt_date, po_id, medicine_id, quantity_received, batch_number, remarks, received_by, created_at)
VALUES 
    ('MR/24-25/0001', '2024-11-20',
        (SELECT id FROM purchase_orders WHERE po_number = 'PO/RM/24-25/0001'),
        (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
        1000, 'BATCH-RM-001', 'All materials received in good condition',
        (SELECT id FROM users WHERE username = 'warehouse_mgr'),
        NOW())
ON CONFLICT (receipt_number) DO NOTHING;

-- ============================================================================
-- 12. INSERT MATERIAL BALANCE (Sample)
-- ============================================================================
INSERT INTO material_balance (medicine_id, available_quantity, last_updated)
VALUES 
    ((SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'), 1000, NOW()),
    ((SELECT id FROM medicine_master WHERE medicine_code = 'MED-002'), 500, NOW()),
    ((SELECT id FROM medicine_master WHERE medicine_code = 'MED-003'), 300, NOW())
ON CONFLICT (medicine_id) DO NOTHING;

-- ============================================================================
-- 13. INSERT DISPATCH ADVICE (Sample)
-- ============================================================================
INSERT INTO dispatch_advice (dispatch_number, dispatch_date, medicine_id, quantity_dispatched, destination, remarks, dispatched_by, created_at)
VALUES 
    ('DA/24-25/0001', '2024-12-01',
        (SELECT id FROM medicine_master WHERE medicine_code = 'MED-001'),
        1000, 'Central Warehouse, Mumbai', 'Dispatched via Premium Logistics',
        (SELECT id FROM users WHERE username = 'warehouse_mgr'),
        NOW())
ON CONFLICT (dispatch_number) DO NOTHING;

-- ============================================================================
-- 14. INSERT WAREHOUSE GRN (Sample)
-- ============================================================================
INSERT INTO warehouse_grn (grn_number, grn_date, dispatch_advice_id, quantity_received, remarks, received_by, created_at)
VALUES 
    ('GRN/24-25/0001', '2024-12-03',
        (SELECT id FROM dispatch_advice WHERE dispatch_number = 'DA/24-25/0001'),
        1000, 'All items received and verified. No damages.',
        (SELECT id FROM users WHERE username = 'warehouse_mgr'),
        NOW())
ON CONFLICT (grn_number) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Comment these out when running the actual seed)
-- ============================================================================
-- SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
-- UNION ALL
-- SELECT 'Vendors', COUNT(*) FROM vendors
-- UNION ALL
-- SELECT 'Products', COUNT(*) FROM product_master
-- UNION ALL
-- SELECT 'Medicines', COUNT(*) FROM medicine_master
-- UNION ALL
-- SELECT 'PIs', COUNT(*) FROM pi
-- UNION ALL
-- SELECT 'PI Items', COUNT(*) FROM pi_items
-- UNION ALL
-- SELECT 'EOPAs', COUNT(*) FROM eopa
-- UNION ALL
-- SELECT 'EOPA Items', COUNT(*) FROM eopa_items
-- UNION ALL
-- SELECT 'Purchase Orders', COUNT(*) FROM purchase_orders
-- UNION ALL
-- SELECT 'PO Items', COUNT(*) FROM po_items
-- UNION ALL
-- SELECT 'Material Receipts', COUNT(*) FROM material_receipts
-- UNION ALL
-- SELECT 'Material Balance', COUNT(*) FROM material_balance
-- UNION ALL
-- SELECT 'Dispatch Advice', COUNT(*) FROM dispatch_advice
-- UNION ALL
-- SELECT 'Warehouse GRN', COUNT(*) FROM warehouse_grn;
