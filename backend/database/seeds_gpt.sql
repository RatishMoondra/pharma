-- seeds_full_demo.sql
-- Full demo dataset (Option C) for PharmaFlow 360
-- Run AFTER pharma_schema.sql applied


BEGIN;

-- =============================
-- 1. FULL CLEANUP & IDENTITY RESET
-- =============================
-- Order: child tables first, parent tables last

-- Transactional tables
TRUNCATE TABLE material_balance RESTART IDENTITY CASCADE;
TRUNCATE TABLE material_receipts RESTART IDENTITY CASCADE;
TRUNCATE TABLE vendor_invoice_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE vendor_invoices RESTART IDENTITY CASCADE;
TRUNCATE TABLE po_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE purchase_orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE eopa_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE eopa RESTART IDENTITY CASCADE;
TRUNCATE TABLE pi_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE pi RESTART IDENTITY CASCADE;
TRUNCATE TABLE medicine_raw_materials RESTART IDENTITY CASCADE;
TRUNCATE TABLE medicine_packing_materials RESTART IDENTITY CASCADE;
TRUNCATE TABLE partner_vendor_medicines RESTART IDENTITY CASCADE;
TRUNCATE TABLE warehouse_grn RESTART IDENTITY CASCADE;
TRUNCATE TABLE dispatch_advice RESTART IDENTITY CASCADE;

-- Master tables
TRUNCATE TABLE medicine_master RESTART IDENTITY CASCADE;
TRUNCATE TABLE raw_material_master RESTART IDENTITY CASCADE;
TRUNCATE TABLE packing_material_master RESTART IDENTITY CASCADE;
TRUNCATE TABLE vendors RESTART IDENTITY CASCADE;
TRUNCATE TABLE countries RESTART IDENTITY CASCADE;
TRUNCATE TABLE product_master RESTART IDENTITY CASCADE;
TRUNCATE TABLE terms_conditions_master RESTART IDENTITY CASCADE;
TRUNCATE TABLE vendor_terms_conditions RESTART IDENTITY CASCADE;

-- Set deterministic timestamps
SET LOCAL TIME ZONE 'UTC';

-- 1) Countries (10)

-- =============================
-- 2. MASTER DATA INSERTS
-- =============================

INSERT INTO countries (id, country_code, country_name, language, currency, is_active, created_at, updated_at)
VALUES
(1, 'IND', 'India', 'English / Hindi', 'INR', true, NOW(), NOW()),
(2, 'KEN', 'Kenya', 'English / Swahili', 'KES', true, NOW(), NOW()),
(3, 'NGA', 'Nigeria', 'English', 'NGN', true, NOW(), NOW()),
(4, 'GHA', 'Ghana', 'English', 'GHS', true, NOW(), NOW()),
(5, 'ETH', 'Ethiopia', 'Amharic', 'ETB', true, NOW(), NOW()),
(6, 'UGA', 'Uganda', 'English / Swahili', 'UGX', true, NOW(), NOW()),
(7, 'TZA', 'Tanzania', 'Swahili / English', 'TZS', true, NOW(), NOW()),
(8, 'RWA', 'Rwanda', 'Kinyarwanda / English / French', 'RWF', true, NOW(), NOW()),
(9, 'ZAF', 'South Africa', 'English / Afrikaans / Zulu', 'ZAR', true, NOW(), NOW()),
(10, 'EGY', 'Egypt', 'Arabic', 'EGP', true, NOW(), NOW()),
(11, 'SEN', 'Senegal', 'French', 'XOF', true, NOW(), NOW()),
(12, 'DZA', 'Algeria', 'Arabic / Berber', 'DZD', true, NOW(), NOW());


-- Users (from live pharma_db)
INSERT INTO users (username, hashed_password, email, full_name, role, is_active, created_at, updated_at)
VALUES
('admin', '$2b$12$tGhEkPm1MQGEp.iOxZ7/t.czo.MKaWmxLbFrshSDDBosI3YGFpO5C', 'admin@pharma.com', 'Admin User', 'ADMIN', TRUE, '2025-11-14 17:31:42.294899', NOW()),
('procurement_officer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'procurement@pharma.com', 'Procurement Officer', 'PROCUREMENT_OFFICER', TRUE, '2025-11-14 23:38:23.273786', NOW()),
('warehouse_mgr', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'warehouse@pharma.com', 'Warehouse Manager', 'WAREHOUSE_MANAGER', TRUE, '2025-11-14 23:38:23.273786', NOW()),
('accountant', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eX7dK.8pWu8W', 'accounts@pharma.com', 'Accountant', 'ACCOUNTANT', TRUE, '2025-11-14 23:38:23.273786', NOW());


-- -- 2) Users (5)
-- INSERT INTO users (username, hashed_password, email, role, is_active, created_at)
-- VALUES
-- ('admin','<demohash>','admin@pharmaflow.local','ADMIN', true, now()),
-- ('proc_officer','<demohash>','proc@pharmaflow.local','PROCUREMENT_OFFICER', true, now()),
-- ('wh_manager','<demohash>','wh@pharmaflow.local','WAREHOUSE_MANAGER', true, now()),
-- ('accountant','<demohash>','acct@pharmaflow.local','ACCOUNTANT', true, now()),
-- ('qa_user','<demohash>','qa@pharmaflow.local','PROCUREMENT_OFFICER', true, now());

-- 3) Vendors (20 = 5 PARTNER,5 RM,5 PM,5 MANUFACTURER)
-- We'll insert specific vendor_codes matching your earlier pattern

