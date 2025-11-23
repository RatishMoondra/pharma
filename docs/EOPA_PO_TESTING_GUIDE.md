# EOPA → PO Implementation - Testing Guide

## Quick Test Checklist

### Backend Tests

Run the comprehensive test suite:

```bash
cd backend
pytest tests/test_po_material_mapping.py -v
```

**Expected Output:**
```
✓ test_fg_po_material_mapping - PASSED
✓ test_rm_po_material_mapping - PASSED
✓ test_pm_po_material_mapping - PASSED
✓ test_eopa_to_po_first_time_reads_eopa_items - PASSED
✓ test_eopa_to_po_subsequent_reads_po_items - PASSED
✓ test_vendor_resolution_from_medicine_master - PASSED
✓ test_po_item_validation_only_one_material_field - PASSED
```

### Frontend Manual Testing

#### Test Scenario 1: Generate FG PO

1. Navigate to EOPA Page
2. Find an APPROVED EOPA
3. Click **"Generate FG PO"** button (green with Business icon)
4. Verify SimplePODialog opens showing only FG preview
5. Verify medicines are grouped by manufacturer vendor
6. Click **"Generate FG PO(s)"**
7. Verify success message
8. Check PO List - verify FG PO created with correct vendor

**Expected PO Item Data:**
```json
{
  "medicine_id": 1,
  "raw_material_id": null,
  "packing_material_id": null,
  "ordered_quantity": 10000
}
```

#### Test Scenario 2: Generate RM PO

1. Navigate to EOPA Page
2. Find an APPROVED EOPA
3. Click **"Generate RM PO"** button (blue with Inventory2 icon)
4. Verify SimplePODialog opens showing only RM preview
5. Verify raw materials are grouped by RM vendor
6. Verify explosion quantities calculated correctly
7. Click **"Generate RM PO(s)"**
8. Verify success message
9. Check PO List - verify RM PO created with correct vendor

**Expected PO Item Data:**
```json
{
  "medicine_id": null,
  "raw_material_id": 5,
  "packing_material_id": null,
  "ordered_quantity": 5000.000
}
```

#### Test Scenario 3: Generate PM PO

1. Navigate to EOPA Page
2. Find an APPROVED EOPA
3. Click **"Generate PM PO"** button (purple with LocalShipping icon)
4. Verify SimplePODialog opens showing only PM preview
5. Verify packing materials are grouped by PM vendor
6. Verify language and artwork version shown
7. Click **"Generate PM PO(s)"**
8. Verify success message
9. Check PO List - verify PM PO created with correct vendor

**Expected PO Item Data:**
```json
{
  "medicine_id": null,
  "raw_material_id": null,
  "packing_material_id": 8,
  "ordered_quantity": 100.000,
  "language": "English",
  "artwork_version": "v1.0"
}
```

### Database Validation

Run these queries to verify correct data:

#### Check FG PO Items
```sql
SELECT 
    po.po_number,
    po.po_type,
    poi.medicine_id,
    poi.raw_material_id,
    poi.packing_material_id,
    m.medicine_name
FROM po_items poi
JOIN purchase_orders po ON poi.po_id = po.id
LEFT JOIN medicine_master m ON poi.medicine_id = m.id
WHERE po.po_type = 'FG'
ORDER BY po.created_at DESC
LIMIT 10;
```

**Expected:** 
- `medicine_id` populated
- `raw_material_id` NULL
- `packing_material_id` NULL

#### Check RM PO Items
```sql
SELECT 
    po.po_number,
    po.po_type,
    poi.medicine_id,
    poi.raw_material_id,
    poi.packing_material_id,
    rm.rm_name
FROM po_items poi
JOIN purchase_orders po ON poi.po_id = po.id
LEFT JOIN raw_material_master rm ON poi.raw_material_id = rm.id
WHERE po.po_type = 'RM'
ORDER BY po.created_at DESC
LIMIT 10;
```

**Expected:**
- `raw_material_id` populated
- `medicine_id` NULL
- `packing_material_id` NULL

#### Check PM PO Items
```sql
SELECT 
    po.po_number,
    po.po_type,
    poi.medicine_id,
    poi.raw_material_id,
    poi.packing_material_id,
    pm.pm_name,
    poi.language,
    poi.artwork_version
FROM po_items poi
JOIN purchase_orders po ON poi.po_id = po.id
LEFT JOIN packing_material_master pm ON poi.packing_material_id = pm.id
WHERE po.po_type = 'PM'
ORDER BY po.created_at DESC
LIMIT 10;
```

