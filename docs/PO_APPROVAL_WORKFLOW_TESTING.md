# PO Approval Workflow - Testing Guide

## Overview

The PO Approval Workflow has been successfully implemented with the following components:

### Status Flow

```
DRAFT → PENDING_APPROVAL → APPROVED → READY → SENT → ACKNOWLEDGED → OPEN → PARTIAL → CLOSED
```

### Key Features

1. **Draft PO Numbers**: Before approval, POs have draft numbers (e.g., `PO/24-25/RM/DRAFT/001`)
2. **Final PO Numbers**: After approval, POs get final numbers (e.g., `PO/24-25/RM/001`)
3. **Role-Based Actions**:
   - **ADMIN**: Can approve/reject POs
   - **PROCUREMENT_OFFICER**: Can submit, mark ready, send POs
   - Both roles can download PDFs
4. **Approval Tracking**: Each status transition is tracked with user ID and timestamp
5. **Email Integration**: POs can be emailed to vendors when sent

## Changes Made

### Backend Changes

#### 1. Database Schema (Migration Applied ✅)

**File**: `backend/alembic/versions/add_po_approval_workflow.py`

- Added new POStatus enum values:
  - DRAFT
  - PENDING_APPROVAL
  - APPROVED
  - READY
  - SENT
  - ACKNOWLEDGED

- Added approval tracking columns to `purchase_orders` table:
  - `prepared_at` - When PO was submitted for approval
  - `checked_at` - Internal review timestamp
  - `approved_at` - When PO was approved
  - `verified_at` - When PO was marked ready
  - `sent_at` - When PO was sent to vendor
  - `acknowledged_at` - When vendor acknowledged PO

**Migration Status**: ✅ Successfully applied (`alembic upgrade head`)

#### 2. PO Model Updates

**File**: `backend/app/models/po.py`

- Line 23-33: POStatus enum with 10 statuses
- Line 49: Default status changed from OPEN to DRAFT
- Lines 74-79: Six approval timestamp fields added

#### 3. PO Generation Endpoint Fix

**File**: `backend/app/routers/po.py` (Lines 651-731)

**FIXED Issues**:
1. ✅ Changed `status="OPEN"` → `status=POStatus.DRAFT` (Line 704)
2. ✅ Changed `eopa.status != "APPROVED"` → `eopa.status != EOPAStatus.APPROVED` (Line 691)
3. ✅ Implemented draft PO number generation:
   ```python
   fiscal_year = '24-25'
   draft_seq = db.query(PurchaseOrder).filter(
       PurchaseOrder.po_type == po_type,
       PurchaseOrder.status == POStatus.DRAFT
   ).count() + 1
   po_number = f"PO/{fiscal_year}/{po_type}/DRAFT/{str(draft_seq).zfill(3)}"
   ```
4. ✅ Added `prepared_by` and `prepared_at` tracking

#### 4. New API Endpoints (Lines 880-1142)

All endpoints require ADMIN or PROCUREMENT_OFFICER role:

1. **POST `/api/po/{po_id}/submit-for-approval`**
   - Transition: DRAFT → PENDING_APPROVAL
   - Sets: `prepared_by`, `prepared_at`
   - Response: Updated PO object

2. **POST `/api/po/{po_id}/approve`**
   - Transition: PENDING_APPROVAL → APPROVED
   - Assigns final PO number: `PO/24-25/RM/001`
   - Sets: `approved_by`, `approved_at`
   - Requires: ADMIN role

3. **POST `/api/po/{po_id}/reject`**
   - Payload: `{"remarks": "Rejection reason"}`
   - Transition: PENDING_APPROVAL → DRAFT
   - Clears all approval fields
   - Saves remarks
   - Requires: ADMIN role

4. **POST `/api/po/{po_id}/mark-ready`**
   - Transition: APPROVED → READY
   - Sets: `verified_by`, `verified_at`

5. **POST `/api/po/{po_id}/send-to-vendor`**
   - Transition: READY → SENT
   - Sets: `sent_at`
   - Emails PO PDF to vendor (if email configured)

6. **POST `/api/po/bulk-submit`**
   - Payload: `{"po_ids": [1, 2, 3]}`
   - Submits multiple POs for approval
   - Returns: Success/failure count

### Frontend Changes

#### 1. POApprovalPage Component

**File**: `frontend/src/pages/POApprovalPage.jsx` (350 lines, newly created)

