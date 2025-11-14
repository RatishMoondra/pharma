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
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import api from '../services/api'

const PIForm = ({ open, onClose, onSubmit, isLoading = false }) => {
  const [partnerVendors, setPartnerVendors] = useState([])
  const [medicines, setMedicines] = useState([])
  
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (open) {
      fetchPartnerVendors()
      fetchMedicines()
    }
  }, [open])

  const fetchPartnerVendors = async () => {
    try {
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        const partners = response.data.data.filter(v => v.vendor_type === 'PARTNER')
        setPartnerVendors(partners)
      }
    } catch (err) {
      console.error('Failed to fetch partner vendors:', err)
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
        partner_vendor_id: parseInt(formData.partner_vendor_id),
        items: items.map(item => ({
          medicine_id: parseInt(item.medicine_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        }))
      }
      onSubmit(payload)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Proforma Invoice (PI)</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Partner Vendor"
              name="partner_vendor_id"
              value={formData.partner_vendor_id}
              onChange={handleChange}
              error={!!errors.partner_vendor_id}
              helperText={errors.partner_vendor_id}
              required
              disabled={isLoading}
            >
              <MenuItem value="">Select Partner Vendor</MenuItem>
              {partnerVendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
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
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Items</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addItem}
              disabled={isLoading}
            >
              Add Item
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Medicine</TableCell>
                  <TableCell width={120}>Quantity</TableCell>
                  <TableCell width={120}>Unit Price</TableCell>
                  <TableCell width={120}>Total</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={item.medicine_id}
                        onChange={(e) => handleItemChange(index, 'medicine_id', e.target.value)}
                        error={!!errors[`item_${index}_medicine`]}
                        disabled={isLoading}
                      >
                        <MenuItem value="">Select Medicine</MenuItem>
                        {medicines.map((med) => (
                          <MenuItem key={med.id} value={med.id}>
                            {med.medicine_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        error={!!errors[`item_${index}_quantity`]}
                        disabled={isLoading}
                        inputProps={{ min: 0, step: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        error={!!errors[`item_${index}_price`]}
                        disabled={isLoading}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1 || isLoading}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <strong>Total Amount:</strong>
                  </TableCell>
                  <TableCell colSpan={2}>
                    <strong>₹{calculateTotal()}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create PI'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PIForm
