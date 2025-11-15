# Schema Enhancement Guide - HSN, GST, Packaging, Quality Fields

**Date**: 2025-11-15  
**Status**: Schema Updated - Migration Pending  
**Impact**: Major - All models, schemas, services, and frontend affected

## 📋 Executive Summary

Based on analysis of PDF documents (PI, EOPA, FG PO, RM PO, PM PO, Printing Material PO), we've identified **20 critical gaps** in the database schema. The schema has been updated to include all required fields for India compliance, pharmaceutical quality standards, and comprehensive procurement workflows.

## 🔥 Critical Enhancements Overview

### 1. HSN Code (Tax Compliance)
- **Impact**: ALL RM/PM/FG POs and invoices
- **Tables Affected**: product_master, medicine_master, pi_item, po_item, vendor_invoice
- **Fields Added**: `hsn_code VARCHAR(20)`
- **Indexes**: Added HSN indexes for performance

### 2. GST Fields (India Compliance)
- **Impact**: Vendor invoices and PO reference
- **Tables Affected**: po_item, vendor_invoice
- **Fields Added**: 
  - `gst_rate NUMERIC(5,2)` - 5%, 12%, 18%, 28%
  - `gst_amount NUMERIC(15,2)` - Calculated GST

### 3. Pack Size
- **Impact**: PI, EOPA, PO (all types)
- **Tables Affected**: medicine_master, pi_item, po_item
- **Fields Added**: `pack_size VARCHAR(50)` - e.g., "10x10 blister", "100ml bottle"

### 4. Artwork & Packaging Specifications (PM/Printing)
- **Impact**: PM and Printing Material POs
- **Table**: po_item
- **Fields Added**:
  - `gsm NUMERIC(10,2)` - Paper/cardboard GSM
  - `ply VARCHAR(20)` - Ply count for corrugated boxes
  - `box_dimensions VARCHAR(100)` - LxWxH in mm
  - `color_spec VARCHAR(255)` - CMYK, Pantone codes
  - `printing_instructions TEXT` - Printing details
  - `die_cut_info TEXT` - Die cutting specifications
  - `plate_charges NUMERIC(15,2)` - Plate making charges
  - `artwork_file_url TEXT` - Link to artwork file
  - `artwork_approval_ref VARCHAR(100)` - Approval reference

### 5. Quality Requirements
- **Impact**: All POs (RM/PM/FG)
- **Table**: purchase_order
- **Fields Added**:
  - `require_coa BOOLEAN` - Certificate of Analysis
  - `require_bmr BOOLEAN` - Batch Manufacturing Record
  - `require_msds BOOLEAN` - Material Safety Data Sheet
  - `sample_quantity INTEGER` - Sample requirements
  - `shelf_life_minimum INTEGER` - Minimum shelf life days

### 6. Shipping & Billing Information
- **Impact**: All POs
- **Table**: purchase_order
- **Fields Added**:
  - `ship_to TEXT` - Shipping address
  - `bill_to TEXT` - Billing address
  - `buyer_reference_no VARCHAR(100)` - Internal reference
  - `buyer_contact_person VARCHAR(100)` - Contact person
  - `transport_mode VARCHAR(50)` - Road, Air, Sea, Rail

### 7. PO Terms & Conditions
- **Impact**: All POs
- **New Table**: `po_terms_conditions`
- **Fields**:
  - `po_id` - Reference to PO
  - `term_text TEXT` - T&C text
  - `priority INTEGER` - Display order

### 8. Approval Metadata
- **Impact**: All POs (found in FG PO PDF)
- **Table**: purchase_order
- **Fields Added**:
  - `prepared_by INTEGER` - User who prepared
  - `checked_by INTEGER` - User who checked
  - `approved_by INTEGER` - User who approved
  - `verified_by INTEGER` - User who verified

### 9. Delivery Schedule
- **Impact**: PO items
- **Table**: po_item
- **Fields Added**:
  - `delivery_schedule_type VARCHAR(50)` - Immediately, Within X days
  - `delivery_date DATE` - Specific delivery date
  - `delivery_window_start DATE` - Delivery window start
  - `delivery_window_end DATE` - Delivery window end

### 10. Multi-Language PM
- **Impact**: PM POs
- **Table**: po_item (language already exists)
- **Fields Added**:
  - `artwork_file_url TEXT`
  - `artwork_approval_ref VARCHAR(100)`

## 🆕 Additional Critical Gaps (AI-Identified)

