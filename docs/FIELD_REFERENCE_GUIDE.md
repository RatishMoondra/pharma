# Quick Field Reference - New Schema Fields

## 📋 Quick Lookup by Table

### vendor (4 new fields)
```sql
drug_license_number     VARCHAR(100)    -- Regulatory compliance
gmp_certified          BOOLEAN          -- GMP certification status
iso_certified          BOOLEAN          -- ISO certification status
credit_days            INTEGER          -- Payment terms (default 30)
```

### product_master (1 new field)
```sql
hsn_code              VARCHAR(20)      -- HSN code for tax compliance
```

### medicine_master (11 new fields)
```sql
-- Unit standardization
primary_unit          VARCHAR(20)      -- Primary UOM (kg, liter, piece)
secondary_unit        VARCHAR(20)      -- Secondary UOM (g, ml)
conversion_factor     NUMERIC(10,4)    -- Conversion (e.g., 1 kg = 1000 g)

-- Tax compliance
hsn_code              VARCHAR(20)      -- HSN code for tax/customs

-- Pack size
pack_size             VARCHAR(50)      -- e.g., "10x10 blister", "100ml bottle"

-- Packaging details
primary_packaging     VARCHAR(255)     -- blister, bottle, strip, vial
secondary_packaging   VARCHAR(255)     -- carton, box, shipper
units_per_pack        INTEGER          -- Units per package

-- Regulatory
regulatory_approvals  JSON             -- USFDA, EMA, WHO, TGA approvals
```

### pi_item (2 new fields)
```sql
hsn_code              VARCHAR(20)      -- Tax compliance (copied from medicine_master)
pack_size             VARCHAR(50)      -- Pack size for this item
```

### purchase_order (19 new fields)
```sql
-- Quality requirements
require_coa           BOOLEAN          -- Require Certificate of Analysis
require_bmr           BOOLEAN          -- Require Batch Manufacturing Record
require_msds          BOOLEAN          -- Require Material Safety Data Sheet
sample_quantity       INTEGER          -- Sample requirements
shelf_life_minimum    INTEGER          -- Minimum shelf life in days

-- Shipping & billing
ship_to               TEXT             -- Shipping address
bill_to               TEXT             -- Billing address
buyer_reference_no    VARCHAR(100)     -- Internal reference number
buyer_contact_person  VARCHAR(100)     -- Contact person name
transport_mode        VARCHAR(50)      -- Road, Air, Sea, Rail

-- Freight & payment
freight_terms         VARCHAR(50)      -- FOB, CIF, Ex-Works, DDP
payment_terms         VARCHAR(255)     -- "30 days from invoice date"

-- Currency
currency_code         VARCHAR(3)       -- USD, EUR, INR (default: INR)

-- Amendment tracking
amendment_number      INTEGER          -- 0 = original, 1+ = amendment
amendment_date        DATE             -- Amendment date
original_po_id        INTEGER          -- FK to original PO

-- Approval metadata
prepared_by           INTEGER          -- FK to users (who prepared)
checked_by            INTEGER          -- FK to users (who checked)
approved_by           INTEGER          -- FK to users (who approved)
verified_by           INTEGER          -- FK to users (who verified)
```

### po_item (26 new fields)
```sql
-- Tax compliance
hsn_code                      VARCHAR(20)      -- Tax compliance
gst_rate                      NUMERIC(5,2)     -- 5%, 12%, 18%, 28%

-- Pack size
pack_size                     VARCHAR(50)      -- Pack size for this item

-- Artwork & packaging (PM/Printing specific)
artwork_file_url              TEXT             -- Link to artwork file
artwork_approval_ref          VARCHAR(100)     -- Approval reference number
gsm                           NUMERIC(10,2)    -- Paper/cardboard GSM
ply                           VARCHAR(20)      -- Ply count for boxes
box_dimensions                VARCHAR(100)     -- LxWxH in mm
color_spec                    VARCHAR(255)     -- CMYK, Pantone codes
printing_instructions         TEXT             -- Printing details
die_cut_info                  TEXT             -- Die cutting specs
plate_charges                 NUMERIC(15,2)    -- Plate making charges

-- Quality specifications
specification_reference       VARCHAR(100)     -- Internal spec document
test_method                   VARCHAR(255)     -- USP, BP, IP, Ph.Eur

-- Delivery schedule
delivery_schedule_type        VARCHAR(50)      -- Immediately, Within X days
delivery_date                 DATE             -- Specific delivery date
delivery_window_start         DATE             -- Delivery window start
delivery_window_end           DATE             -- Delivery window end

-- Tolerances
quantity_tolerance_percentage NUMERIC(5,2)     -- ±5%, ±10%
price_tolerance_percentage    NUMERIC(5,2)     -- Price variance allowed

-- Discount
discount_percentage           NUMERIC(5,2)     -- Trade discount
```

