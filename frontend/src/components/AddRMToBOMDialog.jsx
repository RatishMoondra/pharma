import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Autocomplete,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import ScienceIcon from '@mui/icons-material/Science'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const AddRMToBOMDialog = ({ open, onClose, onAdd, medicineId }) => {
  const [rawMaterials, setRawMaterials] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const { handleApiError } = useApiError()

  const [formData, setFormData] = useState({
    raw_material_id: null,
    qty_required_per_unit: '',
    uom: 'KG',
    vendor_id: null,
    rm_role: 'PRIMARY',
    wastage_percentage: 2.0,
    is_critical: false,
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchRawMaterials()
      fetchVendors()
    }
  }, [open])

  const fetchRawMaterials = async () => {
    try {
      const response = await api.get('/api/raw-materials/', { params: { is_active: true } })
      if (response.data.success) {
        setRawMaterials(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/api/vendors/')
      if (response.data.success) {
        setVendors(response.data.data.filter(v => v.vendor_type === 'RM'))
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_critical' ? checked : value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.raw_material_id) {
      alert('Please select a raw material')
      return
    }

    if (!formData.qty_required_per_unit || parseFloat(formData.qty_required_per_unit) <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    try {
      setLoading(true)
      const payload = {
        medicine_id: medicineId,
        raw_material_id: formData.raw_material_id,
        qty_required_per_unit: parseFloat(formData.qty_required_per_unit),
        uom: formData.uom,
        vendor_id: formData.vendor_id || null,
        rm_role: formData.rm_role,
        wastage_percentage: parseFloat(formData.wastage_percentage) || 0,
        is_critical: formData.is_critical,
        notes: formData.notes || null,
      }

      await onAdd(payload)
      handleClose()
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      raw_material_id: null,
      qty_required_per_unit: '',
      uom: 'KG',
      vendor_id: null,
      rm_role: 'PRIMARY',
      wastage_percentage: 2.0,
      is_critical: false,
      notes: '',
    })
    onClose()
  }

  const selectedRM = rawMaterials.find(rm => rm.id === formData.raw_material_id)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" />
          Add Raw Material to BOM
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Raw Material Selection */}
          <Grid item xs={12}>
            <Autocomplete
              options={rawMaterials}
              getOptionLabel={(option) => `${option.rm_code} - ${option.rm_name}`}
              value={selectedRM || null}
              onChange={(e, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  raw_material_id: newValue?.id || null,
                  uom: newValue?.unit_of_measure || 'KG',
                  vendor_id: newValue?.default_vendor_id || null,
                }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Select Raw Material *" placeholder="Search by code or name" />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2">
                      <strong>{option.rm_code}</strong> - {option.rm_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Category: {option.category || 'N/A'} | UOM: {option.unit_of_measure} | Purity: {option.standard_purity || 'N/A'}%
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>

          {/* Show selected RM details */}
          {selectedRM && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="info.dark" gutterBottom>
                  Selected Raw Material Details
                </Typography>
                <Typography variant="body2">
                  <strong>Code:</strong> {selectedRM.rm_code} | <strong>Category:</strong> {selectedRM.category || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Standard Purity:</strong> {selectedRM.standard_purity || 'N/A'}% | <strong>CAS Number:</strong> {selectedRM.cas_number || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Default Vendor:</strong> {selectedRM.default_vendor?.vendor_name || 'Not assigned'}
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Quantity */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity Required Per Unit *"
              name="qty_required_per_unit"
              type="number"
              value={formData.qty_required_per_unit}
              onChange={handleChange}
              inputProps={{ step: 0.001, min: 0 }}
              helperText="e.g., 0.5 kg per 1000 tablets"
            />
          </Grid>

          {/* UOM */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Unit of Measure *"
              name="uom"
              value={formData.uom}
              onChange={handleChange}
            >
              <MenuItem value="KG">KG</MenuItem>
              <MenuItem value="GRAM">GRAM</MenuItem>
              <MenuItem value="LITER">LITER</MenuItem>
              <MenuItem value="ML">ML</MenuItem>
              <MenuItem value="UNIT">UNIT</MenuItem>
            </TextField>
          </Grid>

          {/* Vendor Override */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => `${option.vendor_code} - ${option.vendor_name}`}
              value={vendors.find(v => v.id === formData.vendor_id) || null}
              onChange={(e, newValue) => {
                setFormData(prev => ({ ...prev, vendor_id: newValue?.id || null }))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Vendor Override (Optional)" helperText="Leave empty to use default vendor" />
              )}
            />
          </Grid>

          {/* RM Role */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="RM Role"
              name="rm_role"
              value={formData.rm_role}
              onChange={handleChange}
            >
              <MenuItem value="PRIMARY">Primary (Active Ingredient)</MenuItem>
              <MenuItem value="EXCIPIENT">Excipient</MenuItem>
              <MenuItem value="BINDER">Binder</MenuItem>
              <MenuItem value="FILLER">Filler</MenuItem>
              <MenuItem value="COATING">Coating Agent</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>
          </Grid>

          {/* Wastage Percentage */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Wastage Percentage"
              name="wastage_percentage"
              type="number"
              value={formData.wastage_percentage}
              onChange={handleChange}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
              helperText="Default: 2% (manufacturing wastage)"
            />
          </Grid>

          {/* Critical Flag */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  name="is_critical"
                  checked={formData.is_critical}
                  onChange={handleChange}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Critical Raw Material</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mark if this RM is essential (cannot substitute)
                  </Typography>
                </Box>
              }
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="e.g., Must be pharma grade, temperature sensitive"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !formData.raw_material_id}>
          {loading ? 'Adding...' : 'Add to BOM'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddRMToBOMDialog
