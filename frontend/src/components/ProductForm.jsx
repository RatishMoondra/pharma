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
    product_name: product?.product_name || '',
    description: product?.description || '',
    unit_of_measure: product?.unit_of_measure || '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        description: product.description || '',
        unit_of_measure: product.unit_of_measure || '',
      })
    } else {
      setFormData({
        product_name: '',
        description: '',
        unit_of_measure: '',
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
        product_name: '',
        description: '',
        unit_of_measure: '',
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
