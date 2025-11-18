# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Set up PostgreSQL Database

```bash
# Create database
createdb pharma_db
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and update DATABASE_URL with your PostgreSQL credentials

# Run migrations
alembic upgrade head

# Create admin user
python scripts/create_admin.py

# Start backend server
uvicorn app.main:app --reload
```

Backend running at: **http://localhost:8000**
API docs: **http://localhost:8000/docs**

### Step 3: Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional - defaults to localhost:8000)
copy .env.example .env

# Start frontend
npm run dev
```

Frontend running at: **http://localhost:5173**

### Step 4: Login

Open http://localhost:5173 in your browser

**Default credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change password after first login!**

## 📁 Project Structure

```
Pawan/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routers/     # API endpoints
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── auth/        # Authentication
│   │   └── utils/       # Utilities
│   ├── alembic/         # Database migrations
│   └── scripts/         # Helper scripts
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API client
│   │   └── context/     # React Context
│   └── package.json
│
├── .github/
│   └── copilot-instructions.md  # AI coding guidelines
│
└── README.md
```

## 🔑 User Roles

| Role | Permissions |
|------|------------|
| **ADMIN** | Full system access |
| **PROCUREMENT_OFFICER** | Create PI, EOPA, POs; View reports |
| **WAREHOUSE_MANAGER** | Material management, GRN |
| **ACCOUNTANT** | View-only financial records |

## 📝 Workflow

1. **Proforma Invoice (PI)** - Create from partner vendor
2. **EOPA** - Generate from PI, get approval
3. **Purchase Order (PO)** - Create from approved EOPA (RM/PM/FG)
4. **Material Receipt** - Record deliveries
5. **Dispatch Advice** - Send to warehouse
6. **Warehouse GRN** - Confirm receipt

## 🛠️ Common Commands

### Backend

```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1

# Run tests (once implemented)
pytest tests/ -v
```

### Frontend

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Ensure virtual environment is activated

### Frontend can't connect to API
- Verify backend is running on port 8000
- Check VITE_API_URL in frontend `.env`
- Check browser console for CORS errors

### Database migration errors
- Delete alembic/versions/* files
- Drop and recreate database
- Run `alembic upgrade head` again

## 📚 Documentation

- Backend API: http://localhost:8000/docs
- See `backend/README.md` for backend details
- See `frontend/README.md` for frontend details
- See `.github/copilot-instructions.md` for development guidelines

## 🔐 Security Notes

1. Change default admin password immediately
2. Generate a strong SECRET_KEY for production
3. Use environment variables for sensitive data
4. Enable HTTPS in production
5. Review and update CORS settings

## 📞 Next Steps

1. ✅ Login and change admin password
2. ✅ Create additional users with different roles
3. ✅ Add vendors (PARTNER, RM, PM, MANUFACTURER)
4. ✅ Create product and medicine masters
5. ✅ Start the procurement workflow with PI creation

Enjoy using the PharmaFlow 360! 🎉