### vendor_invoice (11 new fields)
```sql
-- Tax compliance
hsn_code              VARCHAR(20)      -- HSN code (must match PO item)
gst_rate              NUMERIC(5,2)     -- GST rate applied
gst_amount            NUMERIC(15,2)    -- GST amount calculated

-- Freight & insurance
freight_charges       NUMERIC(15,2)    -- Freight charges
insurance_charges     NUMERIC(15,2)    -- Insurance charges

-- Currency support
currency_code         VARCHAR(3)       -- Invoice currency
exchange_rate         NUMERIC(12,6)    -- Exchange rate if foreign currency
base_currency_amount  NUMERIC(15,2)    -- Amount in base currency (INR)

-- Batch tracking (CRITICAL for pharma)
batch_number          VARCHAR(100)     -- Vendor batch/lot number
manufacturing_date    DATE             -- Manufacturing date
expiry_date           DATE             -- Expiry date
```

### po_terms_conditions (NEW TABLE - 3 fields)
```sql
id                    SERIAL PRIMARY KEY
po_id                 INTEGER          -- FK to purchase_order
term_text             TEXT             -- T&C text
priority              INTEGER          -- Display order
created_at            TIMESTAMP        -- Creation timestamp
```

## 🎯 Field Usage by PO Type

### RM (Raw Material) PO
**Required Fields**:
- hsn_code ✅
- gst_rate ✅
- pack_size ✅
- specification_reference ✅
- test_method ✅
- require_coa ✅
- require_msds ✅
- batch_number (in invoice) ✅

**Optional Fields**:
- delivery_schedule
- quantity_tolerance_percentage
- shelf_life_minimum

**NOT Used**:
- Artwork fields (PM specific)

### PM (Packaging Material) PO
**Required Fields**:
- hsn_code ✅
- gst_rate ✅
- pack_size ✅
- language ✅
- artwork_version ✅
- artwork_file_url ✅
- gsm ✅
- box_dimensions ✅

**Optional Fields**:
- ply
- color_spec
- printing_instructions
- die_cut_info
- plate_charges
- artwork_approval_ref

**NOT Used**:
- test_method (not applicable)

### FG (Finished Goods) PO
**Required Fields**:
- hsn_code ✅
- gst_rate ✅
- pack_size ✅
- delivery_schedule_type ✅
- require_coa ✅
- batch_number (in invoice) ✅
- expiry_date (in invoice) ✅

**Optional Fields**:
- specification_reference
- test_method
- shelf_life_minimum

**NOT Used**:
- Artwork fields (PM specific)

## 🔄 Auto-Population Rules

### From medicine_master → pi_item
```
hsn_code: Auto-populate (user can override)
pack_size: Auto-populate (user can override)
```

### From medicine_master → po_item
```
hsn_code: Auto-populate (user can override)
pack_size: Auto-populate (user can override)
gst_rate: Use default from configuration or user selects
```

### From po_item → vendor_invoice
```
hsn_code: Must match (validation required)
medicine_id: Must match (validation required)
```

### From vendor → purchase_order
```
credit_days → payment_terms: "Credit {credit_days} days from invoice date"
```

## 📊 Validation Rules

### HSN Code
- Format: 4-8 digits (India standard)
- Must be consistent across PI → PO → Invoice
- Log warning if HSN code changes from medicine_master default

### GST Rate
- Allowed values: 0%, 5%, 12%, 18%, 28%
- Used for reference only in PO (actual tax in invoice)
- Formula: `gst_amount = total_amount * (gst_rate / 100)`

### Pack Size
- Free text but suggest standardized format
- Examples: "10x10 blister", "100 tablets", "500ml bottle"

### Batch Number
- Required in vendor_invoice for RM/PM/FG
- Format: Vendor-specific
- Must be unique per vendor per medicine

### Expiry Date
- Must be > manufacturing_date
- Must be >= shelf_life_minimum (from PO)
- Alert if expiry within 6 months

### Currency
- Must match vendor.country_id default currency (if set)
- Exchange rate required if currency_code != 'INR'
- Formula: `base_currency_amount = net_amount * exchange_rate`

## 🎨 UI Field Groups

### Medicine Master Form
**Tab 1: Basic Info**
- medicine_code, medicine_name, description

**Tab 2: Units & Packaging**
- primary_unit, secondary_unit, conversion_factor
- pack_size
- primary_packaging, secondary_packaging, units_per_pack

**Tab 3: Tax & Regulatory**
- hsn_code
- regulatory_approvals (JSON editor)

**Tab 4: Vendor Mappings**
- manufacturer_vendor_id, rm_vendor_id, pm_vendor_id

### PO Form
**Section 1: Basic Info**
- po_number, po_date, po_type, vendor_id, delivery_date

**Section 2: Quality Requirements** (collapsible)
- require_coa, require_bmr, require_msds
- sample_quantity, shelf_life_minimum

