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
  alembic/            # Database migrations
  tests/              # pytest test suite

frontend/
  src/
    pages/            # Route-level components
    components/       # Reusable UI components
    services/         # API client (Axios)
    hooks/            # Custom hooks (useApiError, useAuth, etc.)
    context/          # React Context (AuthContext)
    guards/           # Route guards (PrivateRoute, RoleGuard)
  tests/              # Jest + React Testing Library

db/
  pharma_schema.sql   # DDL schema
  seeds.sql           # Sample data
docs/
  SOP.docx            # Standard Operating Procedures
```

## Core Domain Models

Always model these entities with proper relationships:

1. **User** (with roles: ADMIN, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER, ACCOUNTANT)
2. **Vendor** (types: PARTNER, RM, PM, MANUFACTURER)
3. **Product Master** & **Medicine Master**
4. **PI** (Proforma Invoice) + **PI Items**
5. **EOPA** (Estimated Order & Price Approval) + **EOPA Items**
6. **Purchase Orders** (RM/PM/FG) + **PO Items**
7. **Material Receipt** & **Material Balance**
8. **Dispatch Advice** & **Warehouse GRN**
9. **PO Closure**

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
- `ERR_SERVER` - Unexpected server error

**Global Exception Handler** (`backend/app/exceptions/handlers.py`):
Must handle HTTPException, ValidationError, SQLAlchemy errors, and custom AppException.

### 3. Document Numbering (STRICT FORMAT)

Auto-generate using `backend/app/utils/number_generator.py`:

```python
# PI: PI/YY-YY/0001 (e.g., PI/24-25/0001)
generate_pi_number()

# EOPA: EOPA/YY-YY/0001
generate_eopa_number()

# PO: PO/{TYPE}/YY-YY/0001
generate_po_number(po_type)  # po_type: "RM", "PM", "FG"
```

### 4. Logging (Structured JSON)

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

### 5. SQLAlchemy ORM Style

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

### 6. Frontend Error Handling

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

1. **Vendor Resolution**: Medicine Master links to vendors (RM/PM/MANUFACTURER). Always validate vendor mapping before PO generation.

2. **PO Types**: Purchase Orders branch into three types (RM/PM/FG) with different numbering and workflows.

3. **EOPA Workflow**: PI → EOPA → PO. EOPA requires approval before PO generation.

4. **Material Balance**: Track inventory changes through Material Receipt and Dispatch Advice.

5. **PO Closure**: Only close POs after all material receipts and GRNs are completed.

6. **Audit Trail**: All create/update/delete operations must log user, timestamp, and action for compliance.

7. **Role-Based Workflows**: Certain operations require specific roles (e.g., only PROCUREMENT_OFFICER can approve EOPA).

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
- `backend/app/utils/number_generator.py` - Document number generation
- `frontend/src/services/api.js` - Axios instance with JWT interceptors
- `frontend/src/hooks/useApiError.js` - Centralized error handling
- `frontend/src/context/AuthContext.jsx` - Authentication state management
- `frontend/src/guards/PrivateRoute.jsx` - Route protection

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