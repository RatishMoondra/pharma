import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ScienceIcon from '@mui/icons-material/Science'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

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
        standard_purity: rm.standard_purity || '',
        hsn_code: rm.hsn_code || '',
        gst_rate: rm.gst_rate || '',
        default_vendor_id: rm.default_vendor_id || '',
        cas_number: rm.cas_number || '',
        storage_conditions: rm.storage_conditions || '',
        shelf_life_months: rm.shelf_life_months || '',
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

  const filteredRawMaterials = rawMaterials.filter(rm =>
    rm.rm_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rm.rm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rm.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categoryOptions = ['API', 'Excipient', 'Binder', 'Solvent', 'Preservative', 'Coating Agent', 'Filler', 'Lubricant', 'Other']
  const uomOptions = ['KG', 'GRAM', 'LITER', 'ML', 'UNIT']

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScienceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Raw Material Master
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Raw Material
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by RM code, name, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>RM Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>RM Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>UOM</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Purity %</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Default Vendor</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>HSN Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>GST %</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRawMaterials.map((rm, idx) => (
                <TableRow
                  key={rm.id}
                  sx={{
                    bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                    '&:hover': { bgcolor: 'primary.50' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{rm.rm_code}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{rm.rm_name}</Typography>
                    {rm.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {rm.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {rm.category && (
                      <Chip label={rm.category} size="small" color="info" />
                    )}
                  </TableCell>
                  <TableCell>{rm.unit_of_measure}</TableCell>
                  <TableCell>
                    {rm.standard_purity ? `${rm.standard_purity}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {rm.default_vendor ? (
                      <Box>
                        <Typography variant="body2">{rm.default_vendor.vendor_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rm.default_vendor.vendor_code}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Not assigned</Typography>
                    )}
                  </TableCell>
                  <TableCell>{rm.hsn_code || '-'}</TableCell>
                  <TableCell>{rm.gst_rate ? `${rm.gst_rate}%` : '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={rm.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={rm.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenForm(rm)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(rm.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredRawMaterials.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            {searchQuery ? 'No raw materials found matching your search' : 'No raw materials yet. Click "Add Raw Material" to get started.'}
          </Typography>
        </Box>
      )}

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

      {/* Success Snackbar */}
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

      {/* Error Snackbar */}
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
    </Container>
  )
}

export default RawMaterialPage
