# Visual Workflow Viewer - Quick Reference

## ✅ Feature Completed

A comprehensive visual relationship viewer showing the complete PI → EOPA → PO → Invoice workflow in an interactive Material-UI Timeline.

---

## Quick Access

### User Access
1. Go to **Proforma Invoices** page (`/pi`)
2. Click **Timeline icon** (purple) on any PI row
3. View interactive workflow at `/pi/{id}/visual`

### Developer URLs
- **Visual Page**: `http://localhost:5173/pi/1/visual`
- **API Endpoints**:
  - `GET /api/eopa/by-pi/{pi_id}` - Get EOPAs for PI
  - `GET /api/po/by-eopa/{eopa_id}` - Get POs for EOPA
  - `GET /api/invoice/po/{po_id}` - Get Invoices for PO

---

## Key Files

### Backend
| File | Purpose | Lines Added |
|------|---------|-------------|
| `backend/app/routers/eopa.py` | EOPA relationship endpoint | 27 |
| `backend/app/routers/po.py` | PO relationship endpoint | 30 |

### Frontend
| File | Purpose | Lines |
|------|---------|-------|
| `frontend/src/components/PIWorkflowVisualizer.jsx` | Core timeline component | 400+ |
| `frontend/src/pages/PIWorkflowVisualPage.jsx` | Page wrapper with context | 200+ |
| `frontend/src/pages/PIPage.jsx` | Added timeline button | Modified |
| `frontend/src/services/api.js` | Added 3 fetch functions | 3 lines |
| `frontend/src/App.jsx` | Added route | Modified |

---

## Timeline Structure

```
Step 1        PI/24-25/0001 (blue)
  └─ Step 2.1      EOPA/24-25/0001 (pink)
      ├─ Step 3.1.1    PO/FG/24-25/0001 (light blue)
      │   ├─ Step 4.1.1.1  INV/24-25/0001 (green)
      │   └─ Step 4.1.1.2  INV/24-25/0002 (green)
      └─ Step 3.1.2    PO/RM/24-25/0001 (light blue)
          └─ Step 4.1.2.1  INV/24-25/0003 (green)
```

**Colors**:
- PI: Primary (blue)
- EOPA: Secondary (pink)
- PO: Info (light blue)
- Invoice: Success (green)

**Status Colors**:
- APPROVED/CLOSED: Green
- REJECTED/CANCELLED: Red
- PARTIAL: Orange
- PENDING/OPEN: Blue

---

## Component API

### DocumentNode Props

```jsx
<DocumentNode
  icon={<Description />}          // Material-UI icon
  title="Proforma Invoice (PI)"   // Document type label
  number="PI/24-25/0001"           // Document number
  date="2025-01-15"                // ISO date string
  status="APPROVED"                // Status (optional)
  vendor="ABC Pharmaceuticals"     // Vendor name (optional)
  amount={125000.50}               // Amount (optional)
  onClick={() => navigate('/pi/1')} // Click handler
  color="primary"                  // MUI color
>
  {/* Expandable details */}
  <Typography>Item count: 5</Typography>
</DocumentNode>
```

### PIWorkflowVisualizer Props

```jsx
<PIWorkflowVisualizer
  piId={1}                 // PI ID (required)
  piData={piObject}        // PI details (optional)
/>
```

---

## Data Flow

```
User clicks Timeline icon
  ↓
Navigate to /pi/{id}/visual
  ↓
Fetch PI data
  ↓
Fetch EOPAs for PI
  ↓
For each EOPA, fetch POs
  ↓
For each PO, fetch Invoices
  ↓
Render nested Timeline
```

**Total API Calls**: 1 (PI) + 1 (EOPAs) + N (POs) + M (Invoices)
- Example: 1 PI, 2 EOPAs, 6 POs, 12 Invoices = **21 total calls**
- Load time: ~2-5 seconds

---

## Testing Commands

### Backend
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/api/eopa/by-pi/1
curl http://localhost:8000/api/po/by-eopa/1
curl http://localhost:8000/api/invoice/po/1
```

### Frontend
```bash
# Start frontend
cd frontend
npm run dev

# Access visual page
http://localhost:5173/pi/1/visual
```

---

## Common Workflows

### Adding New Document Type

1. **Create backend endpoint** (follow pattern in `eopa.py` line 297-324)
2. **Add service function** in `api.js`
3. **Update PIWorkflowVisualizer state** (new grouped object)
4. **Add fetch logic** in `fetchWorkflowData()`
5. **Add TimelineItem** with new DocumentNode

### Customizing DocumentNode

**Add new field**:
```jsx
<DocumentNode customField="value">
  <Typography>Custom: {customField}</Typography>
</DocumentNode>
```

**Change status colors**:
```javascript
const getStatusColor = (status) => {
  if (statusLower === 'new_status') return 'primary'
  // ... existing logic
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Timeline connectors extend too far | Add conditional: `{hasNextItem && <TimelineConnector />}` |
| Nested data not displaying | Verify grouping keys: `posGrouped[eopa.id]` matches `eopa.id` |
| Click doesn't navigate | Always pass `onClick` prop to DocumentNode |
| Status colors not working | Lowercase status string: `status.toLowerCase()` |
| Loading spinner stuck | Use `finally` block: `finally { setLoading(false) }` |

---

## Future Enhancements

- [ ] Export to PDF functionality
- [ ] Add Dispatch Advice nodes
- [ ] Add GRN (Goods Receipt Note) nodes
- [ ] Collapsible branches
- [ ] Zoom/pan controls
- [ ] Search/filter by document number or status
- [ ] Real-time updates via WebSocket
- [ ] Horizontal timeline option
- [ ] Document preview modal
- [ ] Analytics panel (total value, lead time)

---

## Related Documentation

- Full Implementation Guide: `docs/VISUAL_WORKFLOW_IMPLEMENTATION.md`
- Database Schema: `backend/database/pharma_schema.sql`
- Copilot Instructions: `.github/copilot-instructions.md`
- Stable Row Editing: `docs/STABLE_ROW_EDITING_IMPLEMENTATION.md`

---

## Status: ✅ PRODUCTION READY

**Last Updated**: 2025-01-15
**Version**: 1.0.0
