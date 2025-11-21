import { useState, useEffect, useMemo } from 'react'
import {
  Typography,
  Button,
  Box,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
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
} from '@mui/material'

import {
  DataGrid,
  GridToolbar,
  GridToolbarContainer,
  gridClasses
} from '@mui/x-data-grid'
import { alpha, styled } from '@mui/material/styles' // 🟢 ADDED alpha and styled import

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ScienceIcon from '@mui/icons-material/Science'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';

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
    backgroundColor: '#f5f5f5',
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderBottom: '2px solid #ccc',
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
}));

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 1, display: 'flex', justifyContent: 'flex-start', borderBottom: '1px solid #e0e0e0' }}>
      <GridToolbar />
    </GridToolbarContainer>
  );
}

function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" color="text.secondary">No Raw Materials Found</Typography>
      <Typography variant="body2" color="text.secondary">Try adjusting your search terms.</Typography>
    </Box>
  );
}


const RawMaterialPage = () => {
  const [rawMaterials, setRawMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRM, setEditingRM] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  const [formData, setFormData] = useState({
    rm_name: '',
    description: '',
    category: '',
    unit_of_measure: 'KG',
    standard_purity: '',
    hsn_code: '',
    gst_rate: '',
    default_vendor_id: '',
    cas_number: '',
    storage_conditions: '',
    shelf_life_months: '',
    is_active: true,
  })

  useEffect(() => {
    fetchRawMaterials()
    fetchVendors()
  }, [])

  const fetchRawMaterials = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/raw-materials/')
      if (response.data.success) {
        setRawMaterials(response.data.data)
        console.log('Fetched raw materials:', response.data.data)
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
        // Filter only RM vendors
        setVendors(response.data.data.filter(v => v.vendor_type === 'RM'))
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const handleOpenForm = (rm = null) => {
    if (rm) {
      setEditingRM(rm)
      setFormData({
        rm_code: rm.rm_code || '',
        rm_name: rm.rm_name || '',
        description: rm.description || '',
        category: rm.category || '',
        unit_of_measure: rm.unit_of_measure || 'KG',
        standard_purity: rm.standard_purity === null || rm.standard_purity === undefined ? '' : String(rm.standard_purity),
        hsn_code: rm.hsn_code || '',
        gst_rate: rm.gst_rate === null || rm.gst_rate === undefined ? '' : String(rm.gst_rate),
        default_vendor_id: rm.default_vendor_id || '',
        cas_number: rm.cas_number || '',
        storage_conditions: rm.storage_conditions || '',
        shelf_life_months: rm.shelf_life_months === null || rm.shelf_life_months === undefined ? '' : String(rm.shelf_life_months),
        is_active: rm.is_active !== undefined ? rm.is_active : true,
      })
    } else {
      setEditingRM(null)
      setFormData({
        rm_name: '',
        description: '',
        category: '',
        unit_of_measure: 'KG',
        standard_purity: '',
        hsn_code: '',
        gst_rate: '',
        default_vendor_id: '',
        cas_number: '',
        storage_conditions: '',
        shelf_life_months: '',
        is_active: true,
      })
    }
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingRM(null)
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
        standard_purity: formData.standard_purity ? parseFloat(formData.standard_purity) : null,
        gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : null,
        shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
        default_vendor_id: formData.default_vendor_id || null,
      }

      let response
      if (editingRM) {
        response = await api.put(`/api/raw-materials/${editingRM.id}`, payload)
      } else {
        response = await api.post('/api/raw-materials/', payload)
      }

      if (response.data.success) {
        setSuccessMessage(editingRM ? 'Raw material updated successfully' : 'Raw material created successfully')
        handleCloseForm()
        fetchRawMaterials()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return

    try {
      const response = await api.delete(`/api/raw-materials/${id}`)
      if (response.data.success) {
        setSuccessMessage('Raw material deleted successfully')
        fetchRawMaterials()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const filteredRawMaterials = useMemo(() => {
    if (!searchQuery) return rawMaterials.map(rm => ({ ...rm, id: rm.id }));
    const query = searchQuery.toLowerCase();
    return rawMaterials
      .map(rm => ({ ...rm, id: rm.id }))
      .filter(rm =>
        rm.rm_code?.toLowerCase().includes(query) ||
        rm.rm_name?.toLowerCase().includes(query) ||
        rm.category?.toLowerCase().includes(query) ||
        rm.default_vendor?.vendor_name?.toLowerCase().includes(query)
      );
  }, [rawMaterials, searchQuery]);

  const categoryOptions = ['API', 'Excipient', 'Binder', 'Solvent', 'Preservative', 'Coating Agent', 'Filler', 'Lubricant', 'Other']
  const uomOptions = ['KG', 'GRAM', 'LITER', 'ML', 'UNIT']


  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScienceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">Raw Material Master</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Raw Material
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Global Search (RM code, name, category, or vendor)..."
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

      <Box sx={{ height: 800, width: '100%' }}>
        <StripedDataGrid
          loading={loading}
          rows={filteredRawMaterials}
          columns={[
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
              field: 'rm_code',
              headerName: 'RM Code',
              minWidth: 120,
              flex: 1,
              renderCell: (params) => (
                <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
              ),
            },
            {
              field: 'rm_name',
              headerName: 'RM Name',
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
              field: 'category',
              headerName: 'Category',
              minWidth: 120,
              flex: 1,
              renderCell: (params) => (
                params.value ? <Chip label={params.value} size="small" color="info" /> : '-'
              ),
            },
            {
              field: 'unit_of_measure',
              headerName: 'UOM',
              minWidth: 80,
              flex: 0.8,
            },
            {
              field: 'standard_purity',
              headerName: 'Purity %',
              minWidth: 100,
              flex: 1,
              renderCell: (params) => (
                params.value ? (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: params.value < 95 ? 'bold' : 'normal',
                      color: params.value < 95 ? 'warning.dark' : 'text.primary',
                    }}
                  >
                    {params.value}%
                  </Typography>
                ) : '-'
              ),
            },
            {
              field: 'default_vendor',
              headerName: 'Default Vendor',
              minWidth: 180,
              flex: 1.5,
              renderCell: (params) => (
                params.value ? (
                  <Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {params.value.vendor_name + '\n' + params.value.vendor_code}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">Not assigned</Typography>
                )
              ),
            },
            {
              field: 'hsn_code',
              headerName: 'HSN Code',
              minWidth: 100,
              flex: 1,
              renderCell: (params) => params.value || '-',
            },
            {
              field: 'gst_rate',
              headerName: 'GST %',
              minWidth: 80,
              flex: 0.8,
              renderCell: (params) => params.value ? `${params.value}%` : '-',
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
          ]}
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
          {editingRM ? 'Edit Raw Material' : 'Add Raw Material'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RM Code"
                name="rm_code"
                value={editingRM ? formData.rm_code : '(Auto-generated)'}
                disabled
                helperText={editingRM ? '' : 'Code will be auto-generated (e.g., RM-0001)'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RM Name *"
                name="rm_name"
                value={formData.rm_name}
                onChange={handleChange}
                required
                placeholder="e.g., Paracetamol API"
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
                placeholder="Detailed description of the raw material..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  label="Category"
                >
                  <MenuItem value="">None</MenuItem>
                  {categoryOptions.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Standard Purity %"
                name="standard_purity"
                value={formData.standard_purity}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                placeholder="e.g., 99.5"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CAS Number"
                name="cas_number"
                value={formData.cas_number}
                onChange={handleChange}
                placeholder="e.g., 103-90-2"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HSN Code"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleChange}
                placeholder="e.g., 2942"
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
                placeholder="e.g., Store in cool, dry place below 25°C"
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
            disabled={submitting || !formData.rm_name}
          >
            {submitting ? <CircularProgress size={24} /> : (editingRM ? 'Update' : 'Create')}
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

export default RawMaterialPage