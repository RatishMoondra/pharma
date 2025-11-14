# Backend Setup Guide

## Quick Start

1. **Create virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` with your settings:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SECRET_KEY`: JWT secret (generate a secure random key)

4. **Set up database**
   ```bash
   alembic upgrade head
   python scripts/create_admin.py
   ```

5. **Run server**
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Users
- `POST /api/users/` - Create user (Admin only)
- `GET /api/users/` - List users (Admin only)
- `GET /api/users/me` - Get current user info

### Vendors
- `POST /api/vendors/` - Create vendor
- `GET /api/vendors/` - List vendors
- `GET /api/vendors/{id}` - Get vendor by ID

### Products
- `POST /api/products/product-master/` - Create product
- `GET /api/products/product-master/` - List products
- `POST /api/products/medicine-master/` - Create medicine
- `GET /api/products/medicine-master/` - List medicines

### Proforma Invoice (PI)
- `POST /api/pi/` - Create PI
- `GET /api/pi/` - List PIs
- `GET /api/pi/{id}` - Get PI by ID

### EOPA
- `POST /api/eopa/` - Create EOPA from PI
- `POST /api/eopa/{id}/approve` - Approve/Reject EOPA
- `GET /api/eopa/` - List EOPAs

### Purchase Orders
- `POST /api/po/` - Create PO from EOPA
- `GET /api/po/` - List POs

### Material Management
- `POST /api/material/receipt/` - Create material receipt
- `GET /api/material/balance/` - View material balance
- `POST /api/material/dispatch/` - Create dispatch advice

## Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Testing

```bash
pytest tests/ -v --cov=app
```

## Troubleshooting

### Import errors
Make sure virtual environment is activated and all dependencies are installed.

### Database connection errors
Check `DATABASE_URL` in `.env` file and ensure PostgreSQL is running.

### Port already in use
Change port: `uvicorn app.main:app --port 8001 --reload`