-- Vendors
INSERT INTO vendors (vendor_code, vendor_name, vendor_type, contact_person, email, phone, address, country_id, gmp_certified, iso_certified, is_active, created_at, updated_at)
VALUES
('VEN-PART-001','HealthCare Distributors Ltd','PARTNER','Ajay','hcdistributor1@example.com','+91-987650001','Mumbai, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PART-002','AfricMedic Tradex','PARTNER','Amina','africmed@example.com','+233-201000002','Accra, Ghana', (SELECT id FROM countries WHERE country_code='GHA'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PART-003','Kenya Health Supplies','PARTNER','Kamau','kenyasup@example.com','+254-700300003','Nairobi, Kenya', (SELECT id FROM countries WHERE country_code='KEN'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PART-004','Sahara Pharm Traders','PARTNER','Fatou','saharatrade@example.com','+221-770400004','Dakar, Senegal', (SELECT id FROM countries WHERE country_code='SEN'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PART-005','Ethiopia Medical Importers','PARTNER','Bekele','ethioimport@example.com','+251-911500005','Addis Ababa, Ethiopia', (SELECT id FROM countries WHERE country_code='ETH'), TRUE, TRUE, TRUE, now(), now()),

('VEN-RM-001','ChemSource Raw Materials Pvt Ltd','RM','Ramesh','rm1@example.com','+91-220110001','Vadodara, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-RM-002','SynthLabs Ltd','RM','Meena','rmlabs2@example.com','+91-220110002','Ahmedabad, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-RM-003','Global RM Corp','RM','John','rmglobal3@example.com','+44-208110003','London, UK', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-RM-004','AfriChem Supplies','RM','Kofi','africhem@example.com','+233-201110004','Accra, Ghana', (SELECT id FROM countries WHERE country_code='GHA'), TRUE, TRUE, TRUE, now(), now()),
('VEN-RM-005','Nile Raw Materials','RM','Lillian','nileraw@example.com','+256-700110005','Kampala, Uganda', (SELECT id FROM countries WHERE country_code='UGA'), TRUE, TRUE, TRUE, now(), now()),

('VEN-PM-001','Prime Packaging Solutions','PM','Shalini','pm1@example.com','+91-330110001','Pune, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PM-002','PackWorld Africa','PM','Okechukwu','pmafrica2@example.com','+254-700110002','Nairobi, Kenya', (SELECT id FROM countries WHERE country_code='KEN'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PM-003','LabelPrint Co','PM','Suresh','labelprint3@example.com','+91-330110003','Delhi, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PM-004','EuroPack Ltd','PM','Claire','europack@example.com','+33-140110004','Paris, France', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-PM-005','AfriLabel Solutions','PM','Mensah','afrilabel@example.com','+233-201110005','Accra, Ghana', (SELECT id FROM countries WHERE country_code='GHA'), TRUE, TRUE, TRUE, now(), now()),

('VEN-MFG-001','MediCure Manufacturing Co','MANUFACTURER','Patel','mfg1@example.com','+91-440110001','Ahmedabad, India', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-MFG-002','GlobalPharm Contract Mfg','MANUFACTURER','Linda','mfg2@example.com','+44-208110002','London, UK', (SELECT id FROM countries WHERE country_code='IND'), TRUE, TRUE, TRUE, now(), now()),
('VEN-MFG-003','AfricHealth Mfg','MANUFACTURER','Diallo','mfg3@example.com','+221-770110003','Dakar, Senegal', (SELECT id FROM countries WHERE country_code='SEN'), TRUE, TRUE, TRUE, now(), now()),
('VEN-MFG-004','Kenya Pharma Works','MANUFACTURER','Wanjiru','mfg4@example.com','+254-700110004','Nairobi, Kenya', (SELECT id FROM countries WHERE country_code='KEN'), TRUE, TRUE, TRUE, now(), now()),
('VEN-MFG-005','Ethiopia Pharma Labs','MANUFACTURER','Solomon','mfg5@example.com','+251-911110005','Addis Ababa, Ethiopia', (SELECT id FROM countries WHERE country_code='ETH'), TRUE, TRUE, TRUE, now(), now());


-- Product master
INSERT INTO product_master (product_code, product_name, description, unit_of_measure, is_active, created_at, updated_at)
VALUES
('PRD-001','Antibiotics Range','Antibiotics family','box', true, now(), now()),
('PRD-002','Analgesics Range','Pain-relief family','box', true, now(), now()),
('PRD-003','Antipyretics Range','Fever & supportive','box', true, now(), now());




-- 5) Medicine master (10)
INSERT INTO medicine_master (medicine_code, medicine_name, product_id, strength, dosage_form, pack_size, is_active, created_at, updated_at, manufacturer_vendor_id, rm_vendor_id, pm_vendor_id, hsn_code, primary_unit, units_per_pack)
VALUES
('MED-001','Amoxicillin 250mg Capsules', 1, '250mg','Capsule','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-001'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-001'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-001'), 'HSN0101','strip',100),
('MED-002','Paracetamol 500mg Tablets', 2, '500mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-002'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-002'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-002'), 'HSN0102','strip',100),
('MED-003','Ciprofloxacin 250mg Tablets', 1, '250mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-001'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-003'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-003'), 'HSN0103','strip',100),
('MED-004','Metronidazole 200mg Tablets', 1, '200mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-004'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-004'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-004'), 'HSN0104','strip',100),
('MED-005','Azithromycin 250mg Tablets', 1, '250mg','Tablet','6x5', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-002'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-001'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-005'), 'HSN0105','strip',30),
('MED-006','Ibuprofen 200mg Tablets', 2, '200mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-003'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-005'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-001'), 'HSN0106','strip',100),
('MED-007','Metformin 500mg Tablets', 3, '500mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-005'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-002'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-002'), 'HSN0107','strip',100),
('MED-008','Amlodipine 5mg Tablets', 3, '5mg','Tablet','10x10', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-001'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-003'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-003'), 'HSN0108','strip',100),
('MED-009','Cough Syrup 100ml', 2, '100ml','Syrup','100ml', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-004'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-004'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-004'), 'HSN0109','bottle',1),
('MED-010','Antipyretic Syrup 100ml', 2, '100ml','Syrup','100ml', true, now(), now(), (SELECT id FROM vendors WHERE vendor_code='VEN-MFG-005'), (SELECT id FROM vendors WHERE vendor_code='VEN-RM-005'), (SELECT id FROM vendors WHERE vendor_code='VEN-PM-005'), 'HSN0110','bottle',1);

INSERT INTO terms_conditions_master (term_text, category, priority, is_active, created_at, updated_at)
VALUES
-- GENERAL TERMS
('This Purchase Order must be acknowledged within 24 hours of receipt.', 'GENERAL', 1, TRUE, NOW(), NOW()),
('All supplies must strictly adhere to the specifications mentioned in the PO.', 'GENERAL', 2, TRUE, NOW(), NOW()),
('No deviation in material quality, specifications, or artwork is permitted without written approval.', 'GENERAL', 3, TRUE, NOW(), NOW()),
('Vendor must supply the material from approved manufacturing sites only.', 'GENERAL', 4, TRUE, NOW(), NOW()),
('Partial delivery must be communicated in advance for approval.', 'GENERAL', 5, TRUE, NOW(), NOW()),

-- QUALITY / GMP
('All materials must comply with applicable GMP and regulatory requirements.', 'QUALITY', 6, TRUE, NOW(), NOW()),
('Raw materials must be accompanied by a Certificate of Analysis (COA).', 'QUALITY', 7, TRUE, NOW(), NOW()),
('COA must match the batch supplied; retrospective COAs are not acceptable.', 'QUALITY', 8, TRUE, NOW(), NOW()),
('Packing materials must be as per approved artwork and die-line specifications.', 'QUALITY', 9, TRUE, NOW(), NOW()),
('Vendor must maintain proper traceability of raw material lots/batches used.', 'QUALITY', 10, TRUE, NOW(), NOW()),
('Vendor should notify any OOS or OOT before dispatch.', 'QUALITY', 11, TRUE, NOW(), NOW()),
('Any quality complaints must be addressed within 48 hours of intimation.', 'QUALITY', 12, TRUE, NOW(), NOW()),

-- RAW MATERIAL
('Raw materials must be packed in tamper-proof containers.', 'RAW_MATERIAL', 13, TRUE, NOW(), NOW()),
('Raw materials must be supplied with purity, assay, moisture content, and impurity profile.', 'RAW_MATERIAL', 14, TRUE, NOW(), NOW()),
('Material must have a minimum 80% shelf life remaining at the time of supply.', 'RAW_MATERIAL', 15, TRUE, NOW(), NOW()),
('Any deviation in pack size must be pre-approved.', 'RAW_MATERIAL', 16, TRUE, NOW(), NOW()),

-- PACKING MATERIAL / PRINTING MATERIAL
('Packing material must match the approved artwork version exactly.', 'PACKING_MATERIAL', 17, TRUE, NOW(), NOW()),
('Printing color, GSM, shade, and dimensions must meet approved standards.', 'PACKING_MATERIAL', 18, TRUE, NOW(), NOW()),
('No overprinting or part-printing is permitted without written approval.', 'PACKING_MATERIAL', 19, TRUE, NOW(), NOW()),
('Vendor must submit shade cards, proofs, or samples for approval when required.', 'PACKING_MATERIAL', 20, TRUE, NOW(), NOW()),
('Language-specific printing must strictly follow approved text.', 'PACKING_MATERIAL', 21, TRUE, NOW(), NOW()),
('Packing materials must be free from smudging, misalignment, or ink bleeding.', 'PACKING_MATERIAL', 22, TRUE, NOW(), NOW()),

-- FINISHED GOODS (FG MANUFACTURING)
('Manufacturing must use only approved raw and packing materials.', 'FINISHED_GOODS', 23, TRUE, NOW(), NOW()),
('Manufacturer must follow approved BMR/BPR for each batch.', 'FINISHED_GOODS', 24, TRUE, NOW(), NOW()),
('Stability data must be maintained for the manufactured batch.', 'FINISHED_GOODS', 25, TRUE, NOW(), NOW()),
('Batch production records must be shared within 2 working days of completion.', 'FINISHED_GOODS', 26, TRUE, NOW(), NOW()),
('Shelf life must comply with export market regulatory requirements.', 'FINISHED_GOODS', 27, TRUE, NOW(), NOW()),

-- DELIVERY & LOGISTICS
('Delivery must be made within the timeline committed in the PO.', 'DELIVERY', 28, TRUE, NOW(), NOW()),
('Advance dispatch intimation must be provided 48 hours prior.', 'DELIVERY', 29, TRUE, NOW(), NOW()),
('PO number, batch number, and item code must be mentioned on invoice & packing list.', 'DELIVERY', 30, TRUE, NOW(), NOW()),
('Damaged or short-supplied items will be rejected and replaced at no extra cost.', 'DELIVERY', 31, TRUE, NOW(), NOW()),
('Freight charges apply as per agreed Incoterms (FOB/CIF/Ex-Works).', 'DELIVERY', 32, TRUE, NOW(), NOW()),

-- PAYMENT
('Payment will be released only after verification of quality and quantity.', 'PAYMENT', 33, TRUE, NOW(), NOW()),
('Original invoice, COA, and delivery challan are mandatory for payment processing.', 'PAYMENT', 34, TRUE, NOW(), NOW()),
('Penalties may apply for delayed delivery beyond agreed timelines.', 'PAYMENT', 35, TRUE, NOW(), NOW()),
('TDS or statutory deductions may apply as per applicable laws.', 'PAYMENT', 36, TRUE, NOW(), NOW()),

-- LEGAL / COMPLIANCE
('Vendor must maintain confidentiality of product specifications and artwork.', 'LEGAL', 37, TRUE, NOW(), NOW()),
('Any breach of confidentiality may result in immediate contract termination.', 'LEGAL', 38, TRUE, NOW(), NOW()),
('All disputes are subject to the jurisdiction of the company’s registered location.', 'LEGAL', 39, TRUE, NOW(), NOW()),
('Company reserves the right to cancel the PO for justified reasons.', 'LEGAL', 40, TRUE, NOW(), NOW()),

-- EXPORT-SPECIFIC
('All documents must comply with export requirements of the destination country.', 'EXPORT', 41, TRUE, NOW(), NOW()),
('Wrong, incomplete, or missing documents may lead to rejection or penalties.', 'EXPORT', 42, TRUE, NOW(), NOW()),
('Vendor must provide MSDS for hazardous materials, if applicable.', 'EXPORT', 43, TRUE, NOW(), NOW()),
('Proper export packaging norms must be followed.', 'EXPORT', 44, TRUE, NOW(), NOW()),

-- COMPANY-SPECIFIC
('GST number must be mentioned on all invoices.', 'COMPANY', 45, TRUE, NOW(), NOW()),
('Price validity must be maintained for the agreed contract period.', 'COMPANY', 46, TRUE, NOW(), NOW()),
('Any statutory tax changes must be communicated immediately.', 'COMPANY', 47, TRUE, NOW(), NOW()),
('Vendor must inform about planned maintenance shutdowns in advance.', 'COMPANY', 48, TRUE, NOW(), NOW()),
('No price escalation will be accepted without written approval.', 'COMPANY', 49, TRUE, NOW(), NOW());

-- Raw material master
INSERT INTO raw_material_master (rm_code, rm_name, description, category, unit_of_measure, standard_purity, hsn_code, gst_rate, default_vendor_id, is_active, created_at, updated_at)
SELECT
  'RM-' || LPAD(i::text,3,'0'),
  'Raw Material ' || i,
  'API or excipient ' || i,
  CASE WHEN (i % 3)=0 THEN 'API' WHEN (i % 3)=1 THEN 'Excipient' ELSE 'Solvent' END,
  'kg',
  (95.0 + (i % 5)),
  'HSN-RM' || LPAD((1000+i)::text,4,'0'),
  CASE WHEN (i % 3)=0 THEN 18.0 WHEN (i % 3)=1 THEN 12.0 ELSE 5.0 END,
  (SELECT id FROM vendors WHERE vendor_type='RM' ORDER BY id OFFSET ((i-1)%5) LIMIT 1),
  true,
  now(),
  now()
FROM generate_series(1,40) AS s(i);


-- Packing material master
INSERT INTO packing_material_master (pm_code, pm_name, description, pm_type, language, artwork_version, unit_of_measure, hsn_code, gst_rate, default_vendor_id, is_active, created_at, updated_at)
SELECT
  'PM-' || LPAD(i::text,3,'0'),
  'Packing Material ' || i,
  'Packing material description ' || i,
  CASE WHEN (i % 4)=0 THEN 'Carton' WHEN (i % 4)=1 THEN 'Label' WHEN (i % 4)=2 THEN 'Bottle' ELSE 'Foil' END,
  CASE WHEN (i % 3)=0 THEN 'English' WHEN (i % 3)=1 THEN 'French' ELSE 'Bilingual' END,
  'ART-' || i,
  CASE WHEN (i % 3)=0 THEN 'box' ELSE 'piece' END,
  'HSN-PM' || LPAD((2000+i)::text,4,'0'),
  CASE WHEN (i % 3)=0 THEN 12.0 WHEN (i % 3)=1 THEN 18.0 ELSE 5.0 END,
  (SELECT id FROM vendors WHERE vendor_type='PM' ORDER BY id OFFSET ((i-1)%5) LIMIT 1),
  true,
  now(),
  now()
FROM generate_series(1,40) AS s(i);


-- 8) medicine_raw_materials links: generate 200 links (allow duplicates across medicines)


WITH rm_vendor_list AS (
    SELECT id FROM vendors WHERE vendor_type = 'RM' ORDER BY id
),
-- Randomly pick 1–3 RM for each medicine
selected_rms AS (
    SELECT 
        m.id AS medicine_id,
        rm.id AS raw_material_id,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY random()) AS rn
    FROM medicine_master m
    CROSS JOIN raw_material_master rm
    WHERE m.is_active = true
)
INSERT INTO medicine_raw_materials (
    medicine_id, raw_material_id, vendor_id, qty_required_per_unit, uom,
    purity_required, hsn_code, gst_rate, is_critical, lead_time_days,
    wastage_percentage, is_active, created_at, updated_at, rm_role
)
SELECT
    s.medicine_id,
    s.raw_material_id,
    (SELECT id FROM rm_vendor_list ORDER BY random() LIMIT 1) AS vendor_id,
    round((0.05 + random() * 0.15)::numeric, 4) AS qty_required_per_unit,
    'kg',
    round((97 + random()*2)::numeric, 2) AS purity_required,
    'HSN-RM' || LPAD((1000 + s.raw_material_id)::text, 4, '0'),
    (ARRAY[5,12,18])[1 + floor(random()*3)]::numeric AS gst_rate,
    (random() < 0.15) AS is_critical,
    (5 + floor(random()*10))::integer AS lead_time_days,
    round((random()*5)::numeric, 2) AS wastage_percentage,
    true,
    now(),
    now(),
    'RAW_MATERIAL'
FROM selected_rms s
WHERE s.rn <= (1 + floor(random()*3))   -- random between 1 and 3 RMs per medicine
ORDER BY medicine_id, raw_material_id;


-- 9) medicine_packing_materials links: generate 200 links


WITH pm_vendor_list AS (
    SELECT id FROM vendors WHERE vendor_type = 'PM' ORDER BY id
),
-- Randomly determine packing materials per medicine
selected_pms AS (
    SELECT 
        m.id AS medicine_id,
        pm.id AS packing_material_id,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY random()) AS rn
    FROM medicine_master m
    CROSS JOIN packing_material_master pm
    WHERE m.is_active = true
)
INSERT INTO medicine_packing_materials (
    medicine_id, packing_material_id, vendor_id, qty_required_per_unit, uom,
    artwork_override, language_override, artwork_version_override,
    hsn_code, gst_rate, pm_role, is_critical, lead_time_days,
    wastage_percentage, is_active, created_at, updated_at
)
SELECT
    s.medicine_id,
    s.packing_material_id,
    (SELECT id FROM pm_vendor_list ORDER BY random() LIMIT 1) AS vendor_id,
    round((1 + random()*2)::numeric, 4) AS qty_required_per_unit,        -- 1 to 3 units
    (CASE WHEN random() > 0.5 THEN 'piece' ELSE 'box' END),
    'ART_OVERRIDE_PM_' || s.packing_material_id,
    (CASE 
        WHEN random() < 0.2 THEN 'French'
        WHEN random() < 0.4 THEN 'Arabic'
        ELSE 'English'
     END) AS language_override,
    'ARTV-' || LPAD((1 + floor(random()*10))::text, 2, '0'),
    'HSN-PM' || LPAD((2000 + s.packing_material_id)::text, 4, '0'),
    (ARRAY[5,12,18])[1 + floor(random()*3)]::numeric AS gst_rate,
    'PM_PACKING_ROLE',
    (random() < 0.1) AS is_critical,                       -- 10% are critical
    (3 + floor(random() * 12))::int AS lead_time_days,     -- 3–15 days
    round((random()*4)::numeric, 2) AS wastage_percentage, -- 0–4%
    true,
    now(),
    now()
