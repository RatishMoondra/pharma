# EOPA Vendor-Agnostic Workflow Implementation

## Date: November 15, 2025
## Status: READY FOR MIGRATION

---

## 1. Overview

This document describes the complete implementation of the revised vendor-agnostic EOPA workflow as requested in the business requirements.

### Previous Workflow
```
PI (with partner vendor) 
  → EOPA (with vendor_id + vendor_type per vendor type)
  → PO (using EOPA's vendor)
```

### New Workflow
```
PI (with partner vendor)
  → EOPA (ONLY medicine details, NO vendor)
  → PO (vendor resolved from Medicine Master)
```

---

## 2. Architecture Changes

### 2.1 EOPA Model Changes

**REMOVED Fields:**
- `vendor_id` (Foreign Key to vendors table)
- `vendor_type` (String field: MANUFACTURER, RM, PM)
- `vendor` relationship

**RETAINED Fields:**
- `eopa_number` (Unique identifier)
- `eopa_date`
- `pi_item_id` (Links to PI item)
- `status` (PENDING, APPROVED, REJECTED)
- `quantity`, `estimated_unit_price`, `estimated_total`
- `remarks`
- Audit fields: `created_by`, `approved_by`, timestamps

**NEW Behavior:**
- ONE EOPA per PI item (vendor-agnostic)
- Vendor resolution happens during PO generation
- Vendors selected from Medicine Master based on product type

### 2.2 EOPA Schema Changes

**EOPACreate:**
```python
# BEFORE
{
    "pi_item_id": int,
    "vendor_type": str,  # REMOVED
    "vendor_id": int,    # REMOVED
    "quantity": float,
    "estimated_unit_price": float,
    "remarks": str (optional)
}

# AFTER
{
    "pi_item_id": int,
    "quantity": float,
    "estimated_unit_price": float,
    "remarks": str (optional)
}
```

**EOPAResponse:**
```python
# BEFORE - included vendor info
{
    ...,
    "vendor_type": str,
    "vendor_id": int,
    "vendor": VendorBasic
}

# AFTER - NO vendor fields
{
    ...,
    "pi_item": PIItemBasic  # Contains medicine with Medicine Master vendors
}
```

**EOPABulkCreateRequest:**
- **DEPRECATED** - No longer needed
- Previous version created 3 EOPAs (one per vendor type)
- New version creates 1 EOPA (vendor-agnostic)

---

## 3. Database Migration

### 3.1 Migration Script

**File:** `backend/scripts/migrate_eopa_vendor_agnostic.py`

**Actions:**
1. Drop foreign key constraint `eopa_vendor_id_fkey`
2. Drop column `vendor_id`
3. Drop column `vendor_type`
4. Preserve all existing EOPA records (but they lose vendor association)

**Usage:**
```bash
cd backend
.\venv\Scripts\python.exe .\scripts\migrate_eopa_vendor_agnostic.py
```

**Rollback:**
```bash
cd backend
.\venv\Scripts\python.exe .\scripts\migrate_eopa_vendor_agnostic.py rollback
```

### 3.2 Data Impact

**Existing EOPAs:**
- Will remain in database
- Vendor association is removed
- POs already generated will remain unchanged (they have their own vendor_id)
- **Recommendation:** After migration, regenerate POs from EOPAs using new Medicine Master-based vendor resolution

---

## 4. API Endpoint Changes

### 4.1 Create EOPA

**Endpoint:** `POST /api/eopa/`

**Request Body Change:**
```json
// BEFORE
{
  "pi_item_id": 1,
  "vendor_type": "MANUFACTURER",
  "vendor_id": 8,
  "quantity": 1000,
  "estimated_unit_price": 50.00,
  "remarks": "Test"
}

// AFTER
{
  "pi_item_id": 1,
  "quantity": 1000,
  "estimated_unit_price": 50.00,
  "remarks": "Test"
}
```

**Behavior Change:**
- No vendor selection required
- System checks if EOPA already exists for PI item (only ONE allowed)
- Vendor will be determined during PO generation from Medicine Master

### 4.2 NEW Endpoint: Bulk Create from PI

**Endpoint:** `POST /api/eopa/from-pi/{pi_id}`

**Purpose:** Create EOPAs for all PI items in one operation

**Response:**
```json
{
  "success": true,
  "message": "Created 5 EOPA(s) from PI PI/24-25/0001",
  "data": {
    "created": [<EOPA objects>],
    "skipped": [
      {
        "pi_item_id": 3,
        "medicine_name": "Aspirin",
        "reason": "EOPA already exists: EOPA/24-25/0008"
      }
    ]
  }
}
```

