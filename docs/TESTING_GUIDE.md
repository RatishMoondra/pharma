# EOPA Vendor-Agnostic Workflow - Quick Testing Guide

## Date: 2025-01-14

---

## Prerequisites

✅ **Database Migrations Completed**
✅ **Backend Server Running** (http://localhost:8000)
✅ **Frontend Server Running** (http://localhost:5173)

---

## Test Scenario 1: PI Approval with Auto-EOPA Generation

### Step 1: Create a New PI
1. Navigate to http://localhost:5173
2. Login with your credentials
3. Go to **PI** page (from sidebar)
4. Click **Create PI** button
5. Fill in the form:
   - **Partner Vendor:** Select a partner vendor
   - **PI Date:** Select today's date
   - **Add Items:**
     - Medicine: Select a medicine
     - Quantity: 1000
     - Unit Price: 25.50
     - (Add 2-3 items for better testing)
6. Click **Submit**
7. **Expected Result:** 
   - PI created successfully
   - Status badge shows **PENDING** (yellow/warning color)

### Step 2: Approve the PI
1. In the PI table, find your newly created PI
2. **Expected UI:**
   - Green checkmark button (Approve)
   - Red cancel button (Reject)
   - Both visible only for PENDING PIs
3. Click the **green checkmark** (Approve) button
4. In the approval dialog:
   - See warning about auto-EOPA generation
   - See count of items (e.g., "3 EOPAs will be generated")
   - Optionally add remarks
5. Click **Approve** button
6. **Expected Result:**
   - Success message: "PI approved successfully - X EOPAs auto-generated"
   - PI status badge changes to **APPROVED** (green)
   - Approve/Reject buttons disappear

### Step 3: Verify Approval Information
1. Click the **arrow** icon to expand the PI row
2. Scroll down in the expanded section
3. **Expected Result:**
   - Green approval information box appears
   - Shows:
     - Approved At: (timestamp)
     - Approved By: User ID X
     - Auto-generated EOPAs: EOPA/24-25/0001, EOPA/24-25/0002, ...

---

## Test Scenario 2: View Auto-Generated EOPAs

### Step 1: Navigate to EOPA Page
1. Click **EOPA** in the sidebar
2. **Expected Result:**
   - Accordion-style display grouped by PI
   - Your approved PI visible at the top
   - Shows PI number, partner, date, amount

### Step 2: Expand PI Accordion
1. Click on the PI accordion to expand
2. **Expected Result:**
   - Table shows all PI items
   - Each row has:
     - Medicine name
     - Quantity
     - Unit price
     - Total price
     - EOPA status chip (shows EOPA number)

### Step 3: Expand EOPA Details
1. Click the **arrow** icon next to a PI item
2. **Expected Result:**
   - EOPA details table appears
   - Shows:
     - EOPA Number (e.g., EOPA/24-25/0001)
     - Quantity
     - Estimated Unit Price
     - Estimated Total
     - Status (PENDING/APPROVED)
     - Actions (Approve/Delete buttons)

### Step 4: Verify Medicine Master Vendor Info
1. In the expanded EOPA details section
2. Scroll down to the blue **Medicine Master - Vendor Mappings** box
3. **Expected Result:**
   - Shows available vendors:
     - 🏢 Manufacturer: [Vendor Name] ([Code])
     - 📦 Raw Material: [Vendor Name] ([Code])
     - 🚚 Packing Material: [Vendor Name] ([Code])
   - Note: "Vendors will be selected from these mappings during PO generation"

---

## Test Scenario 3: EOPA Approval

### Step 1: Approve an EOPA
1. In the EOPA details table (expanded row)
2. Click the **green checkmark** button next to a PENDING EOPA
3. In the approval dialog, click **Approve**
4. **Expected Result:**
   - Success message: "EOPA approved successfully"
   - EOPA status chip changes to **APPROVED** (green)
   - Approve/Delete buttons disappear

---

## Test Scenario 4: PI Rejection

### Step 1: Create Another PI
1. Follow Test Scenario 1, Step 1 to create a new PI
2. Verify status is **PENDING**

### Step 2: Reject the PI
1. Click the **red cancel** button (Reject)
2. In the rejection dialog:
   - Optionally add remarks explaining rejection
3. Click **Reject** button
4. **Expected Result:**
   - Success message: "PI rejected successfully"
   - PI status badge changes to **REJECTED** (red)
   - Approve/Reject buttons disappear
   - Edit button disabled

### Step 3: Verify Rejection Information
1. Expand the rejected PI row
2. **Expected Result:**
   - Red rejection information box appears
   - Shows:
     - Rejected At: (timestamp)
     - Rejected By: User ID X
   - **No EOPAs generated** for rejected PIs

---

## Test Scenario 5: Manual EOPA Creation (Optional)

### Step 1: Create EOPA Manually
1. Go to EOPA page
2. If there's a "Create EOPA" button (currently removed in favor of auto-generation)
3. **Note:** Manual creation is now deprecated
4. **Expected Behavior:**
   - EOPAs should only be created via PI approval
   - No manual creation button should be visible

---

## Validation Checklist

### ✅ UI Components

**PI Page:**
- [ ] PENDING badge is yellow/warning color
- [ ] APPROVED badge is green/success color
- [ ] REJECTED badge is red/error color
- [ ] Approve button (green checkmark) visible for PENDING PIs only
- [ ] Reject button (red cancel) visible for PENDING PIs only
- [ ] Edit button disabled for APPROVED/REJECTED PIs
- [ ] Delete button disabled for APPROVED PIs
- [ ] Approval info box (green) appears for approved PIs
- [ ] Rejection info box (red) appears for rejected PIs
- [ ] EOPA numbers displayed in approval info box

**EOPA Page:**
- [ ] Only approved PIs displayed
- [ ] Accordion grouping by PI works
- [ ] No "Vendor Type" column visible
- [ ] No "Vendor Name" column visible
- [ ] EOPA number chip shows status color
- [ ] Arrow icon expands/collapses EOPA details
- [ ] EOPA details table shows simplified columns
- [ ] Medicine Master vendor info box (blue) appears
- [ ] Vendor icons (🏢📦🚚) displayed correctly
- [ ] Approve/Delete buttons work for PENDING EOPAs

### ✅ Functionality

**PI Approval:**
- [ ] Approving PI shows confirmation dialog
- [ ] Dialog shows EOPA count to be generated
- [ ] Remarks field optional
- [ ] Success message shows EOPA count
- [ ] PI status updates to APPROVED
- [ ] EOPAs auto-generated (verify count matches items)
- [ ] Approval timestamp recorded
- [ ] Approver ID recorded

**PI Rejection:**
- [ ] Rejecting PI shows confirmation dialog
- [ ] Remarks field optional
- [ ] Success message displayed
- [ ] PI status updates to REJECTED
- [ ] No EOPAs generated
- [ ] Rejection timestamp recorded

**EOPA Display:**
- [ ] EOPAs appear under correct PI
- [ ] EOPA number format: EOPA/YY-YY/#### (e.g., EOPA/24-25/0001)
- [ ] Quantity matches PI item quantity
- [ ] Price matches PI item unit price
- [ ] Total calculated correctly
- [ ] Remarks displayed if present
- [ ] Medicine Master vendors shown correctly

**EOPA Approval:**
- [ ] Approve button visible for PENDING EOPAs only
- [ ] Approval dialog shown
- [ ] Status updates to APPROVED
- [ ] Approve/Delete buttons hidden after approval

### ✅ Data Integrity

**Database:**
- [ ] PI table has status, approved_by, approved_at columns
- [ ] EOPA table has NO vendor_id column
- [ ] EOPA table has NO vendor_type column
- [ ] EOPA records created with correct pi_item_id
- [ ] EOPA number unique and sequential

**API Responses:**
- [ ] GET /api/pi/ returns status field
- [ ] GET /api/pi/ returns approved_by, approved_at for approved PIs
- [ ] POST /api/pi/{id}/approve returns eopa_numbers array
- [ ] GET /api/eopa/ does NOT include vendor_id or vendor_type

---

## Common Issues and Troubleshooting

### Issue: Approve Button Not Visible
- **Cause:** PI status not PENDING
- **Fix:** Create a new PI (default status is PENDING)

### Issue: EOPAs Not Auto-Generated
- **Cause:** Backend endpoint not working
- **Check:** Browser console for errors
- **Verify:** POST /api/pi/{id}/approve endpoint exists

### Issue: Vendor Columns Still Visible in EOPA Page
- **Cause:** Old EOPA page cached
- **Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue: EOPA Page Shows No Data
- **Cause:** No approved PIs exist
- **Fix:** Create and approve at least one PI

### Issue: Medicine Master Vendors Not Showing
- **Cause:** Medicine not mapped to vendors in Medicine Master
- **Fix:** 
  1. Go to Medicine Master page
  2. Edit the medicine
  3. Assign vendors (Manufacturer, RM, PM)
  4. Save and refresh EOPA page

---

## Success Criteria

✅ **All Test Scenarios Pass**  
✅ **No Console Errors**  
✅ **UI Matches Expected Behavior**  
✅ **Database Records Created Correctly**  
✅ **Auto-EOPA Generation Works**  
✅ **Medicine Master Vendor Info Displayed**  
✅ **No Vendor Selection Required**

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark ticket as resolved
2. Update user documentation
3. Train users on new workflow
4. Monitor production for issues

### If Tests Fail ❌
1. Document failing test cases
2. Check browser console for errors
3. Check backend logs: `backend/app/logs/`
4. Report issues to development team
5. Provide screenshots/error messages

---

## Quick Reference

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Key Files:**
- PI Page: `frontend/src/pages/PIPage.jsx`
- EOPA Page: `frontend/src/pages/EOPAPage.jsx`
- EOPA Form: `frontend/src/components/EOPAForm.jsx`
- PI Router: `backend/app/routers/pi.py`
- EOPA Router: `backend/app/routers/eopa.py`

**Rollback Files (if needed):**
- `frontend/src/pages/EOPAPage_old.jsx`
- `frontend/src/components/EOPAForm_old.jsx`

---

## Contact for Issues

If you encounter any issues during testing:
1. Check browser console (F12 → Console tab)
2. Check backend logs (`backend/app/logs/`)
3. Verify database migrations completed successfully
4. Restart backend and frontend servers
5. Clear browser cache and reload

**Documentation:**
- Implementation Summary: `docs/FRONTEND_IMPLEMENTATION_SUMMARY.md`
- Architecture Guide: `docs/EOPA_VENDOR_AGNOSTIC_IMPLEMENTATION.md`

---

**Happy Testing! 🚀**
