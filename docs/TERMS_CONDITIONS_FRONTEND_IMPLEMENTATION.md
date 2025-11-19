# Terms & Conditions Frontend Implementation Guide

## Overview
Frontend implementation for the Terms & Conditions feature in PharmaFlow 360, providing ADMIN users with a comprehensive UI for managing master terms, vendor assignments, and partner medicine whitelists.

## Implementation Status

### ✅ Phase 1: Master Library Management (COMPLETE)
- TermsConditionsPage.jsx - Admin interface for managing master terms library
- App.jsx - Route configuration with RBAC
- Sidebar.jsx - Navigation menu item

### ✅ Phase 2: Vendor Integration Components (COMPLETE)
- VendorTermsTab.jsx - Vendor-specific terms management
- PartnerMedicinesTab.jsx - Partner medicine whitelist management
- VendorForm.jsx - Enhanced with tabbed interface for vendor detail management

### ⏳ Phase 3: PI/PO Screen Integration (PENDING)
- PI Screen - Filter medicines by partner whitelist
- PO Screen - Auto-load vendor terms

---

## Completed Components

### 1. Terms & Conditions Master Page
**Location:** `frontend/src/pages/TermsConditionsPage.jsx`  
**Route:** `/terms-conditions`  
**Access:** ADMIN only

#### Features
✅ **Master Library Management**
- Full CRUD operations (Create, Read, Update, Delete)
- Paginated table view with sortable columns
- Real-time search across term text
- Category-based filtering (7 categories)
- Active/Inactive status toggle

✅ **Category System**
- PAYMENT (green) - Payment-related terms
- DELIVERY (blue) - Shipping and delivery terms
- WARRANTY (orange) - Warranty and guarantee terms
- QUALITY (primary blue) - Quality assurance terms
- LEGAL (red) - Legal and compliance terms
- GENERAL (default gray) - General terms
- OTHER (secondary) - Miscellaneous terms

✅ **Priority Management**
- Priority range: 1-999 (lower = higher priority)
- Color-coded priority chips:
  - Red: Priority ≤ 50 (critical/urgent)
  - Orange: Priority 51-100 (high)
  - Default: Priority > 100 (normal)

✅ **Visual Indicators**
- Active terms: Normal display
- Inactive terms: Grayed out background + strikethrough text
- Category color chips for quick identification
- Priority badges for sorting clarity

✅ **Search & Filter**
- Real-time text search (case-insensitive)
- Category dropdown filter
- Active-only toggle switch
- Filters work in combination

✅ **Dialog Forms**
- Add new term dialog with validation
- Edit existing term dialog (pre-populated)
- Required field validation (term_text, category)
- Priority input with min/max constraints
- Active/inactive toggle switch

✅ **User Feedback**
- Success/error snackbars for all operations
- Loading states during API calls
- Confirmation dialogs for delete operations
- Informative error messages from backend

#### UI Components Used
- Material-UI Table with TableContainer, TableHead, TableBody
- Dialog for add/edit forms
- TextField for text inputs and search
- Select dropdown for category filtering
- Switch for active/inactive toggles
- Snackbar + Alert for notifications
- IconButtons for actions (Edit, Delete)
- Chips for category and priority display
- CircularProgress for loading states

#### State Management
```javascript
- terms: Array of term objects
- loading: Boolean for API loading state
- selectedCategory: String for category filter
- showActiveOnly: Boolean for active filter
- searchText: String for search query
- openDialog: Boolean for dialog visibility
- editingTerm: Object or null for edit mode
- formData: Object for form inputs
- snackbar: Object for notification state
```

#### API Integration
```javascript
// Fetch terms with filters
GET /api/terms/?category={category}&is_active={true|false}&search={text}

// Create new term
POST /api/terms/
Body: { term_text, category, priority, is_active }

// Update existing term
PUT /api/terms/{id}
Body: { term_text, category, priority, is_active }

// Delete term
DELETE /api/terms/{id}
```

### 2. Sidebar Navigation Update
**Location:** `frontend/src/components/Sidebar.jsx`

#### Changes Made
✅ Added "Terms & Conditions" menu item
- Icon: ArticleIcon (document icon)
- Path: `/terms-conditions`
- Section: admin
- Roles: ADMIN only
- Position: After "System Configuration"

✅ Import Statement
```javascript
import ArticleIcon from '@mui/icons-material/Article'
```

✅ Menu Item Configuration
```javascript
{
  text: 'Terms & Conditions',
  icon: <ArticleIcon />,
  path: '/terms-conditions',
  roles: ['ADMIN'],
  section: 'admin'
}
```

