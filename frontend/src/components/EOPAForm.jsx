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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import { LocalShipping, Business, Inventory2 } from '@mui/icons-material'
import api from '../services/api'

const EOPAForm = ({ open, onClose, onSubmit, isLoading = false, piItem = null, mode = 'bulk' }) => {
  const [formData, setFormData] = useState({
    manufacturer_price: '',
    manufacturer_vendor_id: '',
    rm_price: '',
    rm_vendor_id: '',
    pm_price: '',
    pm_vendor_id: '',
    remarks: '',
  })

  const [vendors, setVendors] = useState([])
  const [vendorTypes, setVendorTypes] = useState({
    manufacturer: false,
    rm: false,
    pm: false,
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      fetchVendors()
    }
  }, [open])

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

  // Populate form when opening
  useEffect(() => {
    if (piItem && open) {
      // Determine which vendor types are available
      const newVendorTypes = {
        manufacturer: !!piItem.medicine?.manufacturer_vendor_id,
        rm: !!piItem.medicine?.rm_vendor_id,
        pm: !!piItem.medicine?.pm_vendor_id,
      }
      setVendorTypes(newVendorTypes)
      
      // Reset form with default vendors from medicine master
      setFormData({
        manufacturer_price: '',
        manufacturer_vendor_id: piItem.medicine?.manufacturer_vendor_id || '',
        rm_price: '',
        rm_vendor_id: piItem.medicine?.rm_vendor_id || '',
        pm_price: '',
        pm_vendor_id: piItem.medicine?.pm_vendor_id || '',
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
    
    // At least one vendor type must have a price
    const hasAnyPrice = 
      (vendorTypes.manufacturer && formData.manufacturer_price) ||
      (vendorTypes.rm && formData.rm_price) ||
      (vendorTypes.pm && formData.pm_price)
    
    if (!hasAnyPrice) {
      newErrors.general = 'Please provide at least one vendor price'
    }

    // Validate individual prices if vendor type is available
    if (vendorTypes.manufacturer && formData.manufacturer_price) {
      const price = parseFloat(formData.manufacturer_price)
      if (isNaN(price) || price <= 0) {
        newErrors.manufacturer_price = 'Invalid price'
      }
    }

    if (vendorTypes.rm && formData.rm_price) {
      const price = parseFloat(formData.rm_price)
      if (isNaN(price) || price <= 0) {
        newErrors.rm_price = 'Invalid price'
      }
    }

    if (vendorTypes.pm && formData.pm_price) {
      const price = parseFloat(formData.pm_price)
      if (isNaN(price) || price <= 0) {
        newErrors.pm_price = 'Invalid price'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      const payload = {
        pi_item_id: piItem.id,
        remarks: formData.remarks || null,
      }

      // Add prices and vendor IDs for selected vendor types
      if (formData.manufacturer_price && formData.manufacturer_vendor_id) {
        payload.manufacturer_price = parseFloat(formData.manufacturer_price)
        payload.manufacturer_vendor_id = parseInt(formData.manufacturer_vendor_id)
      }
      if (formData.rm_price && formData.rm_vendor_id) {
        payload.rm_price = parseFloat(formData.rm_price)
        payload.rm_vendor_id = parseInt(formData.rm_vendor_id)
      }
      if (formData.pm_price && formData.pm_vendor_id) {
        payload.pm_price = parseFloat(formData.pm_price)
        payload.pm_vendor_id = parseInt(formData.pm_vendor_id)
      }

      onSubmit(payload)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        manufacturer_price: '',
        manufacturer_vendor_id: '',
        rm_price: '',
        rm_vendor_id: '',
        pm_price: '',
        pm_vendor_id: '',
        remarks: '',
      })
      setErrors({})
      onClose()
    }
  }

  if (!piItem) return null

  const calculateTotal = (price) => {
    if (!price || !piItem.quantity) return 0
    return parseFloat(price) * parseFloat(piItem.quantity)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Create EOPAs for PI Item
          </Typography>
          <Chip 
            label={`Qty: ${piItem.quantity}`} 
            color="primary" 
            size="small" 
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {errors.general && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.general}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* PI Number */}
          <Grid item xs={12}>
            <Box sx={{ p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
              <Typography variant="body2">
                <strong>PI Number:</strong> {piItem.pi?.pi_number || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Partner Vendor: {piItem.pi?.partner_vendor?.vendor_name || 'N/A'} | Date: {piItem.pi?.pi_date ? new Date(piItem.pi.pi_date).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
          </Grid>
          
          {/* PI Item Details */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                PI ITEM DETAILS
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Medicine:</strong> {piItem.medicine?.medicine_name}
              </Typography>
              <Typography variant="body2">
                <strong>Quantity:</strong> {piItem.quantity} {piItem.medicine?.unit}
              </Typography>
              <Typography variant="body2">
                <strong>PI Unit Price:</strong> ₹{parseFloat(piItem.unit_price).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>PI Total:</strong> ₹{parseFloat(piItem.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Grid>

          {/* Vendor Type Pricing Table */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Estimated Vendor Prices (EOPA)
            </Typography>
            <Table size="small" sx={{ border: '1px solid', borderColor: 'grey.300' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.50' }}>
                  <TableCell width="15%"><strong>Vendor Type</strong></TableCell>
                  <TableCell width="35%"><strong>Select Vendor</strong></TableCell>
                  <TableCell width="25%"><strong>Estimated Unit Price (₹)</strong></TableCell>
                  <TableCell align="right" width="25%"><strong>Estimated Total (₹)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Manufacturer */}
                <TableRow sx={{ bgcolor: vendorTypes.manufacturer ? 'inherit' : 'grey.100' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business fontSize="small" color={vendorTypes.manufacturer ? 'primary' : 'disabled'} />
                      <Typography variant="body2">Manufacturer</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" disabled={isLoading}>
                      <Select
                        name="manufacturer_vendor_id"
                        value={formData.manufacturer_vendor_id}
                        onChange={handleChange}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Select Vendor</em>
                        </MenuItem>
                        {vendors
                          .filter(v => v.vendor_type === 'MANUFACTURER')
                          .map(vendor => (
                            <MenuItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name} ({vendor.vendor_code})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      name="manufacturer_price"
                      value={formData.manufacturer_price}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={!!errors.manufacturer_price}
                      helperText={errors.manufacturer_price}
                      placeholder="0.00"
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formData.manufacturer_price ? 
                        `₹${calculateTotal(formData.manufacturer_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                        : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* RM */}
                <TableRow sx={{ bgcolor: vendorTypes.rm ? 'inherit' : 'grey.100' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory2 fontSize="small" color={vendorTypes.rm ? 'secondary' : 'disabled'} />
                      <Typography variant="body2">Raw Material</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" disabled={isLoading}>
                      <Select
                        name="rm_vendor_id"
                        value={formData.rm_vendor_id}
                        onChange={handleChange}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Select Vendor</em>
                        </MenuItem>
                        {vendors
                          .filter(v => v.vendor_type === 'RM')
                          .map(vendor => (
                            <MenuItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name} ({vendor.vendor_code})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      name="rm_price"
                      value={formData.rm_price}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={!!errors.rm_price}
                      helperText={errors.rm_price}
                      placeholder="0.00"
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formData.rm_price ? 
                        `₹${calculateTotal(formData.rm_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                        : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* PM */}
                <TableRow sx={{ bgcolor: vendorTypes.pm ? 'inherit' : 'grey.100' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalShipping fontSize="small" color={vendorTypes.pm ? 'success' : 'disabled'} />
                      <Typography variant="body2">Packing Material</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" disabled={isLoading}>
                      <Select
                        name="pm_vendor_id"
                        value={formData.pm_vendor_id}
                        onChange={handleChange}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Select Vendor</em>
                        </MenuItem>
                        {vendors
                          .filter(v => v.vendor_type === 'PM')
                          .map(vendor => (
                            <MenuItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name} ({vendor.vendor_code})
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      name="pm_price"
                      value={formData.pm_price}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={!!errors.pm_price}
                      helperText={errors.pm_price}
                      placeholder="0.00"
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formData.pm_price ? 
                        `₹${calculateTotal(formData.pm_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                        : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * Only vendor types mapped in Medicine Master can be selected. Enter estimated prices for EOPA.
            </Typography>
          </Grid>

          {/* Remarks */}
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
          {isLoading ? 'Creating EOPAs...' : 'Create EOPAs'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EOPAForm
