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
  Tabs,
  Tab,
  Box,
} from '@mui/material'
import api from '../services/api'
import VendorTermsTab from './VendorTermsTab'
import PartnerMedicinesTab from './PartnerMedicinesTab'

const VENDOR_TYPES = ['PARTNER', 'RM', 'PM', 'MANUFACTURER']

const VendorForm = ({ open, onClose, onSubmit, vendor = null, isLoading = false }) => {
  const [countries, setCountries] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState({
    vendor_name: vendor?.vendor_name || '',
    vendor_type: vendor?.vendor_type || 'PARTNER',
    country_id: vendor?.country_id || '',
    contact_person: vendor?.contact_person || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    address: vendor?.address || '',
    gst_number: vendor?.gst_number || '',
    drug_license_number: vendor?.drug_license_number || '',
    gmp_certified: vendor?.gmp_certified || false,
    iso_certified: vendor?.iso_certified || false,
    credit_days: vendor?.credit_days || 15,
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
        drug_license_number: vendor.drug_license_number || '',
        gmp_certified: vendor.gmp_certified || false,
        iso_certified: vendor.iso_certified || false,
        credit_days: vendor.credit_days || 15,
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
        drug_license_number: '',
        gmp_certified: false,
        iso_certified: false,
        credit_days: 15,
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
        drug_license_number: '',
        gmp_certified: false,
        iso_certified: false,
        credit_days: 15,
      })
      setErrors({})
      setActiveTab(0) // Reset to first tab
      onClose()
    }
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
      
      {/* Tabs for existing vendor */}
      {vendor && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Basic Info" />
            <Tab label="Terms & Conditions" />
            {vendor.vendor_type === 'PARTNER' && <Tab label="Medicine Whitelist" />}
          </Tabs>
        </Box>
      )}
      
      <DialogContent>
        {/* Tab 0: Basic Info (or create form) */}
        {(!vendor || activeTab === 0) && (
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Drug License Number"
                name="drug_license_number"
                value={formData.drug_license_number}
                onChange={handleChange}
                disabled={isLoading}
                helperText="For pharmaceutical compliance"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="GMP Certified"
                name="gmp_certified"
                value={String(formData.gmp_certified)}
                onChange={(e) => setFormData(prev => ({ ...prev, gmp_certified: e.target.value === 'true' }))}
                disabled={isLoading}
              >
                <MenuItem value="false">No</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="ISO Certified"
                name="iso_certified"
                value={String(formData.iso_certified)}
                onChange={(e) => setFormData(prev => ({ ...prev, iso_certified: e.target.value === 'true' }))}
                disabled={isLoading}
              >
                <MenuItem value="false">No</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Credit Days"
                name="credit_days"
                type="number"
                value={formData.credit_days}
                onChange={handleChange}
                disabled={isLoading}
                helperText="Payment credit period"
                inputProps={{ min: 0 }}
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
        )}
        
        {/* Tab 1: Terms & Conditions */}
        {vendor && activeTab === 1 && (
          <VendorTermsTab vendor={vendor} />
        )}
        
        {/* Tab 2: Medicine Whitelist (Partner only) */}
        {vendor && vendor.vendor_type === 'PARTNER' && activeTab === 2 && (
          <PartnerMedicinesTab vendor={vendor} />
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {vendor && activeTab !== 0 ? 'Close' : 'Cancel'}
        </Button>
        {(!vendor || activeTab === 0) && (
          <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : vendor ? 'Update' : 'Create'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default VendorForm