FROM selected_pms s
WHERE s.rn <= (1 + floor(random()*4))  -- each medicine gets 1–4 PM
ORDER BY medicine_id, packing_material_id;

-- 10) partner_vendor_medicines: assign medicines to PARTNER vendors (subset)


WITH partner_list AS (
    SELECT id FROM vendors WHERE vendor_type='PARTNER' ORDER BY id
),
medicine_list AS (
    SELECT id FROM medicine_master ORDER BY id
),
assignments AS (
    SELECT 
        p.id AS partner_id,
        m.id AS medicine_id,
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY random()) AS rn
    FROM partner_list p
    CROSS JOIN medicine_list m
)
INSERT INTO partner_vendor_medicines (vendor_id, medicine_id, notes, created_at, updated_at)
SELECT
    partner_id,
    medicine_id,
    'Assigned to partner vendor',
    now(),
    now()
FROM assignments
WHERE rn <= (3 + floor(random()*2))   -- each partner gets 3 or 4 medicines
ORDER BY partner_id, medicine_id;


-- 11) terms_conditions_master: 100 terms
-- select * from terms_conditions_master

-- INSERT INTO terms_conditions_master (term_text, category, priority, is_active, created_at, updated_at)
-- SELECT
--   'Term ' || i || ': Generic T&C ' || i,
--   CASE WHEN (i % 3)=0 THEN 'PAYMENT' WHEN (i % 3)=1 THEN 'DELIVERY' ELSE 'GENERAL' END,
--   (i % 10) + 1,
--   true,
--   now(),
--   now()
-- FROM generate_series(1,100) AS s(i);

