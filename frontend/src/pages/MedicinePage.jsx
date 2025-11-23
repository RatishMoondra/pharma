import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import IconButton from '@mui/material/IconButton'
import { alpha, styled, useTheme } from '@mui/material/styles'
import {
  DataGrid,
  gridClasses,
  GridToolbar,
  GridToolbarContainer,
} from '@mui/x-data-grid'

import ERPPage from '../components/ERPPage'
import MedicineForm from '../components/MedicineForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'


/* -------------------------------------------
   ERP Striped DataGrid
-------------------------------------------- */
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
  <GridToolbarContainer sx={{ borderBottom: '1px solid #e0e0e0' }}>
    <GridToolbar />
  </GridToolbarContainer>
)



/* -------------------------------------------
         MAIN COMPONENT
-------------------------------------------- */

const MedicineMasterPage = () => {
  const theme = useTheme()

  const [products, setProducts] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { error, handleApiError, clearError } = useApiError()
  const {
    openEditForm,
    closeEditForm,
    updateDataStably,
    addDataStably,
    removeDataStably,
    markAsSaved,
    getRowStyle,
  } = useStableRowEditing()


  /* -------------------------------------------
     Fetch Data
  -------------------------------------------- */
  const fetchData = async () => {
    try {
      setLoading(true)
      const [pRes, mRes] = await Promise.all([
        api.get('/api/products/'),
        api.get('/api/products/medicines')
      ])

      if (pRes.data.success) setProducts(pRes.data.data)
      if (mRes.data.success) setMedicines(mRes.data.data)

    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])


  /* -------------------------------------------
     Form Handling
  -------------------------------------------- */
  const handleOpenForm = (item = null) => {
    setEditingItem(item)
    if (item) openEditForm(item.id)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setEditingItem(null)
    closeEditForm()
    setFormOpen(false)
  }

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true)
      let res = null

      if (editingItem) {
        res = await api.put(`/api/products/medicines/${editingItem.id}`, data)
        if (res.data.success) {
          const updated = res.data.data
          setMedicines(prev => updateDataStably(prev, updated))
          markAsSaved(editingItem.id)
          setSuccessMessage('Medicine updated successfully')
        }
      } else {
        res = await api.post('/api/products/medicines', data)
        if (res.data.success) {
          const created = res.data.data
          setMedicines(prev => addDataStably(prev, created, true))
          markAsSaved(created.id)
          setSuccessMessage('Medicine created successfully')
        }
      }

      handleCloseForm()
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return
    try {
      const res = await api.delete(`/api/products/medicines/${id}`)
      if (res.data.success) {
        setMedicines(prev => removeDataStably(prev, id))
        setSuccessMessage('Medicine deleted successfully')
      }
    } catch (err) {
      handleApiError(err)
    }
  }


  /* -------------------------------------------
     Search Filter
  -------------------------------------------- */
  const filteredMedicines = medicines.filter(m => {
    const q = searchQuery.toLowerCase()
    return (
      m.medicine_name?.toLowerCase().includes(q) ||
      m.medicine_code?.toLowerCase().includes(q) ||
      m.dosage_form?.toLowerCase().includes(q) ||
      m.strength?.toLowerCase()?.includes(q) ||
      m.manufacturer_vendor?.vendor_name?.toLowerCase().includes(q)
    )
  })


  /* -------------------------------------------
     DataGrid Columns (with SAFE valueGetters and renderers)
  -------------------------------------------- */

  const columns = [
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        // SAFE access: params.row may be undefined during virtualization
        const row = params?.row ?? {}
        const id = row.id ?? params?.id
        return (
          <Box>
            <IconButton size="small" color="primary" onClick={() => handleOpenForm(row || medById(id))}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleDelete(id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )
      }
    },

    {
      field: 'medicine_name',
      headerName: 'Name',
      flex: 1.6,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{row.medicine_name}</Typography>
            {row.composition && (
              <Typography variant="caption" color="text.secondary">
                {row.composition}
              </Typography>
            )}
          </Box>
        )
      }
    },

    { field: 'medicine_code', headerName: 'Code', flex: 0.8 },

    { field: 'hsn_code', headerName: 'HSN', flex: 0.8 },

    {
      field: 'dosage_form',
      headerName: 'Dosage',
      flex: 1,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return row.dosage_form ? <Chip label={row.dosage_form} size="small" color="info" /> : '-'
      }
    },

    { field: 'strength', headerName: 'Strength', flex: 0.8 },

    { field: 'pack_size', headerName: 'Pack Size', flex: 1 },

    {
      field: 'units',
      headerName: 'Units',
      flex: 1,
      valueGetter: (params) => {
        const m = params?.row ?? {}
        const pu = m.primary_unit
        const su = m.secondary_unit
        const cf = m.conversion_factor

        if (pu && su && cf) return `${cf} ${pu}/${su}`
        return pu || '-'
      }
    },

    {
      field: 'manufacturer_vendor',
      headerName: 'Manufacturer',
      flex: 1.2,
      valueGetter: (params) => {
        const row = params?.row ?? {}
        return row.manufacturer_vendor?.vendor_name || '-'
      }
    },
  ]


  /* -------------------------------------------
     helper: fallback find by id (used only for safe openForm fallback)
     NOTE: this only searches current medicines array and is UI-only (no logic change)
  -------------------------------------------- */
  const medById = (id) => medicines.find(m => m.id === id) ?? { id }


  /* -------------------------------------------
     RENDER
  -------------------------------------------- */

  return (
    <ERPPage
      title="Medicine Master"
      icon={<AddIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
          Add Medicine
        </Button>
      }
    >
      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search Medicine Name, Code, Dosage Form, Strength, Vendor…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
      />

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {products.map(prod => {
            const meds = filteredMedicines.filter(m => m.product_id === prod.id)
            if (meds.length === 0 && searchQuery) return null

            return (
              <Accordion
                key={prod.id}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: 2,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.grey[100],
                    px: 2,
                    py: 1.5,
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {prod.product_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Code: {prod.product_code} | HSN: {prod.hsn_code || 'N/A'} | UOM: {prod.unit_of_measure}
                    </Typography>
                  </Box>

                  <Chip
                    label={`${meds.length} item${meds.length !== 1 ? 's' : ''}`}
                    color="primary"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  {meds.length === 0 ? (
                    <Alert severity="info" sx={{ m: 2 }}>No medicines under this product.</Alert>
                  ) : (
                    <Box sx={{ width: '100%', p: 2 }}>
                      <StripedDataGrid
                        autoHeight
                        rows={meds}
                        columns={columns}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                          pagination: { paginationModel: { pageSize: 10 } }
                        }}
                        slots={{ toolbar: CustomToolbar }}
                        getRowClassName={(params) => {
                          const base = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                          const styleObj = getRowStyle(params.id) || {}
                          return Object.keys(styleObj).length > 0 ? `${base} edited-row` : base
                        }}
                      />
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      )}

      {/* Form */}
      <MedicineForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        medicine={editingItem}
        isLoading={submitting}
      />

      {/* Success */}
      <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage('')}>
        <Alert severity="success">{successMessage}</Alert>
      </Snackbar>

      {/* Error */}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </ERPPage>
  )
}

export default MedicineMasterPage
