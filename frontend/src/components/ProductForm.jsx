import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
} from '@mui/material'

const ProductForm = ({ open, onClose, onSubmit, product = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    product_code: product?.product_code || '',
    product_name: product?.product_name || '',
    description: product?.description || '',
    unit_of_measure: product?.unit_of_measure || '',
    hsn_code: product?.hsn_code || '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      setFormData({
        product_code: product.product_code || '',
        product_name: product.product_name || '',
        description: product.description || '',
        unit_of_measure: product.unit_of_measure || '',
        hsn_code: product.hsn_code || '',
      })
    } else {
      setFormData({
        product_code: '',
        product_name: '',
        description: '',
        unit_of_measure: '',
        hsn_code: '',
      })
    }
  }, [product])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.product_code.trim()) newErrors.product_code = 'Product code is required'
    if (!formData.product_name.trim()) newErrors.product_name = 'Product name is required'
    if (!formData.unit_of_measure.trim()) newErrors.unit_of_measure = 'Unit of measure is required'

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
        product_code: '',
        product_name: '',
        description: '',
        unit_of_measure: '',
        hsn_code: '',
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Product Code"
              name="product_code"
              value={formData.product_code}
              onChange={handleChange}
              error={!!errors.product_code}
              helperText={errors.product_code}
              required
              disabled={isLoading || !!product}
              placeholder="e.g., PROD-001"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="HSN Code"
              name="hsn_code"
              value={formData.hsn_code}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="8-digit HSN code"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Product Name"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              error={!!errors.product_name}
              helperText={errors.product_name}
              required
              disabled={isLoading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Unit of Measure"
              name="unit_of_measure"
              value={formData.unit_of_measure}
              onChange={handleChange}
              error={!!errors.unit_of_measure}
              helperText={errors.unit_of_measure}
              required
              disabled={isLoading}
              placeholder="e.g., TABLET, CAPSULE, KG, LITER"
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
              rows={3}
              disabled={isLoading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? 'Saving...' : product ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProductForm
