import { useState, useEffect, useMemo } from 'react'
import {
  Typography,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material'
import { alpha, styled } from '@mui/material/styles'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import RuleIcon from '@mui/icons-material/Rule'
import IconButtonImport from '@mui/material/IconButton'
import { DataGrid, gridClasses, GridToolbarContainer, GridToolbar } from '@mui/x-data-grid'

import api from '../services/api'
import ERPPage from '../components/ERPPage'
import { useApiError } from '../hooks/useApiError'

/* ---------------------------
   Striped DataGrid (ERP style)
---------------------------- */
const ODD_OPACITY = 0.06
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.primary.main,
    fontWeight: 700,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
    },
  },
  '& .edited-row': {
    boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.08)}`,
  },
}))

const CustomToolbar = () => (
  <GridToolbarContainer sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <GridToolbar />
  </GridToolbarContainer>
)

function toTitleCase(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(/[\s_\-]+/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

const TermsConditionsPage = () => {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)

  // UI-only states (kept names but we no longer use manual column filters)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  // Dialog/form states (kept unchanged)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTerm, setEditingTerm] = useState(null)
  const [formData, setFormData] = useState({
    term_text: '',
    category: 'GENERAL',
    priority: 100,
    is_active: true,
  })
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const { error, handleApiError, clearError } = useApiError()

  // Dynamic categories derived from backend data, preserve original order
  const categories = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const t of terms) {
      if (t && t.category && !seen.has(t.category)) {
        seen.add(t.category)
        list.push(t.category)
      }
    }
    // fallback: if no categories returned yet, include defaults for UX
    if (list.length === 0) {
      return ['GENERAL', 'PAYMENT', 'DELIVERY', 'WARRANTY', 'QUALITY', 'LEGAL', 'OTHER']
    }
    return list
  }, [terms])

  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetchTerms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTerms = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/terms/')
      if (response.data.success) {
        setTerms(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  // Dialog handlers (business logic preserved)
  const handleOpenDialog = (term = null) => {
    if (term) {
      setEditingTerm(term)
      setFormData({
        term_text: term.term_text,
        category: term.category,
        priority: term.priority,
        is_active: term.is_active,
      })
    } else {
      setEditingTerm(null)
      setFormData({
        term_text: '',
        category: categories[0] || 'GENERAL',
        priority: 100,
        is_active: true,
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingTerm(null)
  }

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async () => {
    try {
      if (editingTerm) {
        const response = await api.put(`/api/terms/${editingTerm.id}`, formData)
        if (response.data.success) {
          showSnackbar('Term updated successfully', 'success')
          fetchTerms()
          handleCloseDialog()
        }
      } else {
        const response = await api.post('/api/terms/', formData)
        if (response.data.success) {
          showSnackbar('Term created successfully', 'success')
          fetchTerms()
          handleCloseDialog()
        }
      }
    } catch (err) {
      handleApiError(err)
      const errMsg = err.response?.data?.message || 'Failed to save term'
      showSnackbar(errMsg, 'error')
    }
  }

  const handleDelete = async (termId) => {
    if (!confirm('Are you sure you want to delete this term? This cannot be undone if the term is not assigned to any vendors.')) {
      return
    }

    try {
      const response = await api.delete(`/api/terms/${termId}`)
      if (response.data.success) {
        showSnackbar('Term deleted successfully', 'success')
        fetchTerms()
      }
    } catch (err) {
      handleApiError(err)
      const errMsg = err.response?.data?.message || 'Failed to delete term'
      showSnackbar(errMsg, 'error')
    }
  }

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Utility to map category -> displayed list of terms for that tab
  const termsByCategory = useMemo(() => {
    const map = {}
    for (const cat of categories) map[cat] = []
    for (const t of terms) {
      if (!t) continue
      if (!map[t.category]) map[t.category] = []
      map[t.category].push(t)
    }
    return map
  }, [terms, categories])

  // DataGrid columns (safe access; business logic preserved)
  const columns = [
    {
      field: 'priority',
      headerName: 'Priority',
      flex: 0.6,
      minWidth: 110,
      renderCell: (params) => {
        const row = params?.row ?? {}
        const p = row.priority ?? ''
        const color = p <= 50 ? 'error' : p <= 100 ? 'warning' : 'default'
        return <Chip label={p} size="small" color={color} />
      },
    },
    {
      field: 'term_text',
      headerName: 'Term Text',
      flex: 3,
      minWidth: 360,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textDecoration: row.is_active ? 'none' : 'line-through',
            }}
          >
            {row.term_text}
          </Typography>
        )
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return (
          <Chip
            label={row.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={row.is_active ? 'success' : 'default'}
          />
        )
      },
      sortable: true,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => {
        const row = params?.row ?? {}
        return row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params?.row ?? {}
        const id = row.id ?? params?.id
        return (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <IconButtonImport size="small" color="primary" onClick={() => handleOpenDialog(row)}>
              <EditIcon fontSize="small" />
            </IconButtonImport>
            <IconButtonImport size="small" color="error" onClick={() => handleDelete(id)}>
              <DeleteIcon fontSize="small" />
            </IconButtonImport>
          </Box>
        )
      },
    },
  ]

  return (
    <ERPPage
      title="Terms & Conditions Master Library"
      icon={<RuleIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Add New Term
        </Button>
      }
    >
      {/* Top controls: show active toggle */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
          }
          label="Active Only"
        />
      </Box>

      {/* Tabs styled like ConfigurationPage (IDENTICAL style) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="terms categories"
          sx={{
            '& .MuiTab-root': { textTransform: 'none', minHeight: 40, px: 2 },
            '& .Mui-selected': { fontWeight: 700 },
          }}
        >
          {categories.map((cat, idx) => (
            <Tab key={cat} label={toTitleCase(cat)} />
          ))}
        </Tabs>
      </Box>

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* DataGrid for the active category */}
          <Box sx={{ width: '100%' }}>
            <StripedDataGrid
              autoHeight
              rows={(termsByCategory[categories[activeTab]] || []).filter((t) =>
                showActiveOnly ? t.is_active : true
              )}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              slots={{ toolbar: CustomToolbar }}
              density="comfortable"
              getRowClassName={(params) => {
                const base = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                return base
              }}
            />
          </Box>
        </Box>
      )}

      {/* Dialog: Add / Edit Term */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              name="term_text"
              label="Term Text"
              value={formData.term_text}
              onChange={handleChange}
              multiline
              rows={4}
              required
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select name="category" value={formData.category} onChange={handleChange} label="Category">
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {toTitleCase(cat)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="priority"
              label="Priority (1-999, lower = higher priority)"
              type="number"
              value={formData.priority}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1, max: 999 }}
              size="small"
            />
            <FormControlLabel
              control={<Switch name="is_active" checked={formData.is_active} onChange={handleChange} />}
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.term_text || !formData.category}>
            {editingTerm ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* API error snackbar (from useApiError) */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={clearError} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </ERPPage>
  )
}

export default TermsConditionsPage
