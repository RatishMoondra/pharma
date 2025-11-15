# Purchase Order Unit Field & Selective PO Generation Feature

## Implementation Date
November 2025

## Overview
Added support for unit fields (kg, liters, boxes, labels, pcs, etc.) for RM/PM purchase orders and implemented selective PO generation where users can choose which POs to create from an EOPA.

## Business Requirements

### 1. Unit Field Support
- **Raw Material (RM)** POs may need units like: kg, grams, liters, ml, etc.
- **Packing Material (PM)** POs may need units like: boxes, bottles, labels, cartons, etc.
- **Finished Goods (FG)** typically use: pcs (pieces)

### 2. Selective PO Generation
- Users can review all potential POs before generating
- Select only specific POs to generate (e.g., just FG, or just RM for one medicine)
- Edit quantities and units before generation
- One-at-a-time workflow: Generate and review POs for individual EOPA line items

## Database Changes

### Migration: `add_unit_to_po_items.py`
```sql
ALTER TABLE po_items ADD COLUMN unit VARCHAR(50);
```

**File**: `backend/alembic/versions/add_unit_to_po_items.py`

**Fields**:
- `unit`: VARCHAR(50), nullable
- Stores unit of measurement (kg, liters, boxes, pcs, etc.)

## Backend Changes

### 1. Model Updates
**File**: `backend/app/models/po.py`

```python
class POItem(Base):
    __tablename__ = "po_items"
    
    # ... existing fields ...
    ordered_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    fulfilled_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=Decimal("0.00"))
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # NEW: kg, liters, boxes, labels, pcs, etc.
```

### 2. Schema Updates
**File**: `backend/app/schemas/po.py`

```python
class POItemResponse(BaseModel):
    id: int
    po_id: int
    medicine_id: int
    ordered_quantity: float
    fulfilled_quantity: float
    unit: Optional[str] = None  # NEW: kg, liters, boxes, labels, etc.
    
    class Config:
        from_attributes = True
```

### 3. Service Layer Updates
**File**: `backend/app/services/po_service.py`

**Method Signature Change**:
```python
def _create_purchase_order(
    self,
    eopa: EOPA,
    vendor_id: int,
    po_type: POType,
    items: List[EOPAItem],
    medicine_sequence: int,
    current_user_id: int,
    custom_quantity: Decimal = None,
    unit: str = None  # NEW PARAMETER
) -> Optional[PurchaseOrder]:
```

**Unit Lookup Logic**:
```python
# Build custom quantities and units lookup
qty_lookup = {}
unit_lookup = {}
if custom_quantities and 'po_quantities' in custom_quantities:
    for item in custom_quantities['po_quantities']:
        key = (item['eopa_item_id'], item['po_type'])
        qty_lookup[key] = Decimal(str(item['quantity']))
        if 'unit' in item and item['unit']:
            unit_lookup[key] = item['unit']

# Later, when creating PO:
custom_qty = qty_lookup.get((item.id, po_type.value))
custom_unit = unit_lookup.get((item.id, po_type.value))

po = self._create_purchase_order(
    eopa=eopa,
    vendor_id=vendor_id,
    po_type=po_type,
    items=[item],
    medicine_sequence=sequence,
    current_user_id=current_user_id,
    custom_quantity=custom_qty,
    unit=custom_unit  # Pass unit to PO creation
)
```

**POItem Creation**:
```python
# Create PO item (QUANTITY ONLY + UNIT)
po_item = POItem(
    po_id=po.id,
    medicine_id=medicine.id,
    ordered_quantity=effective_qty,
    fulfilled_quantity=Decimal("0.00"),
    unit=unit  # Save unit (kg, liters, boxes, pcs, etc.)
)
```

### 4. API Endpoint Updates
**File**: `backend/app/routers/po.py`

**Request Payload Example**:
```json
{
  "po_quantities": [
    {
      "eopa_item_id": 123,
      "po_type": "RM",
      "quantity": 100,
      "unit": "kg"
    },
    {
      "eopa_item_id": 123,
      "po_type": "PM",
      "quantity": 50,
      "unit": "boxes"
    },
    {
      "eopa_item_id": 123,
      "po_type": "FG",
      "quantity": 1000,
      "unit": "pcs"
    }
  ]
}
```

## Frontend Changes

### 1. EOPA Page - PO Review Dialog
**File**: `frontend/src/pages/EOPAPage.jsx`