-- 12) vendor_terms_conditions: random assignment of some terms to vendors



INSERT INTO vendor_terms_conditions (vendor_id, term_id, priority_override, notes, created_at, updated_at)
SELECT 
    v.id AS vendor_id,
    t.id AS term_id,
    ((v.id + t.id) % 5) + 1 AS priority_override,
    'Vendor-specific override',
    now(),
    now()
FROM vendors v
JOIN terms_conditions_master t 
    ON t.id BETWEEN 4 AND 52          -- ONLY allow terms 4 → 52
   AND ((v.id + t.id) % 7 = 0);       -- Random-ish assignment rule


-- 13) PI (20) with PI items (1..4 items per PI)

INSERT INTO pi (pi_number, pi_date, partner_vendor_id, total_amount, currency, remarks, created_by, created_at, updated_at, country_id, status)
SELECT
  'PI/24-' || to_char(now(),'YY') || '/' || LPAD(i::text,4,'0'),
  CURRENT_DATE - (20 - i),
  (SELECT id FROM vendors WHERE vendor_type='PARTNER' ORDER BY id OFFSET ((i-1) % (SELECT count(*) FROM vendors WHERE vendor_type='PARTNER')) LIMIT 1),
  0, -- compute later
  'USD',
  'Demo PI ' || i,
  (SELECT id FROM users ORDER BY id LIMIT 1),
  now(),
  now(),
  (SELECT id FROM countries ORDER BY id LIMIT 1),
  'PENDING'
