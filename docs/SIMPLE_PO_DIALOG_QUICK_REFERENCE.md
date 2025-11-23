# SimplePODialog - Quick Reference Card

## Component Overview
**File**: `frontend/src/components/SimplePODialog.jsx`  
**Purpose**: Advanced multi-vendor, multi-PO creation dialog from EOPA with automated line item generation

## Key Features (10-Second Summary)
✅ Auto-generates FG/RM/PM PO line items from EOPA + BOM explosion  
✅ One tab per vendor with draft PO number  
✅ EOPA Qty (readonly) vs Ordered Qty (editable)  
✅ Auto-calculations (value, GST, total)  
✅ Batch PO submission (one per vendor)  
✅ Draft → Real PO number update after save  

## Quick Usage

```jsx
<SimplePODialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  eopa={{
    id: 123,
    eopa_number: "EOPA/24-25/0001",
    selectedPOType: "RM"  // 'FG', 'RM', or 'PM'
  }}
  onSuccess={(msg) => alert(msg)}
/>
```

## UI Structure

```
┌─────────────────────────────────────────────────────┐
│ Create RM Purchase Orders                           │
│ EOPA: EOPA/24-25/0001 | 3 Vendor(s)                │
├─────────────────────────────────────────────────────┤
│ [📦 Vendor A]  [📦 Vendor B]  [📦 Vendor C]       │
│  PO/24-25/      PO/24-25/      PO/24-25/           │
│  RM/DRAFT/      RM/DRAFT/      RM/DRAFT/           │
│  0001           0002           0003                │
│  5 items        3 items        2 items             │
│  ₹250,000       ₹180,000       ₹95,000             │
├─────────────────────────────────────────────────────┤
│ Vendor Details | Ship-To Manufacturer | Delivery    │
├─────────────────────────────────────────────────────┤
│ Line Items Table:                                   │
│ [✓] Material | Medicine | EOPA | Qty/U | Ord | ... │
├─────────────────────────────────────────────────────┤
│ Total Value: ₹250,000 | GST: ₹45,000 | Total: 295k │
├─────────────────────────────────────────────────────┤
│            [Cancel]  [Create 3 PO(s)] ✅           │
└─────────────────────────────────────────────────────┘
```

## Line Items Table Columns

| Select | Material Name | Medicine | EOPA Qty | Qty/Unit | Ordered Qty | Unit | Rate | Value | GST% | GST Amt | Total | Actions |
|:------:|---------------|----------|:--------:|:--------:|:-----------:|:----:|:----:|:-----:|:----:|:-------:|:-----:|:-------:|
| ✓      | RM A          | Med X    | 1000     | 2.5      | **2500**    | KG   | 100  | 250k  | 18%  | 45k     | 295k  | 🗑️      |

**Key:**
- **EOPA Qty**: Read-only (from EOPA item)
- **Ordered Qty**: Editable (exploded from BOM)
- **Bold** = Editable field

## Auto-Calculations

```
Value Amount = Ordered Qty × Rate Per Unit
GST Amount = Value Amount × (GST Rate / 100)
Total Amount = Value Amount + GST Amount
```

Triggers on change: `ordered_quantity`, `rate_per_unit`, `gst_rate`

## Draft PO Number Format

```
PO/{FY}/{POType}/DRAFT/{SEQ}

Examples:
- PO/24-25/RM/DRAFT/0001
- PO/24-25/PM/DRAFT/0002
- PO/24-25/FG/DRAFT/0003
```

Updates to real PO number after save:
```
PO/24-25/RM/0001
```

## PO Generation Logic by Type

### FG (Finished Goods)
```
EOPA Items → Use directly
Vendor = Medicine Master manufacturer_vendor_id
Quantity = EOPA item quantity
```

### RM (Raw Materials)
```
EOPA Items → Fetch medicine BOM (RM) → Explode quantities
Vendor = BOM vendor_id || RM default_vendor_id || Medicine rm_vendor_id
Exploded Qty = EOPA Qty × qty_required_per_unit
```

### PM (Packing Materials)
```
EOPA Items → Fetch medicine BOM (PM) → Explode quantities
Vendor = BOM vendor_id || PM default_vendor_id || Medicine pm_vendor_id
Exploded Qty = EOPA Qty × qty_required_per_unit
```

## Backend API Calls

### 1. Load Data (Parallel)
```http
GET /api/raw-materials/
GET /api/packing-materials/
GET /api/products/medicines
GET /api/vendors/?vendor_type=MANUFACTURER
GET /api/vendors/
GET /api/eopa/{eopa_id}
```

### 2. Fetch BOM (Per Medicine)
```http
GET /api/medicines/{medicine_id}/raw-materials/
GET /api/medicines/{medicine_id}/packing-materials/
```

### 3. Submit PO (Per Vendor)
```http
POST /api/po/generate-po-by-vendor
{
  "eopa_id": 123,
  "vendor_id": 45,
  "po_type": "RM",
  "ship_to_manufacturer_id": 67,
  "items": [
    {
      "raw_material_id": 10,
      "ordered_quantity": 2500,
      "fulfilled_quantity": 1000,  // EOPA Qty
      "rate_per_unit": 100.00,
      "value_amount": 250000.00,
      "gst_rate": 18.00,
      "gst_amount": 45000.00,
      "total_amount": 295000.00
    }
  ]
}
```

