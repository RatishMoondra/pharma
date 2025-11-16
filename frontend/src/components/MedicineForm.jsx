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
  Tabs,
  Tab,
  Box,
  Typography,
} from '@mui/material'
import api from '../services/api'

const MedicineForm = ({ open, onClose, onSubmit, medicine = null, isLoading = false }) => {
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [tabValue, setTabValue] = useState(0)
  
  const [formData, setFormData] = useState({
    product_id: medicine?.product_id || '',
    medicine_name: medicine?.medicine_name || '',
    composition: medicine?.composition || '',
    dosage_form: medicine?.dosage_form || '',
    strength: medicine?.strength || '',
    pack_size: medicine?.pack_size || '',
    hsn_code: medicine?.hsn_code || '',
    primary_unit: medicine?.primary_unit || '',
    secondary_unit: medicine?.secondary_unit || '',
    conversion_factor: medicine?.conversion_factor || '',
    primary_packaging: medicine?.primary_packaging || '',
    secondary_packaging: medicine?.secondary_packaging || '',
    units_per_pack: medicine?.units_per_pack || '',
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
        hsn_code: medicine.hsn_code || '',
        primary_unit: medicine.primary_unit || '',
        secondary_unit: medicine.secondary_unit || '',
        conversion_factor: medicine.conversion_factor || '',
        primary_packaging: medicine.primary_packaging || '',
        secondary_packaging: medicine.secondary_packaging || '',
        units_per_pack: medicine.units_per_pack || '',
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
        hsn_code: formData.hsn_code || null,
        primary_unit: formData.primary_unit || null,
        secondary_unit: formData.secondary_unit || null,
        conversion_factor: formData.conversion_factor ? parseFloat(formData.conversion_factor) : null,
        primary_packaging: formData.primary_packaging || null,
        secondary_packaging: formData.secondary_packaging || null,
        units_per_pack: formData.units_per_pack ? parseInt(formData.units_per_pack) : null,
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
        hsn_code: '',
        primary_unit: '',
        secondary_unit: '',
        conversion_factor: '',
        primary_packaging: '',
        secondary_packaging: '',
        units_per_pack: '',
        manufacturer_vendor_id: '',
        rm_vendor_id: '',
        pm_vendor_id: '',
      })
      setErrors({})
      setTabValue(0)
      onClose()
    }
  }

  const getVendorsByType = (type) => {
    return vendors.filter(v => v.vendor_type === type)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>{medicine ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
            <Tab label="Basic Info" />
            <Tab label="Tax & Units" />
            <Tab label="Packaging" />
            <Tab label="Vendors" />
          </Tabs>
        </Box>

        {/* Tab 1: Basic Info */}
        {tabValue === 0 && (
          <Grid container spacing={2}>
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
          </Grid>
        )}

        {/* Tab 2: Tax & Units */}
        {tabValue === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HSN Code"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleChange}
                disabled={isLoading}
                helperText="Harmonized System Nomenclature for taxation"
              />
            </Grid>
            <Grid item xs={12} sm={6} />
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Primary Unit"
                name="primary_unit"
                value={formData.primary_unit}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="e.g., Tablet, Capsule, ml"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Secondary Unit"
                name="secondary_unit"
                value={formData.secondary_unit}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="e.g., Box, Strip, Bottle"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Conversion Factor"
                name="conversion_factor"
                type="number"
                value={formData.conversion_factor}
                onChange={handleChange}
                disabled={isLoading}
                helperText="How many primary units in one secondary unit"
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Packaging */}
        {tabValue === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primary Packaging"
                name="primary_packaging"
                value={formData.primary_packaging}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="e.g., Blister, Sachet"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Secondary Packaging"
                name="secondary_packaging"
                value={formData.secondary_packaging}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="e.g., Carton, Box"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Units Per Pack"
                name="units_per_pack"
                type="number"
                value={formData.units_per_pack}
                onChange={handleChange}
                disabled={isLoading}
                helperText="Number of units in one pack"
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 4: Vendors */}
        {tabValue === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These vendor mappings are used as defaults when creating EOPAs and POs. You can change them during the workflow if needed.
              </Typography>
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
        )}
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