### 4.3 Update EOPA

**Endpoint:** `PUT /api/eopa/{eopa_id}`

**Request Body Change:**
```json
// BEFORE
{
  "vendor_id": 10,  // REMOVED
  "quantity": 1200,
  "estimated_unit_price": 52.00,
  "remarks": "Updated"
}

// AFTER
{
  "quantity": 1200,
  "estimated_unit_price": 52.00,
  "remarks": "Updated"
}
```

### 4.4 List/Get EOPAs

**No request changes, but response changes:**

```json
// BEFORE
{
  "id": 1,
  "vendor_type": "MANUFACTURER",  // REMOVED
  "vendor_id": 8,                 // REMOVED
  "vendor": {...},                // REMOVED
  "pi_item": {
    "medicine": {
      "manufacturer_vendor": {...},  // Available for PO generation
      "rm_vendor": {...},
      "pm_vendor": {...}
    }
  }
}

// AFTER
{
  "id": 1,
  "pi_item": {
    "medicine": {
      "manufacturer_vendor": {...},
      "rm_vendor": {...},
      "pm_vendor": {...}
    }
  }
}
```

**Key Point:** Vendor info is still available through `pi_item.medicine` relationships for PO generation, but NOT stored in EOPA itself.

---

## 5. PO Generation Changes (FUTURE IMPLEMENTATION)

### 5.1 Current PO Model

**No changes to PO table schema** - POs still have:
- `vendor_id` (selected during PO generation)
- `po_type` (RM/PM/FG)
- `eopa_id` (links back to EOPA)

### 5.2 NEW PO Generation Logic

**When generating PO from EOPA:**

1. **Load EOPA with Medicine Master vendors:**
```python
eopa = db.query(EOPA).options(
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.manufacturer_vendor),
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.rm_vendor),
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.pm_vendor)
).filter(EOPA.id == eopa_id).first()
```

2. **Determine PO type and vendor:**
```python
medicine = eopa.pi_item.medicine

# Logic to determine which PO to create
if medicine.manufacturer_vendor_id:
    # Create FG PO
    po_type = POType.FG
    vendor_id = medicine.manufacturer_vendor_id
    
elif medicine.rm_vendor_id:
    # Create RM PO
    po_type = POType.RM
    vendor_id = medicine.rm_vendor_id
    
elif medicine.pm_vendor_id:
    # Create PM PO with language consideration
    po_type = POType.PM
    vendor_id = medicine.pm_vendor_id
    # Check vendor.country.language for PM materials
```

3. **Create PO with resolved vendor:**
```python
po = PurchaseOrder(
    po_number=generate_po_number(db, po_type),
    po_type=po_type,
    eopa_id=eopa.id,
    vendor_id=vendor_id,  # From Medicine Master
    total_amount=eopa.estimated_total,
    ...
)
```

### 5.3 PO API Endpoint (To Be Updated)

**Endpoint:** `POST /api/po/generate-from-eopa/{eopa_id}`

**New Behavior:**
- Automatically determines PO type (FG/RM/PM)
- Automatically selects vendor from Medicine Master
- No manual vendor selection required
- Can generate multiple POs from single EOPA if multiple vendor types needed

---

## 6. Frontend Changes Required

### 6.1 EOPA Form Component

**File:** `frontend/src/components/EOPAForm.jsx`

**Changes:**
1. **REMOVE** vendor type selection dropdown
2. **REMOVE** vendor selection dropdown
3. **KEEP** only:
   - PI item selection
   - Quantity input
   - Estimated price input
   - Remarks textarea

**NEW Simplified Form:**
```jsx
<DialogContent>
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <TextField
        select
        label="PI Item"
        name="pi_item_id"
        value={formData.pi_item_id}
        onChange={handleChange}
        required
      >
        {piItems.map(item => (
          <MenuItem key={item.id} value={item.id}>
            {item.medicine.medicine_name} - Qty: {item.quantity}
          </MenuItem>
        ))}
      </TextField>
    </Grid>
    
    <Grid item xs={6}>
      <TextField
        label="Quantity"
        name="quantity"
        type="number"
        value={formData.quantity}
        onChange={handleChange}
        required
      />
    </Grid>
    
    <Grid item xs={6}>
      <TextField
        label="Estimated Unit Price"
        name="estimated_unit_price"
        type="number"
        value={formData.estimated_unit_price}
        onChange={handleChange}
        required
      />
    </Grid>
    
    <Grid item xs={12}>
      <TextField
        label="Remarks"
        name="remarks"
        multiline
        rows={2}
        value={formData.remarks}
        onChange={handleChange}
      />
    </Grid>
  </Grid>
</DialogContent>
```

