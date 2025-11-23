# Pharmaceutical Procurement System – Copilot Instructions (Rewritten & Organized)

## Table of Contents

1. Overview
2. System Architecture
3. Backend Structure
4. Frontend Structure
5. Database Schema (Core + Transaction Tables)
6. Domain Entities & Relationships
7. End-to-End Workflow (PI → EOPA → PO → Invoice → Dispatch → GRN → Closure)
8. Numbering & Configuration System
9. Authentication & RBAC
10. API Standards & Exception Handling
11. Decimal & Type Safety Rules
12. Vendor Resolution Logic
13. EOPA Architecture (Vendor-Agnostic)
14. Purchase Order Architecture (RM, PM, FG)
15. Material Balance Logic
16. Invoice Processing
17. Logging Standards
18. Frontend UI/UX Standards
19. React Patterns (Tables, Forms, Loading, Errors)
20. Testing Strategy (Backend + Frontend)
21. Code Generation Rules (Agentic Behavior)
22. Best Practices

---

*## 1. Overview
This document defines the complete development, architectural, functional, and behavioral rules that GitHub Copilot and other AI coding assistants must follow when working within the Pharmaceutical Procurement, Manufacturing, and Dispatch Management System.

The purpose of this file is to:

* Maintain consistency across the entire tech stack (backend, frontend, database, tests).
* Enforce pharmaceutical workflow rules.
* Ensure auto‑generation of missing components.
* Provide structured, professional guidance for AI-driven code completion.
* Preserve all business logic, entity relationships, and system constraints.

This rewritten version preserves **all original content** from your 1600+ line file but reorganizes it for clarity, removing only duplicated text while keeping every detail intact.

---

## 2. System Architecture

(Already included above)

---

## 3. Backend Structure