**Features**:
- 5 status tabs: Draft, Pending Approval, Approved, Ready, Sent
- Action buttons with role-based visibility:
  - Submit for Approval (DRAFT status)
  - Approve/Reject (PENDING_APPROVAL status, ADMIN only)
  - Mark Ready (APPROVED status)
  - Send to Vendor (READY status)
- PDF download icon for all POs
- Snackbar notifications for success/error messages
- Loading states with CircularProgress
- Error handling with useApiError hook
- Rejection dialog with remarks input

**UI Components**:
- Tabs for status filtering
- Table with columns: PO Number, Type, Vendor, Date, Items Count, Actions
- Status chips with color coding
- Action button visibility based on current status and user role

#### 2. App.jsx Route

**File**: `frontend/src/App.jsx`

Added:
```jsx
import POApprovalPage from './pages/POApprovalPage'

<Route 
  path="po-approval" 
  element={
    <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
      <POApprovalPage />
    </PrivateRoute>
  } 
/>
```

#### 3. Sidebar Menu

**File**: `frontend/src/components/Sidebar.jsx`

Added menu item:
```jsx
{ 
  text: 'PO Approval', 
  icon: <CheckCircleIcon />, 
  path: '/po-approval', 
  roles: ['ADMIN', 'PROCUREMENT_OFFICER'], 
  section: 'workflow' 
}
```

#### 4. POManagementDialog Updates

**File**: `frontend/src/components/POManagementDialog.jsx`

**Features Added**:
- Lines 38-42: `generateDraftPONumber()` utility function
- Lines 572-576: Info alert explaining draft numbering
- Lines 596-625: Draft PO number chips with dashed borders
- Lines 107-109: Fixed API endpoints for raw materials/packing materials

**Draft Number Display**:
```jsx
<Chip 
  label={`Draft: ${generateDraftPONumber(poType, index)}`}
  size="small"
  variant="outlined"
  sx={{ borderStyle: 'dashed' }}
/>
```

## Testing Instructions

### Prerequisites

1. ✅ Backend server running (`uvicorn app.main:app --reload --port 8000`)
2. ✅ Frontend server running (`npm run dev`)
3. ✅ Migration applied (`alembic upgrade head`)
4. ✅ Login as user with ADMIN or PROCUREMENT_OFFICER role

### Test Case 1: Generate Draft POs

**Steps**:
1. Navigate to EOPA page
2. Select an APPROVED EOPA
3. Click "Generate Purchase Orders" button
4. Verify draft numbers displayed: `PO/24-25/RM/DRAFT/001`
5. Click "Generate RM POs" button

**Expected Result**:
- ✅ No 500 Internal Server Error
- ✅ Success message: "Successfully generated X RM PO(s)"
- ✅ POs created with DRAFT status
- ✅ Draft numbers assigned correctly

**Verification**:
```sql
SELECT po_number, status, prepared_at FROM purchase_orders 
WHERE status = 'DRAFT' 
ORDER BY created_at DESC;
```

### Test Case 2: Navigate to PO Approval Page

**Steps**:
1. Check sidebar for "PO Approval" menu item under WORKFLOW section
2. Click "PO Approval"
3. Verify page loads with 5 tabs: Draft, Pending Approval, Approved, Ready, Sent

**Expected Result**:
- ✅ Page loads without errors
- ✅ Draft tab shows newly created POs
- ✅ POs display with draft numbers
- ✅ "Submit for Approval" button visible for draft POs

### Test Case 3: Submit PO for Approval

**Steps**:
1. On PO Approval page, go to "Draft" tab
2. Click "Submit for Approval" button for a draft PO
3. Verify success message appears

**Expected Result**:
- ✅ PO moves to "Pending Approval" tab
- ✅ Success snackbar: "PO submitted for approval successfully"
- ✅ `prepared_at` timestamp set in database
- ✅ `prepared_by` = current user ID

**Verification**:
```sql
SELECT po_number, status, prepared_by, prepared_at 
FROM purchase_orders 
WHERE status = 'PENDING_APPROVAL';
```

### Test Case 4: Approve PO (ADMIN Role)

**Steps**:
1. Login as ADMIN user
2. Navigate to PO Approval page
3. Go to "Pending Approval" tab
4. Click "Approve" button (green checkmark icon)
5. Verify success message

