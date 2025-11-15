# Invoice-Based PO Fulfillment Implementation

## Overview

Complete implementation of invoice-driven Purchase Order fulfillment workflow where:
- **POs contain ONLY quantities** (no pricing)
- **Vendor invoices provide actual pricing** (source of truth)
- **Invoice receipt updates PO fulfillment status**
- **Material balance tracked for RM/PM at manufacturer**

---

## Architecture Changes

### 1. Database Models

#### New Models Created

**`app/models/invoice.py`**:
- `VendorInvoice` - Vendor tax invoices with actual pricing
  - Links to PO
  - Contains subtotal, tax, total amount
  - Status: PENDING → PROCESSED
- `VendorInvoiceItem` - Invoice line items
  - Shipped quantity from vendor
  - Actual unit price (source of truth)
  - Tax details, batch numbers, expiry dates

**Key Fields**:
```python
# VendorInvoice
invoice_number: str (unique)
invoice_date: date
invoice_type: InvoiceType (RM/PM/FG)
po_id: int
vendor_id: int
subtotal, tax_amount, total_amount: Decimal
status: InvoiceStatus

# VendorInvoiceItem
medicine_id: int
shipped_quantity: Decimal
unit_price: Decimal (SOURCE OF TRUTH)
tax_rate, tax_amount: Decimal
batch_number, expiry_date: Optional
```

#### Updated Models

**`app/models/po.py`**:

**PurchaseOrder** - Removed pricing, added fulfillment tracking:
```python
# REMOVED:
- total_amount

# ADDED:
- total_ordered_qty: Decimal
- total_fulfilled_qty: Decimal
- status: OPEN | PARTIAL | CLOSED
- invoices: relationship to VendorInvoice
```

**POItem** - Quantity-only tracking:
```python
# REMOVED:
- quantity
- unit_price
- total_price
- received_quantity

# ADDED:
- ordered_quantity: Decimal
- fulfilled_quantity: Decimal
- language: Optional[str] (for PM)
- artwork_version: Optional[str] (for PM)
```

**POStatus Enum**:
- `OPEN` - No fulfillment yet
- `PARTIAL` - Partially fulfilled
- `CLOSED` - Fully fulfilled
- `CANCELLED` - Cancelled

---

### 2. Business Logic Services

#### `app/services/po_service.py` (UPDATED)

**Material Balance Check**:
```python
def _get_material_balance(medicine_id: int) -> Decimal:
    """Get current material balance for manufacturer"""
    
def _create_purchase_order(...) -> Optional[PurchaseOrder]:
    """
    Create PO with material balance check.
    
    For RM/PM:
    - Check manufacturer's material balance
    - effective_qty = required_qty - available_balance
    - Skip PO if balance >= required
    - Create PO with effective_qty only if > 0
    """
```

**Key Changes**:
- Removed all pricing calculations
- Added material balance check for RM/PM
- Returns `None` if PO not needed (sufficient balance)
- Quantity-only PO items

#### `app/services/invoice_service.py` (NEW)

**Main Methods**:

```python
def process_vendor_invoice(po_id, invoice_data, user_id) -> Dict:
    """
    Process vendor tax invoice.
    
    Workflow:
    1. Validate PO exists and is OPEN/PARTIAL
    2. Create invoice record with actual pricing
    3. Create invoice items
    4. Update PO item fulfillment quantities
    5. Update PO status (OPEN → PARTIAL → CLOSED)
    6. For RM/PM: Update manufacturer material balance
    7. Commit transaction
    """

def _update_material_balance(medicine_id, quantity):
    """
    Update manufacturer's material balance.
    
    For RM/PM invoices:
    - Adds received quantity to manufacturer stock
    - Creates MaterialBalance record if not exists
    - Logs balance updates
    """

def get_po_invoices(po_id) -> List[VendorInvoice]:
    """Get all invoices for a PO"""

def get_invoice_by_number(invoice_number) -> VendorInvoice:
    """Get invoice details by number"""
```

---

### 3. API Endpoints

#### `app/routers/invoice.py` (NEW)

**POST `/api/invoice/vendor/{po_id}`**
- Process vendor tax invoice (RM/PM/FG)
- Auth: ADMIN, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER
- Request: `InvoiceCreate` schema
- Response: Invoice processing summary

**GET `/api/invoice/po/{po_id}`**
- Get all invoices for a PO
- Auth: All roles (view-only for ACCOUNTANT)
- Response: List of invoices with items

**GET `/api/invoice/{invoice_number}`**
- Get invoice details by number
- Auth: All roles
- Response: Invoice with PO and vendor details

