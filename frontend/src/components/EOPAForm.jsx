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
  Typography,
  Box,
  Chip,
} from '@mui/material'
import api from '../services/api'

const EOPAForm = ({ open, onClose, onSubmit, isLoading = false, eopa = null }) => {
  const [pis, setPis] = useState([])
  
  const [formData, setFormData] = useState({
    pi_id: '',
    remarks: '',
  })

  const [errors, setErrors] = useState({})

  // Populate form when editing
  useEffect(() => {
    if (eopa && open) {
      setFormData({
        pi_id: eopa.pi_id || '',
        remarks: eopa.remarks || '',
      })
    } else if (open && !eopa) {
      // Reset form for create mode
      setFormData({
        pi_id: '',
        remarks: '',
      })
      setErrors({})
    }
  }, [eopa, open])

  useEffect(() => {
    if (open) {
      fetchPIs()
    }
  }, [open])

  const fetchPIs = async () => {
    try {
      const response = await api.get('/api/pi/')
      if (response.data.success) {
        setPis(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch PIs:', err)
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
    
    if (!formData.pi_id) newErrors.pi_id = 'PI is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      const payload = {
        ...formData,
        pi_id: parseInt(formData.pi_id),
      }
      onSubmit(payload, eopa?.id)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        pi_id: '',
        remarks: '',
      })
      setErrors({})
      onClose()
    }
  }

  const isEditMode = !!eopa
  const selectedPI = pis.find(pi => pi.id === parseInt(formData.pi_id))

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEditMode ? 'Edit EOPA' : 'Create EOPA from PI'}
          </Typography>
          {isEditMode && eopa?.eopa_number && (
            <Chip label={eopa.eopa_number} color="primary" size="small" />
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Select Proforma Invoice (PI)"
              name="pi_id"
              value={formData.pi_id}
              onChange={handleChange}
              error={!!errors.pi_id}
              helperText={errors.pi_id || 'Select a PI to create EOPA'}
              required
              disabled={isLoading}
            >
              <MenuItem value="">Select a PI</MenuItem>
              {pis.map((pi) => (
                <MenuItem key={pi.id} value={pi.id}>
                  <Box>
                    <Typography variant="body2">
                      {pi.pi_number} - {pi.partner_vendor?.vendor_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date: {new Date(pi.pi_date).toLocaleDateString()} | 
                      Amount: ₹{pi.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {selectedPI && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  SELECTED PI DETAILS
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>PI Number:</strong> {selectedPI.pi_number}
                </Typography>
                <Typography variant="body2">
                  <strong>Partner Vendor:</strong> {selectedPI.partner_vendor?.vendor_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Amount:</strong> ₹{selectedPI.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  <strong>Items:</strong> {selectedPI.items?.length || 0}
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              multiline
              rows={3}
              disabled={isLoading}
              placeholder="Optional notes or comments for approval"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update EOPA' : 'Create EOPA')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EOPAForm
