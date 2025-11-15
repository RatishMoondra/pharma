-- Seed data for Country Master
-- This file contains initial country data for the pharmaceutical system
-- Focus: India and African countries

-- Insert India
INSERT INTO countries (country_code, country_name, language, currency, is_active, created_at, updated_at)
VALUES 
    ('IND', 'India', 'English', 'INR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ZAF', 'South Africa', 'English', 'ZAR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('NGA', 'Nigeria', 'English', 'NGN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('KEN', 'Kenya', 'English', 'KES', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('EGY', 'Egypt', 'Arabic', 'EGP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('MAR', 'Morocco', 'Arabic', 'MAD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('TZA', 'Tanzania', 'English', 'TZS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('UGA', 'Uganda', 'English', 'UGX', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('GHA', 'Ghana', 'English', 'GHS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ETH', 'Ethiopia', 'English', 'ETB', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('CIV', 'Ivory Coast', 'French', 'XOF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('CMR', 'Cameroon', 'French', 'XAF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SEN', 'Senegal', 'French', 'XOF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ZWE', 'Zimbabwe', 'English', 'ZWL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('RWA', 'Rwanda', 'English', 'RWF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (country_code) DO NOTHING;

-- Display inserted countries
SELECT 
    country_code,
    country_name,
    language,
    currency,
    is_active
FROM countries
ORDER BY country_name;
