# Copilot Instructions - Pharmaceutical Procurement & Dispatch System

## Project Overview
A web-based pharmaceutical procurement, manufacturing, and dispatch workflow system with three-tier architecture:
- **Frontend**: React + Vite with Material UI/Ant Design
- **Backend**: FastAPI (Python 3.10+) with SQLAlchemy ORM
- **Database**: PostgreSQL
- **Deployment**: Local client-server setup

## Architecture Pattern

```
React Frontend (Vite)
    ↓ REST API (JWT Auth)
FastAPI Routers (API Gateway + RBAC)
    ↓ Business Logic
Service Layer (Domain Logic)
    ↓ ORM
SQLAlchemy Models
    ↓
PostgreSQL Database
```

## Project Structure (MANDATORY)

```
backend/
  app/
    routers/          # FastAPI route handlers (thin layer)
    services/         # Business logic (thick layer)
    models/           # SQLAlchemy ORM models
    schemas/          # Pydantic request/response schemas
    database/         # DB connection, session management
    auth/             # JWT, password hashing, RBAC decorators
    utils/            # Helpers (number_generator.py, etc.)
    exceptions/       # Custom exceptions + handlers
    logs/             # Structured JSON logs
    seeders/          # Database seeders (users, configs, countries)
  alembic/            # Database migrations
  database/           # SQL schema and seed files
    pharma_schema.sql # Complete database DDL schema
    seeds.sql         # Essential seed data (admin, countries, configs)
  tests/              # pytest test suite
  scripts/            # Utility scripts (create_admin.py, etc.)

frontend/
  src/
    pages/            # Route-level components
    components/       # Reusable UI components
    services/         # API client (Axios)
    hooks/            # Custom hooks (useApiError, useAuth, etc.)
    context/          # React Context (AuthContext)
    guards/           # Route guards (PrivateRoute, RoleGuard)
  tests/              # Jest + React Testing Library

docs/
  *.md              # Implementation guides, testing guides, SOP
```

## Database Schema

**Location**: `backend/database/pharma_schema.sql` (complete DDL schema)

The database consists of **12 main tables** organized around pharmaceutical procurement workflow:

### Core Tables

1. **users** - System users with role-based access control
   - Fields: id, username, hashed_password, email, role (ADMIN, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER, ACCOUNTANT), is_active, created_at
   - Used for: Authentication, authorization, audit trail

2. **country_master** - Country reference data
   - Fields: id, country_code, country_name, region, currency
   - Used for: Vendor country mapping, currency defaults

3. **vendor** - Vendor master data (4 types: PARTNER, RM, PM, MANUFACTURER)
   - Fields: id, vendor_code, vendor_name, vendor_type, contact_person, email, phone, address, country_id, is_active
   - Used for: PI partner, EOPA vendor selection, PO vendor assignment

4. **product_master** - Generic product catalog
   - Fields: id, product_code, product_name, description, unit, is_active
   - Used for: Product reference (non-medicine items)

5. **medicine_master** - Medicine catalog with vendor mappings
   - Fields: id, medicine_code, medicine_name, description, unit, manufacturer_vendor_id, rm_vendor_id, pm_vendor_id, is_active
   - **Critical**: Links to 3 vendor types for EOPA vendor defaults (user-editable)
   - Used for: PI items, EOPA vendor resolution, PO items

### Transaction Tables

6. **pi** (Proforma Invoice) - Customer purchase requests
   - Fields: id, pi_number (UNIQUE), pi_date, partner_vendor_id (customer), remarks, created_by, created_at, updated_at
   - Used for: Starting point of procurement workflow

7. **pi_item** - Line items in PI
   - Fields: id, pi_id, medicine_id, quantity, unit_price, total_price, remarks
   - Used for: Individual medicine requirements in PI

8. **eopa** (Estimated Order & Price Approval) - **PI-ITEM-LEVEL**
   - Fields: id, eopa_number (UNIQUE), pi_item_id, vendor_type (MANUFACTURER/RM/PM), vendor_id, quantity, estimated_unit_price, estimated_total, status, approval_date, approved_by, remarks, created_by
   - **Critical Architecture**: 
     - One EOPA per PI Item per Vendor Type
     - Each PI Item can have up to 3 EOPAs (one for each vendor type)
     - UNIQUE constraint on (pi_item_id, vendor_type)
     - Vendor defaults from medicine_master but is user-editable
   - Used for: Price estimation, vendor selection, approval workflow before PO creation

9. **purchase_order** - Purchase orders (3 types: RM, PM, FG)
   - Fields: id, po_number (UNIQUE), po_date, po_type (RM/PM/FG), vendor_id, delivery_date, status (OPEN/PARTIAL/CLOSED), remarks, created_by
   - **Critical**: POs do NOT contain pricing - pricing comes from vendor_invoice
   - Used for: Ordering raw materials, packaging materials, finished goods

10. **po_item** - Line items in PO (NO PRICING)
    - Fields: id, po_id, medicine_id, ordered_quantity, fulfilled_quantity, unit, language (for PM), artwork_version (for PM), remarks
    - **Critical**: No unit_price field - fulfillment driven by invoices
    - Used for: Ordered quantities, PM specifications, fulfillment tracking

### Invoice & Configuration Tables

11. **vendor_invoice** - Vendor tax invoices with actual pricing
    - Fields: id, invoice_number, po_id, invoice_date, medicine_id, shipped_quantity, unit_price, total_amount, tax_amount, discount_amount, net_amount, payment_status, payment_date, remarks, created_by
    - **Critical**: Source of truth for pricing, drives PO fulfillment
    - Workflow:
      - RM Vendor sends RM Tax Invoice → updates RM PO fulfilled_qty → updates manufacturer_balance
      - PM Vendor sends PM Tax Invoice → updates PM PO fulfilled_qty → updates manufacturer_balance
      - Manufacturer sends FG Invoice → updates FG PO fulfilled_qty → decrements manufacturer_balance
    - Used for: Pricing, PO fulfillment, material balance tracking, payment tracking

12. **system_configuration** - Flexible configuration storage with JSONB
    - Fields: id, config_key (UNIQUE), config_value (JSON/JSONB), description, category, is_sensitive, updated_at
    - **Critical**: Stores all system settings (42 configs across 8 categories)
    - Used for: Company info, workflow rules, document numbering formats, vendor rules, SMTP settings, security policies, UI preferences, integrations

