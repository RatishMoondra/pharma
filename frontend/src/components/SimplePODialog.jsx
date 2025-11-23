import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Divider,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Checkbox,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Inventory2 as Inventory2Icon,
  LocalShipping as LocalShippingIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import api from '../services/api'

/**
 * Advanced Multi-Vendor, Multi-PO Creation Dialog
 * 
 * Features:
 * ✅ Automatically generates FG/RM/PM PO line items from EOPA + BOM explosion
 * ✅ Groups items by vendor (one tab per vendor with draft PO number)
 * ✅ Shows draft PO numbers (e.g., PO/24-25/RM/DRAFT/0001)
 * ✅ Updates to real PO numbers after successful save
 * ✅ EOPA Qty (readonly) vs Ordered Qty (editable)
 * ✅ Material dropdown without code prefix
 * ✅ Auto-calculations for value_amount, gst_amount, total_amount
 * ✅ Ship-To manufacturer support with auto-fill address
 * ✅ Submits multiple POs in batch (one per vendor tab)
 * ✅ Per-tab totals (Total Value, Total GST, Grand Total)
 * ✅ UI/UX inspired by POManagementDialog.jsx
 * 
 * EOPA → RM/PM/FG Explosion Logic:
 * - FG: Use EOPA items directly (Medicine Master manufacturer vendor)
 * - RM: Fetch medicine BOM, explode quantities (EOPA Qty × Qty/Unit)
 * - PM: Fetch medicine BOM, explode quantities (EOPA Qty × Qty/Unit)
 */