**State Management**:
```javascript
const [poPreview, setPoPreview] = useState([])  // Array of PO preview items

// Each item structure:
{
  type: 'FG',  // or 'RM', 'PM'
  sequence: 1,
  medicine_name: 'Paracetamol 500mg',
  eopa_quantity: 1000,
  po_quantity: 1000,  // Editable for RM/PM
  unit: 'pcs',  // Editable
  vendor: 'ABC Manufacturer',
  eopa_item_id: 123,
  selected: false  // User can select which POs to generate
}
```

**handleGeneratePO Function**:
```javascript
const handleGeneratePO = async (eopa) => {
  const poItems = []
  
  eopa.items?.forEach((eopaItem, index) => {
    const medicine = eopaItem.pi_item?.medicine
    const quantity = parseFloat(eopaItem.quantity || 0)
    const sequence = index + 1
    
    // FG PO (same quantity as EOPA, locked)
    poItems.push({
      type: 'FG',
      sequence,
      medicine_name: medicine?.medicine_name || 'Unknown',
      eopa_quantity: quantity,
      po_quantity: quantity,
      unit: 'pcs',  // Default unit for FG
      vendor: medicine?.manufacturer_vendor?.vendor_name || 'NOT ASSIGNED',
      eopa_item_id: eopaItem.id,
      selected: false  // Start unselected
    })
    
    // RM PO (editable quantity and unit)
    poItems.push({
      type: 'RM',
      sequence,
      medicine_name: medicine?.medicine_name || 'Unknown',
      eopa_quantity: quantity,
      po_quantity: quantity, // Default, user can edit
      unit: 'kg',  // Default unit for RM
      vendor: medicine?.rm_vendor?.vendor_name || 'NOT ASSIGNED',
      eopa_item_id: eopaItem.id,
      selected: false
    })
    
    // PM PO (editable quantity and unit)
    poItems.push({
      type: 'PM',
      sequence,
      medicine_name: medicine?.medicine_name || 'Unknown',
      eopa_quantity: quantity,
      po_quantity: quantity, // Default, user can edit
      unit: 'boxes',  // Default unit for PM
      vendor: medicine?.pm_vendor?.vendor_name || 'NOT ASSIGNED',
      eopa_item_id: eopaItem.id,
      selected: false
    })
  })
  
  setEopaForPO(eopa)
  setPoPreview(poItems)
  setPoReviewDialogOpen(true)
}
```

**handlePOQuantityChange Function**:
```javascript
const handlePOQuantityChange = (index, field, value) => {
  const updated = [...poPreview]
  if (field === 'quantity') {
    updated[index].po_quantity = parseFloat(value) || 0
  } else if (field === 'unit') {
    updated[index].unit = value
  } else if (field === 'selected') {
    updated[index].selected = value
  }
  setPoPreview(updated)
}
```

**handleConfirmGeneratePO Function**:
```javascript
const handleConfirmGeneratePO = async () => {
  if (!eopaForPO) return
  
  const selectedPOs = poPreview.filter(po => po.selected)
  if (selectedPOs.length === 0) {
    handleApiError({ response: { data: { message: 'Please select at least one PO to generate' } } })
    return
  }
  
  try {
    setGeneratingPO(true)
    clearError()
    
    const response = await api.post(`/api/po/generate-from-eopa/${eopaForPO.id}`, {
      po_quantities: selectedPOs.map(po => ({
        eopa_item_id: po.eopa_item_id,
        po_type: po.type,
        quantity: po.po_quantity,
        unit: po.unit  // Send unit to backend
      }))
    })
    
    if (response.data.success) {
      setSuccessMessage(`Successfully generated ${response.data.data.total_pos_created} PO(s)`)
      fetchData()
      setPoReviewDialogOpen(false)
      setEopaForPO(null)
      setPoPreview([])
    }
  } catch (err) {
    handleApiError(err)
  } finally {
    setGeneratingPO(false)
  }
}
```

