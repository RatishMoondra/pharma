# EOPA → PO Material-Type Mapping Implementation

## Implementation Date
November 23, 2025

## Status
✅ **COMPLETE** - All requirements implemented and tested

---

## Overview

This implementation fixes the EOPA → PO business logic and ensures material-type-aware PO Item creation across the entire pharmaceutical procurement workflow.

---

## CRITICAL BUSINESS RULES IMPLEMENTED

### 1. Material-Type-Aware PO Item Creation

**FG (Finished Goods) PO Items:**
- ✅ Populate: `medicine_id`
- ✅ NULL: `raw_material_id`, `packing_material_id`

**RM (Raw Material) PO Items:**
- ✅ Populate: `raw_material_id`
- ✅ NULL: `medicine_id`, `packing_material_id`

**PM (Packing Material) PO Items:**
- ✅ Populate: `packing_material_id`
- ✅ NULL: `medicine_id`, `raw_material_id`

### 2. EOPA → PO Flow

**FIRST TIME Generating PO:**
- ✅ Read from EOPA + EOPA Items
- ✅ Use EOPA item quantities

**SUBSEQUENT Reads:**
- ✅ Read from purchase_orders + po_items tables
- ✅ NOT from EOPA items

### 3. Vendor Resolution

- ✅ Vendors resolved dynamically from Medicine Master
- ✅ FG PO → `manufacturer_vendor_id`
- ✅ RM PO → `rm_vendor_id` (via BOM explosion)
- ✅ PM PO → `pm_vendor_id` (via BOM explosion)

### 4. EOPA Remains Vendor-Agnostic

- ✅ EOPA contains NO vendor information
- ✅ Vendor resolution happens ONLY at PO generation stage
- ✅ ONE EOPA per PI

---

## Backend Changes

### 1. Service Layer (`backend/app/services/po_service.py`)

#### Updated `_create_purchase_order` Method

**Changes:**
- Enforces FG PO items ONLY populate `medicine_id`
- Explicitly sets `raw_material_id` and `packing_material_id` to NULL
- Added validation to prevent RM/PM POs from using this method

**Code Example:**
```python
if po_type == POType.FG:
    po_item = POItem(
        po_id=po.id,
        medicine_id=medicine.id,
        raw_material_id=None,  # CRITICAL
        packing_material_id=None,  # CRITICAL
        ordered_quantity=effective_qty,
        fulfilled_quantity=Decimal("0.00"),
        unit=unit or 'pcs',
        hsn_code=hsn_code,
        pack_size=pack_size
    )
```

#### Updated `generate_rm_pos_from_explosion` Method

**Changes:**
- Enforces RM PO items ONLY populate `raw_material_id`
- Explicitly sets `medicine_id` and `packing_material_id` to NULL
- Added validation to skip items with missing `raw_material_id`

**Code Example:**
```python
po_item = POItem(
    po_id=po.id,
    raw_material_id=raw_material_id,  # CRITICAL
    medicine_id=None,  # CRITICAL
    packing_material_id=None,  # CRITICAL
    ordered_quantity=float(qty_required),
    fulfilled_quantity=0.0,
    unit=uom,
    hsn_code=hsn_code,
    gst_rate=gst_rate
)
```

#### Updated `generate_pm_pos_from_explosion` Method

**Changes:**
- Enforces PM PO items ONLY populate `packing_material_id`
- Explicitly sets `medicine_id` and `raw_material_id` to NULL
- Added validation to skip items with missing `packing_material_id`

**Code Example:**
```python
po_item = POItem(
    po_id=po.id,
    packing_material_id=packing_material_id,  # CRITICAL
    medicine_id=None,  # CRITICAL
    raw_material_id=None,  # CRITICAL
    ordered_quantity=float(qty_required),
    fulfilled_quantity=0.0,
    unit=uom,
    language=language,
    artwork_version=artwork_version,
    gsm=gsm,
    ply=ply,
    box_dimensions=dimensions,
    hsn_code=hsn_code,
    gst_rate=gst_rate
)
```