const SimplePODialog = ({ open, onClose, eopa, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  // Master data
  const [rawMaterials, setRawMaterials] = useState([])
  const [packingMaterials, setPackingMaterials] = useState([])
  const [medicines, setMedicines] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [vendors, setVendors] = useState([])
  
  // Vendor-grouped POs (array of {vendor_id, vendor_name, draft_po_number, real_po_number, items: []})
  const [vendorPOs, setVendorPOs] = useState([])
  
  // Active tab (vendor index)
  const [activeTab, setActiveTab] = useState(0)
  
  // PO Type from EOPA (FG, RM, PM)
  const poType = eopa?.selectedPOType || 'FG'
  
  useEffect(() => {
    if (open && eopa) {
      console.log('🎬 SimplePODialog opened:', { eopa, poType })
      loadMasterDataAndGeneratePOs()
    }
  }, [open, eopa, poType])
  
  /**
   * Load all master data + auto-generate vendor-grouped PO line items from EOPA
   */
  const loadMasterDataAndGeneratePOs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Loading master data and generating PO items...')
      
      // Step 1: Load master data
      const [rawMaterialsRes, packingMaterialsRes, medicinesRes, manufacturersRes, vendorsRes, eopaRes] = await Promise.all([
        api.get('/api/raw-materials/'),
        api.get('/api/packing-materials/'),
        api.get('/api/products/medicines'),
        api.get('/api/vendors/?vendor_type=MANUFACTURER'),
        api.get('/api/vendors/'),
        api.get(`/api/eopa/${eopa.id}`)
      ])
      
      setRawMaterials(rawMaterialsRes.data.data || [])
      setPackingMaterials(packingMaterialsRes.data.data || [])
      setMedicines(medicinesRes.data.data || [])
      setManufacturers(manufacturersRes.data.data || [])
      setVendors(vendorsRes.data.data || [])
      
      const eopaData = eopaRes.data.data
      console.log('📦 EOPA Data:', eopaData)
      console.log('📦 Loaded RM:', rawMaterialsRes.data.data?.length || 0)
      console.log('📦 Loaded PM:', packingMaterialsRes.data.data?.length || 0)
      console.log('📦 Loaded Medicines:', medicinesRes.data.data?.length || 0)
      console.log('🏭 Loaded Manufacturers:', manufacturersRes.data.data?.length || 0)
      console.log('🏪 Loaded Vendors:', vendorsRes.data.data?.length || 0)
      
      // Step 2: Generate vendor-grouped PO items based on poType
      const vendorMap = new Map()
      
      for (const eopaItem of eopaData.items || []) {
        if (!eopaItem.pi_item?.medicine) {
          console.error('❌ Missing medicine in EOPA item:', eopaItem)
          continue
        }
        
        const medicine = eopaItem.pi_item.medicine
        const eopaQty = parseFloat(eopaItem.quantity || 0)
        
        console.log(`\n🔬 Processing Medicine: ${medicine.medicine_name} (EOPA Qty: ${eopaQty})`)
        
        if (poType === 'RM') {
          // === RM: Fetch BOM and explode ===
          const rmBomRes = await api.get(`/api/medicines/${medicine.id}/raw-materials/`)
          const rmBomItems = rmBomRes.data.data || []
          
          console.log(`  📋 RM BOM Items: ${rmBomItems.length}`)
          
          rmBomItems.forEach(bomItem => {
            const explodedQty = eopaQty * parseFloat(bomItem.qty_required_per_unit || 0)
            const vendorId = bomItem.vendor_id || bomItem.raw_material?.default_vendor_id || medicine.rm_vendor_id
            const vendorName = bomItem.vendor?.vendor_name || bomItem.raw_material?.default_vendor?.vendor_name || medicine.rm_vendor?.vendor_name || 'Unknown Vendor'
            
            if (!vendorId) {
              console.warn(`  ⚠️ No vendor for RM: ${bomItem.raw_material.rm_name}`)
              return
            }
            
            if (!vendorMap.has(vendorId)) {
              vendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                draft_po_number: generateDraftPONumber(poType, vendorMap.size + 1),
                real_po_number: null,
                items: []
              })
            }
            
            vendorMap.get(vendorId).items.push({
              id: `rm-${medicine.id}-${bomItem.raw_material_id}-${Date.now()}`,
              raw_material_id: bomItem.raw_material_id,
              raw_material_name: bomItem.raw_material.rm_name,
              medicine_id: medicine.id,
              medicine_name: medicine.medicine_name,
              packing_material_id: null,
              description: bomItem.raw_material.rm_name,
              unit: bomItem.uom || 'KG',
              hsn_code: bomItem.raw_material.hsn_code || '',
              eopa_quantity: eopaQty,
              qty_per_unit: parseFloat(bomItem.qty_required_per_unit || 0),
              ordered_quantity: explodedQty,
              fulfilled_quantity: 0, // Will be saved to DB
              rate_per_unit: 0,
              value_amount: 0,
              gst_rate: parseFloat(bomItem.raw_material.gst_rate || 18),
              gst_amount: 0,
              total_amount: 0,
              delivery_schedule: 'Immediately',
              delivery_location: '',
              selected: true
            })
            
            console.log(`    ✅ RM: ${bomItem.raw_material.rm_name} | Vendor: ${vendorName} | Exploded Qty: ${explodedQty}`)
          })
        } else if (poType === 'PM') {
          // === PM: Fetch BOM and explode ===
          const pmBomRes = await api.get(`/api/medicines/${medicine.id}/packing-materials/`)
          const pmBomItems = pmBomRes.data.data || []
          
          console.log(`  📦 PM BOM Items: ${pmBomItems.length}`)
          
          pmBomItems.forEach(bomItem => {
            const explodedQty = eopaQty * parseFloat(bomItem.qty_required_per_unit || 0)
            const vendorId = bomItem.vendor_id || bomItem.packing_material?.default_vendor_id || medicine.pm_vendor_id
            const vendorName = bomItem.vendor?.vendor_name || bomItem.packing_material?.default_vendor?.vendor_name || medicine.pm_vendor?.vendor_name || 'Unknown Vendor'
            
            if (!vendorId) {
              console.warn(`  ⚠️ No vendor for PM: ${bomItem.packing_material.pm_name}`)
              return
            }
            
            if (!vendorMap.has(vendorId)) {
              vendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                draft_po_number: generateDraftPONumber(poType, vendorMap.size + 1),
                real_po_number: null,
                items: []
              })
            }
            
            vendorMap.get(vendorId).items.push({
              id: `pm-${medicine.id}-${bomItem.packing_material_id}-${Date.now()}`,
              packing_material_id: bomItem.packing_material_id,
              packing_material_name: bomItem.packing_material.pm_name,
              medicine_id: medicine.id,
              medicine_name: medicine.medicine_name,
              raw_material_id: null,
              description: bomItem.packing_material.pm_name,
              unit: bomItem.uom || 'PCS',
              hsn_code: bomItem.packing_material.hsn_code || '',
              eopa_quantity: eopaQty,
              qty_per_unit: parseFloat(bomItem.qty_required_per_unit || 0),
              ordered_quantity: explodedQty,
              fulfilled_quantity: 0,
              rate_per_unit: 0,
              value_amount: 0,
              gst_rate: parseFloat(bomItem.packing_material.gst_rate || 18),
              gst_amount: 0,
              total_amount: 0,
              delivery_schedule: 'Immediately',
              delivery_location: '',
              language: bomItem.language_override || bomItem.packing_material.language,
              artwork_version: bomItem.artwork_version_override || bomItem.packing_material.artwork_version,
              selected: true
            })
            
            console.log(`    ✅ PM: ${bomItem.packing_material.pm_name} | Vendor: ${vendorName} | Exploded Qty: ${explodedQty}`)
          })
        } else {
          // === FG: Use EOPA items directly with Medicine Master manufacturer ===
          const vendorId = medicine.manufacturer_vendor_id
          const vendorName = medicine.manufacturer_vendor?.vendor_name || 'Unknown Manufacturer'
          
          if (!vendorId) {
            console.warn(`  ⚠️ No manufacturer vendor for medicine: ${medicine.medicine_name}`)
            continue
          }
          
          if (!vendorMap.has(vendorId)) {
            vendorMap.set(vendorId, {
              vendor_id: vendorId,
              vendor_name: vendorName,
              draft_po_number: generateDraftPONumber(poType, vendorMap.size + 1),
              real_po_number: null,
              items: []
            })
          }
          
          vendorMap.get(vendorId).items.push({
            id: `fg-${medicine.id}-${Date.now()}`,
            medicine_id: medicine.id,
            medicine_name: medicine.medicine_name,
            raw_material_id: null,
            packing_material_id: null,
            description: medicine.medicine_name,
            unit: 'PCS',
            hsn_code: medicine.hsn_code || '',
            eopa_quantity: eopaQty,
            qty_per_unit: 1,
            ordered_quantity: eopaQty,
            fulfilled_quantity: 0,
            rate_per_unit: 0,
            value_amount: 0,
            gst_rate: parseFloat(medicine.gst_rate || 12),
            gst_amount: 0,
            total_amount: 0,
            delivery_schedule: 'Immediately',
            delivery_location: '',
            selected: true
          })
          
          console.log(`  🏭 FG: ${medicine.medicine_name} | Manufacturer: ${vendorName} | Qty: ${eopaQty}`)
        }
      }
      
      const vendorPOsArray = Array.from(vendorMap.values())
      
      console.log('\n📊 PO Generation Summary:')
      console.log(`  Total Vendors: ${vendorPOsArray.length}`)
      console.log(`  Total Items: ${vendorPOsArray.reduce((sum, v) => sum + v.items.length, 0)}`)
      
      setVendorPOs(vendorPOsArray)
      setActiveTab(0)
      
    } catch (err) {
      console.error('❌ Failed to load data:', err)
      setError(err.response?.data?.message || 'Failed to load PO data')
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Generate draft PO number (e.g., PO/24-25/RM/DRAFT/0001)
   */
  const generateDraftPONumber = (type, sequenceNumber) => {
    const fy = new Date().getFullYear().toString().slice(-2)
    const nextFY = (parseInt(fy) + 1).toString().padStart(2, '0')
    const seq = sequenceNumber.toString().padStart(4, '0')
    return `PO/${fy}-${nextFY}/${type}/DRAFT/${seq}`
  }
  
  /**
   * Handle item field changes within vendor PO tab
   */
  const handleItemChange = (vendorIndex, itemIndex, field, value) => {
    const updated = [...vendorPOs]
    const item = updated[vendorIndex].items[itemIndex]
    
    item[field] = value
    
    // Auto-calculate amounts if financial fields change
    if (['ordered_quantity', 'rate_per_unit', 'gst_rate'].includes(field)) {
      const qty = parseFloat(item.ordered_quantity || 0)
      const rate = parseFloat(item.rate_per_unit || 0)
      const gstRate = parseFloat(item.gst_rate || 0)
      
      item.value_amount = qty * rate
      item.gst_amount = (item.value_amount * gstRate) / 100
      item.total_amount = item.value_amount + item.gst_amount
    }
    
    setVendorPOs(updated)
  }
  
  /**
   * Handle ship-to manufacturer change (auto-fill address)
   */
  const handleShipToChange = (vendorIndex, manufacturerId) => {
    const updated = [...vendorPOs]
    const manufacturer = manufacturers.find(m => m.id === manufacturerId)
    
    updated[vendorIndex].ship_to_manufacturer_id = manufacturerId
    updated[vendorIndex].ship_to_address = manufacturer?.address || ''
    
    setVendorPOs(updated)
  }
  
  /**
   * Add new line item to vendor PO
   */
  const handleAddLineItem = (vendorIndex) => {
    const updated = [...vendorPOs]
    const newItem = {
      id: `new-${Date.now()}`,
      medicine_id: null,
      raw_material_id: null,
      packing_material_id: null,
      description: '',
      unit: poType === 'RM' ? 'KG' : 'PCS',
      hsn_code: '',
      eopa_quantity: 0,
      qty_per_unit: 0,
      ordered_quantity: 0,
      fulfilled_quantity: 0,
      rate_per_unit: 0,
      value_amount: 0,
      gst_rate: 18,
      gst_amount: 0,
      total_amount: 0,
      delivery_schedule: 'Immediately',
      delivery_location: '',
      selected: true,
      isNew: true
    }
    
    updated[vendorIndex].items.push(newItem)
    setVendorPOs(updated)
  }
  
  /**
   * Delete line item
   */
  const handleDeleteLineItem = (vendorIndex, itemIndex) => {
    const updated = [...vendorPOs]
    updated[vendorIndex].items.splice(itemIndex, 1)
    setVendorPOs(updated)
  }
  
  /**
   * Calculate per-tab totals
   */
  const calculateTabTotals = (vendorPO) => {
    const selectedItems = vendorPO.items.filter(item => item.selected)
    const totalValue = selectedItems.reduce((sum, item) => sum + parseFloat(item.value_amount || 0), 0)
    const totalGST = selectedItems.reduce((sum, item) => sum + parseFloat(item.gst_amount || 0), 0)
    const grandTotal = totalValue + totalGST
    
    return { totalValue, totalGST, grandTotal, itemCount: selectedItems.length }
  }
  
  /**
   * Submit all vendor POs in batch
   */
  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    
    try {
      console.log('🚀 Submitting multi-vendor POs...')
      
      const submitPromises = vendorPOs.map(async (vendorPO, vendorIndex) => {
        const selectedItems = vendorPO.items.filter(item => item.selected)
        
        if (selectedItems.length === 0) {
          console.warn(`⚠️ Vendor ${vendorPO.vendor_name} has no selected items, skipping...`)
          return null
        }
        
        // Build PO payload
        const payload = {
          eopa_id: eopa.id,
          vendor_id: vendorPO.vendor_id,
          po_type: poType,
          ship_to_manufacturer_id: vendorPO.ship_to_manufacturer_id || null,
          ship_to_address: vendorPO.ship_to_address || '',
          delivery_date: vendorPO.delivery_date || null,
          payment_terms: vendorPO.payment_terms || 'NET 30',
          freight_terms: vendorPO.freight_terms || 'FOB',
          currency_code: vendorPO.currency_code || 'INR',
          items: selectedItems.map(item => {
            const itemPayload = {
              medicine_id: item.medicine_id || null,
              raw_material_id: item.raw_material_id || null,
              packing_material_id: item.packing_material_id || null,
              description: item.description,
              unit: item.unit,
              hsn_code: item.hsn_code,
              ordered_quantity: parseFloat(item.ordered_quantity || 0),
              fulfilled_quantity: parseFloat(item.eopa_quantity || 0), // Save EOPA Qty to fulfilled_quantity
              rate_per_unit: parseFloat(item.rate_per_unit || 0),
              value_amount: parseFloat(item.value_amount || 0),
              gst_rate: parseFloat(item.gst_rate || 0),
              gst_amount: parseFloat(item.gst_amount || 0),
              total_amount: parseFloat(item.total_amount || 0),
              delivery_schedule: item.delivery_schedule || 'Immediately',
              delivery_location: item.delivery_location || ''
            }
            
            // Add PM-specific fields
            if (poType === 'PM') {
              itemPayload.language = item.language || ''
              itemPayload.artwork_version = item.artwork_version || ''
            }
            
            return itemPayload
          })
        }
        
        console.log(`📤 Submitting PO for vendor: ${vendorPO.vendor_name}`, payload)
        
        const response = await api.post('/api/po/generate-po-by-vendor', payload)
        const createdPO = response.data.data
        
        console.log(`✅ PO Created: ${createdPO.po_number}`)
        
        // Update draft PO number to real PO number
        const updated = [...vendorPOs]
        updated[vendorIndex].real_po_number = createdPO.po_number
        setVendorPOs(updated)
        
        return createdPO
      })
      
      const results = await Promise.all(submitPromises)
      const createdPOs = results.filter(r => r !== null)
      
      console.log(`🎉 Successfully created ${createdPOs.length} POs`)
      
      if (createdPOs.length > 0) {
        onSuccess(`Successfully created ${createdPOs.length} ${poType} PO(s)`)
        onClose()
      } else {
        setError('No POs were created (all vendors had zero selected items)')
      }
      
    } catch (err) {
      console.error('❌ Failed to submit POs:', err)
      setError(err.response?.data?.message || 'Failed to create POs')
    } finally {
      setSubmitting(false)
    }
  }
  
  /**
   * Get vendor type icon
   */
  const getVendorTypeIcon = () => {
    if (poType === 'FG') return <BusinessIcon />
    if (poType === 'RM') return <Inventory2Icon />
    if (poType === 'PM') return <LocalShippingIcon />
    return null
  }
  
  // Render UI
  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading PO data...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    )
  }
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        Create {poType} Purchase Orders
        <Typography variant="caption" display="block" color="text.secondary">
          EOPA: {eopa?.eopa_number} | {vendorPOs.length} Vendor(s) | Auto-Generated Line Items
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {vendorPOs.length === 0 ? (
          <Alert severity="warning">
            No {poType} vendors found. Please ensure:
            {poType === 'FG' && ' medicines have manufacturer vendors assigned.'}
            {poType === 'RM' && ' raw materials are assigned to medicine BOM with vendors.'}
            {poType === 'PM' && ' packing materials are assigned to medicine BOM with vendors.'}
          </Alert>
        ) : (
          <>
            {/* Vendor Tabs */}
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              {vendorPOs.map((vendorPO, index) => {
                const totals = calculateTabTotals(vendorPO)
                const poNumber = vendorPO.real_po_number || vendorPO.draft_po_number
                const isDraft = !vendorPO.real_po_number
                
                return (
                  <Tab
                    key={index}
                    icon={getVendorTypeIcon()}
                    iconPosition="start"
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {vendorPO.vendor_name}
                        </Typography>
                        <Chip
                          label={poNumber}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.7rem',
                            height: 20,
                            borderStyle: isDraft ? 'dashed' : 'solid',
                            borderColor: isDraft ? 'warning.main' : 'success.main',
                            color: isDraft ? 'warning.main' : 'success.main',
                            mt: 0.5
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {totals.itemCount} item(s) | ₹{totals.grandTotal.toFixed(2)}
                        </Typography>
                      </Box>
                    }
                  />
                )
              })}
            </Tabs>
            
            {/* Tab Content */}
            {vendorPOs.map((vendorPO, vendorIndex) => (
              <Box key={vendorIndex} hidden={activeTab !== vendorIndex}>
                {/* Vendor PO Header */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Vendor Details</Typography>
                      <Typography variant="body2"><strong>Vendor:</strong> {vendorPO.vendor_name}</Typography>
                      <Typography variant="body2"><strong>PO Number:</strong> {vendorPO.real_po_number || vendorPO.draft_po_number}</Typography>
                      <Typography variant="body2"><strong>PO Type:</strong> {poType}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel>Ship-To Manufacturer</InputLabel>
                        <Select
                          value={vendorPO.ship_to_manufacturer_id || ''}
                          onChange={(e) => handleShipToChange(vendorIndex, e.target.value)}
                          label="Ship-To Manufacturer"
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {manufacturers.map(m => (
                            <MenuItem key={m.id} value={m.id}>{m.vendor_name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <TextField
                        fullWidth
                        size="small"
                        label="Ship-To Address"
                        value={vendorPO.ship_to_address || ''}
                        onChange={(e) => {
                          const updated = [...vendorPOs]
                          updated[vendorIndex].ship_to_address = e.target.value
                          setVendorPOs(updated)
                        }}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Delivery Date"
                        value={vendorPO.delivery_date || ''}
                        onChange={(e) => {
                          const updated = [...vendorPOs]
                          updated[vendorIndex].delivery_date = e.target.value
                          setVendorPOs(updated)
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Payment Terms"
                        value={vendorPO.payment_terms || 'NET 30'}
                        onChange={(e) => {
                          const updated = [...vendorPOs]
                          updated[vendorIndex].payment_terms = e.target.value
                          setVendorPOs(updated)
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Freight Terms"
                        value={vendorPO.freight_terms || 'FOB'}
                        onChange={(e) => {
                          const updated = [...vendorPOs]
                          updated[vendorIndex].freight_terms = e.target.value
                          setVendorPOs(updated)
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
                
                {/* Line Items Table */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Line Items
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddLineItem(vendorIndex)}
                    variant="outlined"
                  >
                    Add Line Item
                  </Button>
                </Box>
                
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.200' }}>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>{poType === 'FG' ? 'Medicine' : poType === 'RM' ? 'Raw Material' : 'Packing Material'}</TableCell>
                        <TableCell>Medicine</TableCell>
                        <TableCell align="right">EOPA Qty</TableCell>
                        <TableCell align="right">Qty/Unit</TableCell>
                        <TableCell align="right" width="120px">Ordered Qty *</TableCell>
                        <TableCell width="80px">Unit</TableCell>
                        <TableCell align="right" width="100px">Rate</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right" width="80px">GST%</TableCell>
                        <TableCell align="right">GST Amt</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell width="60px">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vendorPO.items.map((item, itemIndex) => (
                        <TableRow 
                          key={item.id}
                          sx={{ 
                            bgcolor: item.selected ? 'white' : 'grey.50',
                            opacity: item.selected ? 1 : 0.6
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={item.selected}
                              onChange={(e) => handleItemChange(vendorIndex, itemIndex, 'selected', e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.raw_material_name || item.packing_material_name || item.medicine_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {item.medicine_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {item.eopa_quantity?.toFixed(2) || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {item.qty_per_unit?.toFixed(4) || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={item.ordered_quantity || 0}
                              onChange={(e) => handleItemChange(vendorIndex, itemIndex, 'ordered_quantity', e.target.value)}
                              inputProps={{ step: 0.01, min: 0 }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.unit}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={item.rate_per_unit || 0}
                              onChange={(e) => handleItemChange(vendorIndex, itemIndex, 'rate_per_unit', e.target.value)}
                              inputProps={{ step: 0.01, min: 0 }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">₹{parseFloat(item.value_amount || 0).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={item.gst_rate || 0}
                              onChange={(e) => handleItemChange(vendorIndex, itemIndex, 'gst_rate', e.target.value)}
                              inputProps={{ step: 0.01, min: 0, max: 100 }}
                              sx={{ width: '100%' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">₹{parseFloat(item.gst_amount || 0).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              ₹{parseFloat(item.total_amount || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteLineItem(vendorIndex, itemIndex)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Tab Totals */}
                <Paper sx={{ p: 2, mt: 2, bgcolor: 'primary.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Total Value:</strong></Typography>
                      <Typography variant="h6">₹{calculateTabTotals(vendorPO).totalValue.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Total GST:</strong></Typography>
                      <Typography variant="h6">₹{calculateTabTotals(vendorPO).totalGST.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2"><strong>Grand Total:</strong></Typography>
                      <Typography variant="h6" color="primary">₹{calculateTabTotals(vendorPO).grandTotal.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            ))}
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={submitting || vendorPOs.length === 0}
        >
          {submitting ? 'Creating POs...' : `Create ${vendorPOs.filter(v => v.items.some(i => i.selected)).length} PO(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SimplePODialog