**Section 3: Shipping & Billing** (collapsible)
- ship_to, bill_to
- buyer_reference_no, buyer_contact_person
- transport_mode, freight_terms

**Section 4: Payment Terms** (collapsible)
- payment_terms, currency_code

**Section 5: Approval** (collapsible)
- prepared_by, checked_by, approved_by, verified_by

**Section 6: Terms & Conditions** (collapsible)
- Multi-line editor with priority ordering

### PO Item Form (Conditional)
**Always Show**:
- medicine_id, ordered_quantity, unit
- hsn_code, gst_rate, pack_size

**Show if po_type === 'PM'**:
- language, artwork_version, artwork_file_url
- gsm, ply, box_dimensions, color_spec
- printing_instructions, die_cut_info, plate_charges

**Show if po_type === 'RM'**:
- specification_reference, test_method

**Show for All Types**:
- delivery_schedule_type, delivery_date
- quantity_tolerance_percentage
- discount_percentage

### Vendor Invoice Form
**Section 1: Basic Info**
- invoice_number, invoice_date, po_id, medicine_id

**Section 2: Quantities & Pricing**
- shipped_quantity, unit_price, total_amount
- discount_amount

**Section 3: Tax** (auto-calculate)
- hsn_code (readonly from PO)
- gst_rate, gst_amount (calculated)
- tax_amount

**Section 4: Freight**
- freight_charges, insurance_charges

**Section 5: Batch Info** (CRITICAL)
- batch_number, manufacturing_date, expiry_date

**Section 6: Currency** (if foreign)
- currency_code, exchange_rate, base_currency_amount

**Section 7: Payment**
- net_amount (calculated)
- payment_status, payment_date

## 💾 Database Indexes Summary

### New Indexes Created
```sql
-- product_master
CREATE INDEX idx_product_hsn ON product_master(hsn_code);

-- medicine_master
CREATE INDEX idx_medicine_hsn ON medicine_master(hsn_code);

-- pi_item
CREATE INDEX idx_pi_item_hsn ON pi_item(hsn_code);

-- purchase_order
CREATE INDEX idx_po_original ON purchase_order(original_po_id);

-- po_item
CREATE INDEX idx_po_item_hsn ON po_item(hsn_code);

-- vendor_invoice
CREATE INDEX idx_vendor_invoice_batch ON vendor_invoice(batch_number);
CREATE INDEX idx_vendor_invoice_hsn ON vendor_invoice(hsn_code);

-- po_terms_conditions
CREATE INDEX idx_po_terms_po ON po_terms_conditions(po_id);
CREATE INDEX idx_po_terms_priority ON po_terms_conditions(priority);
```

## 🔍 Query Examples

### Get all PO items with HSN and GST for a PO
```sql
SELECT 
    poi.id,
    m.medicine_name,
    poi.ordered_quantity,
    poi.hsn_code,
    poi.gst_rate,
    poi.pack_size
FROM po_item poi
JOIN medicine_master m ON poi.medicine_id = m.id
WHERE poi.po_id = 123;
```

### Get vendor invoices with batch expiry alerts (< 6 months)
```sql
SELECT 
    vi.invoice_number,
    vi.batch_number,
    vi.expiry_date,
    m.medicine_name,
    (vi.expiry_date - CURRENT_DATE) as days_to_expiry
FROM vendor_invoice vi
JOIN medicine_master m ON vi.medicine_id = m.id
WHERE vi.expiry_date < CURRENT_DATE + INTERVAL '6 months'
  AND vi.payment_status = 'PAID'
ORDER BY vi.expiry_date;
```

### Get PM POs with artwork specifications
```sql
SELECT 
    po.po_number,
    m.medicine_name,
    poi.language,
    poi.artwork_version,
    poi.gsm,
    poi.box_dimensions,
    poi.color_spec
FROM purchase_order po
JOIN po_item poi ON poi.po_id = po.id
JOIN medicine_master m ON poi.medicine_id = m.id
WHERE po.po_type = 'PM'
  AND poi.artwork_file_url IS NOT NULL;
```

### Get PO with all approval metadata
```sql
SELECT 
    po.po_number,
    u1.username as prepared_by_name,
    u2.username as checked_by_name,
    u3.username as approved_by_name,
    u4.username as verified_by_name
FROM purchase_order po
LEFT JOIN users u1 ON po.prepared_by = u1.id
LEFT JOIN users u2 ON po.checked_by = u2.id
LEFT JOIN users u3 ON po.approved_by = u3.id
LEFT JOIN users u4 ON po.verified_by = u4.id
WHERE po.id = 123;
```

### Get PO with terms & conditions
```sql
SELECT 
    tc.priority,
    tc.term_text
FROM po_terms_conditions tc
WHERE tc.po_id = 123
ORDER BY tc.priority;
```

---

**Quick Reference Version 1.0 - 2025-11-15**
