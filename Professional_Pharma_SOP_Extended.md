
# ADDENDUM — APPLICATION DEVELOPMENT ARCHITECTURE & TECH STACK

This section defines how to build a full‑fledged web application for the pharmaceutical procurement and manufacturing workflow, following a clean and scalable architecture.

---

# 10. SYSTEM ARCHITECTURE (Three‑Tier)

Your application should follow a **3‑tier enterprise structure**:

```
┌──────────────────────────────┐
│         FRONTEND (UI)        │
│  React (Vite or CRA)         │
│  Material UI / Ant Design    │
│  Redux Toolkit or React Query│
└───────────────▲──────────────┘
                │ REST API
┌───────────────┴──────────────┐
│  MIDDLE TIER (API Gateway)    │
│  FastAPI Routing Layer        │
│  Authentication (JWT)         │
│  Request Validation (Pydantic)│
└───────────────▲──────────────┘
                │ ORM Layer
┌───────────────┴──────────────┐
│        BACKEND SERVICES       │
│  FastAPI Microservices        │
│  SQLAlchemy ORM               │
│  PostgreSQL Database          │
│  Alembic Migrations           │
└───────────────────────────────┘
```

---

# 11. RECOMMENDED TECHNOLOGIES

## **11.1 Backend (FastAPI + SQLAlchemy)**
Use **FastAPI** for:
- High‑speed async APIs  
- Auto‑documentation (Swagger UI)  
- Easy model validation (Pydantic)  
- Clean routing & modularity  
- Perfect for microservice architecture  
- Easy integration with AI/agentic workflows  

Use **SQLAlchemy ORM** for:
- Database interaction  
- JOINs, models, migrations  
- Relationship mapping  
- Works perfectly with PostgreSQL  

Use **Alembic** for:
- Database schema migration  
- Versioning tables  
- Updating schema safely  

---

# 11.2 Middle Tier (API Gateway Layer)

This layer handles:
- Authentication & Authorization (JWT tokens)  
- Role‑based routing  
- API versioning (v1, v2, v3…)  
- Business logic orchestration  
- Integration with:
  - Manufacturer Portal
  - Vendor Portal
  - Warehouse Portal  
  - Reporting Services  

---

# 11.3 Frontend Technologies (React)

Use **React + Vite** (recommended for speed) or **Create React App**.

### UI Libraries (Choose One):
- **Material UI (MUI)** — best and modern  
- **Ant Design** — enterprise style  

### State Management
- **React Query** → Best for API‑heavy applications  
- **Redux Toolkit** → If global shared state is required  

### Frontend Features:
- PI Creation UI  
- EOPA Approval UI  
- Procurement Dashboard  
- Vendor RM/PM Dispatch Portal  
- Manufacturer Material Balance UI  
- Warehouse GRN Entry Screen  
- PO Closure Dashboard  

---

# 11.4 PostgreSQL Database (Local Install)
- Use **PostgreSQL** as RDBMS  
- Install locally via official installer  
- Use **pgAdmin** to manage tables, relationships, and schema  
- Use **DBeaver** (optional) as advanced GUI  

---

# 12. CLEAN SEGREGATION OF APPLICATION LAYERS

## **12.1 FRONTEND LAYER**
- Framework: React  
- UI: Material UI or Ant Design  
- State: Redux Toolkit or React Query  
- Purpose:
  - User interaction  
  - Forms & validations  
  - Display workflow dashboards  
  - Trigger backend API calls  

---

## **12.2 MIDDLE TIER (API ROUTING & SECURITY)**
- Framework: FastAPI  
- Handles:
  - Routing  
  - Authentication  
  - Role-based access  
  - Request validation  
  - Workflow rules enforcement  

This tier is the “controller” or “brain” of the system.

---

## **12.3 BACKEND SERVICES (BUSINESS LOGIC + DATABASE)**

- Microservices architecture:  
  - PO Service  
  - PI Service  
  - EOPA Service  
  - Manufacturer Service  
  - Warehouse/GRN Service  
  - Dispatch Service  

- Uses SQLAlchemy + PostgreSQL  
- Manages all CRUD operations  
- Stores:
  - PI  
  - EOPA  
  - RM/PM/FG POs  
  - GRNs  
  - Material balances  
  - Dispatch Advice  

---

# 13. NEXT STEPS TO START DEVELOPMENT

1. Install PostgreSQL locally  
2. Install pgAdmin  
3. Create a database: `pharma_workflow`  
4. Build your backend structure in FastAPI  
5. Set up SQLAlchemy models  
6. Initialize Alembic  
7. Build React Frontend  
8. Connect UI to backend APIs  
9. Add dashboards & reporting  
10. Deploy (optional: Docker)  

---

This addendum enables you to use the SOP as a **live specification** for your full-stack application development.
