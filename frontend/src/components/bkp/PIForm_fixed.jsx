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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Divider,
  Alert,
  Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import api from '../services/api'

const PIForm = ({ open, onClose, onSubmit, isLoading = false, pi = null }) => {
  const [countries, setCountries] = useState([])
  const [allVendors, setAllVendors] = useState([])
  const [partnerVendors, setPartnerVendors] = useState([])
  const [medicines, setMedicines] = useState([])
  const [partnerMedicines, setPartnerMedicines] = useState([])
  const [partnerTerms, setPartnerTerms] = useState([])
  
  const [formData, setFormData] = useState({
    country_id: '',
    partner_vendor_id: '',
    pi_date: new Date().toISOString().split('T')[0],
    remarks: '',
  })

  const [items, setItems] = useState([{
    medicine_id: '',
    quantity: '',
    unit_price: '',
  }])

  const [errors, setErrors] = useState({})

  // Populate form when editing
  useEffect(() => {
    if (pi && open) {
      console.log('Editing PI:', pi)
      // Extract country_id from pi.country or pi.country_id or partner_vendor.country_id
      const countryId = pi.country_id || pi.country?.id || pi.partner_vendor?.country_id || ''
      console.log('Extracted country_id:', countryId, 'from PI')
      
      setFormData({
        country_id: countryId,
        partner_vendor_id: pi.partner_vendor_id || '',
        pi_date: pi.pi_date ? pi.pi_date.split('T')[0] : new Date().toISOString().split('T')[0],
        remarks: pi.remarks || '',
      })
      
      console.log('Set form data:', {
        country_id: countryId,
        partner_vendor_id: pi.partner_vendor_id,
        partner_vendor_name: pi.partner_vendor?.vendor_name
      })
      
      if (pi.items && pi.items.length > 0) {
        setItems(pi.items.map(item => ({
          medicine_id: item.medicine_id || '',
          quantity: item.quantity || '',
          unit_price: item.unit_price || '',
        })))
      }
    } else if (open && !pi) {
      console.log('Creating new PI')
      // Reset form for create mode
      setFormData({
        country_id: '',
        partner_vendor_id: '',
        pi_date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
      setItems([{ medicine_id: '', quantity: '', unit_price: '' }])
      setErrors({})
    }
  }, [pi, open])

  useEffect(() => {
    if (open) {
      fetchCountries()
      fetchAllVendors()
      fetchMedicines()
    }
  }, [open])
  
  // Fetch partner medicines and terms when partner_vendor_id changes
  useEffect(() => {
    if (formData.partner_vendor_id) {
      fetchPartnerMedicines(formData.partner_vendor_id)
      fetchPartnerTerms(formData.partner_vendor_id)
    } else {
      setPartnerMedicines([])
      setPartnerTerms([])
    }
  }, [formData.partner_vendor_id])

  const fetchPartnerMedicines = async (vendorId) => {
    try {
      const response = await api.get('/api/terms/partner-medicines/', {
        params: { vendor_id: vendorId },
      })
      if (response.data.success) {
        setPartnerMedicines(response.data.data.map(pm => pm.medicine))
      } else {
        setPartnerMedicines([])
      }
    } catch (err) {
      setPartnerMedicines([])
    }
  }

  const fetchPartnerTerms = async (vendorId) => {
    try {
      const response = await api.get('/api/terms/vendor-terms/', {
        params: { vendor_id: vendorId, is_active: true },
      })
      if (response.data.success) {
        setPartnerTerms(response.data.data)
      } else {
        setPartnerTerms([])
      }
    } catch (err) {
      setPartnerTerms([])
    }
  }

  // Filter vendors by country when country changes or vendors load
  useEffect(() => {
    console.log('Vendor filtering triggered:', {
      country_id: formData.country_id,
      allVendorsCount: allVendors.length,
      isEditing: !!pi,
      partner_vendor_id: formData.partner_vendor_id
    })
    
    if (formData.country_id && allVendors.length > 0) {
      const countryIdInt = parseInt(formData.country_id)
      const filtered = allVendors.filter(v => 
        v.vendor_type === 'PARTNER' && v.country_id === countryIdInt
      )
      console.log('Filtered partner vendors:', filtered.length, 'vendors for country', countryIdInt)
      setPartnerVendors(filtered)
      
      // Only reset partner vendor if it's not in the filtered list AND we're not editing an existing PI
      if (formData.partner_vendor_id) {
        const currentVendor = filtered.find(v => v.id === parseInt(formData.partner_vendor_id))
        if (!currentVendor && !pi) {
          // User is creating new PI or changed country - vendor not in new country
          console.log('Resetting vendor selection - not found in filtered list')
          setFormData(prev => ({ ...prev, partner_vendor_id: '' }))
        } else if (currentVendor) {
          console.log('Current vendor found in filtered list:', currentVendor.vendor_name)
        }
      }
    } else {
      // No country selected or vendors not loaded yet
      console.log('Clearing partner vendors - country or vendors not ready')
      setPartnerVendors([])
      // Only clear vendor if not editing (preserve selection during initial load)
      if (!pi && formData.country_id === '') {
        setFormData(prev => ({ ...prev, partner_vendor_id: '' }))
      }
    }
  }, [formData.country_id, allVendors, pi, formData.partner_vendor_id])

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

  const fetchAllVendors = async () => {
    try {
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        console.log('Fetched vendors:', response.data.data.length, 'vendors')
        console.log('Partner vendors:', response.data.data.filter(v => v.vendor_type === 'PARTNER').length)
        setAllVendors(response.data.data)
      } else {
        console.error('Vendors API returned success=false:', response.data)
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
      console.error('Error response:', err.response?.data)
    }
  }

  const fetchMedicines = async () => {
    try {
      const response = await api.get('/api/products/medicines')
      if (response.data.success) {
        setMedicines(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch medicines:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
    
    // Clear errors for this field
    const errorKey = `item_${index}_${field === 'medicine_id' ? 'medicine' : field === 'unit_price' ? 'price' : 'quantity'}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: null }))
    }
  }

  const addItem = () => {
    setItems([...items, { medicine_id: '', quantity: '', unit_price: '' }])
  }

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.country_id) newErrors.country_id = 'Country is required'
    if (!formData.partner_vendor_id) newErrors.partner_vendor_id = 'Partner vendor is required'
    if (!formData.pi_date) newErrors.pi_date = 'PI date is required'

    // Validate items
    items.forEach((item, index) => {
      if (!item.medicine_id) newErrors[`item_${index}_medicine`] = 'Medicine is required'
      if (!item.quantity || item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Valid quantity required'
      if (!item.unit_price || item.unit_price <= 0) newErrors[`item_${index}_price`] = 'Valid price required'
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      const payload = {
        ...formData,
        country_id: parseInt(formData.country_id),
        partner_vendor_id: parseInt(formData.partner_vendor_id),
        items: items.map(item => ({
          medicine_id: parseInt(item.medicine_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        }))
      }
      onSubmit(payload, pi?.id)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        country_id: '',
        partner_vendor_id: '',
        pi_date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
      setItems([{ medicine_id: '', quantity: '', unit_price: '' }])
      setErrors({})
      onClose()
    }
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + (qty * price)
    }, 0).toFixed(2)
  }

  const isEditMode = !!pi

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEditMode ? 'Edit Proforma Invoice (PI)' : 'Create Proforma Invoice (PI)'}
          </Typography>
          {isEditMode && pi?.pi_number && (
            <Chip label={pi.pi_number} color="primary" size="small" />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Please fix the errors in the form before submitting.
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Country"
              name="country_id"
              value={formData.country_id}
              onChange={handleChange}
              error={!!errors.country_id}
              helperText={errors.country_id || 'Select country first to filter partner vendors'}
              required
              disabled={isLoading}
            >
              <MenuItem value="">Select Country</MenuItem>
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
              select
              label="Partner Vendor"
              name="partner_vendor_id"
              value={formData.partner_vendor_id}
              onChange={handleChange}
              error={!!errors.partner_vendor_id}
              helperText={
                errors.partner_vendor_id || 
                (!formData.country_id ? 'Select country first' : 
                partnerVendors.length === 0 ? 'No partner vendors found for selected country' : 
                `${partnerVendors.length} vendor${partnerVendors.length !== 1 ? 's' : ''} available`)
              }
              required
              disabled={isLoading || !formData.country_id}
            >
              <MenuItem value="">Select Partner Vendor</MenuItem>
              {partnerVendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name} ({vendor.vendor_code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="PI Date"
              name="pi_date"
              value={formData.pi_date}
              onChange={handleChange}
              error={!!errors.pi_date}
              helperText={errors.pi_date}
              required
              disabled={isLoading}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {/* Empty grid for layout balance */}
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              multiline
              rows={2}
              disabled={isLoading}
              placeholder="Optional notes or comments"
            />
          </Grid>

          {/* Partner Terms & Conditions Display */}
          {formData.partner_vendor_id && partnerTerms.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="info.dark" sx={{ mb: 1 }}>
                  Partner Terms & Conditions
                </Typography>
                {partnerTerms.map((term) => (
                  <Box key={term.id} sx={{ mb: 1 }}>
                    <Chip label={term.term?.category} size="small" sx={{ mr: 1 }} />
                    <Chip label={`Priority: ${term.priority_override || term.term?.priority}`} size="small" color={term.priority_override ? 'secondary' : 'default'} sx={{ mr: 1 }} />
                    <Typography variant="body2" sx={{ display: 'inline' }}>
                      {term.term?.term_text}
                    </Typography>
                    {term.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        Notes: {term.notes}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Grid>
          )}
          
