import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material'
import api from '../services/api'

const VENDOR_TYPES = ['PARTNER', 'RM', 'PM', 'MANUFACTURER']

const VendorForm = ({ open, onClose, onSubmit, vendor = null, isLoading = false }) => {
  const [countries, setCountries] = useState([])
  const [formData, setFormData] = useState({
    vendor_name: vendor?.vendor_name || '',
    vendor_type: vendor?.vendor_type || 'PARTNER',
    country_id: vendor?.country_id || '',
    contact_person: vendor?.contact_person || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    address: vendor?.address || '',
    gst_number: vendor?.gst_number || '',
  })

  const [errors, setErrors] = useState({})

  // Fetch countries when form opens
  useEffect(() => {
    if (open) {
      fetchCountries()
    }
  }, [open])

  const fetchCountries = async () => {
    try {
      const response = await api.get('/api/countries/active')
      if (response.data.success) {
        setCountries(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch countries:', err)
    }
  }

  // Update form when vendor prop changes
  useEffect(() => {
    if (vendor) {
      setFormData({
        vendor_name: vendor.vendor_name || '',
        vendor_type: vendor.vendor_type || 'PARTNER',
        country_id: vendor.country_id || '',
        contact_person: vendor.contact_person || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        gst_number: vendor.gst_number || '',
      })
    } else {
      setFormData({
        vendor_name: '',
        vendor_type: 'PARTNER',
        country_id: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
      })
    }
  }, [vendor])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.vendor_name.trim()) newErrors.vendor_name = 'Vendor name is required'
    if (!formData.vendor_type) newErrors.vendor_type = 'Vendor type is required'
    if (!formData.country_id) newErrors.country_id = 'Country is required'
    if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.address.trim()) newErrors.address = 'Address is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        vendor_name: '',
        vendor_type: 'PARTNER',
        country_id: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vendor Name"
              name="vendor_name"
              value={formData.vendor_name}
              onChange={handleChange}
              error={!!errors.vendor_name}
              helperText={errors.vendor_name}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Vendor Type"
              name="vendor_type"
              value={formData.vendor_type}
              onChange={handleChange}
              error={!!errors.vendor_type}
              helperText={errors.vendor_type}
              required
              disabled={isLoading}
            >
              {VENDOR_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Country"
              name="country_id"
              value={formData.country_id}
              onChange={handleChange}
              error={!!errors.country_id}
              helperText={errors.country_id || 'Controls language for printing materials'}
              required
              disabled={isLoading}
            >
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.country_name} ({country.country_code}) - {country.language}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              error={!!errors.contact_person}
              helperText={errors.contact_person}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="GST Number"
              name="gst_number"
              value={formData.gst_number}
              onChange={handleChange}
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={!!errors.address}
              helperText={errors.address}
              required
              multiline
              rows={3}
              disabled={isLoading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? 'Saving...' : vendor ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default VendorForm
