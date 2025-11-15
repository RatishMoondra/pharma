# SCRUM-6: Vendor Dropdown Debugging Guide

## Issue Description
When opening the PI screen, vendors do not automatically populate in the dropdown.

## Changes Made

### 1. Enhanced Console Logging
Added comprehensive console logging to `PIForm.jsx` to track:
- Vendor API fetch results (total count, partner vendor count)
- Form data initialization when editing
- Vendor filtering logic execution
- Country ID extraction from PI data

### 2. Improved Helper Text
The Partner Vendor dropdown now shows context-aware helper text:
- **No country selected**: "Select country first"
- **Country selected, no vendors**: "No partner vendors found for selected country"
- **Vendors available**: "X vendor(s) available"

### 3. Fixed Filtering Logic
- Added `formData.partner_vendor_id` to useEffect dependencies
- Improved vendor selection preservation when editing existing PIs
- Better handling of race conditions between data fetching and form initialization

## How to Debug

### Step 1: Open Browser DevTools
Press F12 and go to the **Console** tab

### Step 2: Test Creating New PI
1. Navigate to PI screen
2. Click "Create PI"
3. Check console for:
   ```
   Creating new PI
   Fetched vendors: X vendors
   Partner vendors: Y
   ```

4. Select a country from dropdown
5. Check console for:
   ```
   Vendor filtering triggered: {country_id: "1", allVendorsCount: X, ...}
   Filtered partner vendors: Y vendors for country 1
   ```

### Step 3: Test Editing Existing PI
1. Click Edit button on an existing PI
2. Check console for:
   ```
   Editing PI: {pi_number: "PI/24-25/0001", ...}
   Extracted country_id: 1 from PI
   Set form data: {country_id: 1, partner_vendor_id: 8, partner_vendor_name: "ABC Partners"}
   ```

3. Check if vendor dropdown shows the current vendor
4. Look for this message:
   ```
   Current vendor found in filtered list: ABC Partners
   ```

### Step 4: Common Issues to Check

#### Issue A: No vendors fetched
**Console shows**: `Fetched vendors: 0 vendors`

**Possible causes**:
- Backend not running
- No vendors in database
- API authentication issue

**Fix**: 
- Check backend is running: `.\run\start-backend.ps1`
- Verify vendors exist in database
- Check Network tab for 401/403 errors

#### Issue B: No partner vendors
**Console shows**: `Partner vendors: 0` (but total vendors > 0)

**Possible causes**:
- All vendors have type other than PARTNER (RM, PM, MANUFACTURER)

**Fix**: 
- Go to Vendors page
- Create at least one vendor with type = PARTNER

#### Issue C: Vendors not filtered by country
**Console shows**: `Filtered partner vendors: 0 vendors for country 1`

**Possible causes**:
- Partner vendors don't have country_id set
- Partner vendors belong to different country

**Fix**:
- Go to Vendors page
- Check the Country column for each PARTNER vendor
- Edit vendors to set correct country

#### Issue D: Vendor dropdown disabled
**UI shows**: Dropdown is greyed out

**Possible causes**:
- Country not selected (by design)
- Form is in loading state

**Fix**:
- Select a country first
- Wait for data to load

#### Issue E: Country not extracted when editing
**Console shows**: `Extracted country_id: "" from PI`

**Possible causes**:
- PI response doesn't include country or country_id
- Backend not loading country relationship

**Fix**:
- Check Network tab for GET /api/pi/ response
- Verify response includes: `"country": {"id": 1, "country_code": "IND", ...}`
- If missing, backend needs to add eager loading: `joinedload(PI.country)`

## Expected Behavior

### Creating New PI
1. Form opens with empty fields
2. Country dropdown is enabled, vendor dropdown is **disabled**
3. User selects country
4. Vendor dropdown becomes **enabled** and shows partner vendors for that country
5. Helper text shows "X vendor(s) available"

### Editing Existing PI
1. Form opens with PI data pre-filled
2. Country dropdown shows current PI country
3. Vendor dropdown is **enabled** and shows current vendor selected
4. Dropdown list shows all partner vendors for the PI's country
5. Helper text shows "X vendor(s) available"

## Quick Fixes

### Fix 1: Restart Backend
If vendors API returns errors:
```powershell
# Stop backend (Ctrl+C)
.\run\start-backend.ps1
```

### Fix 2: Create Test Partner Vendor
If no partner vendors exist:
1. Go to Vendors page
2. Click "Add Vendor"
3. Fill in:
   - Vendor Name: "Test Partner"
   - Vendor Type: **PARTNER**
   - Country: India
   - Contact Person: "John Doe"
   - Phone: "1234567890"
   - Email: "test@example.com"
4. Click Save

### Fix 3: Assign Country to Existing Vendors
If vendors don't have country:
1. Go to Vendors page
2. Edit each PARTNER vendor
3. Select a country
4. Click Save

## Next Steps

After following the debugging steps above, report findings:
1. What console messages appear?
2. Which scenario fails (create or edit)?
3. What error messages show in Network tab?
4. Screenshot of console logs

This will help identify the exact root cause.
