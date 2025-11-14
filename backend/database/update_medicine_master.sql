-- Add new columns to medicine_master table
-- This updates the table to support three separate vendor types and composition

-- Add composition column
ALTER TABLE medicine_master 
ADD COLUMN IF NOT EXISTS composition TEXT;

-- Add three vendor columns
ALTER TABLE medicine_master 
ADD COLUMN IF NOT EXISTS manufacturer_vendor_id INTEGER REFERENCES vendors(id);

ALTER TABLE medicine_master 
ADD COLUMN IF NOT EXISTS rm_vendor_id INTEGER REFERENCES vendors(id);

ALTER TABLE medicine_master 
ADD COLUMN IF NOT EXISTS pm_vendor_id INTEGER REFERENCES vendors(id);

-- Migrate existing vendor_id data to manufacturer_vendor_id before dropping
UPDATE medicine_master 
SET manufacturer_vendor_id = vendor_id 
WHERE vendor_id IS NOT NULL AND manufacturer_vendor_id IS NULL;

-- Drop foreign key constraint on vendor_id first
ALTER TABLE medicine_master 
DROP CONSTRAINT IF EXISTS medicine_master_vendor_id_fkey;

-- Drop the old vendor_id column
ALTER TABLE medicine_master 
DROP COLUMN vendor_id;

-- Make dosage_form NOT NULL (if it's currently nullable)
ALTER TABLE medicine_master 
ALTER COLUMN dosage_form SET NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'medicine_master'
ORDER BY ordinal_position;