### Key Indexes

- **Unique constraints**: pi_number, eopa_number, po_number, config_key, (pi_item_id, vendor_type)
- **Performance indexes**: idx_users_username, idx_vendor_code, idx_medicine_code, idx_pi_number, idx_config_key, idx_config_category
- **Foreign key indexes**: All relationship fields indexed for join performance

### Schema Evolution

- Use **Alembic migrations** for all schema changes
- SQL files in `backend/database/` are for reference and fresh installations only
- Never edit pharma_schema.sql manually - generate from Alembic models

## Core Domain Models

Always model these entities with proper relationships:

1. **User** (with roles: ADMIN, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER, ACCOUNTANT)
2. **Vendor** (types: PARTNER, RM, PM, MANUFACTURER)
3. **Product Master** & **Medicine Master** (with vendor mappings)
4. **PI** (Proforma Invoice) + **PI Items**
5. **EOPA** (Estimated Order & Price Approval) - **PI-Item-Level Architecture**
   - One EOPA per PI Item per Vendor Type (MANUFACTURER, RM, PM)
   - Each PI Item can have up to 3 EOPAs (one for each vendor type)
   - Vendor selection defaults from Medicine Master but is user-editable
6. **Purchase Orders** (RM/PM/FG) + **PO Items**
7. **Material Receipt** & **Material Balance**
8. **Dispatch Advice** & **Warehouse GRN**
9. **PO Closure**

### EOPA Architecture (CRITICAL)

**EOPA is now PI-ITEM-LEVEL, not PI-LEVEL:**
- Each PI Item can have multiple EOPAs (one per vendor type: MANUFACTURER, RM, PM)
- Medicine Master defines default vendors, but users can override during EOPA creation
- EOPA number is unique system-wide (EOPA/YY-YY/####) with unique constraint
- Vendor type determines which vendor mapping is used from Medicine Master

## Authentication & Authorization

### 1. User Roles & Permissions

| Role                  | Permissions                                                    |
|-----------------------|----------------------------------------------------------------|
| **ADMIN**             | Full system access, user management, all CRUD operations      |
| **PROCUREMENT_OFFICER** | Create PI, EOPA, POs; View reports; Cannot delete records    |
| **WAREHOUSE_MANAGER** | Material Receipt, Dispatch Advice, GRN; View inventory        |
| **ACCOUNTANT**        | View-only access to all financial records and reports         |

### 2. JWT Authentication Pattern

**Login Endpoint** (`backend/app/routers/auth.py`):
```python
@router.post("/login")
async def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise AppException("Invalid credentials", "ERR_AUTH_FAILED", 401)
    
    access_token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"username": user.username, "role": user.role}
        }
    }
```

**Protected Route Example**:
```python
from app.auth.dependencies import get_current_user, require_role

@router.post("/pi/", dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))])
async def create_pi(
    pi_data: PICreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Business logic
    pass
```

### 3. Frontend Authentication

**AuthContext** (`frontend/src/context/AuthContext.jsx`):
```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (credentials) => {
    const res = await api.post('/api/auth/login', credentials);
    setToken(res.data.data.access_token);
    setUser(res.data.data.user);
    localStorage.setItem('token', res.data.data.access_token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Route Guard** (`frontend/src/guards/PrivateRoute.jsx`):
```javascript
export const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

**Usage in Routes**:
```javascript
<Route path="/pi/create" element={
  <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
    <PICreatePage />
  </PrivateRoute>
} />
```

### 4. Password Security

- Use `bcrypt` for password hashing (backend: `passlib[bcrypt]`)
- Minimum password length: 8 characters
- Hash passwords before storing: `hash_password(plain_password)`
- Verify with: `verify_password(plain_password, hashed_password)`

## Standardized Patterns

### 1. API Response Format (ALWAYS USE)

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "error_code": null,
  "errors": null,
  "timestamp": "2025-11-14T10:30:00Z"
}
```

### 2. Exception Handling

**Custom Exception Class** (`backend/app/exceptions/base.py`):
```python
class AppException(Exception):
    def __init__(self, message: str, error_code: str = "ERR_UNKNOWN", status_code: int = 400):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
```

**Error Code Convention**:
- `ERR_VALIDATION` - Invalid input
- `ERR_NOT_FOUND` - Record not found
- `ERR_DB` - Database errors
- `ERR_AUTH_FAILED` - Authentication failed
- `ERR_FORBIDDEN` - Insufficient permissions
- `ERR_PO_GENERATION` - PO creation failed
- `ERR_EOPA_CREATION` - EOPA creation failed
- `ERR_PI_VALIDATION` - PI validation failed
- `ERR_VENDOR_MISMATCH` - Vendor not mapped in Medicine Master
- `ERR_DUPLICATE_EOPA` - EOPA already exists for PI item + vendor type
- `ERR_TYPE_MISMATCH` - Type conversion error (e.g., Decimal/float)
- `ERR_SERVER` - Unexpected server error

**Global Exception Handler** (`backend/app/exceptions/handlers.py`):
Must handle HTTPException, ValidationError, SQLAlchemy errors, and custom AppException.

### 3. Database Type Safety

**CRITICAL: Decimal Type Handling**

PostgreSQL NUMERIC columns return Python `Decimal` objects. All monetary values and quantities MUST be handled as Decimals to prevent type errors:

```python
from decimal import Decimal

# ✅ CORRECT: Convert float inputs to Decimal before database operations
def create_eopa(eopa_data: EOPACreate, db: Session):
    estimated_total = Decimal(str(eopa_data.quantity)) * Decimal(str(eopa_data.estimated_unit_price))
    
    eopa = EOPA(
        quantity=Decimal(str(eopa_data.quantity)),
        estimated_unit_price=Decimal(str(eopa_data.estimated_unit_price)),
        estimated_total=estimated_total
    )
    db.add(eopa)
    db.commit()

# ❌ WRONG: Direct float multiplication with Decimal
quantity = Decimal("10.5")  # from database
price = 25.0  # from Pydantic float
total = quantity * price  # TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'
```

**Type Conversion Rules:**
- Always use `Decimal(str(float_value))` to convert Pydantic float inputs
- Never use `Decimal(float_value)` directly - causes precision issues
- Apply conversions to: prices, quantities, totals, rates, percentages
- Pydantic schemas use `float` for API interface, models use `Decimal` for database

### 4. Unique Sequence Number Generation

Auto-generate using `backend/app/utils/number_generator.py`:

**CRITICAL: Integrated with Configuration Service**

Number generation now reads formats from the Configuration Service, allowing runtime customization without code changes:

```python
# Reads format from system_configuration table
# Falls back to hardcoded defaults if config unavailable