FROM generate_series(1,20) AS s(i);
-- Clear existing PI items
DELETE FROM pi_items CASCADE;
TRUNCATE TABLE pi_items RESTART IDENTITY CASCADE;

WITH med AS (
    SELECT id FROM medicine_master ORDER BY id
),
pi_med_assign AS (
    SELECT 
        p.id AS pi_id,
        m.id AS medicine_id,
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY random()) AS rn
    FROM pi p
    CROSS JOIN med m
)
INSERT INTO pi_items (
    pi_id, medicine_id, quantity, unit_price, total_price,
    created_at, hsn_code, pack_size
)
SELECT 
    pi_id,
    medicine_id,
    qty,
    price,
    qty * price AS total_price,
    now(),
    hsn_code,
    pack_size
FROM (
    SELECT 
        a.pi_id,
        a.medicine_id,
        (10 + (a.rn * 5))::numeric(15,3) AS qty,
        (0.5 + (a.rn * 0.75))::numeric(15,2) AS price,
        (SELECT hsn_code FROM medicine_master WHERE id = a.medicine_id),
        (SELECT pack_size FROM medicine_master WHERE id = a.medicine_id)
    FROM pi_med_assign a
    WHERE rn <= (1 + (random() * 3)::int)   -- each PI gets 1..4 medicines
) AS final;


-- update PI totals
UPDATE pi
SET total_amount = COALESCE( (SELECT SUM(total_price) FROM pi_items WHERE pi_items.pi_id = pi.id), 0);