### 11. Batch/Lot Tracking (Critical for Pharma)
- **Impact**: Vendor invoices
- **Table**: vendor_invoice
- **Fields Added**:
  - `batch_number VARCHAR(100)` - Vendor batch/lot number
  - `manufacturing_date DATE` - Manufacturing date
  - `expiry_date DATE` - Expiry date
- **Index**: Added batch_number index

### 12. Unit of Measurement Standardization
- **Impact**: Medicine master
- **Table**: medicine_master
- **Fields Added**:
  - `primary_unit VARCHAR(20)` - Primary UOM (kg, liter, piece)
  - `secondary_unit VARCHAR(20)` - Secondary UOM (g, ml)
  - `conversion_factor NUMERIC(10,4)` - Conversion (1 kg = 1000 g)

### 13. Discount & Payment Terms
- **Impact**: POs and vendor master
- **Tables**: purchase_order, po_item, vendor
- **Fields Added**:
  - `payment_terms VARCHAR(255)` in purchase_order
  - `credit_days INTEGER` in vendor
  - `discount_percentage NUMERIC(5,2)` in po_item

### 14. Amendment/Revision Tracking
- **Impact**: POs
- **Table**: purchase_order
- **Fields Added**:
  - `amendment_number INTEGER` - 0 = original, 1+ = amendment
  - `amendment_date DATE` - Amendment date
  - `original_po_id INTEGER` - Reference to original PO

### 15. Regulatory Compliance Fields
- **Impact**: Vendor and medicine master
- **Tables**: vendor, medicine_master
- **Fields Added in vendor**:
  - `drug_license_number VARCHAR(100)`
  - `gmp_certified BOOLEAN`
  - `iso_certified BOOLEAN`
- **Fields Added in medicine_master**:
  - `regulatory_approvals JSON` - USFDA, EMA, WHO, TGA

### 16. Freight & Insurance
- **Impact**: POs and vendor invoices
- **Tables**: purchase_order, vendor_invoice
- **Fields Added in purchase_order**:
  - `freight_terms VARCHAR(50)` - FOB, CIF, Ex-Works
- **Fields Added in vendor_invoice**:
  - `freight_charges NUMERIC(15,2)`
  - `insurance_charges NUMERIC(15,2)`

### 17. Tolerances
- **Impact**: PO items
- **Table**: po_item
- **Fields Added**:
  - `quantity_tolerance_percentage NUMERIC(5,2)` - ±5%, ±10%
  - `price_tolerance_percentage NUMERIC(5,2)` - Price variance

### 18. Multi-Currency Support
- **Impact**: POs and vendor invoices
- **Tables**: purchase_order, vendor_invoice
- **Fields Added in purchase_order**:
  - `currency_code VARCHAR(3)` - USD, EUR, INR
- **Fields Added in vendor_invoice**:
  - `currency_code VARCHAR(3)`
  - `exchange_rate NUMERIC(12,6)`
  - `base_currency_amount NUMERIC(15,2)` - Amount in base currency

### 19. Packaging Details (Beyond PM)
- **Impact**: Medicine master
- **Table**: medicine_master
- **Fields Added**:
  - `primary_packaging VARCHAR(255)` - blister, bottle, strip
  - `secondary_packaging VARCHAR(255)` - carton, box
  - `units_per_pack INTEGER`

### 20. Quality Specifications
- **Impact**: PO items
- **Table**: po_item
- **Fields Added**:
  - `specification_reference VARCHAR(100)` - Internal spec doc
  - `test_method VARCHAR(255)` - USP, BP, IP, Ph.Eur

## 📊 Summary Statistics

| Category | Tables Affected | New Fields | New Tables | New Indexes |
|----------|----------------|------------|------------|-------------|
| Tax Compliance | 5 | 8 | 0 | 4 |
| Packaging | 3 | 18 | 0 | 0 |
| Quality | 2 | 7 | 0 | 0 |
| Shipping | 1 | 5 | 0 | 0 |
| Approval | 1 | 4 | 0 | 0 |
| Batch Tracking | 1 | 3 | 0 | 1 |
| Regulatory | 2 | 5 | 0 | 0 |
| Payment | 2 | 3 | 0 | 0 |
| Amendment | 1 | 3 | 0 | 1 |
| T&Cs | 0 | 0 | 1 | 2 |
| **TOTAL** | **13** | **78** | **1** | **8** |

## 🛠️ Migration Strategy

### Phase 1: Database Migration (Alembic)
**Priority**: CRITICAL  
**Estimated Effort**: 2-3 days

1. **Create Alembic migration script**:
```bash
alembic revision --autogenerate -m "add_hsn_gst_packaging_quality_fields"
```