# PI: PI/YY-YY/0001 (e.g., PI/24-25/0001)
generate_pi_number(db)

# EOPA: EOPA/YY-YY/0001
generate_eopa_number(db)

# PO: PO/{TYPE}/YY-YY/0001
generate_po_number(db, po_type)  # po_type: "RM", "PM", "FG"
```

**Integration Pattern:**
```python
from app.services.configuration_service import ConfigurationService

def generate_pi_number(db: Session) -> str:
    # Try to get format from configuration
    format_config = ConfigurationService.get_config(db, "pi_number_format", use_cache=True)
    if format_config and format_config.config_value:
        format_str = format_config.config_value.get("format", "PI/{FY}/{SEQ:04d}")
    else:
        format_str = "PI/{FY}/{SEQ:04d}"  # Fallback
    
    # Generate number using format
    # ... (implementation)
```

**Configuration Keys:**
- `pi_number_format` - PI number format
- `eopa_number_format` - EOPA number format
- `po_rm_number_format` - RM PO format
- `po_pm_number_format` - PM PO format
- `po_fg_number_format` - FG PO format
- `grn_number_format` - GRN format
- `dispatch_number_format` - Dispatch advice format
- `invoice_number_format` - Vendor invoice format

**CRITICAL: Preventing Duplicate Numbers in Bulk Operations**

When creating multiple records with sequential numbers in a loop, use `db.flush()` to update the database sequence before generating the next number:

```python
# ✅ CORRECT: Flush after each insert to increment sequence
created_eopas = []

if bulk_data.manufacturer_price:
    eopa_number = generate_eopa_number(db)
    eopa = EOPA(eopa_number=eopa_number, ...)
    db.add(eopa)
    db.flush()  # Updates sequence immediately
    created_eopas.append(eopa)

if bulk_data.rm_price:
    eopa_number = generate_eopa_number(db)  # Gets next number
    eopa = EOPA(eopa_number=eopa_number, ...)
    db.add(eopa)
    db.flush()  # Updates sequence immediately
    created_eopas.append(eopa)

db.commit()  # Commit all at once

# ❌ WRONG: No flush - all calls see same database state
for vendor_type in vendor_types:
    eopa_number = generate_eopa_number(db)  # Returns same number each time!
    eopa = EOPA(eopa_number=eopa_number, ...)
    db.add(eopa)
db.commit()  # UniqueViolation: duplicate key value violates unique constraint
```

**Flush vs Commit:**
- `db.flush()`: Writes pending changes to database but keeps transaction open; updates sequences
- `db.commit()`: Writes changes and closes transaction; use after all operations complete
- Use flush in loops when generating sequential numbers
- Use commit once at the end to ensure atomicity

### 5. Pydantic Schema Class Ordering

**CRITICAL: Respect Dependency Order**

When Pydantic schemas reference other schemas, define the referenced schema FIRST:

```python
# ✅ CORRECT: VendorBasic defined before it's referenced
class VendorBasic(BaseModel):
    id: int
    vendor_name: str
    vendor_type: str
    
    class Config:
        from_attributes = True

class MedicineBasic(BaseModel):
    id: int
    medicine_name: str
    manufacturer_vendor: Optional[VendorBasic] = None  # References VendorBasic
    rm_vendor: Optional[VendorBasic] = None
    pm_vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True

# ❌ WRONG: Forward reference without definition
class MedicineBasic(BaseModel):
    manufacturer_vendor: Optional[VendorBasic] = None  # NameError: name 'VendorBasic' is not defined

class VendorBasic(BaseModel):  # Too late!
    id: int
    vendor_name: str
```

**Schema Ordering Rules:**
- Define "leaf" schemas first (no dependencies)
- Then define schemas that reference the leaf schemas
- Update `model_rebuild()` if using forward references
- Apply same ordering to all schema files (pi.py, eopa.py, po.py)

### 6. Logging (Structured JSON)

```python
import logging
logger = logging.getLogger("pharma")

logger.info({
    "event": "PI_CREATED",
    "pi_id": 123,
    "partner_vendor_id": 8,
    "user": current_user.username,
    "request_id": request.state.request_id
})
```

**Log Levels**:
- INFO: Normal operations (PI created, EOPA generated, user login)
- WARNING: Soft errors (vendor mismatch warnings, failed login attempts)
- ERROR: Failures (DB errors, validation failures)
- CRITICAL: System-level failures

**Always log user actions for audit trail: who, what, when**

**Never use `print()` - always use `logger`**

### 7. Frontend UI Patterns

**CRITICAL: Material-UI Best Practices**

**Editable Dropdowns vs Read-Only Display:**

When users need to select from predefined options (even with defaults), use `Select` components instead of read-only `Typography`:

```jsx
// ✅ CORRECT: Editable vendor selection with default from Medicine Master
const [formData, setFormData] = useState({
  manufacturer_vendor_id: piItem.medicine?.manufacturer_vendor_id || ''
})

<FormControl fullWidth>
  <InputLabel>Manufacturer Vendor</InputLabel>
  <Select
    name="manufacturer_vendor_id"
    value={formData.manufacturer_vendor_id}
    onChange={handleChange}
    label="Manufacturer Vendor"
  >
    {vendors
      .filter(v => v.vendor_type === 'MANUFACTURER')
      .map(vendor => (
        <MenuItem key={vendor.id} value={vendor.id}>
          {vendor.vendor_name} ({vendor.vendor_code})
        </MenuItem>
      ))
    }
  </Select>
</FormControl>

// ❌ WRONG: Read-only display when user needs flexibility
<Typography>
  Manufacturer: {piItem.medicine?.manufacturer_vendor?.vendor_name}
</Typography>
```

**Fetching Reference Data:**

Always fetch reference data (vendors, customers, products) when forms open:

```jsx
const [vendors, setVendors] = useState([])

useEffect(() => {
  if (open) {
    fetchVendors()
  }
}, [open])