-- -- 14) EOPA: create 20 EOPAs derived from some PI items
-- INSERT INTO eopa (eopa_number, eopa_date, pi_id, status, remarks, approved_by, approved_at, created_by, created_at, updated_at)
-- SELECT
--   'EOPA/' || to_char(now(),'YY') || '/' || LPAD(nextval('eopa_new_id_seq')::text,4,'0'),
--   CURRENT_DATE,
--   pi_item.pi_id,
--   'PENDING',
--   'Auto EOPA from PI item ' || pi_item.id,
--   NULL, NULL,
--   (SELECT id FROM users ORDER BY id LIMIT 1),
--   now(),
--   now()
-- FROM pi_item
-- WHERE (pi_item.id % 3) = 0
-- LIMIT 20;

-- -- eopa_items: for each new eopa, create eopa_items based on its pi_items (quantity same as PI item)
-- INSERT INTO eopa_items (eopa_id, pi_item_id, quantity, estimated_unit_price, estimated_total, created_by, created_at, updated_at)
-- SELECT e.id, pi_item.id, pi_item.quantity, pi_item.unit_price, pi_item.total_price, (SELECT id FROM users ORDER BY id LIMIT 1), now(), now()
-- FROM eopa e
-- JOIN pi_item ON pi_item.pi_id = e.pi_id
-- LIMIT 40;


-- -- 15) Purchase Orders (60)
-- INSERT INTO purchase_orders (po_number, po_date, po_type, eopa_id, vendor_id, status, delivery_date, remarks, created_by, created_at, updated_at)
-- SELECT
--   'PO/' || CASE WHEN (i % 3)=0 THEN 'RM' WHEN (i % 3)=1 THEN 'PM' ELSE 'FG' END || '/' || LPAD(i::text,4,'0'),
--   CURRENT_DATE - (60 - i),
--   CASE WHEN (i % 3)=0 THEN 'RM' WHEN (i % 3)=1 THEN 'PM' ELSE 'FG' END,
--   NULL,
--   CASE WHEN (i % 3)=0 THEN (SELECT id FROM vendors WHERE vendor_type='RM' ORDER BY id OFFSET ((i-1)%5) LIMIT 1)
--        WHEN (i % 3)=1 THEN (SELECT id FROM vendors WHERE vendor_type='PM' ORDER BY id OFFSET ((i-1)%5) LIMIT 1)
--        ELSE (SELECT id FROM vendors WHERE vendor_type='MANUFACTURER' ORDER BY id OFFSET ((i-1)%5) LIMIT 1) END,
--   'DRAFT',
--   CURRENT_DATE + (7 + (i % 20)),
--   'Auto PO ' || i,
--   (SELECT id FROM users ORDER BY id LIMIT 1),
--   now(),
--   now()
-- FROM generate_series(1,60) AS s(i);

-- -- po_item: create 1..3 items per PO mapped to medicines (and optionally raw_material_id or packing_material_id)
-- INSERT INTO po_item (po_id, medicine_id, created_at, ordered_quantity, unit, hsn_code, raw_material_id, packing_material_id)
-- SELECT
--   po.id,
--   ((po.id * 5) % (SELECT count(*) FROM medicine_master)) + 1,
--   now(),
--   (50 + (po.id % 200))::numeric(15,3),
--   'box',
--   (SELECT hsn_code FROM medicine_master WHERE id = ((po.id * 5) % (SELECT count(*) FROM medicine_master)) + 1),
--   CASE WHEN (po.id % 2)=0 THEN ((po.id % (SELECT count(*) FROM raw_material_master)) + 1) ELSE NULL END,
--   CASE WHEN (po.id % 2)=1 THEN ((po.id % (SELECT count(*) FROM packing_material_master)) + 1) ELSE NULL END
-- FROM purchase_order po
-- CROSS JOIN generate_series(1,3) seq
-- WHERE (po.id + seq) % 2 = 0;

-- -- 16) Vendor invoices (create 60 invoices, mapping to PO)
-- -- Table name in schema: vendor_invoices and vendor_invoice_items
-- INSERT INTO vendor_invoices (invoice_number, invoice_date, invoice_type, po_id, vendor_id, subtotal, tax_amount, total_amount, status, remarks, received_by, received_at, created_at, updated_at)
-- SELECT
--   'INV/' || to_char(now(),'YY') || '/' || LPAD(nextval('vendor_invoices_id_seq')::text,6,'0'),
--   CURRENT_DATE - (i % 12),
--   CASE WHEN (po.po_type='RM') THEN 'RM' WHEN (po.po_type='PM') THEN 'PM' ELSE 'FG' END,
--   po.id,
--   po.vendor_id,
--   (SELECT COALESCE(SUM(ordered_quantity * 1.0),0) FROM po_item WHERE po_item.po_id = po.id),
--   0,
--   0,
--   'PENDING',
--   'Auto invoice for PO ' || po.id,
--   (SELECT id FROM users ORDER BY id LIMIT 1),
--   now(),
--   now(),
--   now()
-- FROM purchase_order po
-- JOIN generate_series(1,1) s(i) ON true
-- LIMIT 60;