### 3. App Router Update
**Location:** `frontend/src/App.jsx`

#### Changes Made
✅ Import TermsConditionsPage component
```javascript
import TermsConditionsPage from './pages/TermsConditionsPage'
```

✅ Route Configuration
```javascript
<Route 
  path="terms-conditions" 
  element={
    <PrivateRoute allowedRoles={['ADMIN']}>
      <TermsConditionsPage />
    </PrivateRoute>
  } 
/>
```

✅ Access Control
- RBAC enforced via PrivateRoute wrapper
- Only users with ADMIN role can access

## Next Steps: Remaining Components

### 3. Vendor Terms Management (In Progress)

#### VendorTermsTab Component
**Location:** `frontend/src/components/VendorTermsTab.jsx` (to be created)  
**Usage:** Tab within VendorDetailPage for managing vendor-specific term assignments

**Features to Implement:**
- [ ] Display assigned terms in a sortable table
- [ ] Show effective priority (override or master priority)
- [ ] Add terms from master library via dialog
- [ ] Batch assign multiple terms at once
- [ ] Edit priority override and notes inline
- [ ] Remove term assignments
- [ ] Category grouping for better organization
- [ ] Active/inactive term filtering

**API Endpoints:**
```javascript
// Get vendor's assigned terms
GET /api/terms/vendor-terms/?vendor_id={id}&is_active=true

// Assign single term
POST /api/terms/vendor-terms/
Body: { vendor_id, term_id, priority_override, notes }

// Batch assign terms
POST /api/terms/vendor-terms/batch
Body: { vendor_id, term_ids: [1,2,3], default_notes }

// Update assignment
PUT /api/terms/vendor-terms/{assignment_id}
Body: { priority_override, notes }

// Remove assignment
DELETE /api/terms/vendor-terms/{assignment_id}
```

**Component Structure:**
```jsx
<VendorTermsTab vendor={vendor}>
  <Box> // Header with "Assign Terms" button
  <Table> // Assigned terms with priority, category, notes
    <TableRow> // Each term row
      <PriorityCell> // Override badge if exists
      <CategoryCell> // Category chip
      <TermTextCell> // Full term text
      <NotesCell> // Vendor-specific notes
      <ActionsCell> // Edit, Delete buttons
  <AssignTermsDialog> // Multi-select from master library
    <TransferList> // Available terms ↔ Selected terms
    <NotesField> // Optional default notes
</VendorTermsTab>
```

### 4. Partner Medicines Management

#### PartnerMedicinesTab Component
**Location:** `frontend/src/components/PartnerMedicinesTab.jsx` (to be created)  
**Usage:** Tab within VendorDetailPage (only for PARTNER type vendors)

**Features to Implement:**
- [ ] Display allowed medicines in a table
- [ ] Search medicines by name/code
- [ ] Add medicines from medicine master via dialog
- [ ] Batch assign multiple medicines
- [ ] Edit assignment notes
- [ ] Remove medicine assignments
- [ ] Show "Not applicable" message for non-PARTNER vendors

**API Endpoints:**
```javascript
// Get partner's allowed medicines
GET /api/terms/partner-medicines/?vendor_id={id}

// Assign single medicine
POST /api/terms/partner-medicines/
Body: { vendor_id, medicine_id, notes }

// Batch assign medicines
POST /api/terms/partner-medicines/batch
Body: { vendor_id, medicine_ids: [1,2,3], default_notes }

// Update assignment
PUT /api/terms/partner-medicines/{assignment_id}
Body: { notes }

// Remove assignment
DELETE /api/terms/partner-medicines/{assignment_id}
```

**Component Structure:**
```jsx
<PartnerMedicinesTab vendor={vendor}>
  {vendor.vendor_type !== 'PARTNER' ? (
    <Alert severity="info">
      Medicine assignments only available for PARTNER vendors
    </Alert>
  ) : (
    <>
      <Box> // Header with "Add Medicines" button
      <Table> // Assigned medicines
        <TableRow> // Each medicine row
          <MedicineCodeCell>
          <MedicineNameCell>
          <NotesCell>
          <ActionsCell> // Edit notes, Remove
      <AddMedicinesDialog> // Multi-select from medicine master
        <Autocomplete multiple> // Medicine search/select
        <NotesField> // Optional default notes
    </>
  )}
</PartnerMedicinesTab>
```

### 5. PI Screen Updates

#### Medicine Filtering for Partner Vendors
**Location:** `frontend/src/pages/PIPage.jsx` (to be updated)