const fetchVendors = async () => {
  try {
    const response = await api.get('/api/vendors/')
    if (response.data.success) {
      setVendors(response.data.data)
    }
  } catch (err) {
    console.error('Failed to fetch vendors:', err)
  }
}
```

**Loading States and Error Handling:**

Provide clear feedback during async operations:

```jsx
const [loading, setLoading] = useState(true)
const [submitting, setSubmitting] = useState(false)
const { error, handleApiError, clearError } = useApiError()

// Loading state
{loading ? (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <CircularProgress />
  </Box>
) : (
  <Table>
    {/* Content */}
  </Table>
)}

// Submit button with loading state
<Button
  variant="contained"
  onClick={handleSubmit}
  disabled={submitting}
>
  {submitting ? <CircularProgress size={24} /> : 'Create EOPA'}
</Button>

// Error display with Snackbar
<Snackbar
  open={!!error}
  autoHideDuration={6000}
  onClose={clearError}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
  <Alert severity="error" onClose={clearError}>
    {error}
  </Alert>
</Snackbar>
```

**Contextual Information Display:**

Show parent context (PI number, partner vendor, date) at the top of nested forms:

```jsx
{/* PI Context Box */}
<Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
  <Typography variant="subtitle2" color="info.dark">
    PI Information
  </Typography>
  <Typography variant="body2">
    <strong>PI Number:</strong> {piItem.pi?.pi_number}
  </Typography>
  <Typography variant="body2">
    <strong>Partner:</strong> {piItem.pi?.partner_vendor?.vendor_name}
  </Typography>
  <Typography variant="body2">
    <strong>Date:</strong> {new Date(piItem.pi?.pi_date).toLocaleDateString()}
  </Typography>
</Box>
```

**Vendor Type Icons:**

Use consistent icons for vendor types across the application:

```jsx
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'

const getVendorTypeIcon = (type) => {
  switch (type) {
    case 'MANUFACTURER':
      return <Business fontSize="small" />
    case 'RM':
      return <Inventory2 fontSize="small" />
    case 'PM':
      return <LocalShipping fontSize="small" />
    default:
      return null
  }
}

// Usage in Chip
<Chip 
  icon={getVendorTypeIcon(eopa.vendor_type)} 
  label={getVendorTypeLabel(eopa.vendor_type)}
  size="small"