-- -- vendor_invoice_items: 1 item per vendor_invoices referencing a medicine or raw/packing material
-- INSERT INTO vendor_invoice_items (invoice_id, medicine_id, shipped_quantity, unit_price, total_price, tax_rate, tax_amount, created_at, hsn_code, raw_material_id, packing_material_id)
-- SELECT
--   vi.id,
--   pi_item.medicine_id,
--   LEAST(pi_item.quantity, (po_item.ordered_quantity)::numeric) * (0.8 + ((vi.id % 3)::numeric)/10),
--   round( (1.0 + (vi.id % 10) * 0.1)::numeric, 2),
--   round( (LEAST(pi_item.quantity, (po_item.ordered_quantity)::numeric) * (0.8 + ((vi.id % 3)::numeric)/10) * (1.0 + (vi.id % 10) * 0.1))::numeric, 2),
--   18.00,
--   round((LEAST(pi_item.quantity, (po_item.ordered_quantity)::numeric) * (0.8 + ((vi.id % 3)::numeric)/10) * (1.0 + (vi.id % 10) * 0.1) * 0.18)::numeric, 2),
--   now(),
--   COALESCE(pi_item.hsn_code, (SELECT hsn_code FROM medicine_master WHERE id = pi_item.medicine_id LIMIT 1)),
--   po_item.raw_material_id,
--   po_item.packing_material_id
-- FROM vendor_invoices vi
-- LEFT JOIN purchase_order po ON po.id = vi.po_id
-- LEFT JOIN LATERAL (
--   SELECT * FROM po_item WHERE po_item.po_id = po.id LIMIT 1
-- ) po_item ON true
-- LEFT JOIN LATERAL (
--   SELECT * FROM pi_item WHERE pi_item.pi_id = (SELECT pi_id FROM pi WHERE id = (SELECT pi_id FROM pi LIMIT 1)) LIMIT 1
-- ) pi_item ON true
-- LIMIT 120;

-- -- 17) Update purchase_order counts
-- UPDATE purchase_order p
-- SET total_ordered_qty = COALESCE((SELECT SUM(ordered_quantity) FROM po_item WHERE po_item.po_id = p.id),0),
--     total_fulfilled_qty = COALESCE((SELECT SUM(vii.shipped_quantity) FROM vendor_invoice_items vii JOIN vendor_invoices vi ON vi.id = vii.invoice_id WHERE vi.po_id = p.id),0)
-- WHERE EXISTS (SELECT 1 FROM po_item WHERE po_item.po_id = p.id);

-- -- 18) material_balance: create 200 rows mapping raw_material_id/packing_material_id to PO/invoice pairs
-- INSERT INTO material_balance (raw_material_id, vendor_id, po_id, invoice_id, ordered_qty, received_qty, balance_qty, last_updated, packing_material_id)
-- SELECT
--   ((i - 1) % (SELECT COUNT(*) FROM raw_material_master)) + 1 AS raw_material_id,
--   (SELECT id FROM vendors WHERE vendor_type='RM' ORDER BY id OFFSET ((i - 1) % 5) LIMIT 1) AS vendor_id,
--   po.id,
--   vi.id,
--   COALESCE(po_item.ordered_quantity, 0),
--   COALESCE(vii.shipped_quantity, 0),
--   (COALESCE(po_item.ordered_quantity,0) - COALESCE(vii.shipped_quantity,0)),
--   now(),
--   po_item.packing_material_id
-- FROM generate_series(1,200) s(i)
-- JOIN LATERAL (SELECT id FROM purchase_order ORDER BY id OFFSET ((i - 1) % (SELECT COUNT(*) FROM purchase_order)) LIMIT 1) po ON true
-- LEFT JOIN LATERAL (SELECT id, shipped_quantity FROM vendor_invoice_items WHERE invoice_id IN (SELECT id FROM vendor_invoices WHERE po_id = po.id) LIMIT 1) vii ON true
-- LEFT JOIN LATERAL (SELECT * FROM po_item WHERE po_item.po_id = po.id LIMIT 1) po_item ON true
-- LEFT JOIN LATERAL (SELECT id FROM vendor_invoices WHERE po_id = po.id LIMIT 1) vi ON true;

-- -- 19) material_receipts: create 40 receipts mapping to some POs
-- INSERT INTO material_receipts (receipt_number, receipt_date, po_id, medicine_id, quantity_received, batch_number, remarks, received_by, created_at)
-- SELECT
--   'RCPT/' || to_char(now(),'YY') || '/' || LPAD(i::text,4,'0'),
--   CURRENT_DATE - (i % 10),
--   po.id,
--   (SELECT id FROM medicine_master ORDER BY id OFFSET ((i -1) % (SELECT COUNT(*) FROM medicine_master)) LIMIT 1),
--   (10 + (i % 50))::numeric(15,3),
--   'BATCH-' || i,
--   'Auto receipt',
--   (SELECT id FROM users ORDER BY id LIMIT 1),
--   now()
-- FROM generate_series(1,40) s(i)
-- JOIN LATERAL (SELECT id FROM purchase_order ORDER BY id OFFSET ((i -1) % (SELECT COUNT(*) FROM purchase_order)) LIMIT 1) po ON true;

COMMIT;