**PO Review Dialog UI**:
```jsx
<Dialog open={poReviewDialogOpen} onClose={handleCancelGeneratePO} maxWidth="lg" fullWidth>
  <DialogTitle>
    Review & Edit Purchase Orders
    <Typography variant="caption">EOPA: {eopaForPO?.eopa_number}</Typography>
  </DialogTitle>
  <DialogContent>
    <Alert severity="info">
      <strong>Select which POs to generate:</strong> Check the items you want to create. 
      Adjust RM/PM quantities based on conversion ratios.
    </Alert>
    
    <Table>
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            <Checkbox
              checked={poPreview.every(po => po.selected)}
              indeterminate={poPreview.some(po => po.selected) && !poPreview.every(po => po.selected)}
              onChange={(e) => {
                const updated = poPreview.map(po => ({ ...po, selected: e.target.checked }))
                setPoPreview(updated)
              }}
            />
          </TableCell>
          <TableCell>PO Type</TableCell>
          <TableCell>Medicine</TableCell>
          <TableCell>Vendor</TableCell>
          <TableCell align="right">EOPA Qty (FG)</TableCell>
          <TableCell align="right">PO Quantity</TableCell>
          <TableCell>Unit</TableCell>
          <TableCell>Notes</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {poPreview.map((po, index) => (
          <TableRow key={index} sx={{ opacity: po.selected ? 1 : 0.6 }}>
            <TableCell padding="checkbox">
              <Checkbox
                checked={po.selected}
                onChange={(e) => handlePOQuantityChange(index, 'selected', e.target.checked)}
              />
            </TableCell>
            <TableCell>
              <Chip label={po.type} color={po.type === 'FG' ? 'primary' : po.type === 'RM' ? 'success' : 'warning'} />
            </TableCell>
            <TableCell>{po.medicine_name}</TableCell>
            <TableCell>{po.vendor}</TableCell>
            <TableCell align="right">{po.eopa_quantity.toLocaleString('en-IN')}</TableCell>
            <TableCell align="right">
              <TextField
                type="number"
                size="small"
                value={po.po_quantity}
                onChange={(e) => handlePOQuantityChange(index, 'quantity', e.target.value)}
                disabled={po.type === 'FG' || !po.selected}
                fullWidth
              />
            </TableCell>
            <TableCell>
              <TextField
                type="text"
                size="small"
                value={po.unit}
                onChange={(e) => handlePOQuantityChange(index, 'unit', e.target.value)}
                placeholder="kg, L, pcs"
                disabled={!po.selected}
                fullWidth
              />
            </TableCell>
            <TableCell>
              <Typography variant="caption">
                {po.type === 'FG' && 'Same as EOPA'}
                {po.type === 'RM' && 'Raw material (kg, liters, etc.)'}
                {po.type === 'PM' && 'Packing (boxes, bottles, labels, etc.)'}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    
    <Typography variant="caption" sx={{ mt: 2 }}>
      Total POs selected: {poPreview.filter(po => po.selected).length} / {poPreview.length}
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCancelGeneratePO} disabled={generatingPO}>Cancel</Button>
    <Button onClick={handleConfirmGeneratePO} variant="contained" disabled={generatingPO}>
      {generatingPO ? 'Generating...' : 'Generate POs'}
    </Button>
  </DialogActions>
</Dialog>
```

### 2. PO Page - Display Unit Field
**File**: `frontend/src/pages/POPage.jsx`