2. **Manual adjustments needed**:
   - Add indexes explicitly (Alembic may miss some)
   - Add comments (COMMENT ON COLUMN)
   - Set default values carefully
   - Create po_terms_conditions table

3. **Test migration**:
```bash
# Test on dev database
alembic upgrade head

# Verify all columns created
\d+ medicine_master
\d+ po_item
\d+ vendor_invoice
\d+ po_terms_conditions
```

4. **Data migration considerations**:
   - Existing PO items will have NULL for new fields (acceptable)
   - HSN codes can be populated from medicine_master via UPDATE
   - Pack size can be populated from medicine_master
   - Regulatory fields default to FALSE (safe)

### Phase 2: SQLAlchemy Models Update
**Priority**: CRITICAL  
**Estimated Effort**: 1-2 days

Update these model files:

1. **`backend/app/models/vendor.py`**:
   - Add drug_license_number, gmp_certified, iso_certified, credit_days

2. **`backend/app/models/product.py`**:
   - Add hsn_code

3. **`backend/app/models/medicine.py`**:
   - Add hsn_code, pack_size, primary_unit, secondary_unit, conversion_factor
   - Add primary_packaging, secondary_packaging, units_per_pack
   - Add regulatory_approvals (JSON)

4. **`backend/app/models/pi.py`**:
   - Add hsn_code, pack_size to PIItem

5. **`backend/app/models/po.py`**:
   - Add ALL new fields to PurchaseOrder (quality, shipping, approval, payment, etc.)
   - Add ALL new fields to POItem (HSN, GST, pack size, artwork, quality, delivery, tolerances)

6. **`backend/app/models/invoice.py`**:
   - Add HSN, GST, batch tracking, freight/insurance, currency fields

7. **NEW: `backend/app/models/po_terms.py`**:
   - Create POTermsConditions model

### Phase 3: Pydantic Schemas Update
**Priority**: CRITICAL  
**Estimated Effort**: 2-3 days

Update schema files to include all new fields:

1. **`backend/app/schemas/vendor.py`**:
   - Add regulatory and payment fields to VendorCreate, VendorUpdate, VendorResponse

2. **`backend/app/schemas/medicine.py`**:
   - Add all new fields (HSN, pack size, packaging, units, regulatory)

3. **`backend/app/schemas/pi.py`**:
   - Add hsn_code, pack_size to PIItemCreate, PIItemResponse

4. **`backend/app/schemas/po.py`**:
   - Add ALL new fields to POCreate, POUpdate, POResponse
   - Add ALL new fields to POItemCreate, POItemResponse
   - Create POTermsConditionsCreate, POTermsConditionsResponse

5. **`backend/app/schemas/invoice.py`**:
   - Add all new fields to VendorInvoiceCreate, VendorInvoiceResponse

**Schema Ordering Reminder**:
- Define "leaf" schemas first (no dependencies)
- Use `Optional[X]` for new fields to maintain backward compatibility

### Phase 4: Service Layer Updates
**Priority**: HIGH  
**Estimated Effort**: 3-4 days

1. **`backend/app/services/medicine_service.py`**:
   - Auto-populate HSN code in PI items from medicine_master
   - Auto-populate pack_size in PI items from medicine_master

2. **`backend/app/services/po_service.py`**:
   - Auto-populate HSN code in PO items from medicine_master
   - Auto-populate pack_size in PO items from medicine_master
   - Handle PO terms & conditions creation
   - Handle approval metadata workflow

3. **`backend/app/services/invoice_service.py`**:
   - Validate HSN code matches PO item
   - Calculate GST amount from gst_rate and total_amount
   - Handle batch tracking
   - Handle currency conversion

4. **`backend/app/services/pdf_service.py`**:
   - Update PO PDF templates to include:
     - HSN codes in item table
     - GST rates
     - Pack sizes
     - Artwork specs (for PM POs)
     - Quality requirements section
     - Terms & conditions section
     - Approval signatures (prepared, checked, approved, verified)
     - Shipping/billing addresses

5. **NEW: `backend/app/services/po_terms_service.py`**:
   - CRUD operations for PO terms & conditions

### Phase 5: API Router Updates
**Priority**: HIGH  
**Estimated Effort**: 1-2 days

Update routers to accept and return new fields:

1. **`backend/app/routers/po.py`**:
   - Update create_po endpoint to accept all new fields
   - Add endpoint for PO terms & conditions: POST /api/po/{po_id}/terms
   - Update PO response to include terms & conditions

