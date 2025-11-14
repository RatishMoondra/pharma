# Pharmaceutical Procurement & Dispatch System

A web-based pharmaceutical procurement, manufacturing, and dispatch workflow system built with FastAPI (backend) and React (frontend).

## Features

- **User Management** with role-based access control (RBAC)
  - ADMIN: Full system access
  - PROCUREMENT_OFFICER: Create PI, EOPA, POs; View reports
  - WAREHOUSE_MANAGER: Material Receipt, Dispatch Advice, GRN
  - ACCOUNTANT: View-only access to financial records

- **Vendor Management** (PARTNER, RM, PM, MANUFACTURER)
- **Product & Medicine Master** data management
- **Proforma Invoice (PI)** creation and tracking
- **EOPA (Estimated Order & Price Approval)** workflow
- **Purchase Orders** (RM/PM/FG) with automatic numbering
- **Material Receipt & Balance** tracking
- **Dispatch Advice & Warehouse GRN**
- **Audit Trail** with structured logging

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Material-UI (MUI)** - Component library
- **React Router** - Routing
- **TanStack Query** - Data fetching
- **Axios** - HTTP client

## Project Structure

```
backend/
  app/
    routers/          # API route handlers
    services/         # Business logic
    models/           # SQLAlchemy ORM models
    schemas/          # Pydantic schemas
    auth/             # Authentication & authorization
    database/         # DB connection
    utils/            # Utilities (number generator, etc.)
    exceptions/       # Custom exceptions & handlers
  alembic/            # Database migrations
  scripts/            # Utility scripts

frontend/
  src/
    pages/            # Page components
    components/       # Reusable components
    services/         # API client
    context/          # React Context (Auth)
    guards/           # Route guards
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   copy .env.example .env
   # Edit .env with your database credentials and secret key
   ```

4. **Set up database**
   ```bash
   # Create database in PostgreSQL
   createdb pharma_db

   # Run migrations
   alembic upgrade head
   ```

5. **Create admin user**
   ```bash
   python scripts/create_admin.py
   ```

6. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```

   Backend will be available at: http://localhost:8000
   API docs: http://localhost:8000/docs

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   copy .env.example .env
   # Edit .env if needed (default API URL is http://localhost:8000)
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```

   Frontend will be available at: http://localhost:5173

### Default Credentials

- **Username**: admin
- **Password**: admin123

**⚠️ IMPORTANT**: Change the admin password after first login!

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Document Numbering Format

- **PI**: PI/YY-YY/0001 (e.g., PI/24-25/0001)
- **EOPA**: EOPA/YY-YY/0001
- **PO**: PO/{TYPE}/YY-YY/0001 (e.g., PO/RM/24-25/0001)
- **Material Receipt**: MR/YY-YY/0001
- **Dispatch Advice**: DA/YY-YY/0001
- **GRN**: GRN/YY-YY/0001

## Business Workflow

1. **Create Proforma Invoice (PI)** with partner vendor
2. **Generate EOPA** from approved PI
3. **Create Purchase Order (PO)** from approved EOPA (RM/PM/FG)
4. **Material Receipt** upon delivery from vendor
5. **Material Balance** updated automatically
6. **Dispatch Advice** for warehouse delivery
7. **Warehouse GRN** upon receipt confirmation
8. **PO Closure** after complete delivery

## Development

### Code Style

- Backend follows PEP 8 Python style guide
- Frontend follows Airbnb JavaScript/React style guide
- Use the provided `.gitignore` files

### Adding New Features

1. Create SQLAlchemy model
2. Create Pydantic schemas
3. Create service layer with business logic
4. Create API router
5. Add RBAC decorators
6. Create frontend components/pages
7. Add proper error handling and logging
8. Write tests

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact the development team.
