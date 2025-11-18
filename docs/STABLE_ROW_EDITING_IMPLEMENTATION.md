# Stable Row Editing Implementation Guide

## Overview

This document describes the implementation of stable row editing across all master and transaction screens in the PharmaFlow 360. The feature ensures that:

1. **Rows maintain their position** after edit/save (no re-sorting)
2. **Active editing rows are highlighted** with a soft background color
3. **Saved rows show a temporary success animation** (2-second pulse)
4. **Highlights clear automatically** when forms close
5. **Array operations preserve order** using map() instead of re-fetching

## Core Hook: `useStableRowEditing`

**Location**: `frontend/src/hooks/useStableRowEditing.js`

### Features

- **State Management**: Tracks `editingRowId` and `savedRowId`
- **Array Operations**: `updateDataStably()`, `addDataStably()`, `removeDataStably()`
- **Styling**: `getRowStyle()` returns Material-UI sx props based on row state
- **Auto-clear**: Saved indicator automatically clears after 2 seconds

### API

```javascript
const {
  // State
  editingRowId,
  savedRowId,
  
  // Actions
  openEditForm,        // (rowId) => void
  closeEditForm,       // () => void
  markAsSaved,         // (rowId, delay=2000) => void
  
  // Data manipulation
  updateDataStably,    // (array, updatedItem, idField='id') => newArray
  addDataStably,       // (array, newItem, addToStart=false) => newArray
  removeDataStably,    // (array, itemId, idField='id') => newArray
  
  // UI helpers
  getRowStyle,         // (rowId) => sxObject
  isEditing,           // (rowId) => boolean
  isSaved,             // (rowId) => boolean
} = useStableRowEditing()
```

### Row Styling States

1. **Editing State** (when form is open for this row):
   ```javascript
   {
     bgcolor: 'action.selected',
     borderLeft: '4px solid',
     borderLeftColor: 'primary.main',
     transition: 'all 0.3s ease',
   }
   ```

2. **Saved State** (for 2 seconds after save):
   ```javascript
   {
     bgcolor: 'success.light',
     transition: 'all 0.3s ease',
     animation: 'pulse 0.5s ease-in-out',
   }
   ```

3. **Normal State**:
   ```javascript
   {
     '&:hover': { bgcolor: 'action.hover' },
     transition: 'all 0.2s ease',
   }
   ```

## Implementation Pattern

### Step 1: Add Import

```javascript
import { useStableRowEditing } from '../hooks/useStableRowEditing'
```

### Step 2: Initialize Hook

```javascript
const {
  openEditForm,
  closeEditForm,
  markAsSaved,
  updateDataStably,
  addDataStably,
  removeDataStably,
  getRowStyle,
} = useStableRowEditing()
```

### Step 3: Update Form Handlers

#### handleOpenForm (or handleEdit)
```javascript
const handleOpenForm = (item = null) => {
  setEditingItem(item)
  setFormOpen(true)
  if (item) {
    openEditForm(item.id)  // Track editing row
  }
}

const handleCloseForm = () => {
  setFormOpen(false)
  setEditingItem(null)
  closeEditForm()  // Clear editing state
}
```

#### handleSubmit (or handleSave)
```javascript
const handleSubmit = async (formData) => {
  try {
    setSubmitting(true)
    
    if (editingItem) {
      // UPDATE - Preserve row position
      const response = await api.put(`/api/resource/${editingItem.id}`, formData)
      if (response.data.success) {
        const updatedItem = response.data.data
        // Update in-place using map()
        setItems(prevItems => updateDataStably(prevItems, updatedItem))
        markAsSaved(editingItem.id)  // Show success animation
        setSuccessMessage('Updated successfully')
        handleCloseForm()
      }
    } else {
      // CREATE - Add to beginning
      const response = await api.post('/api/resource/', formData)
      if (response.data.success) {
        const newItem = response.data.data
        setItems(prevItems => addDataStably(prevItems, newItem, true))
        markAsSaved(newItem.id)  // Show success animation
        setSuccessMessage('Created successfully')
        handleCloseForm()
      }
    }
  } catch (err) {
    handleApiError(err)
  } finally {
    setSubmitting(false)
  }
}
```

