import { useState, useEffect } from 'react'
import {
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  InputAdornment,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import { alpha, styled } from '@mui/material/styles'
import {
  DataGrid,
  GridToolbar,
  GridToolbarContainer,
  gridClasses
} from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import PublicIcon from '@mui/icons-material/Public'
import ERPPage from '../components/ERPPage'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'

const ODD_OPACITY = 0.06
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    fontWeight: 700,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
      '@media (hover: none)': { backgroundColor: 'transparent' },
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
        '@media (hover: none)': {
          backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity),
        },
      },
    },
  },
  // edited-row visual (we'll add a class 'edited-row' in getRowClassName when necessary)
  '& .edited-row': {
    boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.04)}`,
  },
}))

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 1, display: 'flex', justifyContent: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <GridToolbar />
    </GridToolbarContainer>
  );
}

function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <Typography variant="h6" color="text.secondary">No Countries Found</Typography>
      <Typography variant="body2" color="text.secondary">Use the search or add a new country.</Typography>
    </Box>
  );
}

const CountriesPage = () => {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState(null)
  const [formData, setFormData] = useState({
    country_code: '',
    country_name: '',
    language: '',
    currency: '',
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()
  const {
    openEditForm,
    closeEditForm,
    markAsSaved,
    updateDataStably,
    addDataStably,
    removeDataStably,
    getRowStyle,
  } = useStableRowEditing()

  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/countries/')
      if (response.data.success) {
        setCountries(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (country = null) => {
    if (country) {
      setEditingCountry(country)
      setFormData({
        country_code: country.country_code || '',
        country_name: country.country_name || '',
        language: country.language || '',
        currency: country.currency || '',
        is_active: country.is_active !== undefined ? country.is_active : true,
      })
      openEditForm(country.id)
    } else {
      setEditingCountry(null)
      setFormData({
        country_code: '',
        country_name: '',
        language: '',
        currency: '',
        is_active: true,
      })
    }
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingCountry(null)
    setFormData({
      country_code: '',
      country_name: '',
      language: '',
      currency: '',
      is_active: true,
    })
    closeEditForm()
  }

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      if (editingCountry) {
        const response = await api.put(`/api/countries/${editingCountry.id}`, formData)
        if (response.data.success) {
          const updatedCountry = response.data.data
          setCountries(prevCountries => updateDataStably(prevCountries, updatedCountry))
          setSuccessMessage('Country updated successfully')
          markAsSaved(editingCountry.id)
        }
      } else {
        const response = await api.post('/api/countries/', formData)
        if (response.data.success) {
          const newCountry = response.data.data
          setCountries(prevCountries => addDataStably(prevCountries, newCountry, true))
          setSuccessMessage('Country created successfully')
          markAsSaved(newCountry.id)
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
    if (!window.confirm('Are you sure you want to delete this country? This will fail if there are associated vendors or PIs.')) {
      return
    }

    try {
      const response = await api.delete(`/api/countries/${id}`)
      if (response.data.success) {
        setCountries(prevCountries => removeDataStably(prevCountries, id))
        setSuccessMessage('Country deleted successfully')
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const filteredCountries = countries.filter(country => {
    const query = searchQuery.toLowerCase()
    return (
      country.country_name?.toLowerCase().includes(query) ||
      country.country_code?.toLowerCase().includes(query) ||
      country.language?.toLowerCase().includes(query) ||
      country.currency?.toLowerCase().includes(query)
    )
  })

  // DataGrid columns - keep business logic intact (only UI renderers here)
  const columns = [
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 100,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      flex: 0.8,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenForm(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'country_code',
      headerName: 'Country Code',
      minWidth: 120,
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
      ),
    },
    {
      field: 'country_name',
      headerName: 'Country Name',
      minWidth: 180,
      flex: 1.5,
      renderCell: (params) => (
        <Typography variant="body2">{params.value}</Typography>
      ),
    },
    {
      field: 'language',
      headerName: 'Language',
      minWidth: 140,
      flex: 1,
    },
    {
      field: 'currency',
      headerName: 'Currency',
      minWidth: 120,
      flex: 1,
      renderCell: (params) => params.value || '-',
    },
    {
      field: 'is_active',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.9,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
  ]

  return (
    <ERPPage
      title="Country Master"
      icon={<PublicIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Country
        </Button>
      }
    >
      {/* Search bar (kept, placed directly under ERPPage) */}
      <TextField
        fullWidth
        placeholder="Search by Country Name, Code, Language, or Currency..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Main DataGrid area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredCountries.length === 0 ? (
        <Alert severity="info">
          {countries.length === 0 
            ? 'No countries found. Click "Add Country" to create one.' 
            : 'No countries match your search criteria.'}
        </Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <StripedDataGrid
            autoHeight
            loading={loading}
            rows={filteredCountries}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            slots={{
              toolbar: CustomToolbar,
              noRowsOverlay: CustomNoRowsOverlay,
            }}
            density="comfortable"
            // Add striped rows + "edited-row" class if getRowStyle returns a truthy style object for that id
            getRowClassName={(params) => {
              const base = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
              let edited = ''
              try {
                const styleObj = getRowStyle && typeof getRowStyle === 'function' ? getRowStyle(params.id) : null
                // If the hook returns an object with any keys, treat the row as edited / special
                if (styleObj && Object.keys(styleObj).length > 0) {
                  edited = ' edited-row'
                }
              } catch (e) {
                // If getRowStyle throws, ignore and proceed
              }
              return `${base}${edited}`
            }}
          />
        </Box>
      )}

      {/* ALL dialogs and snackbars remain unchanged and positioned under ERPPage */}
      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCountry ? 'Edit Country' : 'Add New Country'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              name="country_code"
              label="Country Code"
              value={formData.country_code}
              onChange={handleChange}
              required
              placeholder="e.g., USA, GBR, IND"
              helperText="ISO 3166-1 alpha-3 code (2-3 characters)"
              inputProps={{ maxLength: 3 }}
            />
            <TextField
              name="country_name"
              label="Country Name"
              value={formData.country_name}
              onChange={handleChange}
              required
            />
            <TextField
              name="language"
              label="Primary Language"
              value={formData.language}
              onChange={handleChange}
              required
              helperText="Language for printing materials"
            />
            <TextField
              name="currency"
              label="Currency Code"
              value={formData.currency}
              onChange={handleChange}
              placeholder="e.g., USD, EUR, INR"
              helperText="ISO 4217 currency code (optional)"
              inputProps={{ maxLength: 3 }}
            />
            <FormControlLabel
              control={
                <Switch
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.country_code || !formData.country_name || !formData.language}
          >
            {submitting ? <CircularProgress size={24} /> : (editingCountry ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </ERPPage>
  )
}

export default CountriesPage
