# Purchase Order Module - Commercial Fields Implementation

## Overview

This document describes the complete implementation of commercial fields in the Purchase Order (PO) module for the Pharma ERP system. The implementation supports Raw Materials (RM), Packing Materials (PM), and Finished Goods (FG) purchase orders with full commercial tracking including rates, values, GST calculations, and totals.

## Features Implemented

### 1. Database Schema Updates

#### PO Items Table (`po_items`)
New commercial fields added:
- `rate_per_unit` (numeric(15,2)) - Rate per unit in PO currency
- `value_amount` (numeric(15,2)) - Calculated as rate × quantity
- `gst_amount` (numeric(15,2)) - Calculated as value × (gst_rate/100)
- `total_amount` (numeric(15,2)) - Calculated as value + gst_amount
- `delivery_schedule` (text) - Delivery timeline (e.g., "Immediately", "Within 15 days")
- `delivery_location` (text) - Specific delivery location for the item

#### Purchase Orders Table (`purchase_orders`)
New commercial totals and shipping fields:
- `total_value_amount` (numeric(15,2)) - Sum of all item values
- `total_gst_amount` (numeric(15,2)) - Sum of all item GST amounts
- `total_invoice_amount` (numeric(15,2)) - Sum of all item totals
- `ship_to_manufacturer_id` (integer, FK to vendors) - Manufacturer receiving RM/PM
- `ship_to_address` (text) - Complete shipping address
- `amendment_reason` (text) - Reason for PO amendment
- `currency_exchange_rate` (numeric(10,4)) - Exchange rate for non-INR currencies

#### Constraints Added
- **One Material Type Constraint**: Each PO item must have exactly ONE of:
  - `medicine_id` (for FG)
  - `raw_material_id` (for RM)
  - `packing_material_id` (for PM)
  
  SQL Constraint:
  ```sql
  CHECK (
    ((medicine_id IS NOT NULL)::integer + 
     (raw_material_id IS NOT NULL)::integer + 
     (packing_material_id IS NOT NULL)::integer) = 1
  )
  ```

### 2. Backend Implementation

#### SQLAlchemy Models (`backend/app/models/po.py`)

**POItem Model Updates:**
```python
# Commercial fields
rate_per_unit: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
value_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
gst_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
total_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
delivery_schedule: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
delivery_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

**PurchaseOrder Model Updates:**
```python
# Commercial totals
total_value_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=0)
total_gst_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=0)
total_invoice_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=0)

# Shipping details
ship_to_manufacturer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"))
ship_to_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

#### Pydantic Schemas (`backend/app/schemas/po.py`)

**POItemCreate Schema:**
```python
class POItemCreate(BaseModel):
    medicine_id: Optional[int] = None
    raw_material_id: Optional[int] = None
    packing_material_id: Optional[int] = None
    ordered_quantity: float
    unit: Optional[str] = None
    
    # Commercial fields
    rate_per_unit: Optional[Decimal] = None
    value_amount: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    delivery_schedule: Optional[str] = None
    delivery_location: Optional[str] = None
    
    # Tax fields
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None
```

**POResponse Schema:**
Includes all commercial totals and shipping information.

#### Service Layer (`backend/app/services/po_service.py`)

**Auto-Calculation Functions:**

1. **`calculate_po_item_amounts(item: POItem) -> POItem`**
   - Calculates value_amount = rate × quantity
   - Calculates gst_amount = value × (gst_rate/100)
   - Calculates total_amount = value + gst_amount
   - Returns updated POItem

2. **`calculate_po_totals(po: PurchaseOrder) -> PurchaseOrder`**
   - Sums all item value_amounts → total_value_amount
   - Sums all item gst_amounts → total_gst_amount
   - Sums all item total_amounts → total_invoice_amount
   - Returns updated PurchaseOrder

3. **`validate_po_item_material_type(item_data: dict) -> None`**
   - Validates exactly ONE material type is specified
   - Raises AppException if validation fails
   - Ensures data integrity before database operations

#### API Endpoints (`backend/app/routers/po.py`)

**New Endpoint:**