**Expected:**
- `packing_material_id` populated
- `medicine_id` NULL
- `raw_material_id` NULL
- `language` populated
- `artwork_version` populated

### Validation Query (Critical)

**Verify NO items have multiple material fields populated:**

```sql
SELECT 
    po.po_number,
    po.po_type,
    poi.id as item_id,
    CASE 
        WHEN poi.medicine_id IS NOT NULL THEN 1 ELSE 0 
    END +
    CASE 
        WHEN poi.raw_material_id IS NOT NULL THEN 1 ELSE 0 
    END +
    CASE 
        WHEN poi.packing_material_id IS NOT NULL THEN 1 ELSE 0 
    END as populated_count,
    poi.medicine_id,
    poi.raw_material_id,
    poi.packing_material_id
FROM po_items poi
JOIN purchase_orders po ON poi.po_id = po.id
WHERE 
    (CASE WHEN poi.medicine_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN poi.raw_material_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN poi.packing_material_id IS NOT NULL THEN 1 ELSE 0 END) != 1;
```

**Expected Result:** 0 rows (all items must have exactly 1 material field)

### API Testing (Postman/cURL)

#### Test FG PO Generation
```bash
curl -X POST http://localhost:8000/api/po/generate-from-eopa/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Test RM PO Generation
```bash
curl -X POST http://localhost:8000/api/po/generate-rm-pos/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Test PM PO Generation
```bash
curl -X POST http://localhost:8000/api/po/generate-pm-pos/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Verify PO Items
```bash
curl -X GET http://localhost:8000/api/po/by-eopa/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Common Issues & Solutions

#### Issue 1: "No RM vendors found"

**Cause:** Medicine doesn't have raw materials in BOM

**Solution:**
1. Go to Medicine Master
2. Add raw materials via BOM
3. Assign RM vendor
4. Retry

#### Issue 2: "No PM vendors found"

**Cause:** Medicine doesn't have packing materials in BOM

**Solution:**
1. Go to Medicine Master
2. Add packing materials via BOM
3. Assign PM vendor with language/artwork
4. Retry

#### Issue 3: "Duplicate PO error"

**Cause:** POs already generated for this EOPA

**Solution:**
1. Delete existing POs using "Delete All POs" button
2. Or use individual PO delete
3. Retry generation

#### Issue 4: Wrong material field populated

**Check:**
1. Review `po_service.py` PO item creation
2. Verify correct method called (FG vs RM vs PM)
3. Run database validation query

### Performance Testing

**Load Test:**
1. Create EOPA with 100 line items
2. Generate all 3 PO types
3. Verify generation time < 5 seconds

**Concurrent Users:**
1. 5 users generate POs simultaneously
2. Verify no race conditions
3. Verify correct vendor assignment

### Edge Cases

#### Test 1: EOPA with no medicines
- Expected: Info message "No vendors found"

#### Test 2: Medicine without vendors
- Expected: Warning, skip that medicine

#### Test 3: Multiple medicines, same vendor
- Expected: Single PO with multiple items

#### Test 4: Multiple medicines, different vendors
- Expected: Multiple POs, one per vendor

### Regression Testing

After implementation, verify:

1. ✓ Existing POs still load correctly
2. ✓ Invoice creation still works
3. ✓ Material balance updates correctly
4. ✓ PO approval workflow intact

### Success Criteria

✅ All pytest tests pass
✅ All 3 PO types generate correctly
✅ Material fields populated correctly
✅ No duplicate field population
✅ Vendor resolution works
✅ UI shows correct previews
✅ Performance acceptable

### Rollback Plan

If issues found:

1. Revert `po_service.py` changes
2. Revert frontend changes
3. Use old POManagementDialog
4. Run full test suite
5. Deploy hotfix

---

## Quick Reference

| PO Type | Material Field | Vendor Source | Explosion? |
|---------|----------------|---------------|------------|
| FG | `medicine_id` | `manufacturer_vendor_id` | No |
| RM | `raw_material_id` | BOM vendor → RM vendor | Yes |
| PM | `packing_material_id` | BOM vendor → PM vendor | Yes |

---

**Test Date:** November 23, 2025
**Tester:** [Your Name]
**Status:** [PASS/FAIL]