### 2. Models (`backend/app/models/po.py`)

**Status:** ✅ Already Correct

The `POItem` model already has all three material fields:
- `medicine_id: Mapped[Optional[int]]`
- `raw_material_id: Mapped[Optional[int]]`
- `packing_material_id: Mapped[Optional[int]]`

### 3. Schemas (`backend/app/schemas/po.py`)

**Status:** ✅ Already Correct

The `POItemResponse` schema includes all three material fields with proper optional handling:
```python
medicine_id: Optional[int] = None
raw_material_id: Optional[int] = None
packing_material_id: Optional[int] = None
```

### 4. Routers (`backend/app/routers/po.py`)

**Status:** ✅ Already Correct

Separate endpoints already exist:
- `/generate-from-eopa/{eopa_id}` - FG POs
- `/generate-rm-pos/{eopa_id}` - RM POs
- `/generate-pm-pos/{eopa_id}` - PM POs

---

## Frontend Changes

### 1. EOPA Page (`frontend/src/pages/EOPAPage.jsx`)

#### Replaced Single Button with 3 Separate Buttons

**Before:**
```jsx
<Button onClick={() => handleGeneratePO(eopa)}>
  Generate Purchase Orders
</Button>
```

**After:**
```jsx
<Button startIcon={<Inventory2 />} onClick={() => handleGeneratePO(eopa, 'RM')}>
  Generate RM PO
</Button>
<Button startIcon={<LocalShipping />} onClick={() => handleGeneratePO(eopa, 'PM')}>
  Generate PM PO
</Button>
<Button startIcon={<Business />} onClick={() => handleGeneratePO(eopa, 'FG')}>
  Generate FG PO
</Button>
```

#### Updated Handler Function

```javascript
const handleGeneratePO = (eopa, poType) => {
  setSelectedEopa({ ...eopa, selectedPOType: poType })
  setPoDialogMode('generate')
  setPoDialogOpen(true)
}
```

### 2. Created New SimplePODialog Component

**File:** `frontend/src/components/SimplePODialog.jsx`

**Features:**
- ✅ No tabs - shows ONLY the selected PO type
- ✅ Material-specific preview tables
- ✅ Fetches explosion data for RM/PM
- ✅ Shows FG items directly from EOPA
- ✅ Color-coded by PO type (RM=primary, PM=secondary, FG=success)
- ✅ One-click generation per PO type

**Key Sections:**

**Preview Fetching:**
```javascript
if (poType === 'RM') {
  const res = await api.get(`/api/rm-explosion/${eopa.id}`)
  setPreview(res.data.data)
} else if (poType === 'PM') {
  const res = await api.get(`/api/pm-explosion/${eopa.id}`)
  setPreview(res.data.data)
} else {
  // FG: Use EOPA items directly
  const res = await api.get(`/api/eopa/${eopa.id}`)
  // Group by manufacturer vendor
}
```

**PO Generation:**
```javascript
if (poType === 'RM') {
  response = await api.post(`/api/po/generate-rm-pos/${eopa.id}`)
} else if (poType === 'PM') {
  response = await api.post(`/api/po/generate-pm-pos/${eopa.id}`)
} else {
  response = await api.post(`/api/po/generate-from-eopa/${eopa.id}`)
}
```

---

## Database Schema

**Status:** ✅ No Migration Needed

The `po_items` table already has all required columns:

```sql
CREATE TABLE public.po_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    medicine_id integer,
    raw_material_id integer,
    packing_material_id integer,
    -- ... other fields
);
```

Foreign key constraints:
```sql
FOREIGN KEY (medicine_id) REFERENCES medicine_master(id)
FOREIGN KEY (raw_material_id) REFERENCES raw_material_master(id)
FOREIGN KEY (packing_material_id) REFERENCES packing_material_master(id)
```

---

## Testing

### Comprehensive Test Suite Created

**File:** `backend/tests/test_po_material_mapping.py`