## State Structure

```javascript
vendorPOs = [
  {
    vendor_id: 45,
    vendor_name: "Vendor A",
    draft_po_number: "PO/24-25/RM/DRAFT/0001",
    real_po_number: null,  // Updated after save
    ship_to_manufacturer_id: null,
    ship_to_address: "",
    delivery_date: "",
    payment_terms: "NET 30",
    freight_terms: "FOB",
    currency_code: "INR",
    items: [
      {
        raw_material_id: 10,
        medicine_id: 5,
        eopa_quantity: 1000,      // Readonly
        ordered_quantity: 2500,   // Editable
        fulfilled_quantity: 0,
        rate_per_unit: 100.00,
        value_amount: 250000.00,
        gst_rate: 18.00,
        gst_amount: 45000.00,
        total_amount: 295000.00,
        selected: true
      }
    ]
  }
]
```

## Key Functions

```javascript
// 1. Load data + generate PO items
loadMasterDataAndGeneratePOs()

// 2. Generate draft PO number
generateDraftPONumber(poType, sequenceNumber)

// 3. Handle item changes + auto-calc
handleItemChange(vendorIndex, itemIndex, field, value)

// 4. Handle ship-to manufacturer + auto-fill address
handleShipToChange(vendorIndex, manufacturerId)

// 5. Add line item
handleAddLineItem(vendorIndex)

// 6. Delete line item
handleDeleteLineItem(vendorIndex, itemIndex)

// 7. Calculate tab totals
calculateTabTotals(vendorPO)

// 8. Submit all vendor POs
handleSubmit()
```

## Common Tasks

### Open dialog for RM POs
```jsx
setSelectedEOPA({
  ...eopa,
  selectedPOType: 'RM'
})
setPODialogOpen(true)
```

### Add custom line item
```jsx
const handleAddLineItem = (vendorIndex) => {
  const updated = [...vendorPOs]
  updated[vendorIndex].items.push({
    id: `new-${Date.now()}`,
    raw_material_id: null,
    ordered_quantity: 0,
    rate_per_unit: 0,
    selected: true,
    isNew: true
  })
  setVendorPOs(updated)
}
```

### Calculate totals
```jsx
const totals = calculateTabTotals(vendorPO)
// → { totalValue, totalGST, grandTotal, itemCount }
```

### Submit all POs
```jsx
await handleSubmit()
// → Creates one PO per vendor
// → Updates draft_po_number → real_po_number
// → Shows success message with count
```

## Troubleshooting

### No vendors found
**Issue**: Empty vendor tabs  
**Cause**: Missing vendor assignments in Medicine Master or BOM  
**Fix**: Check `manufacturer_vendor_id`, `rm_vendor_id`, `pm_vendor_id` in Medicine Master

### BOM not exploding
**Issue**: Zero items in vendor tabs  
**Cause**: Medicine has no BOM entries  
**Fix**: Add RM/PM entries in Medicine BOM with `qty_required_per_unit`

### Calculations not updating
**Issue**: Amounts don't change when editing quantity  
**Cause**: Field name mismatch in `handleItemChange`  
**Fix**: Ensure field names match state keys (`ordered_quantity`, `rate_per_unit`, `gst_rate`)

### Draft PO number not updating
**Issue**: Tab still shows draft number after save  
**Cause**: Backend response missing `po_number`  
**Fix**: Ensure `createdPO.po_number` exists in response

## Testing Checklist

- [ ] FG POs generate from EOPA items
- [ ] RM POs explode from BOM with correct quantities
- [ ] PM POs explode from BOM with correct quantities
- [ ] Draft PO numbers follow format
- [ ] Tabs show one vendor per tab
- [ ] EOPA Qty is readonly, Ordered Qty is editable
- [ ] Auto-calculations work on field change
- [ ] Ship-to manufacturer auto-fills address
- [ ] Add/delete line items work
- [ ] Tab totals update in real-time
- [ ] Submit creates all POs in batch
- [ ] Draft → Real PO number update after save
- [ ] Success message shows correct count

## Performance Tips

✅ **Parallel loading**: All master data + EOPA loaded in one `Promise.all`  
✅ **Parallel submission**: All vendor POs submitted in one `Promise.all`  
⚠️ **Sequential BOM fetching**: Each medicine's BOM fetched one at a time (future optimization)  

## Related Files

- **Component**: `frontend/src/components/SimplePODialog.jsx`
- **Full Docs**: `docs/SIMPLE_PO_DIALOG_ADVANCED_IMPLEMENTATION.md`
- **API Docs**: `docs/PO_COMMERCIAL_FIELDS_IMPLEMENTATION.md`
- **Reference**: `docs/PO_QUICK_REFERENCE.md`
- **Inspiration**: `frontend/src/components/POManagementDialog.jsx`

## Summary

SimplePODialog provides **one-click multi-vendor PO generation** from EOPA with:
- Automated line item generation (FG/RM/PM)
- Vendor grouping with draft PO numbers
- EOPA Qty vs Ordered Qty separation
- Real-time auto-calculations
- Batch PO submission

**Result**: Create multiple POs across vendors in under 30 seconds! 🚀