/>
```

**Accordion-Based Grouping:**

For hierarchical data (PI → PI Items → EOPAs), use accordions for better organization:

```jsx
<Accordion sx={{ mb: 2, boxShadow: 2 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.50' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
      <Box>
        <Typography variant="h6" color="primary.main">
          {pi.pi_number}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Partner: {pi.partner_vendor?.vendor_name} | Date: {new Date(pi.pi_date).toLocaleDateString()}
        </Typography>
      </Box>
      <Chip label={`${piItems.length} items`} color="primary" size="small" />
    </Box>
  </AccordionSummary>
  <AccordionDetails>
    <Table>
      {/* PI Items with nested EOPA rows */}
    </Table>
  </AccordionDetails>
</Accordion>
```

**Expandable Table Rows with Collapse:**

Use collapsible rows to show related nested data without cluttering the main table:

```jsx
const PIItemRow = ({ piItem, eopas }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' }, bgcolor: open ? 'action.selected' : 'inherit' }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{piItem.medicine?.medicine_name}</TableCell>
        {/* Other cells */}
      </TableRow>
      
      {/* Expandable nested content */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, borderBottom: 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                EOPAs for this PI Item ({eopas.length})
              </Typography>
              <Table size="small">
                {/* Nested EOPA table */}
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}
```

**Status Chips with Color Coding:**

Use color-coded chips to show status at a glance:

```jsx
<Chip
  label={eopa.status}
  size="small"
  color={
    eopa.status === 'APPROVED' ? 'success' :
    eopa.status === 'REJECTED' ? 'error' : 'warning'
  }
/>
```

**Enhanced Data Display Formatting:**

Format currency and numbers for better readability:

```jsx
// Currency with Indian locale
₹{parseFloat(piItem.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

// Fixed decimal places
₹{parseFloat(eopa.estimated_unit_price).toFixed(2)}

// Conditional remarks display
{eopas.some(e => e.remarks) && (
  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
    <Typography variant="caption" fontWeight="bold">REMARKS</Typography>
    {eopas.filter(e => e.remarks).map(eopa => (
      <Typography key={eopa.id} variant="body2">
        <strong>{eopa.vendor_type}:</strong> {eopa.remarks}
      </Typography>
    ))}
  </Box>
)}
```

**Visual Hierarchy with Alternating Row Colors:**

Improve table readability with alternating backgrounds:

```jsx
<TableBody>
  {items.map((item, idx) => (
    <TableRow
      key={item.id}
      sx={{
        bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
        '&:hover': { bgcolor: 'primary.50' }
      }}
    >
      {/* Table cells */}
    </TableRow>
  ))}
</TableBody>
```

**Action Button Placement:**

Position action buttons consistently in tables:

```jsx
<TableCell align="right">
  <Button
    size="small"
    variant="outlined"
    startIcon={<AddIcon />}
    onClick={() => onCreateEOPA(piItem)}
  >
    Create EOPA
  </Button>
</TableCell>
```

**Component Composition for Complex Tables:**

Break down complex table structures into reusable components:

```jsx
// Parent Component - Organizes data by PI
const EOPAPage = () => {
  const [pis, setPis] = useState([])
  const [eopas, setEopas] = useState([])
  
  return (
    <Container>
      {pis.map(pi => {
        const piItems = pi.items || []
        const piEopas = eopas.filter(e => 
          piItems.some(item => item.id === e.pi_item_id)
        )
        return (
          <PIAccordion
            key={pi.id}
            pi={pi}
            piItems={piItems}
            eopas={piEopas}
            onCreateEOPA={handleCreateEOPA}
          />
        )
      })}
    </Container>
  )
}

// Mid-Level Component - Groups PI Items
const PIAccordion = ({ pi, piItems, eopas, onCreateEOPA }) => (
  <Accordion>
    <AccordionSummary>
      <Typography>{pi.pi_number}</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Table>
        {piItems.map(piItem => {
          const itemEopas = eopas.filter(e => e.pi_item_id === piItem.id)
          return (
            <PIItemRow
              key={piItem.id}
              piItem={piItem}
              eopas={itemEopas}
              onCreateEOPA={onCreateEOPA}
            />
          )
        })}
      </Table>
    </AccordionDetails>
  </Accordion>
)

// Leaf Component - Individual PI Item with expandable EOPAs
const PIItemRow = ({ piItem, eopas, onCreateEOPA }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <TableRow>
        <TableCell>{piItem.medicine?.medicine_name}</TableCell>
        <TableCell>
          {eopas.map(eopa => (
            <Chip key={eopa.id} label={eopa.vendor_type} />
          ))}
        </TableCell>
        <TableCell>
          <Button onClick={() => onCreateEOPA(piItem)}>
            Create EOPA
          </Button>
        </TableCell>
      </TableRow>
      {/* Expandable nested EOPA details */}
    </>
  )
}
```

**Data Grouping and Filtering:**

Efficiently group and filter data for nested displays:

```jsx
// Group EOPAs by vendor type for quick lookup
const eopaByVendorType = {
  MANUFACTURER: eopas.find(e => e.vendor_type === 'MANUFACTURER'),
  RM: eopas.find(e => e.vendor_type === 'RM'),
  PM: eopas.find(e => e.vendor_type === 'PM'),
}

// Filter and display conditional UI
const hasEOPAs = eopas.length > 0
const hasRemarks = eopas.some(e => e.remarks)

{hasEOPAs && (
  <IconButton onClick={() => setOpen(!open)}>
    {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
  </IconButton>
)}

// Conditional rendering based on data availability
{eopas.length === 0 && (
  <Chip label="No EOPAs" size="small" color="default" />
)}
```

### 8. SQLAlchemy ORM Style

Use SQLAlchemy 2.0+ declarative style with relationships:

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime

class Base(DeclarativeBase):
    pass

class PI(Base):
    __tablename__ = "pi"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    pi_number: Mapped[str] = mapped_column(unique=True, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    items: Mapped[list["PIItem"]] = relationship(back_populates="pi")
    creator: Mapped["User"] = relationship()
```

**CRITICAL: Eager Loading for Nested Relationships**

When querying entities with nested relationships, use `joinedload` to prevent N+1 queries and ensure all required data is loaded:

```python
from sqlalchemy.orm import joinedload

# Example: Loading PI with all vendor relationships for EOPA form
pis = db.query(PI).options(
    joinedload(PI.items)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.manufacturer_vendor),
    joinedload(PI.items)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.rm_vendor),
    joinedload(PI.items)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.pm_vendor),
    joinedload(PI.partner_vendor)
).all()

# Example: Loading EOPA with PI item and medicine vendors
eopas = db.query(EOPA).options(
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.pi)
        .joinedload(PI.partner_vendor),
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.manufacturer_vendor),
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.rm_vendor),
    joinedload(EOPA.pi_item)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.pm_vendor),
    joinedload(EOPA.vendor)
).all()
```

**Eager Loading Best Practices:**
- Always anticipate what nested data the frontend needs
- Use `joinedload` chains for multiple levels of relationships
- Load ALL vendor types when working with Medicine Master
- Include partner_vendor for PI when showing context in EOPA forms
- Apply same eager loading pattern to both list and single-item endpoints

### 9. Frontend Error Handling

**Centralized hook** (`frontend/src/hooks/useApiError.js`):

```javascript
export const useApiError = () => {
  const handleApiError = (error) => {
    const errorCode = error.response?.data?.error_code;
    const message = error.response?.data?.message || "Unknown error";
    
    // Map error codes to user-friendly messages
    const friendlyMessages = {
      ERR_AUTH_FAILED: "Invalid username or password",
      ERR_FORBIDDEN: "You don't have permission to perform this action",
      ERR_VENDOR_MISMATCH: "Vendor not mapped in Medicine Master"
    };
    
    const displayMessage = friendlyMessages[errorCode] || message;
    
    // Show Material UI Snackbar/Toast
    console.error({ errorCode, message, timestamp: new Date().toISOString() });
    return displayMessage;
  };
  
  return { handleApiError };
};
```

**Standard API call pattern**:
```javascript
try {
  const res = await api.post("/api/pi/", payload);
  if (!res.data.success) throw new Error(res.data.message);
  return res.data.data;
} catch (err) {
  handleApiError(err);
}
```

## Testing Strategy

### Backend Testing (pytest)

**Test Structure** (`backend/tests/`):
```
tests/
  conftest.py           # Fixtures (test_db, test_client, auth_headers)
  test_auth.py          # Authentication & authorization tests
  test_pi.py            # PI CRUD and business logic tests
  test_eopa.py          # EOPA generation tests
  test_po.py            # PO creation tests
  test_vendors.py       # Vendor CRUD tests
```

**Testing Patterns**:

```python
# conftest.py - Reusable fixtures
@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

@pytest.fixture
def auth_headers(test_client):
    response = test_client.post("/api/auth/login", json={
        "username": "admin",
        "password": "test123"
    })
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

# Test example
def test_create_pi_unauthorized(test_client):
    response = test_client.post("/api/pi/", json={...})
    assert response.status_code == 401
    assert response.json()["error_code"] == "ERR_AUTH_FAILED"

def test_create_pi_success(test_client, auth_headers):
    response = test_client.post("/api/pi/", json={...}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] == True
```

**Run tests**:
```bash
pytest backend/tests/ -v --cov=app
```

### Frontend Testing (Jest + React Testing Library)

**Test Structure** (`frontend/src/tests/`):
```
tests/
  components/           # Component unit tests
  pages/                # Page integration tests
  hooks/                # Custom hook tests
  utils/                # Utility function tests
```

**Testing Patterns**:

```javascript
// PIForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PIForm } from '../components/PIForm';

test('renders PI form with required fields', () => {
  render(<PIForm />);
  expect(screen.getByLabelText(/Partner Vendor/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/PI Date/i)).toBeInTheDocument();
});

test('displays validation error for empty fields', async () => {
  render(<PIForm />);
  fireEvent.click(screen.getByText(/Submit/i));
  
  await waitFor(() => {
    expect(screen.getByText(/Partner Vendor is required/i)).toBeInTheDocument();
  });
});

test('submits form with valid data', async () => {
  const mockSubmit = jest.fn();
  render(<PIForm onSubmit={mockSubmit} />);
  
  fireEvent.change(screen.getByLabelText(/Partner Vendor/i), {
    target: { value: '1' }
  });
  fireEvent.click(screen.getByText(/Submit/i));
  
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
```

**Run tests**:
```bash
npm test -- --coverage
```

## Code Generation Rules (Agentic Behavior)

When user creates:

| User Action          | Auto-Generate                                               |
|----------------------|-------------------------------------------------------------|
| SQLAlchemy Model     | → Pydantic schema + Router + Service + Alembic migration + Tests |
| API Router           | → Service class + Pydantic schemas + RBAC decorators + Tests |
| Pydantic Schema      | → Corresponding SQLAlchemy model fields                    |
| New Business Flow    | → Frontend page + API endpoints + service logic + Tests    |
| Medicine Master      | → Vendor resolution logic in services                      |
| Error scenario       | → Proper error code + handler + logging + Test case        |
| New User Role        | → Update RBAC decorators + Route guards + Tests            |

## Development Workflows

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head

# Create initial admin user
python scripts/create_admin.py

uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing
```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app --cov-report=html

# Frontend tests
cd frontend
npm test -- --coverage
```

## Key Business Rules

1. **Vendor Resolution**: Medicine Master links to vendors (RM/PM/MANUFACTURER). Users can override Medicine Master defaults during EOPA creation.

2. **EOPA Architecture**: Each PI Item can have up to 3 EOPAs (one per vendor type). Vendor selection defaults from Medicine Master but is editable. EOPA numbers must be unique system-wide.

3. **PO Types**: Purchase Orders branch into three types (RM/PM/FG) with different numbering and workflows.

4. **EOPA Workflow**: PI → EOPA (PI-Item-Level) → PO. EOPA requires approval before PO generation.

5. **Material Balance**: Track inventory changes through Material Receipt and Dispatch Advice.

6. **PO Closure**: Only close POs after all material receipts and GRNs are completed.

7. **Audit Trail**: All create/update/delete operations must log user, timestamp, and action for compliance.

8. **Role-Based Workflows**: Certain operations require specific roles (e.g., only PROCUREMENT_OFFICER can approve EOPA).

9. **Type Safety**: Always convert Pydantic float inputs to Decimal before database operations to prevent type errors.

10. **Sequence Uniqueness**: Use db.flush() when generating multiple sequential numbers in loops to prevent duplicates.

## Naming Conventions

- **Models**: PascalCase (`ProductMaster`, `PIItem`, `User`)
- **Tables**: snake_case (`product_master`, `pi_item`, `users`)
- **API Endpoints**: kebab-case (`/api/pi-items`, `/api/purchase-orders`, `/api/auth/login`)
- **Functions**: snake_case (`generate_pi_number`, `create_eopa`, `hash_password`)
- **React Components**: PascalCase (`PIForm`, `EOPATable`, `PrivateRoute`)
- **Hooks**: camelCase with 'use' prefix (`useAuth`, `useApiError`)

## Critical Files

- `backend/app/database/session.py` - DB connection management
- `backend/app/auth/dependencies.py` - JWT auth & RBAC decorators
- `backend/app/auth/utils.py` - Password hashing, token generation
- `backend/app/exceptions/handlers.py` - Global exception handling
- `backend/app/utils/number_generator.py` - Document number generation (integrated with ConfigurationService)
- `backend/app/services/configuration_service.py` - Configuration management with caching
- `backend/app/models/configuration.py` - SystemConfiguration model
- `backend/app/seeders/configuration_seeder.py` - 42 default configurations
- `frontend/src/services/api.js` - Axios instance with JWT interceptors
- `frontend/src/hooks/useApiError.js` - Centralized error handling
- `frontend/src/context/AuthContext.jsx` - Authentication state management
- `frontend/src/guards/PrivateRoute.jsx` - Route protection
- `frontend/src/pages/ConfigurationPage.jsx` - Admin configuration UI

## Configuration Service (Enterprise Feature)

**Location**: `backend/app/services/configuration_service.py`

A flexible, database-driven configuration system that eliminates hardcoded values and enables runtime customization without code changes.

### Architecture

**Model** (`backend/app/models/configuration.py`):
```python
class SystemConfiguration(Base):
    __tablename__ = "system_configuration"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    config_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    config_value: Mapped[dict] = mapped_column(JSON)  # JSONB in PostgreSQL
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Service Pattern** - In-memory caching with TTL:
```python
class ConfigurationService:
    # Class-level cache (shared across instances)
    _cache: Dict[str, SystemConfiguration] = {}
    _cache_timestamp: Optional[datetime] = None
    _cache_ttl_minutes: int = 5  # 5-minute TTL
    
    @classmethod
    def _refresh_cache(cls, db: Session) -> None:
        """Load all configurations into memory cache"""
        configs = db.query(SystemConfiguration).all()
        cls._cache = {config.config_key: config for config in configs}
        cls._cache_timestamp = datetime.utcnow()
    
    @classmethod
    def get_config(cls, db: Session, key: str, use_cache: bool = True) -> Optional[SystemConfiguration]:
        """Retrieve configuration with optional caching"""
        if use_cache and not cls._is_cache_stale():
            return cls._cache.get(key)
        # ... (DB query fallback)
```

### Configuration Categories (8 total, 42 configs)

1. **System** (7 configs):
   - `company_name` - Company name for reports/emails/PDFs
   - `company_logo_url` - Logo URL
   - `company_address` - Full company address (JSONB)
   - `default_currency` - Default currency (INR, USD, etc.)
   - `default_timezone` - Default timezone (Asia/Kolkata)
   - `date_format` - UI date format (DD-MM-YYYY)
   - `fiscal_year` - Current fiscal year (24-25)

2. **Workflow** (7 configs):
   - `allow_pi_edit_after_eopa` - Edit PI after EOPA created
   - `allow_eopa_edit_after_approval` - Edit EOPA after approval
   - `auto_close_po_on_fulfillment` - Auto-close fulfilled POs
   - `enable_partial_dispatch` - Allow partial PO dispatch
   - `enable_manufacturer_balance_logic` - Track material balance
   - `enable_invoice_fulfillment` - Update PO from invoices
   - `enable_multilingual_pm` - PM language/artwork versioning

3. **Numbering** (8 configs):
   - `pi_number_format` - PI/{FY}/{SEQ:04d}
   - `eopa_number_format` - EOPA/{FY}/{SEQ:04d}
   - `po_rm_number_format` - PO/RM/{FY}/{SEQ:04d}
   - `po_pm_number_format` - PO/PM/{FY}/{SEQ:04d}
   - `po_fg_number_format` - PO/FG/{FY}/{SEQ:04d}
   - `grn_number_format` - GRN/{FY}/{SEQ:04d}
   - `dispatch_number_format` - DISP/{FY}/{SEQ:04d}
   - `invoice_number_format` - INV/{FY}/{SEQ:04d}

4. **Vendor** (3 configs):
   - `allowed_pm_languages` - EN, FR, AR, SP, HI
   - `allowed_pm_artwork_versions` - v1.0, v1.1, v2.0, etc.
   - `enable_vendor_fallback_logic` - Use Medicine Master defaults

5. **Email** (6 configs):
   - `smtp_host` - SMTP server host
   - `smtp_port` - SMTP port (587)
   - `smtp_username` - SMTP auth username (sensitive)
   - `smtp_password` - SMTP password (sensitive)
   - `email_sender` - Default sender email
   - `enable_email_notifications` - Toggle notifications by event

6. **Security** (3 configs):
   - `password_policy` - Complexity requirements
   - `jwt_token_expiry_minutes` - Token TTL (60 min)
   - `role_permissions` - RBAC permission matrix

7. **UI** (4 configs):
   - `ui_theme` - light/dark theme
   - `ui_primary_color` - Brand color (#1976d2)
   - `items_per_page` - Pagination size (50)
   - `default_language` - UI language (EN)

8. **Integration** (4 configs):
   - `erp_integration_url` - External ERP URL
   - `erp_api_key` - ERP authentication key (sensitive)
   - `webhook_endpoints` - Event webhook URLs
   - `file_storage_type` - local/s3/azure

### API Endpoints (9 total)

**CRUD Operations** (ADMIN only):
- `GET /api/config/` - List all configurations (with category filter, include_sensitive param)
- `GET /api/config/{key}` - Get specific config
- `POST /api/config/` - Create config (ADMIN only)
- `PUT /api/config/{key}` - Update config (ADMIN only)
- `DELETE /api/config/{key}` - Delete config (ADMIN only)

**Domain-Specific Getters** (Public):
- `GET /api/config/system/info` - System configuration (company name, currency, timezone)
- `GET /api/config/workflow/rules` - Workflow rules (PI edit, auto-close, etc.)
- `GET /api/config/document/numbering` - Document numbering formats
- `GET /api/config/vendor/rules` - Vendor rules (languages, artwork versions)

### Cache Performance

**Benchmarked Performance:**
- **Cached read**: 0.0000s (instant)
- **Database read**: 0.1085s (108.5ms)
- **Cache TTL**: 5 minutes
- **Cache invalidation**: Automatic on create/update/delete

**Cache Strategy:**
- Class-level variables ensure shared state across service instances
- Single cache for all 42 configurations
- Stale cache detection via timestamp comparison
- Manual refresh on write operations
- Graceful fallback to DB if cache unavailable

### Service Integration Patterns

**1. Number Generator Integration:**
```python
# backend/app/utils/number_generator.py
from app.services.configuration_service import ConfigurationService

def generate_pi_number(db: Session) -> str:
    format_config = ConfigurationService.get_config(db, "pi_number_format", use_cache=True)
    format_str = format_config.config_value.get("format", "PI/{FY}/{SEQ:04d}") if format_config else "PI/{FY}/{SEQ:04d}"
    # ... generate number using format
```

**2. PDF Service Integration:**
```python
# backend/app/services/pdf_service.py
class POPDFService:
    def __init__(self, db: Session):
        self.db = db
        # Load company info from configuration
        company_name_config = ConfigurationService.get_config(db, "company_name")
        self.company_name = company_name_config.config_value.get("value", "Pharma Co. Ltd.") if company_name_config else "Pharma Co. Ltd."
        # ... (similar for address, currency)
```

**3. Email Service Integration:**
```python
# backend/app/services/email_service.py
class EmailService:
    def __init__(self, db: Session):
        self.db = db
        # Load SMTP settings from configuration
        smtp_host_config = ConfigurationService.get_config(db, "smtp_host")
        self.smtp_host = smtp_host_config.config_value.get("value") if smtp_host_config else os.getenv("SMTP_HOST")
        # ... (similar for port, username, password, sender)
```

**Common Integration Pattern:**
1. Accept `db: Session` parameter in service constructors
2. Use `ConfigurationService.get_config(db, key, use_cache=True)` to fetch config
3. Extract value from `config.config_value` (JSONB field)
4. Provide fallback defaults for graceful degradation
5. Use lazy imports to avoid circular dependencies

### Lazy Imports (Avoiding Circular Dependencies)

When ConfigurationService is used in modules that are imported by main.py (like number_generator.py), use lazy imports:

```python
# ❌ WRONG: Top-level import causes circular dependency
from app.services.configuration_service import ConfigurationService

def generate_pi_number(db: Session) -> str:
    config = ConfigurationService.get_config(db, "pi_number_format")
    # ...

# ✅ CORRECT: Lazy import inside function
def generate_pi_number(db: Session) -> str:
    from app.services.configuration_service import ConfigurationService
    config = ConfigurationService.get_config(db, "pi_number_format")
    # ...
```

### Frontend Admin UI

**Location**: `frontend/src/pages/ConfigurationPage.jsx`

**Features:**
- 8 category tabs (System, Workflow, Numbering, Vendor, Email, Security, UI, Integration)
- Inline editing with JSON validation
- Sensitive data masking (show/hide toggle for passwords, API keys)
- Refresh button to reload from server
- Save confirmation dialog
- Success/error snackbars for user feedback
- User-friendly value formatting:
  - `{value: "X"}` displays as `X`
  - `{enabled: true}` displays as `✓ Enabled`
  - Arrays → comma-separated list
  - Objects → readable key-value pairs

**Access Control:**
- Route protected by PrivateRoute with `allowedRoles={['ADMIN']}`
- Only ADMIN users can view/edit configurations
- Sidebar menu item: "Settings" under Admin section

### Seeding Default Configurations

**Script**: `backend/app/seeders/configuration_seeder.py`

**Usage:**
```python
from app.seeders.configuration_seeder import seed_all

# Seed all 42 default configurations
seed_all()
```

**Idempotent Design:**
- Checks for existing configs before creating (by config_key)
- Safe to run multiple times
- Updates description if config exists but description changed

**Seeder Functions:**
- `seed_system_config()` - 7 system configs
- `seed_workflow_rules()` - 7 workflow configs
- `seed_document_numbering()` - 8 numbering formats
- `seed_vendor_rules()` - 3 vendor configs
- `seed_email_config()` - 6 email settings
- `seed_security_config()` - 3 security policies
- `seed_ui_config()` - 4 UI preferences
- `seed_integration_config()` - 4 integration settings
- `seed_all()` - Runs all seeders

### Best Practices

1. **Always use cache for read-heavy operations** (`use_cache=True`)
2. **Pass db session to services** that need configuration
3. **Provide fallback defaults** for graceful degradation
4. **Use lazy imports** in utils/ modules to avoid circular dependencies
5. **Mark sensitive configs** with `is_sensitive=True` (passwords, API keys)
6. **Use JSONB structure** for complex config values (objects, arrays)
7. **Invalidate cache** automatically on write operations
8. **Document config keys** in seeder with clear descriptions
9. **Group related configs** by category for better organization
10. **Test configuration changes** before deploying to production

## AI Assistant Guidelines

- Always maintain the three-layer separation: Router → Service → Model
- Generate complete CRUD operations when creating new entities
- Include proper error handling and logging in every service method
- Add RBAC decorators to all sensitive endpoints
- Suggest React Query hooks for data fetching in frontend
- Propose Alembic migrations when models change
- Follow the standardized response format for all API endpoints
- Use the custom AppException class instead of generic exceptions
- Write tests alongside code generation (TDD approach)
- Include audit trail fields (created_by, created_at, updated_by, updated_at) in all transactional models
- Always validate user permissions before executing business logic

## Common Issues & Troubleshooting

### Issue: Infinite Loading / Busy Icon on Frontend

**Symptoms**: Frontend shows loading spinner indefinitely, no data displayed

**Root Cause**: Backend not loading required nested relationships that frontend expects

**Solution**:
1. Check browser console for errors accessing undefined properties (e.g., `piItem.medicine.manufacturer_vendor`)
2. Add eager loading to backend routers using `joinedload`:
```python
from sqlalchemy.orm import joinedload

pis = db.query(PI).options(
    joinedload(PI.items)
        .joinedload(PIItem.medicine)
        .joinedload(MedicineMaster.manufacturer_vendor),
    # Add all vendor types
).all()
```
3. Ensure eager loading matches frontend data access patterns

### Issue: NameError in Pydantic Schemas

**Symptoms**: `NameError: name 'VendorBasic' is not defined`

**Root Cause**: Pydantic schema class references another schema before it's defined

**Solution**:
1. Move referenced schema class BEFORE the class that uses it
2. Define "leaf" schemas first (no dependencies)
3. Order example: `VendorBasic` → `MedicineBasic` → `PIItemBasic`

### Issue: TypeError with Decimal and Float

**Symptoms**: `TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'`

**Root Cause**: PostgreSQL NUMERIC columns return Decimal objects, Pydantic schemas use float

**Solution**:
```python
from decimal import Decimal

# Convert all float inputs from Pydantic to Decimal
quantity = Decimal(str(pydantic_data.quantity))
price = Decimal(str(pydantic_data.price))
total = quantity * price
```

### Issue: UniqueViolation on Sequential Numbers

**Symptoms**: `UniqueViolation: duplicate key value violates unique constraint "eopa_eopa_number_key"`

**Root Cause**: Multiple number generation calls in loop see same database state

**Solution**:
```python
# Add db.flush() after each insert to update sequence
eopa = EOPA(eopa_number=generate_eopa_number(db), ...)
db.add(eopa)
db.flush()  # Critical: updates sequence before next generation
```

### Issue: Missing Vendor Selection in Forms

**Symptoms**: Users cannot change vendor, only see read-only display

**Root Cause**: Using Typography instead of Select components

**Solution**:
```jsx
// Replace Typography with FormControl/Select
<FormControl fullWidth>
  <InputLabel>Vendor</InputLabel>
  <Select name="vendor_id" value={formData.vendor_id} onChange={handleChange}>
    {vendors.map(v => <MenuItem key={v.id} value={v.id}>{v.vendor_name}</MenuItem>)}
  </Select>
</FormControl>
```

### Issue: Network Errors During EOPA Creation

**Symptoms**: Frontend shows "Network Error", backend returns 500

**Root Cause**: Type mismatch, missing eager loading, or validation failure

**Debugging Steps**:
1. Check backend logs for stack trace
2. Verify Decimal conversions for all monetary fields
3. Confirm vendor relationships are loaded with `joinedload`
4. Validate vendor_id matches vendor_type in request payload
5. Check EOPA doesn't already exist for PI item + vendor type

### Best Practices for Preventing Issues

1. **Always eager load nested relationships** that frontend expects
2. **Define Pydantic schemas in dependency order** (leaf schemas first)
3. **Convert float to Decimal** before any database operations
4. **Use db.flush()** when generating sequential numbers in loops
5. **Fetch reference data** (vendors, products) when forms open
6. **Show contextual information** (PI number, partner) in nested forms
7. **Use Material-UI Select** for editable dropdowns, not Typography
8. **Test with multiple vendor types** to catch bulk operation issues

Copilot must implement Purchase Orders WITHOUT price information.

1. PO only contains:
   - medicine_id
   - quantity
   - language (for PM)
   - artwork_version (for PM)
   - vendor_id
   - po_type (RM, PM, FG)

2. All pricing comes from Vendor Tax Invoices:
   - RM Vendor sends RM Tax Invoice
   - PM Vendor sends PM Tax Invoice
   - Manufacturer sends Final FG Tax Invoice after dispatch

3. PO fulfillment is driven by invoices:
   fulfilled_qty += invoice.shipped_qty

4. PO Status Rules:
   If fulfilled_qty == ordered_qty → status = CLOSED
   If fulfilled_qty < ordered_qty → status = PARTIAL
   If fulfilled_qty == 0 → status = OPEN

5. Manufacturer Material Balance Logic:
   - Before creating RM or PM PO:
       effective_qty = required_qty - manufacturer_balance
       If effective_qty <= 0 → do not raise PO
   - After invoice:
       manufacturer_balance += received_qty
   - After FG dispatch:
       manufacturer_balance -= consumed_qty

6. Copilot must auto-generate:
   - invoice table + invoice processing services
   - /invoice/vendor/{po_id} endpoint
   - /invoice/manufacturer/{po_id} endpoint
   - PO update logic
   - material_balance updates
   - logs for every event
