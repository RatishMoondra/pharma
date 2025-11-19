# Terms & Conditions Backend Implementation Summary

## Overview
Complete backend implementation for the Terms & Conditions feature requested in the PharmaFlow 360 system. This feature provides a flexible master library of terms, vendor-specific term assignments, and partner vendor medicine whitelisting.

## Database Schema

### 1. terms_conditions_master
Master library of reusable terms & conditions.

**Columns:**
- `id` (PK): Auto-increment primary key
- `term_text` (TEXT): Full text of the term/condition
- `category` (VARCHAR 50): Category classification (PAYMENT, DELIVERY, WARRANTY, QUALITY, LEGAL, GENERAL, OTHER)
- `priority` (INTEGER): Display priority (1-999, lower = higher priority)
- `is_active` (BOOLEAN): Active status flag
- `created_at` (DATETIME): Record creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `category` for filtering
- Index on `is_active` for active-only queries
- Index on `priority` for ordering

### 2. vendor_terms_conditions
Assignment table linking vendors to terms with optional customization.

**Columns:**
- `id` (PK): Auto-increment primary key
- `vendor_id` (FK): References vendors.id (CASCADE DELETE)
- `term_id` (FK): References terms_conditions_master.id (CASCADE DELETE)
- `priority_override` (INTEGER, NULLABLE): Optional priority override for this vendor
- `notes` (TEXT, NULLABLE): Vendor-specific notes about this term
- `created_at` (DATETIME): Assignment creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Foreign Keys:**
- `vendor_id` → vendors(id) with CASCADE DELETE
- `term_id` → terms_conditions_master(id) with CASCADE DELETE

**Indexes:**
- Primary key on `id`
- Index on `vendor_id` for vendor lookups
- Index on `term_id` for term usage tracking

### 3. partner_vendor_medicines
Medicine whitelist for partner vendors (vendor_type=PARTNER).

**Columns:**
- `id` (PK): Auto-increment primary key
- `vendor_id` (FK): References vendors.id (CASCADE DELETE)
- `medicine_id` (FK): References medicine_master.id (CASCADE DELETE)
- `notes` (TEXT, NULLABLE): Notes about this medicine assignment
- `created_at` (DATETIME): Assignment creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Foreign Keys:**
- `vendor_id` → vendors(id) with CASCADE DELETE
- `medicine_id` → medicine_master(id) with CASCADE DELETE

**Indexes:**
- Primary key on `id`
- Index on `vendor_id` for vendor lookups
- Index on `medicine_id` for medicine usage tracking

## Models

### Location
`backend/app/models/terms_conditions.py`

### Classes
1. **TermsConditionsMaster**: Master library model
2. **VendorTermsConditions**: Assignment model with bidirectional relationships
3. **PartnerVendorMedicines**: Medicine whitelist model

### Relationships
- **Vendor model** updated with:
  - `terms_conditions`: relationship to VendorTermsConditions (cascade delete)
  - `allowed_medicines`: relationship to PartnerVendorMedicines (cascade delete)

## Pydantic Schemas

### Location
`backend/app/schemas/terms_conditions.py`

### Schema Groups

#### 1. Terms Conditions Master
- `TermsConditionsMasterCreate`: Required fields for creation
- `TermsConditionsMasterUpdate`: Optional fields for updates
- `TermsConditionsMasterResponse`: Full record response with timestamps

#### 2. Vendor Terms
- `VendorTermsCreate`: Assign term to vendor
- `VendorTermsUpdate`: Update assignment (priority/notes)
- `VendorTermsResponse`: Full assignment with nested term details

#### 3. Partner Medicines
- `PartnerMedicineCreate`: Assign medicine to partner
- `PartnerMedicineUpdate`: Update assignment notes
- `PartnerMedicineResponse`: Full assignment with nested medicine/vendor details

#### 4. Batch Operations
- `VendorTermsBatchCreate`: Assign multiple terms at once
- `PartnerMedicinesBatchCreate`: Assign multiple medicines at once