### 6.2 EOPA Page Display

**File:** `frontend/src/pages/EOPAPage.jsx`

**Changes:**
1. **REMOVE** "Vendor Type" column from table
2. **REMOVE** "Vendor Name" column from table
3. **ADD** "Medicine Master Vendors" info section showing:
   - Manufacturer vendor (if mapped)
   - RM vendor (if mapped)
   - PM vendor (if mapped)

**NEW Table Columns:**
```jsx
<TableHead>
  <TableRow sx={{ bgcolor: 'primary.main' }}>
    <TableCell sx={{ color: 'white' }}>EOPA Number</TableCell>
    <TableCell sx={{ color: 'white' }}>PI Number</TableCell>
    <TableCell sx={{ color: 'white' }}>Medicine</TableCell>
    <TableCell sx={{ color: 'white' }}>Quantity</TableCell>
    <TableCell sx={{ color: 'white' }}>Est. Unit Price</TableCell>
    <TableCell sx={{ color: 'white' }}>Est. Total</TableCell>
    <TableCell sx={{ color: 'white' }}>Status</TableCell>
    <TableCell sx={{ color: 'white' }}>Actions</TableCell>
  </TableRow>
</TableHead>
```

**NEW Expandable Row - Medicine Master Vendors:**
```jsx
<Collapse in={open}>
  <Box sx={{ p: 2, bgcolor: 'info.50' }}>
    <Typography variant="subtitle2" gutterBottom>
      Medicine Master Vendor Mappings
    </Typography>
    
    {eopa.pi_item.medicine.manufacturer_vendor && (
      <Chip 
        icon={<Business />}
        label={`Manufacturer: ${eopa.pi_item.medicine.manufacturer_vendor.vendor_name}`}
        sx={{ mr: 1 }}
      />
    )}
    
    {eopa.pi_item.medicine.rm_vendor && (
      <Chip 
        icon={<Inventory2 />}
        label={`RM: ${eopa.pi_item.medicine.rm_vendor.vendor_name}`}
        sx={{ mr: 1 }}
      />
    )}
    
    {eopa.pi_item.medicine.pm_vendor && (
      <Chip 
        icon={<LocalShipping />}
        label={`PM: ${eopa.pi_item.medicine.pm_vendor.vendor_name}`}
      />
    )}
  </Box>
</Collapse>
```

### 6.3 PI to EOPA Bulk Conversion Button

**Add to PI Page:**
```jsx
<Button
  variant="contained"
  color="secondary"
  startIcon={<AssignmentIcon />}
  onClick={() => createEOPAsFromPI(pi.id)}
>
  Convert to EOPAs
</Button>
```

**API Call:**
```javascript
const createEOPAsFromPI = async (piId) => {
  try {
    const response = await api.post(`/api/eopa/from-pi/${piId}`)
    if (response.data.success) {
      alert(`Created ${response.data.data.created.length} EOPAs`)
      if (response.data.data.skipped.length > 0) {
        console.warn('Skipped items:', response.data.data.skipped)
      }
    }
  } catch (err) {
    console.error('Failed to create EOPAs:', err)
  }
}
```

---

## 7. Migration Steps

### 7.1 Pre-Migration Checklist

- [ ] Backup current database
- [ ] Document existing EOPA records (count, status distribution)
- [ ] Backup existing PO records
- [ ] Test migration script on copy of database

### 7.2 Migration Execution

**Step 1: Stop Backend Server**
```bash
# Stop uvicorn server (Ctrl+C)
```

**Step 2: Run Database Migration**
```bash
cd backend
.\venv\Scripts\python.exe .\scripts\migrate_eopa_vendor_agnostic.py
```

**Expected Output:**
```
================================================================================
EOPA VENDOR-AGNOSTIC MIGRATION
================================================================================

📊 Current EOPA records: 15

🔄 Starting migration...

   Found columns to remove: vendor_id, vendor_type
   Dropping foreign key constraint eopa_vendor_id_fkey...
   ✓ Foreign key constraint dropped
   Dropping vendor_id column...
   ✓ vendor_id column removed
   Dropping vendor_type column...
   ✓ vendor_type column removed

================================================================================
✅ MIGRATION COMPLETED SUCCESSFULLY
================================================================================

EOPA is now vendor-agnostic!
Vendor resolution will happen during PO generation from Medicine Master.
```