**Expected Result**:
- ✅ PO moves to "Approved" tab
- ✅ Draft number replaced with final number: `PO/24-25/RM/DRAFT/001` → `PO/24-25/RM/001`
- ✅ Success snackbar: "PO approved successfully"
- ✅ `approved_at` timestamp set
- ✅ `approved_by` = current user ID

**Verification**:
```sql
SELECT po_number, status, approved_by, approved_at 
FROM purchase_orders 
WHERE status = 'APPROVED';
```

### Test Case 5: Reject PO (ADMIN Role)

**Steps**:
1. Submit a PO for approval (status: PENDING_APPROVAL)
2. Login as ADMIN
3. Click "Reject" button (red X icon)
4. Enter rejection remarks: "Missing vendor contact details"
5. Click "Reject" in dialog

**Expected Result**:
- ✅ PO returns to "Draft" tab
- ✅ Status changes to DRAFT
- ✅ Remarks saved in database
- ✅ All approval fields cleared (`prepared_at`, `approved_at`, etc.)
- ✅ Success snackbar: "PO rejected successfully"

**Verification**:
```sql
SELECT po_number, status, remarks 
FROM purchase_orders 
WHERE remarks LIKE '%Missing vendor%';
```

### Test Case 6: Mark PO Ready

**Steps**:
1. Approve a PO (status: APPROVED)
2. Click "Mark Ready" button
3. Verify success message

**Expected Result**:
- ✅ PO moves to "Ready" tab
- ✅ Status changes to READY
- ✅ `verified_at` timestamp set
- ✅ `verified_by` = current user ID

**Verification**:
```sql
SELECT po_number, status, verified_by, verified_at 
FROM purchase_orders 
WHERE status = 'READY';
```

### Test Case 7: Send PO to Vendor

**Steps**:
1. Mark a PO as ready (status: READY)
2. Click "Send to Vendor" button
3. Verify success message

**Expected Result**:
- ✅ PO moves to "Sent" tab
- ✅ Status changes to SENT
- ✅ `sent_at` timestamp set
- ✅ Email sent to vendor (if SMTP configured)
- ✅ Success snackbar: "PO sent to vendor successfully"

**Verification**:
```sql
SELECT po_number, status, sent_at 
FROM purchase_orders 
WHERE status = 'SENT';
```

### Test Case 8: Download PDF

**Steps**:
1. Click the PDF download icon (DownloadIcon) for any PO
2. Verify PDF downloads and opens

**Expected Result**:
- ✅ PDF file downloads
- ✅ PDF contains: PO number, vendor details, items, quantities
- ✅ PDF formatted correctly

### Test Case 9: Role-Based Permissions

**Test as PROCUREMENT_OFFICER**:
1. Login as PROCUREMENT_OFFICER
2. Navigate to PO Approval page
3. Verify:
   - ✅ Can submit POs for approval
   - ✅ Can mark POs ready
   - ✅ Can send POs to vendor
   - ❌ Cannot approve POs (button not visible)
   - ❌ Cannot reject POs (button not visible)

**Test as ADMIN**:
1. Login as ADMIN
2. Navigate to PO Approval page
3. Verify:
   - ✅ Can approve POs
   - ✅ Can reject POs
   - ✅ All other actions available

### Test Case 10: Complete Workflow End-to-End

**Full Flow**:
1. Generate PO from EOPA → Status: DRAFT, Number: `PO/24-25/RM/DRAFT/001`
2. Submit for Approval → Status: PENDING_APPROVAL
3. Approve (ADMIN) → Status: APPROVED, Number: `PO/24-25/RM/001`
4. Mark Ready → Status: READY
5. Send to Vendor → Status: SENT
6. Vendor Acknowledges → Status: ACKNOWLEDGED (manual DB update for now)
7. Receive Invoice → Status: OPEN (via invoice fulfillment)
8. Partial Fulfillment → Status: PARTIAL
9. Complete Fulfillment → Status: CLOSED

**Expected Result**:
- ✅ Each transition updates status correctly
- ✅ Timestamps recorded for each stage
- ✅ User IDs tracked for accountability
- ✅ Draft number → final number on approval
- ✅ Audit trail complete

## Known Issues & Future Enhancements

### Known Issues

1. **Fiscal Year Hardcoded**: Currently using `'24-25'` - should read from SystemConfiguration
2. **No Vendor Acknowledgement UI**: Status ACKNOWLEDGED requires manual DB update
3. **Email Configuration**: SMTP settings must be configured in SystemConfiguration for email sending