#### 5. Query/Filter Schemas
- `TermsConditionsQueryParams`: Filter master terms
- `VendorTermsQueryParams`: Filter vendor assignments
- `PartnerMedicinesQueryParams`: Filter partner medicines

### Nested Schemas
- `MedicineBasic`: Lightweight medicine info for responses
- `VendorBasic`: Lightweight vendor info for responses

## Service Layer

### Location
`backend/app/services/terms_conditions_service.py`

### Service Classes

#### 1. TermsConditionsService
Master library management:
- `get_all_terms()`: List with filters (category, is_active, search)
- `get_term_by_id()`: Retrieve single term
- `create_term()`: Create new term with validation
- `update_term()`: Update existing term
- `delete_term()`: Delete term (with usage check)

**Validation Rules:**
- Category must be one of: PAYMENT, DELIVERY, WARRANTY, QUALITY, LEGAL, GENERAL, OTHER
- Priority range: 1-999
- Cannot delete terms assigned to vendors

#### 2. VendorTermsService
Vendor term assignments:
- `get_vendor_terms()`: List with filters (vendor_id, category, is_active)
- `assign_term_to_vendor()`: Single assignment with duplicate check
- `batch_assign_terms()`: Bulk assignment with skip-if-exists logic
- `update_vendor_term()`: Update priority/notes
- `remove_vendor_term()`: Remove assignment

**Features:**
- Eager loading of term and vendor relationships
- Priority sorting (override > master priority)
- Duplicate prevention
- Batch operations with partial success

#### 3. PartnerMedicinesService
Partner medicine whitelist:
- `get_partner_medicines()`: List with filters (vendor_id, medicine_id)
- `assign_medicine_to_partner()`: Single assignment with vendor type validation
- `batch_assign_medicines()`: Bulk assignment
- `update_partner_medicine()`: Update notes
- `remove_partner_medicine()`: Remove assignment

**Validation Rules:**
- Vendor must be type=PARTNER
- Medicine must exist in medicine_master
- Duplicate prevention
- Batch operations with partial success

## API Router

### Location
`backend/app/routers/terms_conditions.py`

### Endpoint Groups

#### 1. Terms Conditions Master
**Prefix:** `/api/terms`

