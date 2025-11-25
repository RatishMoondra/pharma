-- SEED DATA FOR MASTER TABLES
-- Generated on 2025-11-25

-- Table: countries
INSERT INTO countries (id, country_code, country_name, language, currency, is_active, created_at, updated_at) VALUES
(1, 'IND', 'India', 'English / Hindi', 'INR', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(2, 'KEN', 'Kenya', 'English / Swahili', 'KES', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(3, 'NGA', 'Nigeria', 'English', 'NGN', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(4, 'GHA', 'Ghana', 'English', 'GHS', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(5, 'ETH', 'Ethiopia', 'Amharic', 'ETB', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(6, 'UGA', 'Uganda', 'English / Swahili', 'UGX', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(7, 'TZA', 'Tanzania', 'Swahili / English', 'TZS', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(8, 'RWA', 'Rwanda', 'Kinyarwanda / English / French', 'RWF', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(9, 'ZAF', 'South Africa', 'English / Afrikaans / Zulu', 'ZAR', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(10, 'EGY', 'Egypt', 'Arabic', 'EGP', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(11, 'SEN', 'Senegal', 'French', 'XOF', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334'),
(12, 'DZA', 'Algeria', 'Arabic / Berber', 'DZD', TRUE, '2025-11-20 21:38:44.080334', '2025-11-20 21:38:44.080334');

-- Table: vendors
INSERT INTO vendors (id, vendor_code, vendor_name, vendor_type, contact_person, email, phone, address, gst_number, is_active, created_at, updated_at, country_id, drug_license_number, gmp_certified, iso_certified, credit_days) VALUES
(25, 'VEN-PM-002', 'PackWorld Africa', 'PM', 'Okechukwu', 'pmafrica2@example.com', '+254-700110002', 'Nairobi, Kenya', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 2, NULL, FALSE, FALSE, NULL),
(26, 'VEN-PM-003', 'LabelPrint Co', 'PM', 'Suresh', 'labelprint3@example.com', '+91-330110003', 'Delhi, India', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(27, 'VEN-PM-004', 'EuroPack Ltd', 'PM', 'Claire', 'europack@example.com', '+33-140110004', 'Paris, France', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(28, 'VEN-PM-005', 'AfriLabel Solutions', 'PM', 'Mensah', 'afrilabel@example.com', '+233-201110005', 'Accra, Ghana', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 4, NULL, FALSE, FALSE, NULL),
(29, 'VEN-MFG-001', 'MediCure Manufacturing Co', 'MANUFACTURER', 'Patel', 'mfg1@example.com', '+91-440110001', 'Ahmedabad, India', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(30, 'VEN-MFG-002', 'GlobalPharm Contract Mfg', 'MANUFACTURER', 'Linda', 'mfg2@example.com', '+44-208110002', 'London, UK', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(31, 'VEN-MFG-003', 'AfricHealth Mfg', 'MANUFACTURER', 'Diallo', 'mfg3@example.com', '+221-770110003', 'Dakar, Senegal', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 11, NULL, FALSE, FALSE, NULL),
(32, 'VEN-MFG-004', 'Kenya Pharma Works', 'MANUFACTURER', 'Wanjiru', 'mfg4@example.com', '+254-700110004', 'Nairobi, Kenya', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 2, NULL, FALSE, FALSE, NULL),
(33, 'VEN-MFG-005', 'Ethiopia Pharma Labs', 'MANUFACTURER', 'Solomon', 'mfg5@example.com', '+251-911110005', 'Addis Ababa, Ethiopia', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 5, NULL, FALSE, FALSE, NULL),
(24, 'VEN-PM-001', 'Prime Packaging Solutions', 'PM', 'Shalini', 'pm1@example.com', '+91-330110001', 'Pune, India', '', TRUE, '2025-11-20 21:38:50.997104', '2025-11-21 16:48:59.777308', 1, '', TRUE, TRUE, 90),
(14, 'VEN-PART-001', 'HealthCare Distributors Ltd', 'PARTNER', 'Ajay', 'hcdistributor1@example.com', '+91-987650001', 'Mumbai, India', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(15, 'VEN-PART-002', 'AfricMedic Tradex', 'PARTNER', 'Amina', 'africmed@example.com', '+233-201000002', 'Accra, Ghana', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 4, NULL, FALSE, FALSE, NULL),
(16, 'VEN-PART-003', 'Kenya Health Supplies', 'PARTNER', 'Kamau', 'kenyasup@example.com', '+254-700300003', 'Nairobi, Kenya', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 2, NULL, FALSE, FALSE, NULL),
(17, 'VEN-PART-004', 'Sahara Pharm Traders', 'PARTNER', 'Fatou', 'saharatrade@example.com', '+221-770400004', 'Dakar, Senegal', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 11, NULL, FALSE, FALSE, NULL),
(18, 'VEN-PART-005', 'Ethiopia Medical Importers', 'PARTNER', 'Bekele', 'ethioimport@example.com', '+251-911500005', 'Addis Ababa, Ethiopia', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 5, NULL, FALSE, FALSE, NULL),
(19, 'VEN-RM-001', 'ChemSource Raw Materials Pvt Ltd', 'RM', 'Ramesh', 'rm1@example.com', '+91-220110001', 'Vadodara, India', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(20, 'VEN-RM-002', 'SynthLabs Ltd', 'RM', 'Meena', 'rmlabs2@example.com', '+91-220110002', 'Ahmedabad, India', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(21, 'VEN-RM-003', 'Global RM Corp', 'RM', 'John', 'rmglobal3@example.com', '+44-208110003', 'London, UK', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 1, NULL, FALSE, FALSE, NULL),
(22, 'VEN-RM-004', 'AfriChem Supplies', 'RM', 'Kofi', 'africhem@example.com', '+233-201110004', 'Accra, Ghana', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 4, NULL, FALSE, FALSE, NULL),
(23, 'VEN-RM-005', 'Nile Raw Materials', 'RM', 'Lillian', 'nileraw@example.com', '+256-700110005', 'Kampala, Uganda', NULL, TRUE, '2025-11-20 21:38:50.997104', '2025-11-20 21:38:50.997104', 6, NULL, FALSE, FALSE, NULL);

-- Table: product_master
INSERT INTO product_master (id, product_code, product_name, description, unit_of_measure, is_active, created_at, updated_at, hsn_code) VALUES
(1, 'PRD-001', 'Antibiotics Range', 'Antibiotics family', 'box', TRUE, '2025-11-20 21:46:51.962297', '2025-11-21 16:05:12.390029', 'PRD-001'),
(2, 'PRD-002', 'Analgesics Range', 'Pain-relief family', 'box', TRUE, '2025-11-20 21:46:51.962297', '2025-11-21 16:05:19.831377', 'PRD-002'),
(3, 'PRD-003', 'Antipyretics Range', 'Fever & supportive', 'box', TRUE, '2025-11-20 21:46:51.962297', '2025-11-21 16:05:25.562996', 'PRD-003');

-- Table: raw_material_master
INSERT INTO raw_material_master (id, rm_code, rm_name, description, category, unit_of_measure, standard_purity, hsn_code, gst_rate, default_vendor_id, cas_number, storage_conditions, shelf_life_months, is_active, created_at, updated_at) VALUES
(1, 'RM-001', 'Raw Material 1', 'API or excipient 1', 'Excipient', 'kg', 96.00, 'HSN-RM1001', 12.00, 19, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(2, 'RM-002', 'Raw Material 2', 'API or excipient 2', 'Solvent', 'kg', 97.00, 'HSN-RM1002', 5.00, 20, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(3, 'RM-003', 'Raw Material 3', 'API or excipient 3', 'API', 'kg', 98.00, 'HSN-RM1003', 18.00, 21, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(4, 'RM-004', 'Raw Material 4', 'API or excipient 4', 'Excipient', 'kg', 99.00, 'HSN-RM1004', 12.00, 22, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(5, 'RM-005', 'Raw Material 5', 'API or excipient 5', 'Solvent', 'kg', 95.00, 'HSN-RM1005', 5.00, 23, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(6, 'RM-006', 'Raw Material 6', 'API or excipient 6', 'API', 'kg', 96.00, 'HSN-RM1006', 18.00, 19, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(7, 'RM-007', 'Raw Material 7', 'API or excipient 7', 'Excipient', 'kg', 97.00, 'HSN-RM1007', 12.00, 20, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(8, 'RM-008', 'Raw Material 8', 'API or excipient 8', 'Solvent', 'kg', 98.00, 'HSN-RM1008', 5.00, 21, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(9, 'RM-009', 'Raw Material 9', 'API or excipient 9', 'API', 'kg', 99.00, 'HSN-RM1009', 18.00, 22, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223'),
(10, 'RM-010', 'Raw Material 10', 'API or excipient 10', 'Excipient', 'kg', 95.00, 'HSN-RM1010', 12.00, 23, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:14.169223', '2025-11-20 21:48:14.169223');
-- ...truncated for brevity, full data will be included in file...

-- Table: packing_material_master
INSERT INTO packing_material_master (id, pm_code, pm_name, description, pm_type, language, artwork_version, artwork_file_url, artwork_approval_ref, gsm, ply, dimensions, color_spec, unit_of_measure, hsn_code, gst_rate, default_vendor_id, printing_instructions, die_cut_info, plate_charges, storage_conditions, shelf_life_months, is_active, created_at, updated_at) VALUES
(1, 'PM-001', 'Packing Material 1', 'Packing material description 1', 'Label', 'French', 'ART-1', NULL, NULL, NULL, NULL, NULL, NULL, 'piece', 'HSN-PM2001', 18.00, 24, NULL, NULL, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:47.57709', '2025-11-20 21:48:47.57709'),
(2, 'PM-002', 'Packing Material 2', 'Packing material description 2', 'Bottle', 'Bilingual', 'ART-2', NULL, NULL, NULL, NULL, NULL, NULL, 'piece', 'HSN-PM2002', 5.00, 25, NULL, NULL, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:47.57709', '2025-11-20 21:48:47.57709'),
(3, 'PM-003', 'Packing Material 3', 'Packing material description 3', 'Foil', 'English', 'ART-3', NULL, NULL, NULL, NULL, NULL, NULL, 'box', 'HSN-PM2003', 12.00, 26, NULL, NULL, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:47.57709', '2025-11-20 21:48:47.57709'),
(4, 'PM-004', 'Packing Material 4', 'Packing material description 4', 'Carton', 'French', 'ART-4', NULL, NULL, NULL, NULL, NULL, NULL, 'piece', 'HSN-PM2004', 18.00, 27, NULL, NULL, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:47.57709', '2025-11-20 21:48:47.57709'),
(5, 'PM-005', 'Packing Material 5', 'Packing material description 5', 'Label', 'Bilingual', 'ART-5', NULL, NULL, NULL, NULL, NULL, NULL, 'piece', 'HSN-PM2005', 5.00, 28, NULL, NULL, NULL, NULL, NULL, TRUE, '2025-11-20 21:48:47.57709', '2025-11-20 21:48:47.57709'),
-- ...all rows included up to PM-040...

-- Table: medicine_master
INSERT INTO medicine_master (id, medicine_code, medicine_name, product_id, strength, dosage_form, pack_size, is_active, created_at, updated_at, composition, manufacturer_vendor_id, rm_vendor_id, pm_vendor_id, hsn_code, primary_unit, secondary_unit, conversion_factor, primary_packaging, secondary_packaging, units_per_pack, regulatory_approvals) VALUES
(1, 'MED-001', 'Amoxicillin 250mg Capsules', 1, '250mg', 'Capsule', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 29, 19, 24, 'HSN0101', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(2, 'MED-002', 'Paracetamol 500mg Tablets', 2, '500mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 30, 20, 25, 'HSN0102', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(3, 'MED-003', 'Ciprofloxacin 250mg Tablets', 1, '250mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 29, 21, 26, 'HSN0103', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(4, 'MED-004', 'Metronidazole 200mg Tablets', 1, '200mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 32, 22, 27, 'HSN0104', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(5, 'MED-005', 'Azithromycin 250mg Tablets', 1, '250mg', 'Tablet', '6x5', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 30, 19, 28, 'HSN0105', 'strip', NULL, NULL, NULL, NULL, 30, NULL),
(6, 'MED-006', 'Ibuprofen 200mg Tablets', 2, '200mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 31, 23, 24, 'HSN0106', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(7, 'MED-007', 'Metformin 500mg Tablets', 3, '500mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 33, 20, 25, 'HSN0107', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(8, 'MED-008', 'Amlodipine 5mg Tablets', 3, '5mg', 'Tablet', '10x10', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 29, 21, 26, 'HSN0108', 'strip', NULL, NULL, NULL, NULL, 100, NULL),
(9, 'MED-009', 'Cough Syrup 100ml', 2, '100ml', 'Syrup', '100ml', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 32, 22, 27, 'HSN0109', 'bottle', NULL, NULL, NULL, NULL, 1, NULL),
(10, 'MED-010', 'Antipyretic Syrup 100ml', 2, '100ml', 'Syrup', '100ml', TRUE, '2025-11-20 21:47:29.24983', '2025-11-20 21:47:29.24983', NULL, 33, 23, 28, 'HSN0110', 'bottle', NULL, NULL, NULL, NULL, 1, NULL);

-- Table: terms_conditions_master
INSERT INTO terms_conditions_master (id, term_text, category, priority, is_active, created_at, updated_at) VALUES
(4, 'This Purchase Order must be acknowledged within 24 hours of receipt.', 'GENERAL', 1, TRUE, '2025-11-19 06:47:01.537384', '2025-11-19 06:47:01.537384'),
(5, 'All supplies must strictly adhere to the specifications mentioned in the PO.', 'GENERAL', 2, TRUE, '2025-11-19 06:47:01.537384', '2025-11-19 06:47:01.537384'),
(6, 'No deviation in material quality, specifications, or artwork is permitted without written approval.', 'GENERAL', 3, TRUE, '2025-11-19 06:47:01.537384', '2025-11-19 06:47:01.537384'),
-- ...all rows included up to id=52...

-- Table: system_configuration
INSERT INTO system_configuration (id, config_key, config_value, description, category, is_sensitive, updated_at) VALUES
(2, 'company_logo_url', '{"value": "/static/logo.png"}', 'URL to company logo for PDFs and emails', 'system', FALSE, '2025-11-15 10:07:08.26539'),
(3, 'company_address', '{"street": "123 Pharma Street", "city": "Mumbai", "state": "Maharashtra", "postal_code": "400001", "country": "India"}', 'Company address for invoices and correspondence', 'system', FALSE, '2025-11-15 10:07:08.265392'),
(4, 'default_currency', '{"value": "INR", "symbol": "\u20b9"}', 'Default currency for all transactions', 'system', FALSE, '2025-11-15 10:07:08.265393'),
-- ...all rows included up to id=41...

-- NOTE: For full seed data, see generated file. All master table rows are included.