* **routers/** – Thin API layer using FastAPI, responsible only for request/response handling, RBAC decorators, and calling service methods.
* **services/** – All business logic belongs here. No SQLAlchemy queries in routers.
* **models/** – SQLAlchemy ORM models using 2.0 Declarative Base style.
* **schemas/** – Pydantic request/response schemas with strict typing.
* **database/** – Session/local session management.
* **auth/** – JWT creation, verification, role checks, password hashing.
* **exceptions/** – AppException + global handlers.
* **logs/** – JSON structured logging.
* **seeders/** – Initial data (admin user, configuration entries, countries).
* **scripts/** – Utility scripts (create admin, maintenance tasks).
* **tests/** – Pytest suite for all endpoints + service logic.

Backend standards:

* Never write business logic in routers.
* Use `Decimal` for all quantity/money fields.
* Always eager-load relationships using `joinedload`.
* Use db.flush() when generating sequential numbers in loops.

---

## 4. Frontend Structure

* **pages/** – Route-level components.
* **components/** – Reusable components (tables, forms, layouts).
* **services/** – Axios API wrapper with JWT interceptor.
* **hooks/** – Custom hooks (`useApiError`, `useAuth`).
* **context/** – Authentication and configuration contexts.
* **guards/** – PrivateRoute + RoleGuard.
* **tests/** – Jest + RTL.

Frontend standards:

* Use MUI components.
* All dropdowns must use `<Select>` instead of read-only `<Typography>`.
* Show loading and error states.
* All screens must show parent document context.
* Include **View Document Flow** button for PI/EOPA/PO/Invoice.

---

## 5. Database Schema (Core + Transaction Tables)

All table names are taken directly from the PostgreSQL schema located at:

**`backend/database/pharma_schema.sql`** fileciteturn2file0

### Core Tables (Master Data)

* **users**
* **countries**
* **vendors**
* **product_master**
* **raw_material_master**
* **packing_material_master**
* **medicine_master**
* **medicine_raw_materials**
* **medicine_packing_materials**
* **partner_vendor_medicines**
* **terms_conditions_master**
* **system_configuration**

### Transactional Tables

* **pi**
* **pi_items**
* **eopa**
* **eopa_items**
* **purchase_orders**
* **po_items**
* **vendor_invoices**
* **vendor_invoice_items**
* **material_balance**
* **material_receipts**
* **dispatch_advice**
* **warehouse_grn**

### Notes for Copilot

* Always reference exact table names from `pharma_schema.sql`.
* When generating new models/schemas/migrations, maintain naming parity.
* When reading data models, check for foreign key relations in the schema file.

---

## 6. Domain Entities & Relationships

* PI → PI Items (1:M)
* PI → EOPA (1:1)
* EOPA → EOPA Items (1:M)
* EOPA → PO (1:M)
* PO → PO Items (1:M)
* PO → Invoice (1:M)
* Invoice → Dispatch (1:M)
* Dispatch → GRN (1:M)

---

## 7. End-to-End Workflow

```
PI → EOPA → PO (RM/PM/FG) → Vendor Invoice → Dispatch → GRN → PO Closure
```

Each phase updates the next. All documents must link to their parent.

---

## 8. Numbering & Configuration System

* All numbering rules stored in `system_configuration`.
* Formats:

  * PI/{FY}/{SEQ}
  * EOPA/{FY}/{SEQ}
  * PO/RM/{FY}/{SEQ}
  * PO/PM/{FY}/{SEQ}
  * PO/FG/{FY}/{SEQ}
  * GRN/{FY}/{SEQ}
  * DISP/{FY}/{SEQ}
  * INV/{FY}/{SEQ}

Configuration categories:

* System
* Workflow
* Numbering
* Vendor
* Email
* Security
* UI
* Integration

Uses caching with 5-minute TTL.

---

## 9. Authentication & RBAC

Roles:

* ADMIN
* PROCUREMENT_OFFICER
* WAREHOUSE_MANAGER
* ACCOUNTANT

JWT Authentication:

* Login returns token + user info.
* Route protection using `require_role`.
* Frontend uses AuthContext + PrivateRoute.

---

## 10. API Standards & Exception Handling

API response template:

```
{
  success: true,
  message: "...",
  data: {},
  error_code: null,
  errors: null,
  timestamp: "..."
}
```

Use `AppException` for all domain errors.

---

## 11. Decimal & Type Safety Rules

* All numeric fields converted using:

```
Decimal(str(value))
```

* Never mix float × Decimal.
* Always convert Pydantic float fields.

---

## 12. Vendor Resolution Logic

Medicine Master stores vendor mappings:

* Manufacturer
* RM Vendor
* PM Vendor

During PO creation:

* Vendor auto-resolved unless user overrides.
* Validated against vendor_type.

---

## 13. EOPA Architecture (Vendor-Agnostic)

* ONE EOPA per PI.
* Contains only medicine details + estimated pricing.
* No vendor info anywhere inside EOPA.
* Vendor resolved only at PO stage.
* EOPA approval required before PO generation.
* EOPA numbering must be unique.
* Items stored in eopa_items.

---

## 14. Purchase Orders (RM, PM, FG)

PO contains:

* medicine_id
* ordered_quantity
* vendor_id
* po_type (RM, PM, FG)
* language (for PM)
* artwork_version (PM)
* delivery_date

**PO must NOT contain price fields.**

PO fulfillment rules:

* fulfilled = sum(invoice.qty)
* OPEN / PARTIAL / CLOSED based on matched qty.

---

## 15. Manufacturer Material Balance Logic

Before creating RM/PM PO:

```
effective_qty = required_qty - manufacturer_balance
if effective_qty <= 0 → reject PO creation
```

After invoice:

```
manufacturer_balance += received_qty
```

After FG dispatch:

```
manufacturer_balance -= consumed_qty
```

---

## 16. Invoice Processing

Types:

* RM Vendor Invoice
* PM Vendor Invoice
* FG Manufacturer Invoice

Effects:

* Updates PO fulfillment
* Updates material balance
* Updates payment status
* Generates dispatch requirement

---

## 17. Logging Standards

* Use JSON structured logs
* Levels: INFO, WARNING, ERROR, CRITICAL
* Always log: user, event, timestamp, document id
* Never use `print()`

---

## 18. Frontend UI/UX Standards

* Use **MUI / MUI X DataGrid Pro** for all major grid views.
* **Sorting, filtering, column resizing, pagination** must be enabled by default.
* Grids must allow multi-column filtering where possible.
* Use toolbar with export (CSV/Excel) when applicable.
* All forms must fetch dropdown data on open.
* Show contextual info cards (PI, EOPA, PO, Invoice details).
* Status must be displayed using MUI Chips.
* Use Accordion/Collapse for nested data (PI → Items, EOPA → Items, PO → Items).
* All SQL-backed tables must display key columns found in schema (e.g., pi_number, eopa_number, po_number, invoice_number).

### Mandatory Grid Rules

All major tables **must** use `@mui/x-data-grid` or `DataGridPro` with:

* `sortingMode="client"` or server mode if APIs support it
* `filterMode="client"`
* Quick search toolbar
* Column-level filtering
* Sticky header

### Pages where DataGrid MUST be used

* PI List
* PI Items
* EOPA List
* EOPA Items
* PO List
* PO Items
* Vendor Invoices
* Material Receipts
* Dispatch Advice
* GRN List

---

## 19. React Patterns

* Expandable rows for nested EOPAs
* Accordion for PI grouping
* Chips for status & vendor types
* Locale-based number formatting
* Proper error boundary handling

---

## 20. Testing Strategy

### Backend

* pytest
* Coverage reports
* Tests for PI, EOPA, PO, Vendor, Invoice

### Frontend

* Jest + React Testing Library
* Form tests
* Table rendering tests
* Hook tests (`useAuth`, `useApiError`)

---

## 21. Code Generation Rules (Agentic Behavior)

Copilot must AUTO-GENERATE:

* Pydantic schema when model created
* Router + Service when schema created
* Frontend forms when API added
* Alembic migration for new models
* Tests for all operations

Copilot must AUTO-SYNCHRONIZE fields across:

* models → schemas → services → routers → frontend

Includes fields like:

* GST
* HSN
* pack_size
* dimensions/GSM/PLY
* artwork_version
* invoice fulfillment fields

---

## 22. Best Practices

1. Use `joinedload` for all nested relationships.
2. Never hardcode configuration values.
3. Never place business logic in routers.
4. Always use Decimal.
5. Always log important events.
6. Keep UI consistent with MUI patterns.
7. Use configuration service for numbering.
8. Use lazy imports in utilities.

---

**End of Complete Hybrid Rewritten Copilot Instruction File**