- **GET /** - List all terms
  - Query Params: category, is_active, search
  - Access: Authenticated users
  
- **GET /{term_id}** - Get specific term
  - Access: Authenticated users
  
- **POST /** - Create new term
  - Body: TermsConditionsMasterCreate
  - Access: ADMIN only
  
- **PUT /{term_id}** - Update term
  - Body: TermsConditionsMasterUpdate
  - Access: ADMIN only
  
- **DELETE /{term_id}** - Delete term
  - Access: ADMIN only
  - Validation: Cannot delete if assigned to vendors

#### 2. Vendor Terms
**Prefix:** `/api/terms/vendor-terms`

- **GET /** - List vendor terms
  - Query Params: vendor_id, category, is_active
  - Access: Authenticated users
  
- **POST /** - Assign term to vendor
  - Body: VendorTermsCreate
  - Access: ADMIN, PROCUREMENT_OFFICER
  
- **POST /batch** - Batch assign terms
  - Body: VendorTermsBatchCreate
  - Access: ADMIN, PROCUREMENT_OFFICER
  
- **PUT /{assignment_id}** - Update assignment
  - Body: VendorTermsUpdate
  - Access: ADMIN, PROCUREMENT_OFFICER
  
- **DELETE /{assignment_id}** - Remove assignment
  - Access: ADMIN, PROCUREMENT_OFFICER

#### 3. Partner Medicines
**Prefix:** `/api/terms/partner-medicines`

- **GET /** - List partner medicines
  - Query Params: vendor_id, medicine_id
  - Access: Authenticated users
  
- **POST /** - Assign medicine to partner
  - Body: PartnerMedicineCreate
  - Access: ADMIN, PROCUREMENT_OFFICER
  - Validation: Vendor must be type=PARTNER
  
- **POST /batch** - Batch assign medicines
  - Body: PartnerMedicinesBatchCreate
  - Access: ADMIN, PROCUREMENT_OFFICER
  
- **PUT /{assignment_id}** - Update assignment
  - Body: PartnerMedicineUpdate
  - Access: ADMIN, PROCUREMENT_OFFICER
  
- **DELETE /{assignment_id}** - Remove assignment
  - Access: ADMIN, PROCUREMENT_OFFICER

### Response Format
All endpoints follow the standard PharmaFlow 360 response format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "error_code": null,
  "timestamp": "2025-11-19T12:00:00Z"
}
```

## Error Handling

### Error Codes
- `ERR_NOT_FOUND`: Term, vendor, or medicine not found
- `ERR_VALIDATION`: Validation failures (invalid category, duplicate assignments, vendor type mismatch)
- `ERR_SERVER`: Unexpected server errors

### Validation Messages
- "Invalid category. Must be one of: PAYMENT, DELIVERY, ..."
- "Vendor not a PARTNER vendor. Only PARTNER vendors can have medicine assignments."
- "Term already assigned to vendor"
- "Medicine already assigned to partner"
- "Cannot delete term. It is assigned to N vendor(s)."

## Logging

All operations logged with structured JSON:

**Events Logged:**
- `TERMS_RETRIEVED`, `TERM_CREATED`, `TERM_UPDATED`, `TERM_DELETED`
- `VENDOR_TERMS_RETRIEVED`, `VENDOR_TERM_ASSIGNED`, `VENDOR_TERM_UPDATED`, `VENDOR_TERM_REMOVED`
- `VENDOR_TERMS_BATCH_ASSIGNED`
- `PARTNER_MEDICINES_RETRIEVED`, `PARTNER_MEDICINE_ASSIGNED`, `PARTNER_MEDICINE_UPDATED`, `PARTNER_MEDICINE_REMOVED`
- `PARTNER_MEDICINES_BATCH_ASSIGNED`

**Log Context:**
- event: Event type
- user_id: User performing operation (where applicable)
- term_id, vendor_id, medicine_id: Entity IDs
- count: Number of records (for list operations)
- filters: Applied filters (for list operations)

## Database Migration

### Migration File
`backend/alembic/versions/7f94567810c1_add_terms_conditions_and_partner_.py`

### Operations
**Upgrade:**
1. Create `terms_conditions_master` table with indexes
2. Create `vendor_terms_conditions` table with foreign keys and indexes
3. Create `partner_vendor_medicines` table with foreign keys and indexes

**Downgrade:**
1. Drop `partner_vendor_medicines` table and indexes
2. Drop `vendor_terms_conditions` table and indexes
3. Drop `terms_conditions_master` table and indexes

### Applied Status
✅ Migration successfully applied to database

## Integration Points

### 1. Main Application
Router registered in `backend/app/main.py`:
```python
app.include_router(terms_conditions.router)  # Prefix: /api/terms
```

### 2. Models Package
Exported in `backend/app/models/__init__.py`:
- TermsConditionsMaster
- VendorTermsConditions
- PartnerVendorMedicines

### 3. Alembic Environment
Models imported in `backend/alembic/env.py` for migration tracking

## Testing Checklist

### Unit Tests (To Be Created)
- [ ] Test TermsConditionsService CRUD operations
- [ ] Test VendorTermsService assignment logic
- [ ] Test PartnerMedicinesService with vendor type validation
- [ ] Test batch operations (partial success scenarios)
- [ ] Test duplicate prevention
- [ ] Test cascade delete behavior
- [ ] Test priority sorting (override vs master)

### Integration Tests (To Be Created)
- [ ] Test API endpoints with proper auth
- [ ] Test RBAC enforcement (ADMIN vs PROCUREMENT_OFFICER)
- [ ] Test error responses
- [ ] Test query parameter filtering
- [ ] Test nested relationship loading

### Manual Testing Checklist
- [ ] Create master terms via API
- [ ] Assign terms to vendors (single and batch)
- [ ] Test priority override
- [ ] Assign medicines to partner vendors
- [ ] Verify PARTNER type validation
- [ ] Test term deletion with usage check
- [ ] Verify cascade deletes (vendor/medicine deletion)

## Next Steps: Frontend Implementation

### Pages to Create
1. **TermsConditionsMasterPage** (`/admin/terms-master`)
   - Master library management (CRUD)
   - Category filtering
   - Active/inactive toggle
   - Priority ordering

2. **VendorDetailPage** - Add Tabs:
   - **Terms & Conditions Tab**: Manage vendor terms
   - **Allowed Medicines Tab**: Partner medicine whitelist (PARTNER vendors only)

3. **PI Screen Updates**:
   - Filter medicine dropdown by partner's allowed medicines
   - Show partner's terms & conditions during PI creation

4. **PO Screen Updates**:
   - Auto-load vendor's terms & conditions
   - Allow inline editing of terms
   - Priority-based ordering display

### Components to Create
- `TermsLibraryTable`: Sortable, filterable table
- `VendorTermsAssignmentDialog`: Assign/unassign terms
- `PartnerMedicinesDialog`: Manage medicine whitelist
- `TermsDisplayCard`: Read-only terms display with priority badges
- `TermsEditorDialog`: Inline term editing

## API Usage Examples

### Create a Master Term
```bash
POST /api/terms/
{
  "term_text": "Payment within 30 days from invoice date",
  "category": "PAYMENT",
  "priority": 10,
  "is_active": true
}
```

### Assign Term to Vendor
```bash
POST /api/terms/vendor-terms/
{
  "vendor_id": 5,
  "term_id": 1,
  "priority_override": 5,
  "notes": "Urgent vendor - higher priority"
}
```

### Batch Assign Terms
```bash
POST /api/terms/vendor-terms/batch
{
  "vendor_id": 5,
  "term_ids": [1, 3, 7, 12],
  "default_notes": "Standard pharma vendor terms"
}
```

### Assign Medicine to Partner
```bash
POST /api/terms/partner-medicines/
{
  "vendor_id": 8,  // Must be vendor_type=PARTNER
  "medicine_id": 15,
  "notes": "Approved for this partner"
}
```

### Get Vendor's Terms
```bash
GET /api/terms/vendor-terms/?vendor_id=5&is_active=true
```

### Get Partner's Allowed Medicines
```bash
GET /api/terms/partner-medicines/?vendor_id=8
```

## Benefits

1. **Centralized Term Management**: Single source of truth for all terms
2. **Reusability**: Terms defined once, reused across vendors
3. **Flexibility**: Vendor-specific customization with priority overrides
4. **Partner Control**: Whitelist medicines per partner vendor
5. **Audit Trail**: Complete logging of all assignments/changes
6. **Data Integrity**: CASCADE DELETE ensures clean removal
7. **Priority System**: Flexible ordering with override capability
8. **Batch Operations**: Efficient bulk assignments

## Compliance & Best Practices

✅ **RBAC Enforcement**: ADMIN for master data, ADMIN/PROCUREMENT_OFFICER for assignments  
✅ **Cascade Deletes**: Proper foreign key constraints  
✅ **Eager Loading**: Relationships pre-loaded to avoid N+1 queries  
✅ **Validation**: Category enforcement, vendor type checking, duplicate prevention  
✅ **Logging**: Structured JSON logs for audit trail  
✅ **Error Handling**: Proper error codes and user-friendly messages  
✅ **API Standards**: Follows PharmaFlow 360 response format  
✅ **Migration Safety**: Reversible database changes  

## Architecture Highlights

- **Three-Layer Pattern**: Router → Service → Model (standard PharmaFlow 360 architecture)
- **Flexible Priority System**: Master priority + optional override
- **Vendor Type Validation**: Partner medicine whitelist enforced at service layer
- **Batch Processing**: Partial success with skip-if-exists logic
- **Nested Responses**: Eager-loaded relationships for rich API responses
- **Category-Based Organization**: Terms organized by business domain
- **Active Status Filtering**: Support for active/inactive terms
- **Search Capability**: Full-text search on term_text

---

**Status**: ✅ Backend implementation complete  
**Next Phase**: Frontend UI implementation  
**Date**: 2025-11-19  
**Author**: GitHub Copilot (Claude Sonnet 4.5)