#### handleDelete
```javascript
const handleDelete = async (itemId) => {
  if (!window.confirm('Are you sure?')) return
  
  try {
    const response = await api.delete(`/api/resource/${itemId}`)
    if (response.data.success) {
      // Remove from array while preserving order
      setItems(prevItems => removeDataStably(prevItems, itemId))
      setSuccessMessage('Deleted successfully')
    }
  } catch (err) {
    handleApiError(err)
  }
}
```

### Step 4: Apply Row Styling

```javascript
<TableBody>
  {items.map((item) => (
    <TableRow 
      key={item.id}
      sx={getRowStyle(item.id)}  // Apply dynamic styling
    >
      {/* Table cells */}
    </TableRow>
  ))}
</TableBody>
```

### Step 5: For Collapsible Row Components

If using a separate row component (like PIRow, InvoiceRow), pass `getRowStyle` as a prop:

```javascript
// Parent component
<PIRow 
  pi={pi} 
  onEdit={handleEdit}
  getRowStyle={getRowStyle}  // Pass styling function
/>

// Row component
const PIRow = ({ pi, onEdit, getRowStyle }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <TableRow 
      sx={{
        ...getRowStyle(pi.id),  // Merge with existing styles
        ...(open ? { bgcolor: 'action.selected' } : {})
      }}
    >
      {/* Content */}
    </TableRow>
  )
}
```

## Implementation Status

### ✅ COMPLETED

1. **VendorsPage.jsx** - Full implementation with edit/delete operations
2. **ProductsPage.jsx** - Both products and medicines tabs
3. **CountriesPage.jsx** - Dialog-based editing
4. **PIPage.jsx** - Complex with PIRow component, approval workflow
5. **InvoicesPage.jsx** - Partial (imports and row component updated)

### ⏳ PENDING UPDATES

#### InvoicesPage.jsx (PARTIALLY DONE)

**Remaining Work:**
- Update `handleCreateSubmit` to use `addDataStably()`
- Update `handleEditSubmit` to use `updateDataStably()` and `markAsSaved()`
- Update `handleDeleteConfirm` to use `removeDataStably()`
- Add `openEditForm()` call in `handleEditClick()`

**Code Changes Needed:**

```javascript
// handleCreateSubmit (line ~476)
const response = await api.post('/api/invoice/create', payload)
if (response.data.success) {
  const newInvoice = response.data.data
  setInvoices(prevInvoices => addDataStably(prevInvoices, newInvoice, true))
  markAsSaved(newInvoice.id)
  setSuccessMessage('Invoice created successfully!')
  setCreateDialogOpen(false)
  // REMOVE: fetchInvoices()
}

// handleEditClick (line ~517)
const handleEditClick = (invoice) => {
  setEditingInvoice(invoice)
  openEditForm(invoice.id)  // ADD THIS
  setEditFormData({...})
  setEditDialogOpen(true)
}

// handleEditSubmit (line ~634)
const response = await api.put(`/api/invoice/${editingInvoice.id}`, payload)
if (response.data.success) {
  const updatedInvoice = response.data.data
  setInvoices(prevInvoices => updateDataStably(prevInvoices, updatedInvoice))
  markAsSaved(editingInvoice.id)
  setSuccessMessage('Invoice updated successfully!')
  handleEditClose()
  // REMOVE: fetchInvoices()
}

// handleDeleteConfirm (line ~681)
const response = await api.delete(`/api/invoice/${invoiceToDelete.id}`)
if (response.data.success) {
  setInvoices(prevInvoices => removeDataStably(prevInvoices, invoiceToDelete.id))
  setSuccessMessage('Invoice deleted successfully')
  setDeleteDialogOpen(false)
  setPiToDelete(null)
  // REMOVE: fetchInvoices()
}

// handleEditClose (add closeEditForm)
const handleEditClose = () => {
  setEditDialogOpen(false)
  setEditingInvoice(null)
  closeEditForm()  // ADD THIS
  // ... reset form data
}
```

#### POPage.jsx (NOT STARTED)

**Required Changes:**
1. Add `useStableRowEditing` import
2. Initialize hook in component
3. Update `handleSubmit` (create/update PO)
4. Update `handleDelete`
5. Update `handleOpenForm` and `handleCloseForm`
6. Apply `getRowStyle()` to TableRow
7. If using PORow component, pass `getRowStyle` as prop

#### EOPAPage.jsx (NOT STARTED)