2. **`backend/app/routers/invoice.py`**:
   - Update create_invoice to accept HSN, GST, batch, currency fields
   - Add validation for HSN code matching

### Phase 6: Frontend Updates
**Priority**: MEDIUM  
**Estimated Effort**: 4-5 days

#### 6.1 Medicine Master Form
- Add HSN code field
- Add pack size field
- Add primary/secondary unit fields with conversion factor
- Add packaging details (primary, secondary, units_per_pack)
- Add regulatory approvals (JSONB editor)

#### 6.2 PI Form
- Auto-populate HSN code from medicine_master (editable)
- Auto-populate pack_size from medicine_master (editable)

#### 6.3 PO Form
- **Quality Requirements Section** (checkbox group):
  - Require COA, BMR, MSDS
  - Sample quantity input
  - Shelf life minimum (days)

- **Shipping & Billing Section**:
  - Ship-to address (textarea)
  - Bill-to address (textarea)
  - Buyer reference number
  - Contact person
  - Transport mode (dropdown)

- **Approval Metadata Section**:
  - Prepared by (user dropdown)
  - Checked by (user dropdown)
  - Approved by (user dropdown)
  - Verified by (user dropdown)

- **Terms & Conditions Section**:
  - Multi-line text editor
  - Add/Remove term buttons
  - Priority ordering (drag-drop)

#### 6.4 PO Item Form (Conditional based on PO type)
- **Common Fields**:
  - HSN code (auto-populated, editable)
  - GST rate (dropdown: 5%, 12%, 18%, 28%)
  - Pack size (auto-populated, editable)
  - Delivery schedule (immediate, custom date, window)
  - Quantity tolerance (%)
  - Discount (%)

- **PM/Printing Specific Fields** (show if po_type === 'PM'):
  - Language (dropdown from config)
  - Artwork version (dropdown from config)
  - Artwork file upload/URL
  - Artwork approval reference
  - GSM (numeric)
  - Ply (text)
  - Box dimensions (LxWxH)
  - Color specification (text)
  - Printing instructions (textarea)
  - Die cut info (textarea)
  - Plate charges (numeric)

- **Quality Spec Fields**:
  - Specification reference (text)
  - Test method (dropdown: USP, BP, IP, Ph.Eur)

#### 6.5 Vendor Invoice Form
- Add HSN code field (must match PO item)
- Add GST rate dropdown
- Add GST amount (auto-calculated)
- Add batch number field
- Add manufacturing date (date picker)
- Add expiry date (date picker)
- Add freight charges
- Add insurance charges
- Add currency dropdown
- Add exchange rate (if foreign currency)

#### 6.6 PDF Preview
- Update PO PDF preview to show all new sections
- Add artwork specifications table (for PM POs)
- Add quality requirements section
- Add terms & conditions section
- Add approval signatures section

### Phase 7: Testing
**Priority**: CRITICAL  
**Estimated Effort**: 2-3 days

#### 7.1 Unit Tests
- Test model relationships
- Test schema validation
- Test service logic for auto-population
- Test GST calculation
- Test HSN validation
- Test currency conversion

#### 7.2 Integration Tests
- Test complete PI → EOPA → PO → Invoice workflow with new fields
- Test PM PO with artwork specifications
- Test RM PO with quality requirements
- Test FG PO with all sections
- Test PO amendment workflow

#### 7.3 UI Tests
- Test conditional rendering of PM fields
- Test auto-population of HSN and pack size
- Test terms & conditions editor
- Test approval workflow

## 📝 Implementation Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Review all PDF documents for field requirements
- [ ] Document current data state (how many POs, invoices exist)
- [ ] Identify any custom reports that need updates

### Migration
- [ ] Create Alembic migration script
- [ ] Test migration on dev database
- [ ] Verify all indexes created
- [ ] Test rollback (alembic downgrade -1)
- [ ] Document any manual data migration steps

### Model Updates
- [ ] Update Vendor model
- [ ] Update Product model
- [ ] Update Medicine model
- [ ] Update PI/PIItem models
- [ ] Update PO/POItem models
- [ ] Update VendorInvoice model
- [ ] Create POTermsConditions model
- [ ] Update __init__.py imports

### Schema Updates
- [ ] Update vendor schemas
- [ ] Update medicine schemas
- [ ] Update PI schemas
- [ ] Update PO schemas (huge update)
- [ ] Update invoice schemas
- [ ] Create PO terms schemas
- [ ] Test schema validation with pytest

