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
  Autocomplete,
} from '@mui/material'
import api from '../services/api'

const MedicineForm = ({ open, onClose, onSubmit, medicine = null, isLoading = false }) => {
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  
  const [formData, setFormData] = useState({
    product_id: medicine?.product_id || '',
    medicine_name: medicine?.medicine_name || '',
    composition: medicine?.composition || '',
    dosage_form: medicine?.dosage_form || '',
    strength: medicine?.strength || '',
    pack_size: medicine?.pack_size || '',
    manufacturer_vendor_id: medicine?.manufacturer_vendor_id || '',
    rm_vendor_id: medicine?.rm_vendor_id || '',
    pm_vendor_id: medicine?.pm_vendor_id || '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      fetchProducts()
      fetchVendors()
    }
  }, [open])

  useEffect(() => {
    if (medicine) {
      setFormData({
        product_id: medicine.product_id || '',
        medicine_name: medicine.medicine_name || '',
        composition: medicine.composition || '',
        dosage_form: medicine.dosage_form || '',
        strength: medicine.strength || '',
        pack_size: medicine.pack_size || '',
        manufacturer_vendor_id: medicine.manufacturer_vendor_id || '',
        rm_vendor_id: medicine.rm_vendor_id || '',
        pm_vendor_id: medicine.pm_vendor_id || '',
      })
    }
  }, [medicine])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products/')
      if (response.data.success) {
        setProducts(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        setVendors(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.product_id) newErrors.product_id = 'Product is required'
    if (!formData.medicine_name.trim()) newErrors.medicine_name = 'Medicine name is required'
    if (!formData.dosage_form.trim()) newErrors.dosage_form = 'Dosage form is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      const payload = {
        product_id: parseInt(formData.product_id),
        medicine_name: formData.medicine_name,
        composition: formData.composition || null,
        dosage_form: formData.dosage_form,
        strength: formData.strength || null,
        pack_size: formData.pack_size || null,
        manufacturer_vendor_id: formData.manufacturer_vendor_id && formData.manufacturer_vendor_id !== '' ? parseInt(formData.manufacturer_vendor_id) : null,
        rm_vendor_id: formData.rm_vendor_id && formData.rm_vendor_id !== '' ? parseInt(formData.rm_vendor_id) : null,
        pm_vendor_id: formData.pm_vendor_id && formData.pm_vendor_id !== '' ? parseInt(formData.pm_vendor_id) : null,
      }
      onSubmit(payload)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        product_id: '',
        medicine_name: '',
        composition: '',
        dosage_form: '',
        strength: '',
        pack_size: '',
        manufacturer_vendor_id: '',
        rm_vendor_id: '',
        pm_vendor_id: '',
      })
      setErrors({})
      onClose()
    }
  }

  const getVendorsByType = (type) => {
    return vendors.filter(v => v.vendor_type === type)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{medicine ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Product"
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              error={!!errors.product_id}
              helperText={errors.product_id}
              required
              disabled={isLoading}
            >
              <MenuItem value="">Select Product</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.product_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Medicine Name"
              name="medicine_name"
              value={formData.medicine_name}
              onChange={handleChange}
              error={!!errors.medicine_name}
              helperText={errors.medicine_name}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Composition"
              name="composition"
              value={formData.composition}
              onChange={handleChange}
              multiline
              rows={2}
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Dosage Form"
              name="dosage_form"
              value={formData.dosage_form}
              onChange={handleChange}
              error={!!errors.dosage_form}
              helperText={errors.dosage_form}
              required
              disabled={isLoading}
              placeholder="e.g., Tablet, Capsule"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Strength"
              name="strength"
              value={formData.strength}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="e.g., 500mg"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Pack Size"
              name="pack_size"
              value={formData.pack_size}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="e.g., 10x10"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Manufacturer Vendor"
              name="manufacturer_vendor_id"
              value={formData.manufacturer_vendor_id}
              onChange={handleChange}
              disabled={isLoading}
            >
              <MenuItem value="">None</MenuItem>
              {getVendorsByType('MANUFACTURER').map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="RM Vendor"
              name="rm_vendor_id"
              value={formData.rm_vendor_id}
              onChange={handleChange}
              disabled={isLoading}
            >
              <MenuItem value="">None</MenuItem>
              {getVendorsByType('RM').map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="PM Vendor"
              name="pm_vendor_id"
              value={formData.pm_vendor_id}
              onChange={handleChange}
              disabled={isLoading}
            >
              <MenuItem value="">None</MenuItem>
              {getVendorsByType('PM').map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? 'Saving...' : medicine ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MedicineForm