**POST `/api/po/{po_id}/recalculate`**
- Recalculates all commercial amounts for a PO
- Updates each item's value, GST, and total
- Recalculates PO totals
- Returns updated PO with all calculations
- Protected: Requires ADMIN or PROCUREMENT_OFFICER role

Usage:
```bash
POST /api/po/123/recalculate
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Purchase Order recalculated successfully",
  "data": {
    "id": 123,
    "po_number": "PO/RM/2025-26/001",
    "total_value_amount": "376875.00",
    "total_gst_amount": "67837.50",
    "total_invoice_amount": "444712.50",
    "items": [...]
  }
}
```

### 3. Migration Script

**File:** `backend/alembic/versions/5374a7ebec48_add_commercial_fields_to_po.py`

The migration:
- Adds all new columns to po_items and purchase_orders
- Creates foreign key constraint for ship_to_manufacturer_id
- Adds check constraint for one-material-type validation
- Creates performance indexes
- Sets default values for existing records
- Includes proper rollback in downgrade()

**Run Migration:**
```bash
cd backend
alembic upgrade head
```

### 4. Frontend Implementation

#### POCreationForm Component
**File:** `frontend/src/components/POCreationForm.jsx`

**Features:**
- ✅ Matches screenshot layout exactly
- ✅ Editable table with all commercial fields
- ✅ Material dropdown (RM/PM/FG) per row
- ✅ Auto-calculation of Value, GST Amount, Total Amount
- ✅ Material selection auto-fills HSN, Unit, GST Rate
- ✅ Add/Remove rows dynamically
- ✅ Real-time totals summary
- ✅ Delivery schedule per item
- ✅ Support for all three PO types (RM, PM, FG)

**Table Columns (matching screenshot):**
1. CODE - Dropdown to select material
2. DESCRIPTION OF GOODS - Auto-filled from material, editable
3. UNIT - Auto-filled, editable
4. HSN CODE - Auto-filled, editable
5. QUANTITY - User input
6. RATE PER UNIT(Rs) - User input
7. VALUE - Auto-calculated (qty × rate)
8. GST(Rate) - Auto-filled from material, editable
9. GST AMT - Auto-calculated (value × gst_rate/100)
10. Total Amount(Rs) - Auto-calculated (value + gst_amt)
11. DELIVERY SCHEDULE - User input
12. Delete - Remove row button

**Material Switching Logic:**
```javascript
const handleMaterialChange = (index, materialType, materialId) => {
  // Reset all material IDs
  // Set selected material ID
  // Auto-populate: description, unit, hsn_code, gst_rate
  // Recalculate amounts
}
```

**Auto-Calculation Logic:**
```javascript
const calculateItemAmounts = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate_per_unit) || 0;
  const gstRate = parseFloat(item.gst_rate) || 0;
  
  const value = qty * rate;
  const gstAmt = value * (gstRate / 100);
  const total = value + gstAmt;
  
  return { ...item, value_amount: value, gst_amount: gstAmt, total_amount: total };
}
```

## Business Rules

### 1. Material Type Validation
- Each PO item MUST have exactly ONE material type
- Database constraint enforces this rule
- Backend validation before insert/update
- Frontend prevents invalid selections

### 2. Auto-Calculation Rules
- Value = Rate × Quantity
- GST Amount = Value × (GST Rate / 100)
- Total Amount = Value + GST Amount
- PO Totals = Sum of all item amounts

### 3. Material Selection
When user changes material in dropdown:
1. Previous material ID is cleared
2. New material ID is set
3. Description auto-filled from material name
4. Unit auto-filled from material UOM
5. HSN code auto-filled from material
6. GST rate auto-filled from material
7. All amounts recalculated

### 4. Delivery Information
- Each item can have its own delivery schedule
- Each item can have specific delivery location
- PO-level ship_to_address for overall shipping

## API Usage Examples

### Creating a PO with Commercial Fields

