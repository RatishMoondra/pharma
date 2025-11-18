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
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VendorForm from '../components/VendorForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'

const VendorsPage = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
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

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        setVendors(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const handleOpenForm = (vendor = null) => {
    setEditingVendor(vendor)
    setFormOpen(true)
    if (vendor) {
      openEditForm(vendor.id)
    }
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingVendor(null)
    closeEditForm()
  }

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()

      if (editingVendor) {
        // Update existing vendor - maintain row position
        const response = await api.put(`/api/vendors/${editingVendor.id}`, formData)
        if (response.data.success) {
          const updatedVendor = response.data.data
          // Update in-place to preserve row order
          setVendors(prevVendors => updateDataStably(prevVendors, updatedVendor))
          setSuccessMessage('Vendor updated successfully')
          markAsSaved(editingVendor.id)
          handleCloseForm()
        }
      } else {
        // Create new vendor - add to beginning
        const response = await api.post('/api/vendors/', formData)
        if (response.data.success) {
          const newVendor = response.data.data
          setVendors(prevVendors => addDataStably(prevVendors, newVendor, true))
          setSuccessMessage('Vendor created successfully')
          markAsSaved(newVendor.id)
          handleCloseForm()
        }
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) {
      return
    }

    try {
      const response = await api.delete(`/api/vendors/${vendorId}`)
      if (response.data.success) {
        // Remove from array while preserving order of remaining items
        setVendors(prevVendors => removeDataStably(prevVendors, vendorId))
        setSuccessMessage('Vendor deleted successfully')
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const getVendorTypeColor = (type) => {
    const colors = {
      PARTNER: 'primary',
      RM: 'success',
      PM: 'warning',
      MANUFACTURER: 'info',
    }
    return colors[type] || 'default'
  }

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      vendor.vendor_name?.toLowerCase().includes(query) ||
      vendor.vendor_code?.toLowerCase().includes(query) ||
      vendor.vendor_type?.toLowerCase().includes(query) ||
      vendor.contact_person?.toLowerCase().includes(query) ||
      vendor.phone?.toLowerCase().includes(query) ||
      vendor.email?.toLowerCase().includes(query)
    )
  })

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Vendors</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Vendor
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by Vendor Name, Code, Type, Contact Person, Phone, Email..."
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredVendors.length === 0 ? (
        <Alert severity="info">
          {vendors.length === 0 
            ? 'No vendors found. Click "Add Vendor" to create one.' 
            : 'No vendors match your search criteria.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vendor Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Country</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Contact Person</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Certifications</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Credit Days</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow 
                  key={vendor.id}
                  sx={getRowStyle(vendor.id)}
                >
                  <TableCell>{vendor.vendor_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={vendor.vendor_type}
                      color={getVendorTypeColor(vendor.vendor_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {vendor.country ? (
                      <Chip
                        label={`${vendor.country.country_code} - ${vendor.country.language}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{vendor.contact_person}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {vendor.gmp_certified && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="GMP"
                          color="success"
                          size="small"
                        />
                      )}
                      {vendor.iso_certified && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="ISO"
                          color="info"
                          size="small"
                        />
                      )}
                      {!vendor.gmp_certified && !vendor.iso_certified && '-'}
                    </Box>
                  </TableCell>
                  <TableCell>{vendor.credit_days ? `${vendor.credit_days} days` : '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenForm(vendor)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(vendor.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <VendorForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        vendor={editingVendor}
        isLoading={submitting}
      />

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default VendorsPage