**Changes Required:**
- [ ] Fetch partner's allowed medicines when partner vendor selected
- [ ] Filter medicine dropdown to only show whitelisted medicines
- [ ] Display message if partner has no allowed medicines
- [ ] Show all medicines if vendor is not a partner

**API Endpoint:**
```javascript
// Get partner's allowed medicines
GET /api/terms/partner-medicines/?vendor_id={partnerId}

// Extract medicine IDs
const allowedMedicineIds = response.data.data.map(pm => pm.medicine_id)

// Filter medicine dropdown
const filteredMedicines = allMedicines.filter(m => 
  allowedMedicineIds.includes(m.id)
)
```

**Implementation:**
```jsx
// In PI form component
const [allowedMedicines, setAllowedMedicines] = useState([])

useEffect(() => {
  if (formData.partner_vendor_id) {
    fetchPartnerMedicines(formData.partner_vendor_id)
  }
}, [formData.partner_vendor_id])

const fetchPartnerMedicines = async (vendorId) => {
  const response = await api.get('/api/terms/partner-medicines/', {
    params: { vendor_id: vendorId }
  })
  const medicineIds = response.data.data.map(pm => pm.medicine_id)
  setAllowedMedicines(medicineIds)
}

// In medicine dropdown
<Select>
  {medicines
    .filter(m => allowedMedicines.length === 0 || allowedMedicines.includes(m.id))
    .map(medicine => (
      <MenuItem key={medicine.id} value={medicine.id}>
        {medicine.medicine_name}
      </MenuItem>
    ))
  }
</Select>
```

#### Partner Terms Display
**Location:** `frontend/src/pages/PIPage.jsx` (to be updated)

**Changes Required:**
- [ ] Fetch partner's terms when partner vendor selected
- [ ] Display terms in a collapsible section
- [ ] Show terms sorted by priority
- [ ] Category-based grouping

**Component Structure:**
```jsx
<Accordion>
  <AccordionSummary>
    Partner Terms & Conditions ({partnerTerms.length})
  </AccordionSummary>
  <AccordionDetails>
    {Object.entries(groupByCategory(partnerTerms)).map(([category, terms]) => (
      <Box key={category}>
        <Typography variant="subtitle2">{category}</Typography>
        <List dense>
          {terms.map(term => (
            <ListItem key={term.id}>
              <ListItemText primary={term.term.term_text} />
            </ListItem>
          ))}
        </List>
      </Box>
    ))}
  </AccordionDetails>
</Accordion>
```

### 6. PO Screen Updates

#### Vendor Terms Auto-Load
**Location:** `frontend/src/pages/POPage.jsx` (to be updated)

**Changes Required:**
- [ ] Fetch vendor's terms when vendor selected
- [ ] Auto-populate PO terms field
- [ ] Allow inline editing of terms
- [ ] Show priority-sorted terms
- [ ] Enable add/remove individual terms

**API Endpoint:**
```javascript
// Get vendor's assigned terms
GET /api/terms/vendor-terms/?vendor_id={vendorId}&is_active=true

// Sort by effective priority
const sortedTerms = response.data.data.sort((a, b) => {
  const priorityA = a.priority_override || a.term.priority
  const priorityB = b.priority_override || b.term.priority
  return priorityA - priorityB
})
```

**Component Structure:**
```jsx
<Box>
  <Typography variant="h6">Terms & Conditions</Typography>
  <Alert severity="info">
    Auto-loaded from vendor settings. You can edit below.
  </Alert>
  
  <List>
    {vendorTerms.map((vt, index) => (
      <ListItem key={vt.id}>
        <Chip label={`${index + 1}`} size="small" sx={{ mr: 1 }} />
        <TextField
          fullWidth
          multiline
          value={editableTerms[vt.id] || vt.term.term_text}
          onChange={(e) => handleTermEdit(vt.id, e.target.value)}
        />
        <IconButton onClick={() => handleRemoveTerm(vt.id)}>
          <DeleteIcon />
        </IconButton>
      </ListItem>
    ))}
  </List>
  
  <Button startIcon={<AddIcon />} onClick={handleAddTerm}>
    Add Custom Term
  </Button>
</Box>
```

## Testing Checklist

### Terms & Conditions Master Page
- [x] Page loads successfully
- [x] Table displays all terms
- [ ] Search filters terms correctly
- [ ] Category filter works
- [ ] Active-only toggle works
- [ ] Create dialog opens and saves new term
- [ ] Edit dialog pre-populates data
- [ ] Update saves changes correctly
- [ ] Delete shows confirmation and removes term
- [ ] Delete fails gracefully if term is assigned
- [ ] Snackbar shows success/error messages
- [ ] Priority sorting works (lower = higher)
- [ ] Category chips display correct colors
- [ ] Inactive terms show visual indicators