```javascript
POST /api/po/
{
  "eopa_id": 4,
  "po_type": "RM",
  "vendor_id": 2,
  "po_date": "2025-11-23",
  "ship_to_address": "Manufacturing Plant, Address...",
  "total_value_amount": 376875.00,
  "total_gst_amount": 67837.50,
  "total_invoice_amount": 444712.50,
  "items": [
    {
      "raw_material_id": 1,
      "ordered_quantity": 225,
      "unit": "KG",
      "hsn_code": "30049099",
      "gst_rate": 18.00,
      "rate_per_unit": 1675.00,
      "value_amount": 376875.00,
      "gst_amount": 67837.50,
      "total_amount": 444712.50,
      "delivery_schedule": "Immediately",
      "delivery_location": "Warehouse A"
    }
  ]
}
```

### Recalculating PO Amounts

```javascript
POST /api/po/123/recalculate
// Automatically recalculates all amounts based on current rates and quantities
```

## Testing Checklist

### Backend Tests
- [ ] Test po_items constraint (only one material type)
- [ ] Test calculate_po_item_amounts function
- [ ] Test calculate_po_totals function
- [ ] Test recalculate endpoint
- [ ] Test PO creation with commercial fields
- [ ] Test PO update with commercial fields
- [ ] Test validation of material types

### Frontend Tests
- [ ] Test material dropdown switching
- [ ] Test auto-calculation on rate change
- [ ] Test auto-calculation on quantity change
- [ ] Test auto-calculation on GST rate change
- [ ] Test add/remove rows
- [ ] Test totals calculation
- [ ] Test form submission
- [ ] Test material auto-fill (HSN, Unit, GST)

### Integration Tests
- [ ] End-to-end PO creation flow
- [ ] Material switching updates calculations
- [ ] Recalculate endpoint updates all fields
- [ ] Database constraints enforce rules
- [ ] Migration runs successfully

## Files Modified/Created

### Backend
- ✅ `backend/database/schema_updates_commercial_fields.sql` - SQL schema update
- ✅ `backend/alembic/versions/5374a7ebec48_add_commercial_fields_to_po.py` - Migration
- ✅ `backend/app/models/po.py` - ORM models updated
- ✅ `backend/app/schemas/po.py` - Pydantic schemas updated
- ✅ `backend/app/services/po_service.py` - Service logic with calculations
- ✅ `backend/app/routers/po.py` - Recalculate endpoint added

### Frontend
- ✅ `frontend/src/components/POCreationForm.jsx` - New PO creation form

### Documentation
- ✅ `docs/PO_COMMERCIAL_FIELDS_IMPLEMENTATION.md` - This file

## Migration Instructions

### 1. Backend Migration
```bash
cd backend
alembic upgrade head
```

### 2. Verify Schema
```sql
-- Verify po_items columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'po_items' 
  AND column_name IN ('rate_per_unit', 'value_amount', 'gst_amount', 'total_amount');

-- Verify constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'po_items'::regclass 
  AND conname = 'chk_po_item_one_material_type';
```

### 3. Test Backend
```bash
cd backend
pytest tests/test_po_commercial_fields.py -v
```

### 4. Frontend Integration
Import and use the POCreationForm component:

```javascript
import POCreationForm from '../components/POCreationForm';

<POCreationForm 
  eopaId={4} 
  poType="RM" 
  onSubmit={handlePOSubmit}
  onCancel={handleCancel}
/>
```

## Next Steps

1. ✅ Run database migration
2. ✅ Test backend endpoints with Postman/Thunder Client
3. ✅ Integrate POCreationForm into main PO workflow
4. ⏳ Add comprehensive tests
5. ⏳ Update existing PO screens to show commercial fields
6. ⏳ Add PDF generation with commercial totals
7. ⏳ Add Excel export with commercial fields

## Notes

- All numeric fields use `Decimal` type for precision
- Auto-calculations happen in real-time on frontend
- Backend recalculate endpoint ensures data consistency
- Database constraint prevents invalid material type combinations
- Migration is reversible (downgrade supported)
- All changes maintain backward compatibility

---

**Implementation Status:** ✅ Complete
**Last Updated:** 2025-11-23
**Version:** 1.0