**Step 3: Restart Backend Server**
```bash
.\run\start-backend.ps1
```

**Step 4: Update Frontend**
- Remove vendor fields from EOPA form
- Update EOPA table display
- Add Medicine Master vendor info display
- Add bulk EOPA creation button to PI page

**Step 5: Test New Workflow**
```
1. Create PI with items
2. Convert PI to EOPAs (bulk operation)
3. Verify EOPAs created without vendor
4. Approve EOPAs
5. Generate POs (vendors auto-selected from Medicine Master)
```

### 7.3 Post-Migration Cleanup

**If existing EOPAs need to be preserved:**
- Existing EOPAs remain valid
- POs already generated are unaffected
- New POs should be generated using new vendor resolution logic

**If clean slate is needed:**
```sql
-- Delete all existing EOPAs (after backing up)
DELETE FROM eopa;

-- Delete all EOPAs POs (if not yet dispatched)
DELETE FROM po_items WHERE po_id IN (SELECT id FROM purchase_orders);
DELETE FROM purchase_orders;

-- Restart EOPA number sequence
ALTER SEQUENCE eopa_id_seq RESTART WITH 1;
```

---

## 8. Testing Checklist

### 8.1 Backend API Tests

- [ ] Create EOPA without vendor (should succeed)
- [ ] Create EOPA with vendor (should fail - field not accepted)
- [ ] Create duplicate EOPA for same PI item (should fail)
- [ ] Bulk create EOPAs from PI (should create one per item)
- [ ] List EOPAs (should not include vendor fields)
- [ ] Get EOPA by ID (should include Medicine Master vendors in pi_item)
- [ ] Update EOPA (vendor fields not accepted)
- [ ] Approve EOPA (should work as before)
- [ ] Delete EOPA (should work as before)

### 8.2 Frontend Tests

- [ ] EOPA form does not show vendor selection
- [ ] EOPA table does not show vendor columns
- [ ] EOPA expandable row shows Medicine Master vendors
- [ ] Bulk convert PI to EOPAs works
- [ ] Medicine without vendor mappings shows appropriate message

### 8.3 Integration Tests

- [ ] Create PI → Convert to EOPA → Generate PO (vendor auto-selected)
- [ ] Verify PO has correct vendor from Medicine Master
- [ ] Verify PO type (FG/RM/PM) auto-determined correctly
- [ ] Test language-based PM vendor selection

---

## 9. Rollback Plan

If issues occur, rollback is possible:

**Step 1: Run Rollback Script**
```bash
cd backend
.\venv\Scripts\python.exe .\scripts\migrate_eopa_vendor_agnostic.py rollback
```

**Step 2: Restore Frontend Code**
- Revert EOPA form to include vendor selection
- Revert EOPA table to show vendor columns
- Remove bulk conversion features

**Step 3: Manual Data Fix**
Existing EOPAs will have NULL vendor values. Options:
1. Delete all EOPAs and recreate with vendor info
2. Manually update vendor_id and vendor_type for critical EOPAs
3. Regenerate EOPAs from original PIs

---

## 10. Benefits of New Workflow

### 10.1 Business Benefits

1. **Cleaner Separation of Concerns**
   - PI: Customer/partner facing document
   - EOPA: Approval checkpoint for quantities/prices only
   - PO: Vendor-specific procurement document

2. **Flexibility**
   - Change vendor mappings in Medicine Master without affecting existing EOPAs
   - Single EOPA per PI item (simpler approval process)

3. **Centralized Vendor Management**
   - All vendor logic in Medicine Master
   - Regulatory/language requirements tied to medicine, not EOPA

### 10.2 Technical Benefits

1. **Reduced Data Redundancy**
   - Vendor info not duplicated in EOPA table
   - Single source of truth (Medicine Master)

2. **Simpler EOPA Creation**
   - No vendor selection required
   - Fewer fields = less room for error

3. **Future-Proof**
   - Easy to add new vendor types without EOPA schema changes
   - Dynamic vendor selection based on business rules

---

## 11. Summary

This implementation successfully transforms EOPA from a vendor-aware to a vendor-agnostic approval layer. The workflow now clearly separates:

1. **PI Stage**: Customer/partner details
2. **EOPA Stage**: Medicine/product details and pricing approval
3. **PO Stage**: Vendor resolution and procurement

All backend models, schemas, and APIs have been updated. Frontend changes are straightforward removals of vendor selection UI.

**Next Steps:**
1. Run migration script
2. Update frontend components
3. Test complete workflow
4. Update PO generation to use Medicine Master vendor resolution