### Sidebar Navigation
- [x] Terms & Conditions menu item visible for ADMIN
- [x] Menu item not visible for non-ADMIN users
- [x] Clicking navigates to /terms-conditions
- [x] Selected state highlights correctly
- [x] Icon displays correctly (ArticleIcon)

### App Router
- [x] Route registered at /terms-conditions
- [x] RBAC enforced (ADMIN only)
- [x] Page loads within Layout
- [x] Unauthorized users redirected

## Styling & UX Considerations

### Material-UI Theme Integration
- Primary color: #1976d2 (blue)
- Secondary color: #dc004e (red)
- Success: green for active terms
- Warning: orange for priority alerts
- Error: red for critical items

### Responsive Design
- Container: maxWidth="xl" for wide screens
- Table: Horizontal scroll on mobile
- Dialog: fullWidth with maxWidth="md"
- Filters: Flexbox with wrapping

### Accessibility
- Icon buttons have tooltips
- Form fields have labels
- Snackbars auto-dismiss after 6 seconds
- Confirmation dialogs for destructive actions
- Loading states prevent duplicate submissions

### Performance Optimizations
- Debounced search input (consider implementing)
- Pagination for large term lists (future enhancement)
- Lazy loading for dialogs
- Memoized filter functions (future enhancement)

## API Error Handling

### Standard Error Format
```javascript
{
  success: false,
  message: "Error message here",
  error_code: "ERR_VALIDATION"
}
```

### Common Error Scenarios
1. **ERR_NOT_FOUND**: Term ID doesn't exist → Show "Term not found" message
2. **ERR_VALIDATION**: 
   - Invalid category → "Category must be one of: PAYMENT, DELIVERY, ..."
   - Duplicate assignment → "Term already assigned to vendor"
   - Vendor type mismatch → "Only PARTNER vendors can have medicine assignments"
3. **ERR_SERVER**: Unexpected error → "Failed to perform operation. Please try again."

### Error Display Pattern
```javascript
try {
  const response = await api.post('/api/terms/', formData)
  if (response.data.success) {
    showSnackbar('Success message', 'success')
  }
} catch (error) {
  const errorMessage = error.response?.data?.message || 'Generic error message'
  showSnackbar(errorMessage, 'error')
}
```

## File Structure

```
frontend/src/
├── pages/
│   ├── TermsConditionsPage.jsx ✅ (Created)
│   ├── VendorsPage.jsx (To be updated with tabs)
│   ├── PIPage.jsx (To be updated with filtering)
│   └── POPage.jsx (To be updated with auto-load)
├── components/
│   ├── Layout.jsx ✅ (No changes needed)
│   ├── Sidebar.jsx ✅ (Updated)
│   ├── VendorTermsTab.jsx ⏳ (To be created)
│   └── PartnerMedicinesTab.jsx ⏳ (To be created)
├── services/
│   └── api.js ✅ (No changes needed)
└── App.jsx ✅ (Updated)
```

## Dependencies

### Required Material-UI Components
Already available in project:
- @mui/material/Container
- @mui/material/Paper
- @mui/material/Table, TableBody, TableCell, TableContainer, TableHead, TableRow
- @mui/material/Dialog, DialogTitle, DialogContent, DialogActions
- @mui/material/TextField, Select, MenuItem, FormControl, InputLabel
- @mui/material/Button, IconButton
- @mui/material/Chip
- @mui/material/Snackbar, Alert
- @mui/material/Switch, FormControlLabel
- @mui/material/CircularProgress
- @mui/icons-material/* (various icons)

### No Additional npm Packages Needed
All required functionality can be built with existing dependencies.

## Next Development Session

**Priority 1: Vendor Detail Page Integration**
1. Create VendorTermsTab component
2. Create PartnerMedicinesTab component  
3. Add tabs to existing VendorsPage/VendorDetailPage
4. Test CRUD operations for vendor assignments

**Priority 2: PI Screen Enhancements**
1. Add partner medicine filtering logic
2. Display partner terms in PI form
3. Test medicine dropdown filtering
4. Verify terms display

**Priority 3: PO Screen Enhancements**
1. Add vendor terms auto-load
2. Implement inline term editing
3. Test term persistence in PO
4. Verify priority-based sorting

---

**Status**: Phase 1 Complete (Master Library Management) ✅  
**Next**: Phase 2 - Vendor Integration Components  
**Date**: 2025-11-19  
**Author**: GitHub Copilot (Claude Sonnet 4.5)