---

### 4. Pydantic Schemas

#### `app/schemas/invoice.py` (NEW)

**Request Schemas**:
```python
class InvoiceItemCreate(BaseModel):
    medicine_id: int
    shipped_quantity: float
    unit_price: float  # Actual price from vendor
    tax_rate: float
    batch_number: Optional[str]
    expiry_date: Optional[date]
    remarks: Optional[str]

class InvoiceCreate(BaseModel):
    invoice_number: str
    invoice_date: date
    po_id: int
    subtotal: float
    tax_amount: float
    total_amount: float
    items: List[InvoiceItemCreate]
    remarks: Optional[str]
```

**Response Schemas**:
```python
class InvoiceItemResponse(BaseModel):
    # Full item details with medicine info
    
class InvoiceResponse(BaseModel):
    # Full invoice with PO, vendor, items
```

---

### 5. Database Migration

**`alembic/versions/add_invoice_fulfillment.py`**

**Upgrade Operations**:
1. Create `vendor_invoices` table
2. Create `vendor_invoice_items` table
3. Add `PARTIAL` to POStatus enum
4. Add `total_ordered_qty`, `total_fulfilled_qty` to `purchase_orders`
5. Remove `total_amount` from `purchase_orders`
6. Add `ordered_quantity`, `fulfilled_quantity`, `language`, `artwork_version` to `po_items`
7. Remove `quantity`, `unit_price`, `total_price`, `received_quantity` from `po_items`
8. Migrate existing data: `quantity` → `ordered_quantity`

**Run Migration**:
```bash
cd backend
alembic upgrade head
```

---

## Workflow Diagrams

### Complete PO Fulfillment Flow

```
1. EOPA Approved
   ↓
2. PO Generation Service
   ├─ Check material balance (RM/PM only)
   ├─ Calculate: effective_qty = required - balance
   ├─ Skip PO if effective_qty <= 0
   └─ Create PO with ordered quantities
   ↓
3. PO Created (OPEN status)
   ├─ Contains: medicine_id, ordered_qty
   ├─ NO PRICING
   └─ Sent to vendor
   ↓
4. Vendor Ships Goods
   ├─ Sends Tax Invoice
   └─ Invoice contains: shipped_qty, unit_price, taxes
   ↓
5. Invoice Processing (POST /api/invoice/vendor/{po_id})
   ├─ Create invoice record
   ├─ Update PO fulfillment: fulfilled_qty += shipped_qty
   ├─ Update PO status:
   │  ├─ fulfilled == ordered → CLOSED
   │  ├─ fulfilled < ordered → PARTIAL
   │  └─ fulfilled == 0 → OPEN
   └─ For RM/PM: Update manufacturer balance
   ↓
6. Material Balance Updated (RM/PM only)
   ├─ manufacturer_balance += received_qty
   └─ Used in next PO calculation
```

### Material Balance Logic

```
Before Creating RM/PM PO:
┌─────────────────────────────────────┐
│ Required Qty: 1000                  │
│ Manufacturer Balance: 300           │
│ Effective PO Qty: 1000 - 300 = 700 │
└─────────────────────────────────────┘
        ↓
Create PO for 700 units only

After Invoice Received (500 units):
┌─────────────────────────────────────┐
│ Previous Balance: 300               │
│ Received: 500                       │
│ New Balance: 300 + 500 = 800       │
└─────────────────────────────────────┘
```

---

## Testing

### Test Script

**`backend/scripts/test_invoice_fulfillment.py`**

Validates:
1. ✅ PO contains only quantities (no pricing)
2. ✅ Invoice processing updates PO fulfillment
3. ✅ PO status transitions (OPEN → PARTIAL → CLOSED)
4. ✅ Material balance updates for RM/PM
5. ✅ Invoice retrieval endpoints

**Run Tests**:
```bash
cd backend
.\venv\Scripts\python.exe .\scripts\test_invoice_fulfillment.py
```

---

## API Usage Examples

### 1. Process Vendor Invoice

