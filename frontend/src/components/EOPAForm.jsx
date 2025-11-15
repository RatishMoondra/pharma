import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import api from '../services/api'

const EOPAForm = ({ open, onClose, onSubmit, isLoading = false, piItem = null }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    estimated_unit_price: '',
    remarks: '',
  })

  const [errors, setErrors] = useState({})

  // Populate form when opening
  useEffect(() => {
    if (piItem && open) {
      // Pre-fill with PI item data
      setFormData({
        quantity: piItem.quantity || '',
        estimated_unit_price: piItem.unit_price || '',
        remarks: '',
      })
      setErrors({})
    }
  }, [piItem, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    
    if (!formData.estimated_unit_price || formData.estimated_unit_price <= 0) {
      newErrors.estimated_unit_price = 'Estimated unit price must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    const eopaData = {
      pi_item_id: piItem.id,
      quantity: parseFloat(formData.quantity),
      estimated_unit_price: parseFloat(formData.estimated_unit_price),
      remarks: formData.remarks || undefined,
    }
    
    await onSubmit(eopaData)
  }

  const handleClose = () => {
    setFormData({
      quantity: '',
      estimated_unit_price: '',
      remarks: '',
    })
    setErrors({})
    onClose()
  }

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0
    const price = parseFloat(formData.estimated_unit_price) || 0
    return qty * price
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Create EOPA (Vendor-Agnostic)
      </DialogTitle>
      <DialogContent>
        {piItem && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="info.dark">
              PI Information
            </Typography>
            <Typography variant="body2">
              <strong>PI Number:</strong> {piItem.pi?.pi_number}
            </Typography>
            <Typography variant="body2">
              <strong>Partner:</strong> {piItem.pi?.partner_vendor?.vendor_name}
            </Typography>
            <Typography variant="body2">
              <strong>Date:</strong> {new Date(piItem.pi?.pi_date).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Medicine:</strong> {piItem.medicine?.medicine_name} ({piItem.medicine?.dosage_form})
            </Typography>
          </Box>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> EOPAs are now vendor-agnostic. Vendors will be automatically selected from Medicine Master during PO generation.
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              error={!!errors.quantity}
              helperText={errors.quantity}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Estimated Unit Price (₹)"
              name="estimated_unit_price"
              type="number"
              value={formData.estimated_unit_price}
              onChange={handleChange}
              error={!!errors.estimated_unit_price}
              helperText={errors.estimated_unit_price}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
              <Typography variant="h6" color="success.dark">
                Estimated Total: ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Remarks (Optional)"
              name="remarks"
              multiline
              rows={3}
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Add any notes about this EOPA..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create EOPA'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EOPAForm