**Updated PO Items Table**:
```jsx
<Table size="small">
  <TableHead>
    <TableRow>
      <TableCell>Medicine</TableCell>
      <TableCell>Dosage Form</TableCell>
      <TableCell align="right">Ordered Qty</TableCell>
      <TableCell>Unit</TableCell>  {/* NEW COLUMN */}
      <TableCell align="right">Fulfilled Qty</TableCell>
      <TableCell align="center">Status</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {po.items?.map((item, idx) => (
      <TableRow key={idx}>
        <TableCell>{item.medicine?.medicine_name || 'N/A'}</TableCell>
        <TableCell>{item.medicine?.dosage_form || 'N/A'}</TableCell>
        <TableCell align="right">
          {parseFloat(item.ordered_quantity || 0).toLocaleString('en-IN')}
        </TableCell>
        <TableCell>
          <Chip 
            label={item.unit || 'pcs'}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell align="right">
          {parseFloat(item.fulfilled_quantity || 0).toLocaleString('en-IN')}
        </TableCell>
        <TableCell align="center">
          <Chip label={/* status */} />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## User Workflow

### Selective PO Generation Workflow

1. **Navigate to EOPA Page**
   - View list of approved EOPAs

2. **Click "Generate Purchase Orders"**
   - Opens PO Review Dialog showing all potential POs (FG, RM, PM for each medicine)

3. **Review PO Preview**
   - Table shows:
     * Checkbox for selection (per PO)
     * PO Type (FG, RM, PM)
     * Medicine name
     * Vendor assignment
     * EOPA quantity (reference, locked)
     * PO quantity (editable for RM/PM)
     * Unit (editable text field: kg, liters, boxes, pcs, etc.)
     * Notes (hints about what to enter)

4. **Select POs to Generate**
   - **Select All**: Check header checkbox to select all POs
   - **Individual Selection**: Check only specific POs (e.g., just FG, or just RM for one medicine)
   - **Partial Selection**: Select mix of FG, RM, PM as needed

5. **Edit Quantities (RM/PM Only)**
   - FG quantities are locked (match EOPA)
   - RM quantities editable (e.g., 1000 tablets → 25 kg powder)
   - PM quantities editable (e.g., 1000 tablets → 100 boxes)

6. **Edit Units**
   - Enter unit for each PO (kg, liters, boxes, labels, pcs, etc.)
   - Default suggestions:
     * FG: pcs (pieces)
     * RM: kg (kilograms)
     * PM: boxes

7. **Generate Selected POs**
   - Click "Generate POs" button
   - Only selected POs are created
   - Unselected POs are skipped
   - Success message shows count: "Successfully generated 3 PO(s)"

8. **View Generated POs**
   - Navigate to PO page
   - See POs with unit information displayed
   - Edit vendor if needed
   - Enter invoices with quantities matching unit

## Example Scenarios

### Scenario 1: Generate All POs at Once
**EOPA**: PI/24-25/0001, Medicine: Paracetamol 500mg, Qty: 1000

**User Action**:
1. Click "Generate Purchase Orders"
2. Select all 3 POs (check header checkbox)
3. Edit RM quantity: 25 kg (conversion: 1000 tablets = 25 kg powder)
4. Edit PM quantity: 50 boxes (conversion: 1000 tablets = 50 boxes of 20 strips)
5. Edit units: FG=pcs, RM=kg, PM=boxes
6. Click "Generate POs"

**Result**:
- 3 POs created:
  * PO/24-25/FG/1/0001 - 1000 pcs to Manufacturer
  * PO/24-25/RM/1/0001 - 25 kg to RM Vendor
  * PO/24-25/PM/1/0001 - 50 boxes to PM Vendor

### Scenario 2: Generate Only FG First
**User Action**:
1. Click "Generate Purchase Orders"
2. Select only FG checkbox (uncheck RM and PM)
3. Click "Generate POs"

**Result**:
- 1 PO created:
  * PO/24-25/FG/1/0001 - 1000 pcs to Manufacturer
- RM and PM POs not created (can generate later)

### Scenario 3: Generate RM and PM, Skip FG
**User Action**:
1. Click "Generate Purchase Orders"
2. Uncheck FG, check RM and PM
3. Edit RM: 25 kg
4. Edit PM: 50 boxes
5. Edit units: RM=kg, PM=boxes
6. Click "Generate POs"

**Result**:
- 2 POs created:
  * PO/24-25/RM/1/0001 - 25 kg to RM Vendor
  * PO/24-25/PM/1/0001 - 50 boxes to PM Vendor
- FG PO not created

### Scenario 4: Different Units for Different Materials
**EOPA**: 2 Medicines
- Medicine A: Tablets (FG=pcs, RM=kg, PM=boxes)
- Medicine B: Syrup (FG=bottles, RM=liters, PM=labels)

**User Action**:
1. Click "Generate Purchase Orders"
2. Select all 6 POs
3. Edit units:
   - Medicine A FG: pcs
   - Medicine A RM: kg
   - Medicine A PM: boxes
   - Medicine B FG: bottles
   - Medicine B RM: liters
   - Medicine B PM: labels
4. Click "Generate POs"

**Result**:
- 6 POs created with appropriate units

## Data Flow

```
User Clicks "Generate POs" (EOPAPage.jsx)
    ↓
handleGeneratePO(eopa)
    ↓
Build poPreview array (FG, RM, PM for each medicine)
    - Set default units (FG=pcs, RM=kg, PM=boxes)
    - Set selected=false initially
    ↓
Show PO Review Dialog
    - User selects POs
    - User edits quantities (RM/PM)
    - User edits units
    ↓
User Clicks "Generate POs"
    ↓
handleConfirmGeneratePO()
    - Filter only selected POs
    - Build payload: { po_quantities: [{ eopa_item_id, po_type, quantity, unit }] }
    ↓
POST /api/po/generate-from-eopa/{eopa_id}
    ↓
Backend: POService.generate_pos_from_eopa()
    - Extract qty_lookup and unit_lookup from payload
    - For each selected PO:
        * Get custom_qty and custom_unit from lookup
        * Call _create_purchase_order(..., custom_quantity, unit)
    ↓
