# PO Commercial Fields - Quick Reference

## 🔢 Auto-Calculation Formulas

```
value_amount = rate_per_unit × ordered_quantity
gst_amount = value_amount × (gst_rate ÷ 100)
total_amount = value_amount + gst_amount

PO Total Value = Σ (all items.value_amount)
PO Total GST = Σ (all items.gst_amount)
PO Total Invoice = Σ (all items.total_amount)
```

## 📋 PO Item Fields

### Required Fields
- ✅ ONE of: `medicine_id`, `raw_material_id`, or `packing_material_id`
- ✅ `ordered_quantity`
- ✅ `unit`

### Commercial Fields
- `rate_per_unit` - Rate per unit (₹)
- `value_amount` - Auto-calculated
- `gst_rate` - GST percentage (%)
- `gst_amount` - Auto-calculated
- `total_amount` - Auto-calculated
- `delivery_schedule` - e.g., "Immediately"
- `delivery_location` - Specific location

### Auto-Filled on Material Selection
- `description` - Material name
- `unit` - Material UOM
- `hsn_code` - Tax code
- `gst_rate` - GST percentage

## 📊 PO Header Fields

### Totals (Auto-calculated)
- `total_value_amount` - Sum of all item values
- `total_gst_amount` - Sum of all item GST
- `total_invoice_amount` - Sum of all item totals

### Shipping
- `ship_to_manufacturer_id` - Manufacturer FK
- `ship_to_address` - Shipping address

### Other
- `amendment_reason` - If amended
- `currency_exchange_rate` - Default: 1.0000

## 🔌 API Endpoints

### Recalculate PO
```http
POST /api/po/{po_id}/recalculate
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "total_value_amount": "376875.00",
    "total_gst_amount": "67837.50",
    "total_invoice_amount": "444712.50"
  }
}
```

## 🎨 Frontend Usage

```javascript
import POCreationForm from '../components/POCreationForm';

<POCreationForm 
  eopaId={4} 
  poType="RM"  // or "PM" or "FG"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

## 🧮 Backend Usage

### Calculate Item Amounts
```python
from app.services.po_service import calculate_po_item_amounts

item = POItem(
    ordered_quantity=Decimal('225'),
    rate_per_unit=Decimal('1675.00'),
    gst_rate=Decimal('18.00')
)

item = calculate_po_item_amounts(item)
# item.value_amount = 376875.00
# item.gst_amount = 67837.50
# item.total_amount = 444712.50
```

### Calculate PO Totals
```python
from app.services.po_service import calculate_po_totals

po = calculate_po_totals(po)
# po.total_value_amount = sum of all items
# po.total_gst_amount = sum of all items
# po.total_invoice_amount = sum of all items
```

### Validate Material Type
```python
from app.services.po_service import validate_po_item_material_type

item_data = {
    'raw_material_id': 1,
    'medicine_id': None,
    'packing_material_id': None
}

validate_po_item_material_type(item_data)  # ✅ Pass

item_data = {
    'raw_material_id': 1,
    'medicine_id': 2,  # ❌ Fail - multiple types
    'packing_material_id': None
}

validate_po_item_material_type(item_data)  # Raises AppException
```

## 🗄️ Database Constraint

```sql
-- Ensures exactly ONE material type per PO item
ALTER TABLE po_items
ADD CONSTRAINT chk_po_item_one_material_type
CHECK (
  ((medicine_id IS NOT NULL)::integer + 
   (raw_material_id IS NOT NULL)::integer + 
   (packing_material_id IS NOT NULL)::integer) = 1
);
```

## 🧪 Testing

```bash
# Run all PO commercial field tests
pytest tests/test_po_commercial_fields.py -v

# Run specific test
pytest tests/test_po_commercial_fields.py::TestAutoCalculations::test_calculate_item_amounts_basic -v
```

## 📝 Example: Complete PO Creation

```python
# Backend
po_data = {
    "eopa_id": 4,
    "po_type": "RM",
    "vendor_id": 2,
    "ship_to_address": "Factory A",
    "items": [
        {
            "raw_material_id": 1,
            "ordered_quantity": 225,
            "unit": "KG",
            "hsn_code": "30049099",
            "rate_per_unit": 1675.00,
            "gst_rate": 18.00,
            "delivery_schedule": "Immediately"
        }
    ]
}

# Auto-calculations happen:
# value_amount = 225 × 1675 = 376,875.00
# gst_amount = 376,875 × 0.18 = 67,837.50
# total_amount = 376,875 + 67,837.50 = 444,712.50
```

## 🎯 Material Switching Flow

```javascript
// User selects material from dropdown
handleMaterialChange(index, 'raw_material', 1)
  ↓
// Clear previous IDs
item.medicine_id = null
item.packing_material_id = null
  ↓
// Set new ID
item.raw_material_id = 1
  ↓
// Auto-fill from material master
item.description = "ALBENDAZOLE USP MICRO"
item.unit = "KG"
item.hsn_code = "30049099"
item.gst_rate = 18
  ↓
// Recalculate amounts
calculateItemAmounts(item)
```

## 🚨 Common Issues

### Issue: Multiple material types error
```
ERROR: PO item can only have ONE material type
```
**Solution:** Ensure only one of medicine_id, raw_material_id, or packing_material_id is set.

### Issue: Amounts not calculating
```
value_amount = 0.00
```
**Solution:** Ensure both `rate_per_unit` and `ordered_quantity` are set before calling `calculate_po_item_amounts()`.

### Issue: Migration fails
```
ERROR: relation "po_items" does not exist
```
**Solution:** Run `alembic upgrade head` to apply all migrations.

## 📚 Documentation

- Full Implementation: `docs/PO_COMMERCIAL_FIELDS_IMPLEMENTATION.md`
- Summary: `docs/PO_IMPLEMENTATION_SUMMARY.md`
- Tests: `backend/tests/test_po_commercial_fields.py`

---

**Quick Start:**
1. Run migration: `alembic upgrade head`
2. Import component: `import POCreationForm from '../components/POCreationForm'`
3. Use recalculate: `POST /api/po/{id}/recalculate`

**Last Updated:** 2025-11-23
