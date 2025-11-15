--
-- Seed Data for Pharma Procurement System
-- Updated: 2025-11-15
--
-- This file contains essential seed data for:
-- - Admin user (username: admin, password: admin123)
-- - Sample countries
-- - System configurations (42 configs across 8 categories)
--

-- Disable triggers temporarily for faster insertion
SET session_replication_role = 'replica';

--
-- USERS
-- Default admin user with password: admin123
-- Password hash generated with bcrypt
--
INSERT INTO users (username, hashed_password, email, role, is_active) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VexXL7p.LXgj8DFAC', 'admin@pharmaco.com', 'ADMIN', true);

--
-- COUNTRY MASTER
-- Sample countries with regions and currencies
--
INSERT INTO country_master (country_code, country_name, region, currency) VALUES
('IND', 'India', 'Asia', 'INR'),
('USA', 'United States', 'North America', 'USD'),
('GBR', 'United Kingdom', 'Europe', 'GBP'),
('CHN', 'China', 'Asia', 'CNY'),
('DEU', 'Germany', 'Europe', 'EUR'),
('FRA', 'France', 'Europe', 'EUR'),
('JPN', 'Japan', 'Asia', 'JPY'),
('ARE', 'United Arab Emirates', 'Middle East', 'AED'),
('SAU', 'Saudi Arabia', 'Middle East', 'SAR'),
('SGP', 'Singapore', 'Asia', 'SGD');

--
-- SYSTEM CONFIGURATION
-- 42 configurations across 8 categories
--

-- System Configuration (7 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('company_name', '{"value": "Pharma Co. Ltd."}', 'Company name displayed in reports, emails, and PDFs', 'system', false),
('company_logo_url', '{"value": "/static/logo.png"}', 'URL to company logo for PDFs and emails', 'system', false),
('company_address', '{"street": "123 Pharma Street", "city": "Mumbai", "state": "Maharashtra", "postal_code": "400001", "country": "India"}', 'Company address for invoices and correspondence', 'system', false),
('default_currency', '{"value": "INR", "symbol": "₹"}', 'Default currency for all transactions', 'system', false),
('default_timezone', '{"value": "Asia/Kolkata"}', 'Default timezone for timestamps', 'system', false),
('date_format', '{"value": "DD-MM-YYYY"}', 'Date format for UI and reports', 'system', false),
('fiscal_year', '{"value": "24-25", "start_month": 4}', 'Current fiscal year and start month (1=January)', 'system', false);

-- Workflow Rules (7 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('allow_pi_edit_after_eopa', '{"enabled": false}', 'Allow editing PI after EOPA is created', 'workflow', false),
('allow_eopa_edit_after_approval', '{"enabled": false}', 'Allow editing EOPA after approval', 'workflow', false),
('auto_close_po_on_fulfillment', '{"enabled": true}', 'Automatically close PO when fulfilled_qty == ordered_qty', 'workflow', false),
('enable_partial_dispatch', '{"enabled": true}', 'Allow partial dispatch of POs', 'workflow', false),
('enable_manufacturer_balance_logic', '{"enabled": true}', 'Track manufacturer material balance for RM/PM', 'workflow', false),
('enable_invoice_fulfillment', '{"enabled": true}', 'Update PO fulfillment from vendor invoices', 'workflow', false),
('enable_multilingual_pm', '{"enabled": true}', 'Enable packaging material language/artwork versioning', 'workflow', false);

-- Document Numbering (8 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('pi_number_format', '{"format": "PI/{FY}/{SEQ:04d}"}', 'Proforma Invoice number format', 'numbering', false),
('eopa_number_format', '{"format": "EOPA/{FY}/{SEQ:04d}"}', 'EOPA number format', 'numbering', false),
('po_rm_number_format', '{"format": "PO/RM/{FY}/{SEQ:04d}"}', 'Raw Material PO number format', 'numbering', false),
('po_pm_number_format', '{"format": "PO/PM/{FY}/{SEQ:04d}"}', 'Packaging Material PO number format', 'numbering', false),
('po_fg_number_format', '{"format": "PO/FG/{FY}/{SEQ:04d}"}', 'Finished Goods PO number format', 'numbering', false),
('grn_number_format', '{"format": "GRN/{FY}/{SEQ:04d}"}', 'Goods Receipt Note number format', 'numbering', false),
('dispatch_number_format', '{"format": "DISP/{FY}/{SEQ:04d}"}', 'Dispatch Advice number format', 'numbering', false),
('invoice_number_format', '{"format": "INV/{FY}/{SEQ:04d}"}', 'Vendor Invoice number format', 'numbering', false);

-- Vendor Rules (3 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('allowed_pm_languages', '{"languages": ["EN", "FR", "AR", "SP", "HI"], "labels": {"EN": "English", "FR": "French", "AR": "Arabic", "SP": "Spanish", "HI": "Hindi"}}', 'Allowed packaging material languages', 'vendor', false),
('allowed_pm_artwork_versions', '{"versions": ["v1.0", "v1.1", "v2.0", "v2.1", "v3.0"]}', 'Allowed packaging material artwork versions', 'vendor', false),
('enable_vendor_fallback_logic', '{"enabled": true}', 'Use Medicine Master vendor defaults when creating EOPAs', 'vendor', false);

-- Email Configuration (6 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('smtp_host', '{"value": "smtp.gmail.com"}', 'SMTP server host', 'email', false),
('smtp_port', '{"value": 587}', 'SMTP server port', 'email', false),
('smtp_username', '{"value": "noreply@pharmaco.com"}', 'SMTP authentication username', 'email', true),
('smtp_password', '{"value": ""}', 'SMTP authentication password (configure in production)', 'email', true),
('email_sender', '{"email": "noreply@pharmaco.com", "name": "Pharma Co. System"}', 'Default sender for system emails', 'email', false),
('enable_email_notifications', '{"po_created": true, "eopa_approved": true, "invoice_received": true, "dispatch_created": true}', 'Enable/disable email notifications by event type', 'email', false);

-- Security Configuration (3 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_number": true, "require_special": false}', 'Password complexity requirements', 'security', false),
('jwt_token_expiry_minutes', '{"value": 60}', 'JWT access token expiry time in minutes', 'security', false),
('role_permissions', '{"ADMIN": ["all"], "PROCUREMENT_OFFICER": ["pi:create", "eopa:create", "po:create", "reports:view"], "WAREHOUSE_MANAGER": ["material:receive", "dispatch:create", "grn:create", "inventory:view"], "ACCOUNTANT": ["view_only"]}', 'Role-based permissions matrix', 'security', false);

-- UI Configuration (4 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('ui_theme', '{"value": "light"}', 'Default UI theme (light/dark)', 'ui', false),
('ui_primary_color', '{"value": "#1976d2"}', 'Primary brand color for UI', 'ui', false),
('items_per_page', '{"value": 50}', 'Default pagination size for tables', 'ui', false),
('default_language', '{"value": "EN"}', 'Default UI language', 'ui', false);

-- Integration Configuration (4 configs)
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive) VALUES
('erp_integration_url', '{"value": null}', 'External ERP system URL (configure in production)', 'integration', false),
('erp_api_key', '{"value": ""}', 'ERP API authentication key', 'integration', true),
('webhook_endpoints', '{"po_created": null, "invoice_received": null, "dispatch_created": null}', 'Webhook URLs for event notifications', 'integration', false),
('file_storage_type', '{"value": "local"}', 'File storage backend (local, s3, azure)', 'integration', false);

-- Re-enable triggers
SET session_replication_role = 'origin';

-- End of seed data
