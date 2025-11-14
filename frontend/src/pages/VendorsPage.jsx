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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VendorForm from '../components/VendorForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const VendorsPage = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { error, handleApiError, clearError } = useApiError()

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
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingVendor(null)
  }

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()

      if (editingVendor) {
        // Update existing vendor
        const response = await api.put(`/api/vendors/${editingVendor.id}`, formData)
        if (response.data.success) {
          setSuccessMessage('Vendor updated successfully')
          fetchVendors()
          handleCloseForm()
        }
      } else {
        // Create new vendor
        const response = await api.post('/api/vendors/', formData)
        if (response.data.success) {
          setSuccessMessage('Vendor created successfully')
          fetchVendors()
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
        setSuccessMessage('Vendor deleted successfully')
        fetchVendors()
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : vendors.length === 0 ? (
        <Alert severity="info">No vendors found. Click "Add Vendor" to create one.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>GST Number</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>{vendor.vendor_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={vendor.vendor_type}
                      color={getVendorTypeColor(vendor.vendor_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{vendor.contact_person}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.gst_number || '-'}</TableCell>
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
