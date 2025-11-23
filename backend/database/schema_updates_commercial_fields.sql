-- =====================================================
-- SCHEMA UPDATE: Add Commercial Fields to PO Module
-- =====================================================
-- This script adds rate, value, GST, and delivery fields
-- to support complete Pharma PO workflow as per screenshot
-- =====================================================

-- PART 1: Add commercial fields to po_items
-- =====================================================

ALTER TABLE public.po_items
    ADD COLUMN IF NOT EXISTS rate_per_unit numeric(15,2),
    ADD COLUMN IF NOT EXISTS value_amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS gst_amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS total_amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS delivery_schedule text,
    ADD COLUMN IF NOT EXISTS delivery_location text;

-- Add comments for clarity
COMMENT ON COLUMN public.po_items.rate_per_unit IS 'Rate per unit in the PO currency';
COMMENT ON COLUMN public.po_items.value_amount IS 'Calculated: rate_per_unit × ordered_quantity';
COMMENT ON COLUMN public.po_items.gst_amount IS 'Calculated: value_amount × (gst_rate / 100)';
COMMENT ON COLUMN public.po_items.total_amount IS 'Calculated: value_amount + gst_amount';
COMMENT ON COLUMN public.po_items.delivery_schedule IS 'e.g., "Immediate", "Within 15 days", "As per schedule"';
COMMENT ON COLUMN public.po_items.delivery_location IS 'Delivery location for this specific item (can differ from PO ship_to)';

-- PART 2: Add commercial totals to purchase_orders
-- =====================================================

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS total_value_amount numeric(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount numeric(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_invoice_amount numeric(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ship_to_manufacturer_id integer,
    ADD COLUMN IF NOT EXISTS ship_to_address text,
    ADD COLUMN IF NOT EXISTS amendment_reason text,
    ADD COLUMN IF NOT EXISTS currency_exchange_rate numeric(10,4) DEFAULT 1.0000;

-- Add comments
COMMENT ON COLUMN public.purchase_orders.total_value_amount IS 'Sum of all po_items.value_amount';
COMMENT ON COLUMN public.purchase_orders.total_gst_amount IS 'Sum of all po_items.gst_amount';
COMMENT ON COLUMN public.purchase_orders.total_invoice_amount IS 'Sum of all po_items.total_amount (value + GST)';
COMMENT ON COLUMN public.purchase_orders.ship_to_manufacturer_id IS 'Foreign key to vendors table (manufacturer receiving RM/PM)';
COMMENT ON COLUMN public.purchase_orders.ship_to_address IS 'Complete shipping address for this PO';
COMMENT ON COLUMN public.purchase_orders.amendment_reason IS 'Reason for amendment if amendment_number > 0';
COMMENT ON COLUMN public.purchase_orders.currency_exchange_rate IS 'Exchange rate if currency_code is not INR';

-- PART 3: Add foreign key constraint for ship_to_manufacturer_id
-- =====================================================

ALTER TABLE public.purchase_orders
    DROP CONSTRAINT IF EXISTS fk_ship_to_manufacturer;

ALTER TABLE public.purchase_orders
    ADD CONSTRAINT fk_ship_to_manufacturer 
    FOREIGN KEY (ship_to_manufacturer_id) 
    REFERENCES public.vendors(id);

-- PART 4: Add check constraint to ensure only ONE material type per po_item
-- =====================================================

ALTER TABLE public.po_items
    DROP CONSTRAINT IF EXISTS chk_po_item_one_material_type;

ALTER TABLE public.po_items
    ADD CONSTRAINT chk_po_item_one_material_type
    CHECK (
        (
            (medicine_id IS NOT NULL)::integer +
            (raw_material_id IS NOT NULL)::integer +
            (packing_material_id IS NOT NULL)::integer
        ) = 1
    );

COMMENT ON CONSTRAINT chk_po_item_one_material_type ON public.po_items IS 
'Ensures exactly ONE of medicine_id, raw_material_id, or packing_material_id is populated';

-- PART 5: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_po_items_rate_per_unit ON public.po_items(rate_per_unit);
CREATE INDEX IF NOT EXISTS idx_po_items_total_amount ON public.po_items(total_amount);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ship_to_manufacturer ON public.purchase_orders(ship_to_manufacturer_id);

-- PART 6: Update existing records with default values
-- =====================================================

-- Set default values for existing po_items
UPDATE public.po_items
SET 
    rate_per_unit = 0,
    value_amount = 0,
    gst_amount = 0,
    total_amount = 0,
    delivery_schedule = 'As per agreement',
    delivery_location = 'As per PO'
WHERE rate_per_unit IS NULL;

-- Set default values for existing purchase_orders
UPDATE public.purchase_orders
SET 
    total_value_amount = 0,
    total_gst_amount = 0,
    total_invoice_amount = 0,
    currency_exchange_rate = 1.0000
WHERE total_value_amount IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify po_items columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'po_items'
  AND column_name IN (
    'rate_per_unit', 'value_amount', 'gst_amount', 
    'total_amount', 'delivery_schedule', 'delivery_location'
  )
ORDER BY column_name;

-- Verify purchase_orders columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
  AND column_name IN (
    'total_value_amount', 'total_gst_amount', 'total_invoice_amount',
    'ship_to_manufacturer_id', 'ship_to_address', 'amendment_reason',
    'currency_exchange_rate'
  )
ORDER BY column_name;

-- Verify constraints
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.po_items'::regclass
  AND conname = 'chk_po_item_one_material_type';

-- =====================================================
-- END OF SCHEMA UPDATE
-- =====================================================