**Request**:
```http
POST /api/invoice/vendor/123
Authorization: Bearer <token>

{
  "invoice_number": "INV-2025-001",
  "invoice_date": "2025-11-15",
  "po_id": 123,
  "subtotal": 10000.00,
  "tax_amount": 1800.00,
  "total_amount": 11800.00,
  "items": [
    {
      "medicine_id": 5,
      "shipped_quantity": 500,
      "unit_price": 20.00,
      "tax_rate": 18.0,
      "batch_number": "BATCH-2025-A",
      "expiry_date": "2026-12-31"
    }
  ],
  "remarks": "Shipment 1 of 2"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Invoice INV-2025-001 processed successfully",
  "data": {
    "invoice_id": 45,
    "invoice_number": "INV-2025-001",
    "invoice_type": "RM",
    "po_number": "PO/RM/25-26/0001",
    "po_status": "PARTIAL",
    "total_shipped_qty": 500.0,
    "total_amount": 11800.0,
    "items_count": 1
  }
}
```

### 2. Get PO Invoices

**Request**:
```http
GET /api/invoice/po/123
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "invoice_number": "INV-2025-001",
      "invoice_type": "RM",
      "po": {
        "po_number": "PO/RM/25-26/0001",
        "status": "PARTIAL"
      },
      "vendor": {
        "vendor_name": "ChemSource Pvt Ltd"
      },
      "total_amount": 11800.0,
      "items": [...]
    }
  ]
}
```

---

## Key Business Rules Implemented

1. ✅ **PO Creation**:
   - Contains ONLY quantities
   - NO pricing information
   - Checks material balance for RM/PM before creation
   - Skips PO if manufacturer has sufficient stock

2. ✅ **Invoice Processing**:
   - Records actual pricing from vendor (source of truth)
   - Updates PO fulfillment quantities
   - Automatic status transitions based on fulfillment
   - Updates manufacturer material balance for RM/PM

3. ✅ **PO Status Transitions**:
   - `OPEN`: No fulfillment yet (fulfilled_qty == 0)
   - `PARTIAL`: Partially fulfilled (0 < fulfilled_qty < ordered_qty)
   - `CLOSED`: Fully fulfilled (fulfilled_qty == ordered_qty)

4. ✅ **Material Balance**:
   - Tracked at manufacturer level
   - Increased when RM/PM invoice received
   - Checked before creating new RM/PM PO
   - Effective PO qty = Required - Available balance

5. ✅ **Data Integrity**:
   - Cannot over-ship (validation in invoice processing)
   - Cannot process invoice for closed PO
   - Unique invoice numbers enforced
   - Transaction safety (rollback on error)

---

## Files Created/Modified

### Created:
- `app/models/invoice.py` - Invoice models
- `app/services/invoice_service.py` - Invoice processing logic
- `app/routers/invoice.py` - Invoice API endpoints
- `app/schemas/invoice.py` - Invoice Pydantic schemas
- `alembic/versions/add_invoice_fulfillment.py` - Database migration
- `scripts/test_invoice_fulfillment.py` - Test suite

### Modified:
- `app/models/po.py` - Removed pricing, added fulfillment tracking
- `app/services/po_service.py` - Added material balance check
- `app/models/vendor.py` - Added invoice relationship
- `app/models/__init__.py` - Exported new models
- `app/services/__init__.py` - Exported InvoiceService
- `app/main.py` - Registered invoice router

---

## Next Steps

1. **Run Migration**:
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Restart Backend**:
   ```bash
   cd c:\Ratish\Pawan\run
   .\start-backend.ps1
   ```

3. **Test Workflow**:
   ```bash
   cd backend
   .\venv\Scripts\python.exe .\scripts\test_invoice_fulfillment.py
   ```

4. **Frontend Integration** (Future):
   - Create invoice entry form
   - Add "Process Invoice" button on PO details page
   - Show PO fulfillment status
   - Display invoice history per PO

---

## Logging Events

All operations are comprehensively logged:

```python
# PO Creation with Balance Check
"event": "PO_ITEM_ADJUSTED_FOR_BALANCE"
"event": "PO_ITEM_SKIPPED_SUFFICIENT_BALANCE"
"event": "PO_CANCELLED_NO_ITEMS"
"event": "PO_CREATED"

# Invoice Processing
"event": "INVOICE_PROCESSED"
"event": "MATERIAL_BALANCE_UPDATED"
"event": "INVOICE_PROCESSING_FAILED"
```

---

## Summary

✅ **Complete invoice-driven PO fulfillment workflow implemented**
✅ **POs contain only quantities (no pricing)**
✅ **Vendor invoices are source of truth for pricing**
✅ **Automatic PO status updates based on fulfillment**
✅ **Material balance tracking for RM/PM**
✅ **Comprehensive logging and error handling**
✅ **Clean architecture (Router → Service → ORM)**
✅ **Transaction safety and data integrity**

The system now follows the specified business rules where Purchase Orders are quantity-based, and all pricing comes from vendor tax invoices after shipment!