**Tests Included:**

1. ✅ **test_fg_po_material_mapping**
   - Verifies FG PO items populate `medicine_id`
   - Verifies `raw_material_id` and `packing_material_id` are NULL

2. ✅ **test_rm_po_material_mapping**
   - Verifies RM PO items populate `raw_material_id`
   - Verifies `medicine_id` and `packing_material_id` are NULL

3. ✅ **test_pm_po_material_mapping**
   - Verifies PM PO items populate `packing_material_id`
   - Verifies `medicine_id` and `raw_material_id` are NULL

4. ✅ **test_eopa_to_po_first_time_reads_eopa_items**
   - Verifies first-time PO generation reads from EOPA items
   - Verifies quantities match EOPA item quantities

5. ✅ **test_eopa_to_po_subsequent_reads_po_items**
   - Verifies subsequent reads use PO items table
   - Verifies data comes from `purchase_orders` and `po_items`

6. ✅ **test_vendor_resolution_from_medicine_master**
   - Verifies FG PO uses `manufacturer_vendor_id`
   - Verifies RM PO uses `rm_vendor_id`
   - Verifies PM PO uses `pm_vendor_id`

7. ✅ **test_po_item_validation_only_one_material_field**
   - Verifies exactly ONE material field is populated per item
   - Prevents invalid states

---

## Validation Rules

### PO Item Validation

All PO items MUST satisfy:
```python
populated_fields = sum([
    item.medicine_id is not None,
    item.raw_material_id is not None,
    item.packing_material_id is not None
])

assert populated_fields == 1  # Exactly one field
```

### PO Type Enforcement

| PO Type | Must Populate | Must Be NULL |
|---------|---------------|--------------|
| FG | `medicine_id` | `raw_material_id`, `packing_material_id` |
| RM | `raw_material_id` | `medicine_id`, `packing_material_id` |
| PM | `packing_material_id` | `medicine_id`, `raw_material_id` |

---

## API Endpoints

### PO Generation Endpoints

| Endpoint | Purpose | Input | Output |
|----------|---------|-------|--------|
| `POST /api/po/generate-from-eopa/{eopa_id}` | Generate FG PO | EOPA ID | FG PO(s) |
| `POST /api/po/generate-rm-pos/{eopa_id}` | Generate RM PO | EOPA ID | RM PO(s) |
| `POST /api/po/generate-pm-pos/{eopa_id}` | Generate PM PO | EOPA ID | PM PO(s) |

### Explosion Preview Endpoints

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /api/rm-explosion/{eopa_id}` | RM explosion preview | Raw materials grouped by vendor |
| `GET /api/pm-explosion/{eopa_id}` | PM explosion preview | Packing materials grouped by vendor |

---

## User Interface Updates

### EOPA Page

**Before:**
- Single "Generate Purchase Orders" button
- No indication of PO type

**After:**
- 3 distinct buttons with icons:
  - 🏭 Generate RM PO (Primary color)
  - 📦 Generate PM PO (Secondary color)
  - 🏢 Generate FG PO (Success color)
- Each button pre-selects PO type

### PO Manager Dialog

**Before:**
- Tabbed interface (RM/PM/FG tabs)
- Complex multi-type management
- Confusing user experience

**After:**
- Single-purpose dialog
- Shows ONLY selected PO type
- Clean preview table
- One-click generation
- Material-specific columns

---

## Workflow Diagram

```
User clicks "Generate RM PO" on EOPA
    ↓
EOPAPage.handleGeneratePO(eopa, 'RM')
    ↓
Opens SimplePODialog with selectedPOType='RM'
    ↓
Dialog fetches RM explosion preview
    ↓
User reviews RM materials by vendor
    ↓
User clicks "Generate RM PO(s)"
    ↓
POST /api/po/generate-rm-pos/{eopa_id}
    ↓
POGenerationService.generate_rm_pos_from_explosion()
    ↓
Creates RM PO with raw_material_id populated
    ↓
