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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Checkbox,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const MedicineForm = ({ open, onClose, onSubmit, medicine = null, isLoading = false }) => {
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [packingMaterials, setPackingMaterials] = useState([])
  const [medicineRMs, setMedicineRMs] = useState([])
  const [medicinePMs, setMedicinePMs] = useState([])
  const [tabValue, setTabValue] = useState(0)
  const { handleApiError } = useApiError()

  const [showRMForm, setShowRMForm] = useState(false)
  const [showPMForm, setShowPMForm] = useState(false)
  const [editingRMId, setEditingRMId] = useState(null)
  const [editingPMId, setEditingPMId] = useState(null)
  const [editingRMData, setEditingRMData] = useState(null)
  const [editingPMData, setEditingPMData] = useState(null)

  const [newRMRow, setNewRMRow] = useState({
    raw_material_id: '',
    qty_required_per_unit: '',
    uom: 'KG',
    vendor_id: '',
    wastage_percentage: 2.0,
    is_critical: false,
  })

  const [newPMRow, setNewPMRow] = useState({
    packing_material_id: '',
    qty_required_per_unit: '',
    uom: 'PCS',
    vendor_id: '',
    language_override: '',
    artwork_version_override: '',
    wastage_percentage: 2.0,
    is_critical: false,
  })
  
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
      fetchRawMaterials()
      fetchPackingMaterials()
      if (medicine?.id) {
        fetchMedicineRMs(medicine.id)
        fetchMedicinePMs(medicine.id)
      }
    }
  }, [open, medicine?.id])

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

  const fetchRawMaterials = async () => {
    try {
      const response = await api.get('/api/raw-materials/', { params: { is_active: true } })
      if (response.data.success) {
        setRawMaterials(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch raw materials:', err)
    }
  }

  const fetchPackingMaterials = async () => {
    try {
      const response = await api.get('/api/packing-materials/', { params: { is_active: true } })
      if (response.data.success) {
        setPackingMaterials(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch packing materials:', err)
    }
  }

  const fetchMedicineRMs = async (medicineId) => {
    console.log('🔍 Fetching medicine RMs for medicine ID:', medicineId)
    try {
      const response = await api.get(`/api/medicines/${medicineId}/raw-materials/`)
      console.log('✅ Raw Materials Response:', response.data)
      if (response.data.success) {
        console.log('📦 Setting Medicine RMs:', response.data.data)
        setMedicineRMs(response.data.data)
      }
    } catch (err) {
      console.error('❌ Failed to fetch medicine RMs:', err)
    }
  }

  const fetchMedicinePMs = async (medicineId) => {
    console.log('🔍 Fetching medicine PMs for medicine ID:', medicineId)
    try {
      const response = await api.get(`/api/medicines/${medicineId}/packing-materials/`)
      console.log('✅ Packing Materials Response:', response.data)
      if (response.data.success) {
        console.log('📦 Setting Medicine PMs:', response.data.data)
        setMedicinePMs(response.data.data)
      }
    } catch (err) {
      console.error('❌ Failed to fetch medicine PMs:', err)
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

  const handleAddRM = async (rmData) => {
    if (!medicine?.id) {
      alert('Please save the medicine first before adding raw materials')
      return
    }
    
    try {
      const response = await api.post(`/api/medicines/${medicine.id}/raw-materials/`, rmData)
      if (response.data.success) {
        fetchMedicineRMs(medicine.id)
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const handleEditRM = (medRM) => {
    setEditingRMId(medRM.id)
    setEditingRMData({...medRM})
  }

  const handleCancelEditRM = () => {
    setEditingRMId(null)
    setEditingRMData(null)
  }

  const handleSaveEditRM = async (editData) => {
    if (!medicine?.id) return

    try {
      const payload = {
        raw_material_id: editData.raw_material_id || editData.raw_material.id,
        qty_required_per_unit: parseFloat(editData.qty_required_per_unit),
        uom: editData.uom,
        vendor_id: editData.vendor_id || editData.vendor?.id || null,
        wastage_percentage: parseFloat(editData.wastage_percentage || 0),
        is_critical: editData.is_critical || false,
      }

      const response = await api.put(`/api/medicines/raw-materials/${editData.id}`, payload)
      
      if (response.data.success) {
        await fetchMedicineRMs(medicine.id)
        setEditingRMId(null)
        setEditingRMData(null)
      }
    } catch (err) {
      console.error('Error updating medicine RM:', err)
      handleApiError(err)
    }
  }

  const handleDeleteRM = async (mappingId) => {
    if (!window.confirm('Delete this raw material from BOM?')) return
    
    console.log('🗑️ Deleting RM mapping ID:', mappingId)
    try {
      const response = await api.delete(`/api/medicines/raw-materials/${mappingId}`)
      console.log('✅ Delete RM Response:', response.data)
      if (response.data.success) {
        console.log('🎉 RM deleted successfully!')
        setMedicineRMs(medicineRMs.filter(rm => rm.id !== mappingId))
      }
    } catch (err) {
      console.error('❌ Delete RM Error:', err)
      handleApiError(err)
    }
  }

  const handleAddPM = async (pmData) => {
    if (!medicine?.id) {
      alert('Please save the medicine first before adding packing materials')
      return
    }
    
    try {
      const response = await api.post(`/api/medicines/${medicine.id}/packing-materials/`, pmData)
      if (response.data.success) {
        fetchMedicinePMs(medicine.id)
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const handleEditPM = (medPM) => {
    setEditingPMId(medPM.id)
    setEditingPMData({...medPM})
  }

  const handleCancelEditPM = () => {
    setEditingPMId(null)
    setEditingPMData(null)
  }

  const handleSaveEditPM = async (editData) => {
    if (!medicine?.id) return

    try {
      const payload = {
        packing_material_id: editData.packing_material_id || editData.packing_material.id,
        qty_required_per_unit: parseFloat(editData.qty_required_per_unit),
        uom: editData.uom,
        vendor_id: editData.vendor_id || editData.vendor?.id || null,
        language_override: editData.language_override || null,
        artwork_version_override: editData.artwork_version_override || null,
        wastage_percentage: parseFloat(editData.wastage_percentage || 0),
        is_critical: editData.is_critical || false,
      }

      const response = await api.put(`/api/medicines/packing-materials/${editData.id}`, payload)
      
      if (response.data.success) {
        await fetchMedicinePMs(medicine.id)
        setEditingPMId(null)
        setEditingPMData(null)
      }
    } catch (err) {
      console.error('Error updating medicine PM:', err)
      handleApiError(err)
    }
  }

  const handleDeletePM = async (mappingId) => {
    if (!window.confirm('Delete this packing material from BOM?')) return
    
    console.log('🗑️ Deleting PM mapping ID:', mappingId)
    try {
      const response = await api.delete(`/api/medicines/packing-materials/${mappingId}`)
      console.log('✅ Delete PM Response:', response.data)
      if (response.data.success) {
        console.log('🎉 PM deleted successfully!')
        setMedicinePMs(medicinePMs.filter(pm => pm.id !== mappingId))
      }
    } catch (err) {
      console.error('❌ Delete PM Error:', err)
      handleApiError(err)
    }
  }

  const handleSaveNewRM = async () => {
    if (!newRMRow.raw_material_id || !newRMRow.qty_required_per_unit) {
      console.warn('⚠️ Cannot save RM: Missing required fields', newRMRow)
      return
    }

    console.log('💾 Saving new Raw Material for medicine ID:', medicine.id)
    console.log('📝 Form data:', newRMRow)

    try {
      const payload = {
        medicine_id: medicine.id,
        raw_material_id: parseInt(newRMRow.raw_material_id),
        qty_required_per_unit: parseFloat(newRMRow.qty_required_per_unit),
        uom: newRMRow.uom,
        vendor_id: newRMRow.vendor_id ? parseInt(newRMRow.vendor_id) : null,
        wastage_percentage: parseFloat(newRMRow.wastage_percentage) || 0,
        is_critical: newRMRow.is_critical,
      }

      console.log('📤 POST Payload:', payload)
      const response = await api.post(`/api/medicines/${medicine.id}/raw-materials/`, payload)
      console.log('✅ Save RM Response:', response.data)
      
      if (response.data.success) {
        console.log('🎉 RM saved successfully! Fetching updated list...')
        fetchMedicineRMs(medicine.id)
        // Reset form
        setNewRMRow({
          raw_material_id: '',
          qty_required_per_unit: '',
          uom: 'KG',
          vendor_id: '',
          wastage_percentage: 2.0,
          is_critical: false,
        })
        setShowRMForm(false)
      } else {
        console.error('❌ Save RM failed: Response success was false')
      }
    } catch (err) {
      console.error('❌ Save RM Error:', err)
      console.error('Error Response:', err.response?.data)
      handleApiError(err)
    }
  }

  const handleSaveNewPM = async () => {
    if (!newPMRow.packing_material_id || !newPMRow.qty_required_per_unit) {
      console.warn('⚠️ Cannot save PM: Missing required fields', newPMRow)
      return
    }

    console.log('💾 Saving new Packing Material for medicine ID:', medicine.id)
    console.log('📝 Form data:', newPMRow)

    try {
      const payload = {
        medicine_id: medicine.id,
        packing_material_id: parseInt(newPMRow.packing_material_id),
        qty_required_per_unit: parseFloat(newPMRow.qty_required_per_unit),
        uom: newPMRow.uom,
        vendor_id: newPMRow.vendor_id ? parseInt(newPMRow.vendor_id) : null,
        language_override: newPMRow.language_override || null,
        artwork_version_override: newPMRow.artwork_version_override || null,
        wastage_percentage: parseFloat(newPMRow.wastage_percentage) || 0,
        is_critical: newPMRow.is_critical,
      }

      console.log('📤 POST Payload:', payload)
      const response = await api.post(`/api/medicines/${medicine.id}/packing-materials/`, payload)
      console.log('✅ Save PM Response:', response.data)
      
      if (response.data.success) {
        console.log('🎉 PM saved successfully! Fetching updated list...')
        fetchMedicinePMs(medicine.id)
        // Reset form
        setNewPMRow({
          packing_material_id: '',
          qty_required_per_unit: '',
          uom: 'PCS',
          vendor_id: '',
          language_override: '',
          artwork_version_override: '',
          wastage_percentage: 2.0,
          is_critical: false,
        })
        setShowPMForm(false)
      } else {
        console.error('❌ Save PM failed: Response success was false')
      }
    } catch (err) {
      console.error('❌ Save PM Error:', err)
      console.error('Error Response:', err.response?.data)
      handleApiError(err)
    }
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
            <Tab label="Raw Materials" />
            <Tab label="Packing Materials" />
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

        {/* Tab 5: Raw Materials BOM - Editable Grid */}
        {tabValue === 4 && (
          <Box>
            {!medicine?.id && (
              <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                Please save the medicine first before adding raw materials.
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">Raw Materials Bill of Materials (BOM)</Typography>
              {medicine?.id && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    console.log('🆕 "Add Raw Material" button clicked - showing form')
                    setShowRMForm(true)
                  }}
                >
                  Add Raw Material
                </Button>
              )}
            </Box>

            {medicineRMs.length === 0 && !medicine?.id && (
              <Alert severity="info">Save the medicine first to add raw materials.</Alert>
            )}
            
            {medicineRMs.length === 0 && medicine?.id && !showRMForm && (
              <Alert severity="info">
                No raw materials added yet. Click "Add Raw Material" to get started.
              </Alert>
            )}

            {(medicineRMs.length > 0 || showRMForm) && (
              <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 250 }}>Raw Material *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Qty/Unit *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>UOM *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 200 }}>Vendor</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Wastage %</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>Critical</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                  {/* Existing RM rows */}
                  {medicineRMs.map((medRM) => {
                    const isEditing = editingRMId === medRM.id
                    const displayData = isEditing ? editingRMData : medRM
                    
                    return (
                      <TableRow key={medRM.id} sx={{ '&:hover': { bgcolor: 'action.hover' }, bgcolor: isEditing ? 'action.selected' : 'inherit' }}>
                        <TableCell>
                          <Typography variant="body2">
                            {displayData.raw_material?.rm_code ? (
                              <><strong>{displayData.raw_material.rm_code}</strong> - {displayData.raw_material.rm_name}</>
                            ) : (
                              <>{displayData.raw_material?.rm_name || 'Unknown'}</>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {displayData.raw_material?.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.qty_required_per_unit
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={displayData.qty_required_per_unit}
                              onChange={(e) => setEditingRMData({ ...editingRMData, qty_required_per_unit: e.target.value })}
                              inputProps={{ step: 0.001, min: 0 }}
                              sx={{ width: 100 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.uom
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={displayData.uom}
                              onChange={(e) => setEditingRMData({ ...editingRMData, uom: e.target.value })}
                              sx={{ width: 100 }}
                            >
                              <MenuItem value="KG">KG</MenuItem>
                              <MenuItem value="GRAM">GRAM</MenuItem>
                              <MenuItem value="LITER">LITER</MenuItem>
                              <MenuItem value="ML">ML</MenuItem>
                              <MenuItem value="UNIT">UNIT</MenuItem>
                            </TextField>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.vendor?.vendor_name || displayData.raw_material?.default_vendor?.vendor_name || '-'
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={editingRMData.vendor_id || editingRMData.vendor?.id || ''}
                              onChange={(e) => setEditingRMData({ ...editingRMData, vendor_id: e.target.value })}
                              sx={{ minWidth: 150 }}
                            >
                              <MenuItem value="">-- Default --</MenuItem>
                              {vendors.filter(v => v.vendor_type === 'RM').map(vendor => (
                                <MenuItem key={vendor.id} value={vendor.id}>{vendor.vendor_name}</MenuItem>
                              ))}
                            </TextField>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            `${displayData.wastage_percentage || 0}%`
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={displayData.wastage_percentage || 0}
                              onChange={(e) => setEditingRMData({ ...editingRMData, wastage_percentage: e.target.value })}
                              inputProps={{ step: 0.1, min: 0, max: 100 }}
                              sx={{ width: 80 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.is_critical && <Chip label="✓" size="small" color="error" />
                          ) : (
                            <Checkbox
                              checked={displayData.is_critical || false}
                              onChange={(e) => setEditingRMData({ ...editingRMData, is_critical: e.target.checked })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditRM(medRM)}
                                title="Edit"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRM(medRM.id)}
                                title="Delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <Button size="small" onClick={() => handleSaveEditRM(editingRMData)} sx={{ mr: 0.5 }}>Save</Button>
                              <Button size="small" onClick={handleCancelEditRM}>Cancel</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  
                  {/* Add new RM row with inline dropdowns */}
                  {showRMForm && (
                    <TableRow sx={{ bgcolor: 'success.50' }}>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newRMRow.raw_material_id || ''}
                          onChange={(e) => {
                            console.log('🔧 Raw Material Selected:', e.target.value)
                            const selectedRM = rawMaterials.find(rm => rm.id === e.target.value)
                            console.log('📋 Selected RM Details:', selectedRM)
                            const updatedRow = {
                              ...newRMRow,
                              raw_material_id: e.target.value,
                              uom: selectedRM?.unit_of_measure || 'KG',
                              vendor_id: selectedRM?.default_vendor_id || ''
                            }
                            console.log('✏️ Updated newRMRow:', updatedRow)
                            setNewRMRow(updatedRow)
                          }}
                          placeholder="Select Raw Material"
                        >
                          <MenuItem value="">-- Select Raw Material --</MenuItem>
                          {rawMaterials.map((rm) => (
                            <MenuItem key={rm.id} value={rm.id}>
                              {rm.rm_code ? `${rm.rm_code} - ` : ''}{rm.rm_name} ({rm.category})
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={newRMRow.qty_required_per_unit}
                          onChange={(e) => {
                            console.log('🔢 Quantity Changed:', e.target.value)
                            const updatedRow = { ...newRMRow, qty_required_per_unit: e.target.value }
                            console.log('✏️ Updated newRMRow:', updatedRow)
                            setNewRMRow(updatedRow)
                          }}
                          inputProps={{ step: 0.001, min: 0 }}
                          placeholder="0.5"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newRMRow.uom}
                          onChange={(e) => setNewRMRow({ ...newRMRow, uom: e.target.value })}
                        >
                          <MenuItem value="KG">KG</MenuItem>
                          <MenuItem value="GRAM">GRAM</MenuItem>
                          <MenuItem value="LITER">LITER</MenuItem>
                          <MenuItem value="ML">ML</MenuItem>
                          <MenuItem value="UNIT">UNIT</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newRMRow.vendor_id || ''}
                          onChange={(e) => setNewRMRow({ ...newRMRow, vendor_id: e.target.value })}
                        >
                          <MenuItem value="">Default</MenuItem>
                          {getVendorsByType('RM').map((vendor) => (
                            <MenuItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={newRMRow.wastage_percentage}
                          onChange={(e) => setNewRMRow({ ...newRMRow, wastage_percentage: e.target.value })}
                          inputProps={{ step: 0.1, min: 0, max: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          size="small"
                          checked={newRMRow.is_critical}
                          onChange={(e) => setNewRMRow({ ...newRMRow, is_critical: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            console.log('🖱️ Add button clicked!')
                            console.log('📊 Current newRMRow state:', newRMRow)
                            console.log('✅ Button enabled:', !(!newRMRow.raw_material_id || !newRMRow.qty_required_per_unit))
                            handleSaveNewRM()
                          }}
                          disabled={!newRMRow.raw_material_id || !newRMRow.qty_required_per_unit}
                          title="Add to BOM"
                        >
                          <AddIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 6: Packing Materials BOM - Editable Grid */}
        {tabValue === 5 && (
          <Box>
            {!medicine?.id && (
              <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                Please save the medicine first before adding packing materials.
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">Packing Materials Bill of Materials (BOM)</Typography>
              {medicine?.id && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowPMForm(true)}
                >
                  Add Packing Material
                </Button>
              )}
            </Box>

            {medicinePMs.length === 0 && !medicine?.id && (
              <Alert severity="info">Save the medicine first to add packing materials.</Alert>
            )}
            
            {medicinePMs.length === 0 && medicine?.id && !showPMForm && (
              <Alert severity="info">
                No packing materials added yet. Click "Add Packing Material" to get started.
              </Alert>
            )}

            {(medicinePMs.length > 0 || showPMForm) && (
              <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 250 }}>Packing Material *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Qty/Unit *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>UOM *</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Language</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Artwork</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 200 }}>Vendor</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>Wastage %</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>Critical</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                  {/* Existing PM rows */}
                  {medicinePMs.map((medPM) => {
                    const isEditing = editingPMId === medPM.id
                    const displayData = isEditing ? editingPMData : medPM
                    
                    return (
                      <TableRow key={medPM.id} sx={{ '&:hover': { bgcolor: 'action.hover' }, bgcolor: isEditing ? 'action.selected' : 'inherit' }}>
                        <TableCell>
                          <Typography variant="body2">
                            {displayData.packing_material?.pm_code ? (
                              <><strong>{displayData.packing_material.pm_code}</strong> - {displayData.packing_material.pm_name}</>
                            ) : (
                              <>{displayData.packing_material?.pm_name || 'Unknown'}</>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {displayData.packing_material?.pm_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.qty_required_per_unit
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={displayData.qty_required_per_unit}
                              onChange={(e) => setEditingPMData({ ...editingPMData, qty_required_per_unit: e.target.value })}
                              inputProps={{ step: 0.001, min: 0 }}
                              sx={{ width: 100 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.uom
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={displayData.uom}
                              onChange={(e) => setEditingPMData({ ...editingPMData, uom: e.target.value })}
                              sx={{ width: 100 }}
                            >
                              <MenuItem value="PCS">PCS</MenuItem>
                              <MenuItem value="BOXES">BOXES</MenuItem>
                              <MenuItem value="ROLLS">ROLLS</MenuItem>
                              <MenuItem value="SHEETS">SHEETS</MenuItem>
                            </TextField>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.language_override || displayData.packing_material?.language || '-'
                          ) : (
                            <TextField
                              size="small"
                              value={displayData.language_override || ''}
                              onChange={(e) => setEditingPMData({ ...editingPMData, language_override: e.target.value })}
                              sx={{ width: 100 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.artwork_version_override || displayData.packing_material?.artwork_version || '-'
                          ) : (
                            <TextField
                              size="small"
                              value={displayData.artwork_version_override || ''}
                              onChange={(e) => setEditingPMData({ ...editingPMData, artwork_version_override: e.target.value })}
                              sx={{ width: 100 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.vendor?.vendor_name || displayData.packing_material?.default_vendor?.vendor_name || '-'
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={editingPMData.vendor_id || editingPMData.vendor?.id || ''}
                              onChange={(e) => setEditingPMData({ ...editingPMData, vendor_id: e.target.value })}
                              sx={{ minWidth: 150 }}
                            >
                              <MenuItem value="">-- Default --</MenuItem>
                              {vendors.filter(v => v.vendor_type === 'PM').map(vendor => (
                                <MenuItem key={vendor.id} value={vendor.id}>{vendor.vendor_name}</MenuItem>
                              ))}
                            </TextField>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            `${displayData.wastage_percentage || 0}%`
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={displayData.wastage_percentage || 0}
                              onChange={(e) => setEditingPMData({ ...editingPMData, wastage_percentage: e.target.value })}
                              inputProps={{ step: 0.1, min: 0, max: 100 }}
                              sx={{ width: 80 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            displayData.is_critical && <Chip label="✓" size="small" color="error" />
                          ) : (
                            <Checkbox
                              checked={displayData.is_critical || false}
                              onChange={(e) => setEditingPMData({ ...editingPMData, is_critical: e.target.checked })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing ? (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditPM(medPM)}
                                title="Edit"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePM(medPM.id)}
                                title="Delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <Button size="small" onClick={() => handleSaveEditPM(editingPMData)} sx={{ mr: 0.5 }}>Save</Button>
                              <Button size="small" onClick={handleCancelEditPM}>Cancel</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  
                  {/* Add new PM row with inline dropdowns */}
                  {showPMForm && (
                    <TableRow sx={{ bgcolor: 'success.50' }}>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newPMRow.packing_material_id || ''}
                          onChange={(e) => {
                            const selectedPM = packingMaterials.find(pm => pm.id === e.target.value)
                            setNewPMRow({
                              ...newPMRow,
                              packing_material_id: e.target.value,
                              uom: selectedPM?.unit_of_measure || 'PCS',
                              vendor_id: selectedPM?.default_vendor_id || '',
                              language_override: selectedPM?.language || '',
                              artwork_version_override: selectedPM?.artwork_version || '',
                            })
                          }}
                          placeholder="Select Packing Material"
                        >
                          <MenuItem value="">-- Select Packing Material --</MenuItem>
                          {packingMaterials.map((pm) => (
                            <MenuItem key={pm.id} value={pm.id}>
                              {pm.pm_code ? `${pm.pm_code} - ` : ''}{pm.pm_name} ({pm.pm_type})
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={newPMRow.qty_required_per_unit}
                          onChange={(e) => setNewPMRow({ ...newPMRow, qty_required_per_unit: e.target.value })}
                          inputProps={{ step: 0.001, min: 0 }}
                          placeholder="1"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newPMRow.uom}
                          onChange={(e) => setNewPMRow({ ...newPMRow, uom: e.target.value })}
                        >
                          <MenuItem value="PCS">PCS</MenuItem>
                          <MenuItem value="SHEETS">SHEETS</MenuItem>
                          <MenuItem value="ROLLS">ROLLS</MenuItem>
                          <MenuItem value="BOXES">BOXES</MenuItem>
                          <MenuItem value="UNIT">UNIT</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newPMRow.language_override}
                          onChange={(e) => setNewPMRow({ ...newPMRow, language_override: e.target.value })}
                        >
                          <MenuItem value="">Default</MenuItem>
                          <MenuItem value="EN">EN</MenuItem>
                          <MenuItem value="FR">FR</MenuItem>
                          <MenuItem value="AR">AR</MenuItem>
                          <MenuItem value="SP">SP</MenuItem>
                          <MenuItem value="HI">HI</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={newPMRow.artwork_version_override}
                          onChange={(e) => setNewPMRow({ ...newPMRow, artwork_version_override: e.target.value })}
                          placeholder="e.g., v2.0"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={newPMRow.vendor_id || ''}
                          onChange={(e) => setNewPMRow({ ...newPMRow, vendor_id: e.target.value })}
                        >
                          <MenuItem value="">Default</MenuItem>
                          {getVendorsByType('PM').map((vendor) => (
                            <MenuItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={newPMRow.wastage_percentage}
                          onChange={(e) => setNewPMRow({ ...newPMRow, wastage_percentage: e.target.value })}
                          inputProps={{ step: 0.1, min: 0, max: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          size="small"
                          checked={newPMRow.is_critical}
                          onChange={(e) => setNewPMRow({ ...newPMRow, is_critical: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveNewPM}
                          disabled={!newPMRow.packing_material_id || !newPMRow.qty_required_per_unit}
                          title="Add to BOM"
                        >
                          <AddIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </Box>
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
