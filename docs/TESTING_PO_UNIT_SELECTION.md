# Testing Guide: PO Unit Field & Selective Generation

## Prerequisites
- Backend running on http://localhost:8000
- Frontend running on http://localhost:5173
- Database migration applied (unit column added to po_items)
- At least one approved EOPA with items

## Test Scenarios

### Test 1: Verify Migration Applied
**Goal**: Confirm unit field exists in database

**Steps**:
1. Open database tool (pgAdmin, DBeaver, etc.)
2. Run query:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'po_items' AND column_name = 'unit';
   ```

**Expected Result**:
```
column_name | data_type         | is_nullable
------------|-------------------|------------
unit        | character varying | YES
```

**Status**: ✅ Pass / ❌ Fail

---

### Test 2: Open PO Review Dialog
**Goal**: Verify dialog opens with checkboxes and unit fields

**Steps**:
1. Login to application
2. Navigate to **EOPA** page
3. Find an **APPROVED** EOPA
4. Click **"Generate Purchase Orders"** button

**Expected Result**:
- Dialog opens with title "Review & Edit Purchase Orders"
- Table shows columns:
  * Checkbox (leftmost column)
  * PO Type (FG, RM, PM with colored chips)
  * Medicine
  * Vendor
  * EOPA Qty (FG)
  * PO Quantity (text field)
  * Unit (text field)
  * Notes
- All checkboxes initially **unchecked**
- FG quantity fields **disabled** (locked to EOPA qty)
- RM/PM quantity fields **enabled**
- All unit fields **enabled**
- Default units: FG=pcs, RM=kg, PM=boxes

**Status**: ✅ Pass / ❌ Fail

---

### Test 3: Select All POs
**Goal**: Test "select all" checkbox functionality

**Steps**:
1. Open PO Review Dialog (Test 2)
2. Click **header checkbox** (in column header)

**Expected Result**:
- All row checkboxes become **checked**
- All rows opacity changes to **1** (fully visible)
- Footer shows: "Total POs selected: X / X" (e.g., "3 / 3")

**Status**: ✅ Pass / ❌ Fail

---

### Test 4: Individual Selection
**Goal**: Test individual checkbox functionality

**Steps**:
1. Open PO Review Dialog (Test 2)
2. Click **individual checkbox** for FG row only

**Expected Result**:
- Only FG row checkbox is **checked**
- FG row opacity = **1**, others = **0.6** (dimmed)
- Header checkbox shows **indeterminate state** (dash/minus icon)
- Footer shows: "Total POs selected: 1 / 3"

**Status**: ✅ Pass / ❌ Fail

---

### Test 5: Edit RM Quantity
**Goal**: Test quantity editing for RM

**Steps**:
1. Open PO Review Dialog (Test 2)
2. Select **RM checkbox**
3. Click in **RM PO Quantity** field
4. Change value from **1000** to **25**

**Expected Result**:
- Value changes to **25**
- Field accepts decimal values (e.g., **25.5**)
- FG field remains **disabled** (cannot edit)

**Status**: ✅ Pass / ❌ Fail

---

### Test 6: Edit Unit
**Goal**: Test unit text field editing

**Steps**:
1. Open PO Review Dialog (Test 2)
2. Select **RM checkbox**
3. Click in **RM Unit** field
4. Change value from **kg** to **liters**

**Expected Result**:
- Value changes to **liters**
- Field accepts any text (free-form input)
- Placeholder shows: "kg, L, pcs"

**Status**: ✅ Pass / ❌ Fail

---

### Test 7: Generate Selected POs (All Selected)
**Goal**: Test PO generation with all POs selected

**Setup**:
- EOPA with 1 medicine (Medicine A)
- Quantity: 1000

**Steps**:
1. Open PO Review Dialog
2. Click **header checkbox** (select all)
3. Edit quantities:
   - FG: **1000** (locked)
   - RM: **25**
   - PM: **50**
4. Edit units:
   - FG: **pcs**
   - RM: **kg**
   - PM: **boxes**
5. Click **"Generate POs"** button

**Expected Result**:
- Success message: "Successfully generated 3 PO(s) from EOPA EOPA/24-25/0001"
- Dialog closes
- Page refreshes
- Navigate to **PO Page**
- See 3 POs:
  * PO/24-25/FG/1/0001 - 1000 **pcs** - Manufacturer
  * PO/24-25/RM/1/0001 - 25 **kg** - RM Vendor
  * PO/24-25/PM/1/0001 - 50 **boxes** - PM Vendor

**Status**: ✅ Pass / ❌ Fail

---

### Test 8: Generate Only FG
**Goal**: Test selective PO generation (FG only)

**Steps**:
1. Open PO Review Dialog
2. Select **only FG checkbox** (leave RM and PM unchecked)
3. Click **"Generate POs"** button

**Expected Result**:
- Success message: "Successfully generated 1 PO(s)"
- Only **1 PO** created:
  * PO/24-25/FG/1/0001 - 1000 pcs
- No RM or PM POs created

**Status**: ✅ Pass / ❌ Fail

---

### Test 9: Generate Only RM and PM (Skip FG)
**Goal**: Test selective PO generation (RM and PM only)

**Steps**:
1. Open PO Review Dialog
2. Select **RM and PM checkboxes** (leave FG unchecked)
3. Edit quantities:
   - RM: **25**
   - PM: **50**
4. Edit units:
   - RM: **kg**
   - PM: **boxes**
5. Click **"Generate POs"** button

**Expected Result**:
- Success message: "Successfully generated 2 PO(s)"
- Only **2 POs** created:
  * PO/24-25/RM/1/0001 - 25 kg
  * PO/24-25/PM/1/0001 - 50 boxes
- No FG PO created

**Status**: ✅ Pass / ❌ Fail

---

### Test 10: Validation - No Selection
**Goal**: Test validation when no POs selected

**Steps**:
1. Open PO Review Dialog
2. **Do not check any checkboxes**
3. Click **"Generate POs"** button

**Expected Result**:
- **Error message** (red Snackbar): "Please select at least one PO to generate"
- Dialog remains **open**
- No POs created

**Status**: ✅ Pass / ❌ Fail

---

### Test 11: Unit Display on PO Page
**Goal**: Verify unit shows correctly on PO page

**Steps**:
1. Generate POs with custom units (Test 7)
2. Navigate to **PO Page**
3. Expand any EOPA accordion
4. View **PO Line Items** tab

**Expected Result**:
- Table shows columns:
  * Medicine
  * Dosage Form
  * Ordered Qty
  * **Unit** (NEW - shows as chip)
  * Fulfilled Qty
  * Status
- Unit column displays:
  * FG: **pcs** (chip with outlined variant)
  * RM: **kg** (chip)
  * PM: **boxes** (chip)

**Status**: ✅ Pass / ❌ Fail

---

### Test 12: Hard Refresh Persistence
**Goal**: Verify unit data persists after hard refresh

**Steps**:
1. Generate POs with units (Test 7)
2. Navigate to PO page
3. Press **Ctrl + Shift + R** (hard refresh)
4. View PO items

**Expected Result**:
- Unit data still displays correctly
- No console errors
- Data fetched from backend includes unit field

**Status**: ✅ Pass / ❌ Fail

---

### Test 13: Different Units for Different Materials
**Goal**: Test variety of units

**Steps**:
1. Open PO Review Dialog
2. Select all 3 POs
3. Edit units:
   - FG: **bottles**
   - RM: **liters**
   - PM: **labels**
4. Generate POs

**Expected Result**:
- 3 POs created:
  * PO/24-25/FG/1/0001 - 1000 **bottles**
  * PO/24-25/RM/1/0001 - 25 **liters**
  * PO/24-25/PM/1/0001 - 50 **labels**
- Units display correctly on PO page

**Status**: ✅ Pass / ❌ Fail

---

### Test 14: Multiple Medicines
**Goal**: Test PO generation with 2 medicines

**Setup**:
- EOPA with 2 medicines:
  * Medicine A: 1000 qty
  * Medicine B: 500 qty

**Steps**:
1. Open PO Review Dialog
2. Should see **6 PO rows** (3 per medicine):
   - Medicine A: FG, RM, PM
   - Medicine B: FG, RM, PM
3. Select **all 6 checkboxes**
4. Edit quantities:
   - Medicine A RM: **25 kg**
   - Medicine A PM: **50 boxes**
   - Medicine B RM: **10 liters**
   - Medicine B PM: **20 labels**
5. Generate POs

**Expected Result**:
- Success message: "Successfully generated 6 PO(s)"
- 6 POs created:
  * PO/24-25/FG/1/0001 - Medicine A - 1000 pcs
  * PO/24-25/RM/1/0001 - Medicine A - 25 kg
  * PO/24-25/PM/1/0001 - Medicine A - 50 boxes
  * PO/24-25/FG/2/0001 - Medicine B - 500 pcs
  * PO/24-25/RM/2/0001 - Medicine B - 10 liters
  * PO/24-25/PM/2/0001 - Medicine B - 20 labels

**Status**: ✅ Pass / ❌ Fail

---

### Test 15: Backend Logging
**Goal**: Verify backend logs unit values

**Steps**:
1. Generate POs with custom units (Test 7)
2. Check backend terminal/logs

**Expected Result**:
- Log entry shows:
  ```json
  {
    "event": "USING_CUSTOM_PO_QUANTITY",
    "medicine_id": 1,
    "eopa_quantity": 1000.0,
    "custom_quantity": 25.0,
    "po_type": "RM",
    "unit": "kg"
  }
  ```

**Status**: ✅ Pass / ❌ Fail

---

### Test 16: API Payload Inspection
**Goal**: Verify frontend sends correct payload

**Steps**:
1. Open **Browser DevTools** (F12)
2. Go to **Network** tab
3. Open PO Review Dialog
4. Select RM and PM
5. Edit quantities and units
6. Click "Generate POs"
7. Find **POST /api/po/generate-from-eopa/{id}** request
8. View **Payload** tab

**Expected Payload**:
```json
{
  "po_quantities": [
    {
      "eopa_item_id": 123,
      "po_type": "RM",
      "quantity": 25,
      "unit": "kg"
    },
    {
      "eopa_item_id": 123,
      "po_type": "PM",
      "quantity": 50,
      "unit": "boxes"
    }
  ]
}
```

**Status**: ✅ Pass / ❌ Fail

---

### Test 17: Disabled Fields When Not Selected
**Goal**: Verify quantity and unit fields disabled when row not selected

**Steps**:
1. Open PO Review Dialog
2. **Do not select any checkboxes**
3. Try to edit RM quantity field
4. Try to edit RM unit field

**Expected Result**:
- Both fields are **disabled** (greyed out)
- Cannot type in fields
- FG quantity always disabled (regardless of selection)

**Status**: ✅ Pass / ❌ Fail

---

### Test 18: Indeterminate State
**Goal**: Test header checkbox indeterminate state

**Steps**:
1. Open PO Review Dialog (3 POs total)
2. Select **only FG checkbox**
3. Check header checkbox state

**Expected Result**:
- Header checkbox shows **dash/minus icon** (indeterminate)
- Not fully checked, not fully unchecked

**Steps (continued)**:
4. Select **all 3 checkboxes**
5. Check header checkbox state

**Expected Result**:
- Header checkbox shows **checkmark** (fully checked)

**Status**: ✅ Pass / ❌ Fail

---

## Summary Checklist

| Test # | Test Name                              | Status |
|--------|----------------------------------------|--------|
| 1      | Verify Migration Applied               | ⬜     |
| 2      | Open PO Review Dialog                  | ⬜     |
| 3      | Select All POs                         | ⬜     |
| 4      | Individual Selection                   | ⬜     |
| 5      | Edit RM Quantity                       | ⬜     |
| 6      | Edit Unit                              | ⬜     |
| 7      | Generate Selected POs (All)            | ⬜     |
| 8      | Generate Only FG                       | ⬜     |
| 9      | Generate Only RM and PM                | ⬜     |
| 10     | Validation - No Selection              | ⬜     |
| 11     | Unit Display on PO Page                | ⬜     |
| 12     | Hard Refresh Persistence               | ⬜     |
| 13     | Different Units                        | ⬜     |
| 14     | Multiple Medicines                     | ⬜     |
| 15     | Backend Logging                        | ⬜     |
| 16     | API Payload Inspection                 | ⬜     |
| 17     | Disabled Fields When Not Selected      | ⬜     |
| 18     | Indeterminate State                    | ⬜     |

**Total Tests**: 18  
**Passed**: ___  
**Failed**: ___  
**Pass Rate**: ___%

## Common Issues & Fixes

### Issue: Dialog doesn't open
**Symptoms**: Click "Generate Purchase Orders" but nothing happens

**Fixes**:
1. Check browser console for errors
2. Verify EOPA status is **APPROVED**
3. Hard refresh (Ctrl + Shift + R)
4. Check backend is running

---

### Issue: Checkboxes not working
**Symptoms**: Clicking checkbox doesn't change state

**Fixes**:
1. Check browser console for errors
2. Verify Checkbox import in EOPAPage.jsx
3. Check handlePOQuantityChange function exists
4. Hard refresh

---

### Issue: Unit not saving
**Symptoms**: Unit shows as null in database or empty on PO page

**Fixes**:
1. Check migration applied: `SELECT * FROM alembic_version`
2. Check backend logs for errors
3. Verify payload in browser DevTools Network tab
4. Check POItem model has unit field
5. Restart backend server

---

### Issue: Quantity fields disabled
**Symptoms**: Cannot edit RM/PM quantity fields

**Fixes**:
1. Check if checkbox is selected (row must be selected to edit)
2. FG fields are always disabled (this is expected)
3. Verify disabled prop logic in TextField

---

### Issue: Unit not displaying on PO page
**Symptoms**: Unit column exists but shows empty/null

**Fixes**:
1. Check backend response includes unit field (Network tab)
2. Verify eager loading in backend router (joinedload)
3. Check POItemResponse schema includes unit
4. Hard refresh page

---

## Test Environment

**Backend**:
- URL: http://localhost:8000
- Python Version: _____
- Database: PostgreSQL _____ (version)

**Frontend**:
- URL: http://localhost:5173
- React Version: 18.x
- Material-UI Version: 5.x

**Browser**:
- Name: _____________
- Version: _____________

**Tester**:
- Name: _____________
- Date: _____________

**Notes**:
_______________________________________________________
_______________________________________________________
_______________________________________________________