**Required Changes:**
1. Add `useStableRowEditing` import
2. Initialize hook
3. Update EOPA creation handler
4. Update approval handler (preserve row order on approval)
5. Update delete handler
6. Apply row styling

#### MaterialPage.jsx (NOT STARTED)

**Required Changes:**
1. Add `useStableRowEditing` import
2. Initialize hook
3. Update material receipt handlers
4. Update material balance update handlers
5. Apply row styling

#### ConfigurationPage.jsx (NOT STARTED)

**Required Changes:**
1. Add `useStableRowEditing` import
2. Initialize hook
3. Update inline edit handlers
4. Apply row styling
5. Mark saved config rows with animation

## Testing Checklist

For each implemented page, verify:

- [ ] **Row Position**: Edit a row in the middle → Save → Row stays in same position
- [ ] **Edit Highlight**: Click Edit → Row gets blue left border and light background
- [ ] **Save Animation**: Save changes → Row briefly pulses with success color
- [ ] **Highlight Clear**: Close form → Editing highlight disappears
- [ ] **Create Behavior**: Add new item → Appears at top of list
- [ ] **Delete Behavior**: Delete row → Removed without affecting other rows' positions
- [ ] **Search Filter**: Edit filtered row → Position preserved in filtered view
- [ ] **Tab Switching**: (For ProductsPage, EOPAPage) → Edit state clears on tab change
- [ ] **Collapsible Rows**: (For PIPage, InvoicesPage) → Expand state independent of edit state

## Benefits

1. **Better UX**: Users can find edited rows immediately (no jumping)
2. **Visual Feedback**: Clear indication of which row is being edited
3. **Success Confirmation**: Brief animation confirms save without blocking UI
4. **Performance**: No full data refetch after edits (uses optimistic updates)
5. **Consistency**: Uniform behavior across all screens

## Common Pitfalls

### ❌ DON'T: Re-fetch data after every edit
```javascript
// BAD
await api.put(`/api/resource/${id}`, data)
fetchAllData()  // Causes row reordering, network overhead
```

### ✅ DO: Update array in-place
```javascript
// GOOD
const response = await api.put(`/api/resource/${id}`, data)
setData(prev => updateDataStably(prev, response.data.data))
```

### ❌ DON'T: Forget to clear edit state
```javascript
// BAD
const handleClose = () => {
  setFormOpen(false)
  // Missing: closeEditForm()
}
```

### ✅ DO: Always call closeEditForm()
```javascript
// GOOD
const handleClose = () => {
  setFormOpen(false)
  setEditingItem(null)
  closeEditForm()  // Clears highlighting
}
```

### ❌ DON'T: Use index as key
```javascript
// BAD - breaks row identity on updates
{items.map((item, idx) => (
  <TableRow key={idx}>
))}
```

### ✅ DO: Use stable ID as key
```javascript
// GOOD - preserves row identity
{items.map((item) => (
  <TableRow key={item.id} sx={getRowStyle(item.id)}>
))}
```

## Migration Instructions

To migrate an existing page:

1. **Add import** at top of file
2. **Initialize hook** in component
3. **Find handleSubmit** → Replace `fetchData()` with `updateDataStably()` or `addDataStably()`
4. **Find handleDelete** → Replace `fetchData()` with `removeDataStably()`
5. **Find handleOpenForm** → Add `openEditForm(id)` when editing
6. **Find handleCloseForm** → Add `closeEditForm()`
7. **Find TableRow** → Add `sx={getRowStyle(item.id)}`
8. **Test** all CRUD operations

## Advanced: Approval Workflows

For screens with approval workflows (PI, EOPA), update approval handler:

```javascript
const handleApprove = async (item) => {
  const response = await api.post(`/api/resource/${item.id}/approve`, { approved: true })
  if (response.data.success) {
    const updatedItem = response.data.data
    setItems(prevItems => updateDataStably(prevItems, updatedItem))
    markAsSaved(item.id)  // Show success animation
    // NO fetchItems() call needed
  }
}
```

## Support

For questions or issues:
- Review `frontend/src/hooks/useStableRowEditing.js` for hook implementation
- Check `frontend/src/pages/VendorsPage.jsx` for complete reference implementation
- See `frontend/src/pages/PIPage.jsx` for collapsible row example
- Consult this document for patterns and best practices