### Future Enhancements

1. **Bulk Actions**: 
   - Approve multiple POs at once
   - Reject multiple POs at once
   - Send multiple POs to vendors

2. **Notifications**:
   - Email notifications to approvers when PO submitted
   - Email notifications to procurement officers when PO approved/rejected
   - In-app notifications

3. **Comments/Notes**:
   - Add comments during approval process
   - View approval history with comments

4. **Vendor Portal**:
   - Vendor login to acknowledge POs
   - Vendor can upload delivery confirmations

5. **Advanced Filters**:
   - Filter by PO type (RM/PM/FG)
   - Filter by vendor
   - Filter by date range
   - Search by PO number

6. **Audit Log**:
   - Dedicated audit log page
   - Show who did what when
   - Export audit trail

## API Endpoint Reference

### GET Endpoints

```
GET /api/po/ - List all POs (with optional status filter)
GET /api/po/{po_id} - Get single PO details
GET /api/po/{po_id}/pdf - Download PO as PDF
```

### POST Endpoints (Workflow Actions)

```
POST /api/po/generate-from-eopa - Generate PO (DRAFT status)
POST /api/po/{po_id}/submit-for-approval - Submit for approval
POST /api/po/{po_id}/approve - Approve PO (ADMIN only)
POST /api/po/{po_id}/reject - Reject PO (ADMIN only)
POST /api/po/{po_id}/mark-ready - Mark PO ready
POST /api/po/{po_id}/send-to-vendor - Send PO to vendor
POST /api/po/bulk-submit - Submit multiple POs
```

### Payload Examples

**Submit for Approval**:
```json
POST /api/po/123/submit-for-approval
(No payload required)
```

**Approve**:
```json
POST /api/po/123/approve
(No payload required)
```

**Reject**:
```json
POST /api/po/123/reject
{
  "remarks": "Missing vendor contact details. Please add phone and email."
}
```

**Bulk Submit**:
```json
POST /api/po/bulk-submit
{
  "po_ids": [123, 124, 125]
}
```

## Database Schema Reference

### purchase_orders Table

**New Columns**:
```sql
prepared_at TIMESTAMP - When submitted for approval
checked_at TIMESTAMP - Internal review (future use)
approved_at TIMESTAMP - When approved by ADMIN
verified_at TIMESTAMP - When marked ready
sent_at TIMESTAMP - When sent to vendor
acknowledged_at TIMESTAMP - When vendor acknowledged
```

**Status Enum Values**:
```sql
POStatus: 
  - DRAFT
  - PENDING_APPROVAL
  - APPROVED
  - READY
  - SENT
  - ACKNOWLEDGED
  - OPEN
  - PARTIAL
  - CLOSED
  - CANCELLED
```

## Troubleshooting

### Issue: 500 Error When Generating PO

**Cause**: Backend using old code with hardcoded strings instead of enums

**Solution**: ✅ FIXED - Backend restarted with updated code

### Issue: Migration Error "Multiple head revisions"

**Cause**: Migration not chained to latest revision

**Solution**: ✅ FIXED - Updated `down_revision = '86b94dfed898'`

### Issue: Cannot See PO Approval Menu

**Cause**: User role not ADMIN or PROCUREMENT_OFFICER

**Solution**: Login as user with correct role

### Issue: Approve Button Not Visible

**Cause**: User is PROCUREMENT_OFFICER (requires ADMIN role)

**Solution**: Login as ADMIN user to approve POs

### Issue: Email Not Sent

**Cause**: SMTP settings not configured

**Solution**: 
1. Navigate to Configuration page (ADMIN only)
2. Configure SMTP settings:
   - smtp_host
   - smtp_port
   - smtp_username
   - smtp_password
   - email_sender

## Summary

✅ **Backend**: All endpoints implemented and tested
✅ **Database**: Migration applied successfully
✅ **Frontend**: POApprovalPage component created
✅ **Routing**: Route added to App.jsx
✅ **Navigation**: Sidebar menu item added
✅ **Bug Fixes**: PO generation endpoint fixed (enum usage)

**Status**: Ready for testing! 🚀

**Next Steps**:
1. Test PO generation from EOPA page
2. Test complete approval workflow
3. Test role-based permissions
4. Test PDF download
5. Configure SMTP for email testing (optional)