Success message & dialog closes
```

---

## Code Quality

### Logging

All critical operations include structured logging:

```python
logger.info({
    "event": "RM_PO_CREATED",
    "po_number": po_number,
    "vendor_id": vendor_id,
    "eopa_id": eopa_id,
    "items_count": len(raw_materials),
    "total_ordered_qty": float(total_ordered_qty),
    "created_by": current_user_id
})
```

### Error Handling

Proper exception handling with descriptive messages:

```python
if not raw_material_id:
    logger.warning({
        "event": "RM_PO_ITEM_SKIPPED_NO_RAW_MATERIAL_ID",
        "po_id": po.id,
        "vendor_id": vendor_id,
        "message": "Skipping PO item creation: raw_material_id is missing."
    })
    continue
```

### Type Safety

Decimal conversion for all quantities:

```python
qty_required = Decimal(str(rm.get("qty_required", 0)))
```

---

## Best Practices Followed

1. ✅ **Separation of Concerns**
   - Business logic in services
   - Thin routers
   - Clean models

2. ✅ **Single Responsibility**
   - Each method handles one PO type
   - Explosion services separated

3. ✅ **DRY (Don't Repeat Yourself)**
   - Reusable service methods
   - Shared utility functions

4. ✅ **Explicit is Better Than Implicit**
   - Explicit NULL assignments
   - Clear validation messages

5. ✅ **Fail Fast**
   - Early validation
   - Skip invalid items
   - Clear error messages

---

## Breaking Changes

### None

This implementation is **backward compatible**. Existing POs are not affected.

---

## Migration Path

### For Existing Data

No migration needed. The database schema already supports all fields.

### For Existing Code

Developers should:
1. Use separate generation endpoints for each PO type
2. Ensure PO items populate correct material field
3. Use SimplePODialog instead of POManagementDialog

---

## Performance Considerations

### Database Queries

- ✅ Uses `joinedload` for eager loading
- ✅ Minimal database round trips
- ✅ Batch inserts where possible

### Frontend

- ✅ Lazy loading of explosion data
- ✅ Single API call per PO type
- ✅ Efficient re-rendering

---

## Security

- ✅ RBAC enforced on all endpoints
- ✅ User validation before PO creation
- ✅ Vendor validation before assignment

---

## Documentation

- ✅ Inline code comments
- ✅ Docstrings for all methods
- ✅ API documentation
- ✅ This implementation summary

---

## Future Enhancements

1. **Bulk PO Generation**
   - Generate all 3 PO types at once
   - Progress indicator for large EOPAs

2. **PO Templates**
   - Save PO configurations
   - Reuse vendor preferences

3. **Advanced Validation**
   - Material balance checks
   - Lead time validation

4. **Approval Workflow**
   - Multi-stage approvals
   - Email notifications

---

## Conclusion

This implementation successfully enforces the CRITICAL business rules for material-type-aware PO Item creation. The system now correctly:

1. ✅ Populates the correct material field based on PO type
2. ✅ Reads from EOPA items on first generation
3. ✅ Reads from PO items on subsequent operations
4. ✅ Resolves vendors dynamically from Medicine Master
5. ✅ Maintains EOPA vendor-agnostic architecture
6. ✅ Provides clear, type-specific UI
7. ✅ Includes comprehensive testing

**All requirements have been implemented and tested.**

---

## Files Modified

### Backend
- `backend/app/services/po_service.py` - Material-type-aware PO item creation
- `backend/tests/test_po_material_mapping.py` - Comprehensive test suite

### Frontend
- `frontend/src/pages/EOPAPage.jsx` - 3 separate PO buttons
- `frontend/src/components/SimplePODialog.jsx` - New simplified dialog

### No Changes Needed
- `backend/app/models/po.py` - Already correct
- `backend/app/schemas/po.py` - Already correct
- `backend/app/routers/po.py` - Already correct
- `backend/database/pharma_schema.sql` - Already correct

---

**Implementation Complete: November 23, 2025**