### Service Updates
- [ ] Update medicine_service (auto-populate HSN, pack_size)
- [ ] Update po_service (handle all new fields, terms, approval)
- [ ] Update invoice_service (HSN validation, GST calc, batch tracking)
- [ ] Update pdf_service (all new sections in PO PDF)
- [ ] Create po_terms_service
- [ ] Add logging for all new operations

### Router Updates
- [ ] Update PO router
- [ ] Add PO terms endpoints
- [ ] Update invoice router
- [ ] Test all endpoints with Postman/curl

### Frontend Updates
- [ ] Update Medicine Master form
- [ ] Update PI form
- [ ] Update PO form (major update)
- [ ] Update PO item form (conditional rendering)
- [ ] Update Invoice form
- [ ] Update PO PDF component
- [ ] Test all forms with different PO types

### Testing
- [ ] Write unit tests for new models
- [ ] Write unit tests for new services
- [ ] Write integration tests for workflows
- [ ] Write UI tests for new forms
- [ ] Perform end-to-end testing
- [ ] Performance testing (check query performance with indexes)

### Documentation
- [ ] Update API documentation
- [ ] Update user manual
- [ ] Create video tutorials for new fields
- [ ] Update copilot-instructions.md

### Deployment
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Gather user feedback

## 🚨 Risk Mitigation

### High Risk Areas
1. **PO PDF Generation**: Many new fields to display conditionally
   - **Mitigation**: Template-based approach, separate templates for RM/PM/FG

2. **Backward Compatibility**: Existing POs don't have new data
   - **Mitigation**: All new fields are optional (nullable or default values)

3. **HSN Code Validation**: Must be consistent across PI → PO → Invoice
   - **Mitigation**: Add validation service, log mismatches

4. **GST Calculation**: Must be accurate for compliance
   - **Mitigation**: Use Decimal type, add unit tests, log all calculations

5. **Frontend Complexity**: Conditional rendering based on PO type
   - **Mitigation**: Component composition, shared field components

### Medium Risk Areas
1. **Data Migration**: Populating HSN/pack_size in existing records
2. **Performance**: Additional fields may slow down queries
3. **User Training**: Many new fields to explain

## 💡 Recommendations

### Immediate Actions
1. **Start with Alembic migration** - This unblocks everything else
2. **Update models in parallel** - Multiple developers can work on different models
3. **Create comprehensive test data** - Include all PO types with all field combinations

### Best Practices
1. **Use Enums for dropdowns**: GST rates, transport modes, test methods
2. **Add field validation at service layer**: Don't rely only on database constraints
3. **Log all auto-population**: Log when HSN/pack_size is copied from medicine_master
4. **Use transactions**: All PO + PO items + PO terms should be in one transaction
5. **Add field-level help text**: Especially for technical fields (GSM, PLY, HSN)

### Future Enhancements
1. **HSN Master Table**: Create separate table for HSN codes with descriptions
2. **Artwork Management**: Separate module for artwork versioning and approval
3. **Batch Inventory**: Track batch-level inventory with expiry alerts
4. **Automated GST Return**: Generate GST return reports from vendor_invoice
5. **Multi-Language Support**: Store T&Cs in multiple languages

## 📞 Support & Questions

If you need clarification on any field or requirement, refer to the PDF documents in `pdf/` folder:
- `PROFORMA INVOICE PART 1.pdf` - PI format reference
- `EOPA 25-26 008 PART 2.pdf` - EOPA format reference
- `FINISH GOOD PART 3.pdf` - FG PO format reference
- `PACKING MATERIAL PART 4 A.pdf` - PM PO format reference
- `PRINTING MATERIAL PART 4 B.pdf` - Printing PO format reference
- `RAW MATERIAL PART 4 C.pdf` - RM PO format reference

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Database Migration | 2-3 days | None |
| Model Updates | 1-2 days | Database Migration |
| Schema Updates | 2-3 days | Model Updates |
| Service Updates | 3-4 days | Schema Updates |
| Router Updates | 1-2 days | Service Updates |
| Frontend Updates | 4-5 days | Router Updates |
| Testing | 2-3 days | All above |
| Documentation | 1-2 days | Testing complete |
| **TOTAL** | **16-24 days** | Sequential execution |

With **3 developers working in parallel**:
- Developer 1: Backend (Migration → Models → Schemas → Services)
- Developer 2: Backend (Routers → Tests)
- Developer 3: Frontend (Forms → PDF → Tests)

**Optimistic Timeline**: 10-12 days  
**Realistic Timeline**: 14-18 days  
**Pessimistic Timeline**: 20-24 days

---

**End of Schema Enhancement Guide**
