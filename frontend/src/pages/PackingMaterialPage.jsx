import { useState, useEffect, useMemo } from 'react'
import {
  Typography,
  Button,
  Box,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material'
import { DataGrid, GridToolbar, GridToolbarContainer, gridClasses } from '@mui/x-data-grid'
import { alpha, styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import SearchIcon from '@mui/icons-material/Search'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const ODD_OPACITY = 0.2;
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: 'background.default',
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
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
}))

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 1, display: 'flex', justifyContent: 'flex-start', borderBottom: '1px solid #e0e0e0' }}>
      <GridToolbar />
    </GridToolbarContainer>
  )
}

function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" color="text.secondary">No Packing Materials Found</Typography>
      <Typography variant="body2" color="text.secondary">Try adjusting your search terms.</Typography>
    </Box>
  )
}

const PackingMaterialPage = () => {
  const [packingMaterials, setPackingMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPM, setEditingPM] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  const [formData, setFormData] = useState({
    pm_name: '',
    description: '',
    pm_type: '',
    language: 'EN',
    artwork_version: 'v1.0',
    artwork_file_url: '',
    artwork_approval_ref: '',
    gsm: '',
    ply: '',
    dimensions: '',
    color_spec: '',
    unit_of_measure: 'PCS',
    hsn_code: '',
    gst_rate: '',
    default_vendor_id: '',
    printing_instructions: '',
    die_cut_info: '',
    plate_charges: '',
    storage_conditions: '',
    shelf_life_months: '',
    is_active: true,
  })

  useEffect(() => {
    fetchPackingMaterials()
    fetchVendors()
  }, [])

  const fetchPackingMaterials = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/packing-materials/')
      if (response.data.success) {
        setPackingMaterials(response.data.data.map(pm => ({ ...pm, id: pm.id })))
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        setVendors(response.data.data.filter(v => v.vendor_type === 'PM'))
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const handleOpenForm = (pm = null) => {
    if (pm) {
      setEditingPM(pm)
      setFormData({
        pm_code: pm.pm_code || '',
        pm_name: pm.pm_name || '',
        description: pm.description || '',
        pm_type: pm.pm_type || '',
        language: pm.language || 'EN',
        artwork_version: pm.artwork_version || 'v1.0',
        artwork_file_url: pm.artwork_file_url || '',
        artwork_approval_ref: pm.artwork_approval_ref || '',
        gsm: pm.gsm || '',
        ply: pm.ply || '',
        dimensions: pm.dimensions || '',
        color_spec: pm.color_spec || '',
        unit_of_measure: pm.unit_of_measure || 'PCS',
        hsn_code: pm.hsn_code || '',
        gst_rate: pm.gst_rate || '',
        default_vendor_id: pm.default_vendor_id || '',
        printing_instructions: pm.printing_instructions || '',
        die_cut_info: pm.die_cut_info || '',
        plate_charges: pm.plate_charges || '',
        storage_conditions: pm.storage_conditions || '',
        shelf_life_months: pm.shelf_life_months || '',
        is_active: pm.is_active !== undefined ? pm.is_active : true,
      })
    } else {
      setEditingPM(null)
      setFormData({
        pm_name: '',
        description: '',
        pm_type: '',
        language: 'EN',
        artwork_version: 'v1.0',
        artwork_file_url: '',
        artwork_approval_ref: '',
        gsm: '',
        ply: '',
        dimensions: '',
        color_spec: '',
        unit_of_measure: 'PCS',
        hsn_code: '',
        gst_rate: '',
        default_vendor_id: '',
        printing_instructions: '',
        die_cut_info: '',
        plate_charges: '',
        storage_conditions: '',
        shelf_life_months: '',
        is_active: true,
      })
    }
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingPM(null)
  }

  const handleChange = (e) => {
    const { name, value, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value
    }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      // Convert empty strings to null for numeric fields
      const payload = {
        ...formData,
        gsm: formData.gsm ? parseFloat(formData.gsm) : null,
        ply: formData.ply ? parseInt(formData.ply) : null,
        gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : null,
        plate_charges: formData.plate_charges ? parseFloat(formData.plate_charges) : null,
        shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
        default_vendor_id: formData.default_vendor_id || null,
      }

      let response
      if (editingPM) {
        response = await api.put(`/api/packing-materials/${editingPM.id}`, payload)
      } else {
        response = await api.post('/api/packing-materials/', payload)
      }

      if (response.data.success) {
        setSuccessMessage(editingPM ? 'Packing material updated successfully' : 'Packing material created successfully')
        handleCloseForm()
        fetchPackingMaterials()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this packing material?')) return

    try {
      const response = await api.delete(`/api/packing-materials/${id}`)
      if (response.data.success) {
        setSuccessMessage('Packing material deleted successfully')
        fetchPackingMaterials()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const filteredPackingMaterials = useMemo(() => {
    if (!searchQuery) return packingMaterials
    const query = searchQuery.toLowerCase()
    return packingMaterials.filter(pm =>
      pm.pm_code?.toLowerCase().includes(query) ||
      pm.pm_name?.toLowerCase().includes(query) ||
      pm.pm_type?.toLowerCase().includes(query)
    )
  }, [packingMaterials, searchQuery])

  const pmTypeOptions = ['Label', 'Carton', 'Insert', 'Blister', 'Bottle', 'Cap', 'Seal', 'Wrapper', 'Sachet', 'Other']
  const languageOptions = ['EN', 'FR', 'AR', 'SP', 'HI', 'DE', 'IT', 'PT']
  const uomOptions = ['PCS', 'SHEETS', 'ROLLS', 'BOXES', 'UNIT']

  // DataGrid columns
  const COLUMNS = [
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
      field: 'pm_code',
      headerName: 'PM Code',
      minWidth: 120,
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
      ),
    },
    {
      field: 'pm_name',
      headerName: 'PM Name',
      minWidth: 180,
      flex: 1.5,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.description && (
            <Typography variant="caption" color="text.secondary" display="block">
              {params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'pm_type',
      headerName: 'Type',
      minWidth: 120,
      flex: 1,
      renderCell: (params) => (
        params.value ? <Chip label={params.value} size="small" color="info" /> : '-'
      ),
    },
    {
      field: 'language',
      headerName: 'Lang',
      minWidth: 80,
      flex: 0.8,
      renderCell: (params) => (
        params.value ? <Chip label={params.value} size="small" color="primary" /> : '-'
      ),
    },
    {
      field: 'artwork_version',
      headerName: 'Artwork Ver',
      minWidth: 100,
      flex: 1,
      renderCell: (params) => (
        <Typography variant="caption">{params.value || 'v1.0'}</Typography>
      ),
    },
    {
      field: 'specs',
      headerName: 'Specs',
      minWidth: 160,
      flex: 1.2,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const pm = params.row
        return (
          <Box>
            {pm.gsm && <Typography variant="caption" display="block">GSM: {pm.gsm}</Typography>}
            {pm.ply && <Typography variant="caption" display="block">Ply: {pm.ply}</Typography>}
            {pm.dimensions && <Typography variant="caption" display="block">{pm.dimensions}</Typography>}
          </Box>
        )
      },
    },
    {
      field: 'unit_of_measure',
      headerName: 'UOM',
      minWidth: 80,
      flex: 0.8,
    },
    {
      field: 'default_vendor',
      headerName: 'Default Vendor',
      minWidth: 160,
      flex: 1.2,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const vendor = vendors.find(v => v.id === params.row.default_vendor_id)
        return vendor ? (
          <Typography variant="body2">
            {vendor.vendor_name}
            <br />
            {vendor.vendor_code}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">Not assigned</Typography>
        )
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      minWidth: 100,
      flex: 1,
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
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Inventory2Icon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">Packing Material Master</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Packing Material
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Global Search (PM code, name, type, etc.)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ minHeight: 'calc(100vh - 200px)', width: '100%' }}>
        <StripedDataGrid
          loading={loading}
          rows={filteredPackingMaterials}
          columns={COLUMNS}
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
          getRowClassName={(params) =>
            params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
          }
        />
      </Box>

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPM ? 'Edit Packing Material' : 'Add Packing Material'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Basic Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PM Code"
                name="pm_code"
                value={editingPM ? formData.pm_code : '(Auto-generated)'}
                disabled
                helperText={editingPM ? '' : 'Code will be auto-generated (e.g., PM-0001)'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PM Name *"
                name="pm_name"
                value={formData.pm_name}
                onChange={handleChange}
                required
                placeholder="e.g., Product Label English"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Detailed description..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>PM Type</InputLabel>
                <Select
                  name="pm_type"
                  value={formData.pm_type}
                  onChange={handleChange}
                  label="PM Type"
                >
                  <MenuItem value="">None</MenuItem>
                  {pmTypeOptions.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Unit of Measure *</InputLabel>
                <Select
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  label="Unit of Measure *"
                >
                  {uomOptions.map(uom => (
                    <MenuItem key={uom} value={uom}>{uom}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Artwork Info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Artwork Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  label="Language"
                >
                  {languageOptions.map(lang => (
                    <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Artwork Version"
                name="artwork_version"
                value={formData.artwork_version}
                onChange={handleChange}
                placeholder="e.g., v1.0, v2.0"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Artwork File URL"
                name="artwork_file_url"
                value={formData.artwork_file_url}
                onChange={handleChange}
                placeholder="URL to artwork file"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Artwork Approval Ref"
                name="artwork_approval_ref"
                value={formData.artwork_approval_ref}
                onChange={handleChange}
                placeholder="e.g., ART-2024-001"
              />
            </Grid>

            {/* Specifications */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Technical Specifications</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="GSM"
                name="gsm"
                value={formData.gsm}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                placeholder="e.g., 80"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Ply"
                name="ply"
                value={formData.ply}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
                placeholder="e.g., 3"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g., 10x5x2 cm"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Color Specifications"
                name="color_spec"
                value={formData.color_spec}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Color details, Pantone codes, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Printing Instructions"
                name="printing_instructions"
                value={formData.printing_instructions}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Special printing instructions..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Die-Cut Info"
                name="die_cut_info"
                value={formData.die_cut_info}
                onChange={handleChange}
                placeholder="Die-cutting specifications"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plate Charges"
                name="plate_charges"
                value={formData.plate_charges}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="e.g., 5000"
              />
            </Grid>

            {/* Tax & Vendor */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Tax & Vendor</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HSN Code"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleChange}
                placeholder="e.g., 4911"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GST Rate %"
                name="gst_rate"
                value={formData.gst_rate}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                placeholder="e.g., 12"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Default Vendor</InputLabel>
                <Select
                  name="default_vendor_id"
                  value={formData.default_vendor_id}
                  onChange={handleChange}
                  label="Default Vendor"
                >
                  <MenuItem value="">None</MenuItem>
                  {vendors.map(vendor => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name} ({vendor.vendor_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Shelf Life (Months)"
                name="shelf_life_months"
                value={formData.shelf_life_months}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
                placeholder="e.g., 24"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Storage Conditions"
                name="storage_conditions"
                value={formData.storage_conditions}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Storage requirements..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_active}
                    onChange={handleChange}
                    name="is_active"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.pm_name}
          >
            {submitting ? <CircularProgress size={24} /> : (editingPM ? 'Update' : 'Create')}
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
    </Box>
  )
}

export default PackingMaterialPage