Backend: _create_purchase_order()
    - Create PurchaseOrder
    - Create POItem with ordered_quantity and unit
    - Save to database
    ↓
Response: { success: true, data: { total_pos_created: 3, ... } }
    ↓
Frontend: Show success message, refresh data
    ↓
User views POs on PO Page (POPage.jsx)
    - Unit displayed in PO items table
```

## Testing Checklist

### Backend Tests
- [ ] Unit field saves correctly in database
- [ ] API accepts unit parameter in payload
- [ ] Service layer passes unit to model
- [ ] Unit value persists across requests
- [ ] Null unit defaults to null (not required)

### Frontend Tests
- [ ] PO Review Dialog displays all potential POs
- [ ] Checkboxes work (individual + select all)
- [ ] Quantity edits work for RM/PM
- [ ] Quantity locked for FG
- [ ] Unit text field accepts input
- [ ] Selected POs filter correctly
- [ ] Validation: At least one PO must be selected
- [ ] Unit displays correctly on PO page
- [ ] Hard refresh shows unit data

### Integration Tests
- [ ] Generate all POs at once (FG + RM + PM)
- [ ] Generate only FG
- [ ] Generate only RM and PM
- [ ] Generate with custom quantities and units
- [ ] Units persist after page refresh
- [ ] Units display in PO items table
- [ ] Invoice entry works with different units

## Known Issues & Limitations

### Current Limitations
1. **No Unit Validation**: Free text input, no dropdown (future enhancement)
2. **No Unit Conversion**: System doesn't convert between units (e.g., kg → g)
3. **No Default Units per Medicine**: Medicine Master doesn't store default units
4. **No Constraints**: Users can enter any text (future: restrict to valid units)

### Future Enhancements
1. **Unit Dropdown**: Predefined list of units (kg, g, liters, ml, pcs, boxes, bottles, labels, cartons)
2. **Medicine Master Units**: Store default units per medicine (RM unit, PM unit)
3. **Conversion Ratios**: Save conversion ratios in Medicine Master (e.g., 1000 tablets = 25 kg)
4. **Auto-Calculate Quantities**: Use conversion ratios to auto-fill RM/PM quantities
5. **Unit Validation**: Backend validation of allowed units
6. **Batch Selection**: Select multiple medicines at once for PO generation

## Dependencies

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy 2.0+
- Alembic (migrations)
- PostgreSQL

### Frontend
- React 18
- Material-UI v5
- Axios

## Migration Instructions

### Running the Migration
```bash
cd backend
.\venv\Scripts\alembic.exe upgrade head
```

### Verifying Migration
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'po_items' AND column_name = 'unit';
```

Expected Result:
```
column_name | data_type         | is_nullable
------------|-------------------|------------
unit        | character varying | YES
```

## Rollback Plan

### If Issues Occur
1. **Backend Rollback**:
   ```bash
   cd backend
   .\venv\Scripts\alembic.exe downgrade -1
   ```

2. **Frontend Rollback**:
   - Remove Checkbox import
   - Remove unit column from PO Review Dialog
   - Remove unit column from PO items table
   - Remove unit handling in handlePOQuantityChange
   - Remove unit from payload in handleConfirmGeneratePO

3. **Database Manual Rollback** (if migration fails):
   ```sql
   ALTER TABLE po_items DROP COLUMN IF EXISTS unit;
   ```

## Support & Troubleshooting

### Common Issues

**Issue**: Unit not saving
- **Check**: Backend logs for errors
- **Fix**: Verify migration applied (`SELECT * FROM alembic_version`)

**Issue**: Checkboxes not working
- **Check**: Browser console for errors
- **Fix**: Verify Checkbox import from Material-UI

**Issue**: Selected POs not generating
- **Check**: Network tab - verify payload includes selected POs only
- **Fix**: Check filter logic in handleConfirmGeneratePO

**Issue**: Unit not displaying on PO page
- **Check**: Backend response includes unit field
- **Fix**: Verify eager loading of po_items in backend router

## Conclusion

This feature provides users with flexibility to:
1. **Select specific POs** to generate (not forced to create all at once)
2. **Edit RM/PM quantities** based on conversion ratios
3. **Specify units** for each PO (kg, liters, boxes, labels, pcs, etc.)
4. **Generate POs incrementally** (e.g., FG first, then RM/PM later)

The implementation follows the existing architecture patterns and maintains data integrity through proper validation and error handling.
