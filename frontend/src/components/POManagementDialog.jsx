import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'
import api from '../services/api'
// Example import for Material-UI icons
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';



// Mini-component for RM info tooltip
const RawMaterialInfo = ({ raw_material_id }) => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleFetch = async () => {
    if (summary || loading) return
    setLoading(true)
    try {
      // Replace with your actual summary endpoint
      console.log('Fetching RM summary for ID:', raw_material_id);
      console.log(`/api/material-balance/summary/${raw_material_id}`);
      const res = await api.get(`/api/material-balance/summary/${raw_material_id}`)
      setSummary(res.data)
      console.log('Packing Material Balance Summary:', res.data);
    } catch (err) {
      setSummary({ ordered: '-', received: '-', balance: '-' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tooltip
      title={
        loading
          ? <CircularProgress size={16} />
          : summary
            ? `Ordered: ${summary.total_ordered} | Received: ${summary.total_received} | Balance: ${summary.total_balance}`
            : 'Show RM summary'
      }
      arrow
      open={open}
      onOpen={() => { setOpen(true); handleFetch() }}
      onClose={() => setOpen(false)}
    >
      <IconButton size="small">
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

// Mini-component for RM info tooltip
const PackingMaterialInfo = ({ packing_material_id }) => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleFetch = async () => {
    if (summary || loading) return
    setLoading(true)
    try {
      // Replace with your actual summary endpoint
      const res = await api.get(`/api/material-balance/pmsummary/${packing_material_id}`)
      setSummary(res.data)
      console.log('Packing Material Balance Summary:', res.data);
    } catch (err) {
      setSummary({ ordered: '-', received: '-', balance: '-' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tooltip
      title={
        loading
          ? <CircularProgress size={16} />
          : summary
            ? `Ordered: ${summary.total_ordered} | Received: ${summary.total_received} | Balance: ${summary.total_balance}`
            : 'Show RM summary'
      }
      arrow
      open={open}
      onOpen={() => { setOpen(true); handleFetch() }}
      onClose={() => setOpen(false)}
    >
      <IconButton size="small">
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}
const getVendorTypeIcon = (type) => {
  switch (type) {
    case 'MANUFACTURER':
    case 'FG':
      return <Business fontSize="small" />
    case 'RM':
      return <Inventory2 fontSize="small" />
    case 'PM':
      return <LocalShipping fontSize="small" />
    default:
      return null
  }
}

const POManagementDialog = ({ open, onClose, eopa, mode, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0) // 0=RM, 1=PM, 2=FG
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // PO Data grouped by vendor
  const [rmPOs, setRmPOs] = useState([]) // Array of {vendor_id, vendor_name, items: [{medicine_id, medicine_name, quantity, unit, selected}]}
  const [pmPOs, setPmPOs] = useState([])
  const [fgPOs, setFgPOs] = useState([])
  
  // Existing POs (for delete mode)
  const [existingRmPOs, setExistingRmPOs] = useState([])
  const [existingPmPOs, setExistingPmPOs] = useState([])
  const [existingFgPOs, setExistingFgPOs] = useState([])
  
  // Reference data
  const [medicines, setMedicines] = useState([])
  const [vendors, setVendors] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [packingMaterials, setPackingMaterials] = useState([])
  
  useEffect(() => {
    console.log('🎬 Dialog state changed:', { open, mode, eopaId: eopa?.id })
    if (open && eopa) {
      if (mode === 'generate') {
        console.log('▶️ Calling fetchGenerateData...')
        fetchGenerateData()
        // Also fetch existing POs to show them in generate mode
        fetchExistingPOs()
      } else if (mode === 'delete') {
        console.log('▶️ Calling fetchExistingPOs...')
        fetchExistingPOs()
      }
    }
  }, [open, eopa, mode])
  
  const fetchGenerateData = async () => {
    setLoading(true)
    try {
      console.log('🔍 Fetching PO generation data for EOPA:', eopa)
      console.log('📌 EOPA ID:', eopa?.id)
      console.log('📌 EOPA Number:', eopa?.eopa_number)
      
      if (!eopa?.id) {
        throw new Error('EOPA object is missing or has no ID')
      }
      
      // Fetch EOPA items with medicine details
      console.log(`🌐 API Call: GET /api/eopa/${eopa.id}`)
      const eopaRes = await api.get(`/api/eopa/${eopa.id}`)
      const eopaData = eopaRes.data.data
      console.log('📦 EOPA Data:', eopaData)
      
      // Fetch vendors, medicines, raw materials, and packing materials for dropdowns
      console.log('🔍 Fetching vendors, medicines, raw materials, and packing materials...')
      const [vendorsRes, medicinesRes, rawMaterialsRes, packingMaterialsRes] = await Promise.all([
        api.get('/api/vendors/'),
        api.get('/api/products/medicines'),
        api.get('/api/raw-materials/'),
        api.get('/api/packing-materials/')
      ])
      
      setVendors(vendorsRes.data.data || [])
      setMedicines(medicinesRes.data.data || [])
      setRawMaterials(rawMaterialsRes.data.data || [])
      setPackingMaterials(packingMaterialsRes.data.data || [])
      console.log('📦 Vendors loaded:', vendorsRes.data.data?.length || 0)
      console.log('📦 Medicines loaded:', medicinesRes.data.data?.length || 0)
      console.log('📦 Raw Materials loaded:', rawMaterialsRes.data.data?.length || 0)
      console.log('📦 Packing Materials loaded:', packingMaterialsRes.data.data?.length || 0)
      
      // Group items by vendor type and vendor
      const rmVendorMap = new Map()
      const pmVendorMap = new Map()
      const fgVendorMap = new Map()
      
      // Process each EOPA item (medicine with quantity)
      for (const eopaItem of eopaData.items || []) {

        console.log("🔍 EOPA Item:", eopaItem);

        // Step 1 — validate pi_item exists
        if (!eopaItem.pi_item) {
            console.error("❌ Missing pi_item in EOPA item:", eopaItem);
            continue;
        }

        // Step 2 — validate medicine exists
        const medicine = eopaItem.pi_item.medicine;

        if (!medicine) {
            console.error("❌ Missing medicine object inside pi_item:", eopaItem.pi_item);
            continue;
        }

        // Step 3 — extract values safely
        const medicineName = medicine.medicine_name || "(No name)";
        const medicineId = medicine.id || "(No ID)";
        const eopaQty = eopaItem.quantity || 0;

        console.log(`Processing Medicine: ${medicineName} (ID: ${medicineId}) - EOPA Qty: ${eopaQty}`);


        console.log('🔍 EOPA Item:', eopaItem)
        
        // const medicine = eopaItem.pi_item.medicine_id

        if (!medicine) {
                console.error("❌ Missing medicine object inside pi_item:", eopaItem.pi_item);
                continue;
            }        
        // const eopaQty = eopaItem.quantity
        
        if (!medicine) {
          console.error('❌ EOPA item missing medicine data:', eopaItem)
          console.error('   Item has pi_item_id:', eopaItem.pi_item_id)
          console.error('   Need to fetch medicine from pi_item instead')
          continue
        }
        
        console.log(`\n🔬 Processing Medicine: ${medicine.medicine_name} (ID: ${medicine.id}) - EOPA Qty: ${eopaQty}`)
        
        // === RM POs: Fetch BOM and explode ===
        try {
          const rmBomRes = await api.get(`/api/medicines/${medicine.id}/raw-materials/`)
          const rmBomItems = rmBomRes.data.data || []
          console.log(`  📋 RM BOM Items (${rmBomItems.length}):`, rmBomItems)
          
          rmBomItems.forEach(bomItem => {
            // Calculate exploded quantity: EOPA qty × qty_required_per_unit
            const explodedQty = parseFloat(eopaQty) * parseFloat(bomItem.qty_required_per_unit)
            
            // Use BOM vendor or fallback to RM default vendor or Medicine Master RM vendor
            const vendorId = bomItem.vendor_id || bomItem.raw_material?.default_vendor_id || medicine.rm_vendor_id
            const vendorName = bomItem.vendor?.vendor_name || bomItem.raw_material?.default_vendor?.vendor_name || medicine.rm_vendor?.vendor_name || 'Unknown'
            
            console.log(`    ✅ RM: ${bomItem.raw_material.rm_name} | Vendor: ${vendorName} | Qty/Unit: ${bomItem.qty_required_per_unit} | Exploded: ${explodedQty} ${bomItem.uom}`)
            
            if (!vendorId) {
              console.warn(`    ⚠️ No vendor found for RM: ${bomItem.raw_material.rm_name}`)
              return
            }
            
            if (!rmVendorMap.has(vendorId)) {
              rmVendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                items: [],
                selected: true
              })
            }
            
            rmVendorMap.get(vendorId).items.push({
              raw_material_id: bomItem.raw_material_id,
              raw_material_name: bomItem.raw_material.rm_name,
              raw_material_code: bomItem.raw_material.rm_code,
              medicine_id: medicine.id,
              medicine_name: medicine.medicine_name,
              eopa_quantity: eopaQty,
              qty_per_unit: bomItem.qty_required_per_unit,
              quantity: explodedQty,
              unit: bomItem.uom,
              selected: true
            })
          })
        } catch (err) {
          console.error(`  ❌ Failed to fetch RM BOM for medicine ${medicine.id}:`, err)
        }
        
        // === PM POs: Fetch BOM and explode ===
        try {
          const pmBomRes = await api.get(`/api/medicines/${medicine.id}/packing-materials/`)
          const pmBomItems = pmBomRes.data.data || []
          console.log(`  📦 PM BOM Items (${pmBomItems.length}):`, pmBomItems, pmBomRes.data.data)
          
          pmBomItems.forEach(bomItem => {
            const explodedQty = parseFloat(eopaQty) * parseFloat(bomItem.qty_required_per_unit)
            
            const vendorId = bomItem.vendor_id || bomItem.packing_material?.default_vendor_id || medicine.pm_vendor_id
            const vendorName = bomItem.vendor?.vendor_name || bomItem.packing_material?.default_vendor?.vendor_name || medicine.pm_vendor?.vendor_name || 'Unknown'
            
            console.log(`    ✅ PM: ${bomItem.packing_material.pm_name} | Vendor: ${vendorName} | Qty/Unit: ${bomItem.qty_required_per_unit} | Exploded: ${explodedQty} ${bomItem.uom}`)
            
            if (!vendorId) {
              console.warn(`    ⚠️ No vendor found for PM: ${bomItem.packing_material.pm_name}`)
              return
            }
            
            if (!pmVendorMap.has(vendorId)) {
              pmVendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                items: [],
                selected: true
              })
            }
            
            pmVendorMap.get(vendorId).items.push({
              packing_material_id: bomItem.packing_material_id,
              packing_material_name: bomItem.packing_material.pm_name,
              packing_material_code: bomItem.packing_material.pm_code,
              medicine_id: medicine.id,
              medicine_name: medicine.medicine_name,
              eopa_quantity: eopaQty,
              qty_per_unit: bomItem.qty_required_per_unit,
              quantity: explodedQty,
              unit: bomItem.uom,
              language: bomItem.language_override || bomItem.packing_material.language,
              artwork_version: bomItem.artwork_version_override || bomItem.packing_material.artwork_version,
              selected: true
            })
          })
        } catch (err) {
          console.error(`  ❌ Failed to fetch PM BOM for medicine ${medicine.id}:`, err)
        }
        
        // === FG POs: Use Medicine Master manufacturer vendor ===
        if (medicine?.manufacturer_vendor_id) {
          const vendorKey = medicine.manufacturer_vendor_id
          if (!fgVendorMap.has(vendorKey)) {
            fgVendorMap.set(vendorKey, {
              vendor_id: medicine.manufacturer_vendor_id,
              vendor_name: medicine.manufacturer_vendor?.vendor_name || 'Unknown',
              items: [],
              selected: true
            })
          }
          fgVendorMap.get(vendorKey).items.push({
            medicine_id: medicine.id,
            medicine_name: medicine.medicine_name,
            eopa_quantity: eopaQty,
            quantity: eopaQty,
            unit: 'pcs',
            selected: true
          })
          console.log(`  🏭 FG: ${medicine.medicine_name} | Vendor: ${medicine.manufacturer_vendor?.vendor_name} | Qty: ${eopaQty}`)
        }
      }
      
      const rmPOsArray = Array.from(rmVendorMap.values())
      const pmPOsArray = Array.from(pmVendorMap.values())
      const fgPOsArray = Array.from(fgVendorMap.values())
      
      console.log('\n📊 PO Generation Summary:')
      console.log(`  RM Vendors: ${rmPOsArray.length}, Total RM Items: ${rmPOsArray.reduce((sum, v) => sum + v.items.length, 0)}`)
      console.log(`  PM Vendors: ${pmPOsArray.length}, Total PM Items: ${pmPOsArray.reduce((sum, v) => sum + v.items.length, 0)}`)
      console.log(`  FG Vendors: ${fgPOsArray.length}, Total FG Items: ${fgPOsArray.reduce((sum, v) => sum + v.items.length, 0)}`)
      
      setRmPOs(rmPOsArray)
      setPmPOs(pmPOsArray)
      setFgPOs(fgPOsArray)
      
    } catch (err) {
      console.error('❌ Failed to fetch PO generation data:', err)
      console.error('❌ Error response:', err.response?.data)
      console.error('❌ Error message:', err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchExistingPOs = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/po/by-eopa/${eopa.id}`)
      const pos = response.data.data
      
      const rmList = pos.filter(po => po.po_type === 'RM').map(po => ({
        ...po,
        selected: false
      }))
      const pmList = pos.filter(po => po.po_type === 'PM').map(po => ({
        ...po,
        selected: false
      }))
      const fgList = pos.filter(po => po.po_type === 'FG').map(po => ({
        ...po,
        selected: false
      }))
      
      setExistingRmPOs(rmList)
      setExistingPmPOs(pmList)
      setExistingFgPOs(fgList)
      
    } catch (err) {
      console.error('Failed to fetch existing POs:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddLineItem = (poType, vendorIndex) => {
    let newItem
    
    if (poType === 'RM') {
      newItem = {
        raw_material_id: '',
        raw_material_name: '',
        quantity: 0,
        unit: 'kg',
        selected: true,
        isNew: true
      }
    } else if (poType === 'PM') {
      newItem = {
        packing_material_id: '',
        packing_material_name: '',
        quantity: 0,
        unit: 'boxes',
        selected: true,
        isNew: true
      }
    } else {
      newItem = {
        medicine_id: '',
        medicine_name: '',
        quantity: 0,
        unit: 'pcs',
        selected: true,
        isNew: true
      }
    }
    
    if (poType === 'RM') {
      const updated = [...rmPOs]
      updated[vendorIndex].items.push(newItem)
      setRmPOs(updated)
    } else if (poType === 'PM') {
      const updated = [...pmPOs]
      updated[vendorIndex].items.push(newItem)
      setPmPOs(updated)
    } else if (poType === 'FG') {
      const updated = [...fgPOs]
      updated[vendorIndex].items.push(newItem)
      setFgPOs(updated)
    }
  }
  
  const handleItemChange = (poType, vendorIndex, itemIndex, field, value) => {
    const updatePOs = (posList) => {
      const updated = [...posList]
      updated[vendorIndex].items[itemIndex][field] = value
      
      // Update name when ID changes
      if (poType === 'RM' && field === 'raw_material_id') {
        const rawMaterial = rawMaterials.find(rm => rm.id === value)
        updated[vendorIndex].items[itemIndex].raw_material_name = rawMaterial?.rm_name || ''
        updated[vendorIndex].items[itemIndex].raw_material_code = rawMaterial?.rm_code || ''
      } else if (poType === 'PM' && field === 'packing_material_id') {
        const packingMaterial = packingMaterials.find(pm => pm.id === value)
        updated[vendorIndex].items[itemIndex].packing_material_name = packingMaterial?.pm_name || ''
        updated[vendorIndex].items[itemIndex].packing_material_code = packingMaterial?.pm_code || ''
      } else if (poType === 'FG' && field === 'medicine_id') {
        const medicine = medicines.find(m => m.id === value)
        updated[vendorIndex].items[itemIndex].medicine_name = medicine?.medicine_name || ''
      }
      
      return updated
    }
    
    if (poType === 'RM') setRmPOs(updatePOs(rmPOs))
    else if (poType === 'PM') setPmPOs(updatePOs(pmPOs))
    else if (poType === 'FG') setFgPOs(updatePOs(fgPOs))
  }
  
  const handleDeleteLineItem = (poType, vendorIndex, itemIndex) => {
    const deleteLine = (posList) => {
      const updated = [...posList]
      updated[vendorIndex].items.splice(itemIndex, 1)
      return updated
    }
    
    if (poType === 'RM') setRmPOs(deleteLine(rmPOs))
    else if (poType === 'PM') setPmPOs(deleteLine(pmPOs))
    else if (poType === 'FG') setFgPOs(deleteLine(fgPOs))
  }
  
  const handleVendorSelectToggle = (poType, vendorIndex) => {
    const toggleVendor = (posList) => {
      const updated = [...posList]
      updated[vendorIndex].selected = !updated[vendorIndex].selected
      return updated
    }
    
    if (poType === 'RM') setRmPOs(toggleVendor(rmPOs))
    else if (poType === 'PM') setPmPOs(toggleVendor(pmPOs))
    else if (poType === 'FG') setFgPOs(toggleVendor(fgPOs))
  }
  
  const handleGeneratePOs = async () => {
    setSubmitting(true)
    try {
      const currentTab = activeTab === 0 ? 'RM' : activeTab === 1 ? 'PM' : 'FG'
      const posList = activeTab === 0 ? rmPOs : activeTab === 1 ? pmPOs : fgPOs
      
      console.log(`🚀 Generating ${currentTab} POs`)
      console.log(`📋 Total vendor groups: ${posList.length}`)
      
      // Get selected vendors (all vendors are auto-selected by default)
      const selectedVendors = posList.filter(v => v.selected)
      console.log(`✅ Selected vendors: ${selectedVendors.length}`)
      
      if (selectedVendors.length === 0) {
        const message = currentTab === 'RM' 
          ? 'No RM vendors found. Please add raw materials to medicine BOM with vendor assignments.'
          : currentTab === 'PM'
          ? 'No PM vendors found. Please add packing materials to medicine BOM with vendor assignments.'
          : 'No FG vendors found. Please ensure medicines have manufacturer vendors assigned in Medicine Master.'
        console.error('❌ No vendors found')
        alert(message)
        setSubmitting(false)
        return
      }
      
      // Route to specific endpoint based on tab
      let generateResponse
      
      if (currentTab === 'RM') {
        // RM POs: Use explosion-based endpoint (generates ALL RM POs at once)
        console.log('🔧 Calling RM explosion endpoint')
        generateResponse = await api.post(`/api/po/generate-rm-pos/${eopa.id}`)
      } else if (currentTab === 'PM') {
        // PM POs: Use explosion-based endpoint (generates ALL PM POs at once)
        console.log('🔧 Calling PM explosion endpoint')
        generateResponse = await api.post(`/api/po/generate-pm-pos/${eopa.id}`)
      } else {
        // FG POs: Generate per vendor-medicine using /api/po/generate-po-by-vendor
        console.log('🔧 Generating FG POs per vendor')
        const generatePromises = selectedVendors.map(async (vendorGroup) => {
          const selectedItems = vendorGroup.items.filter(item => item.selected && item.medicine_id)
          
          if (selectedItems.length === 0) return null
          
          const payload = {
            eopa_id: eopa.id,
            vendor_id: vendorGroup.vendor_id,
            po_type: currentTab,
            items: selectedItems.map(item => ({
              medicine_id: item.medicine_id,
              ordered_quantity: parseFloat(item.quantity),
              unit: item.unit
            }))
          }
          
          return api.post('/api/po/generate-po-by-vendor', payload)
        })
        
        await Promise.all(generatePromises.filter(p => p !== null))
      }
      
      onSuccess(`Successfully generated ${selectedVendors.length} ${currentTab} PO(s)`)
      onClose()
      
    } catch (err) {
      console.error('Failed to generate POs:', err)
      const errorMsg = err.response?.data?.message || 'Failed to generate POs'
      const errorCode = err.response?.data?.error_code
      
      // If duplicate PO error, show existing PO numbers
      if (errorCode === 'ERR_DUPLICATE_PO') {
        // Fetch existing POs to show numbers
        try {
          const existingRes = await api.get(`/api/po/by-eopa/${eopa.id}`)
          const existingPOs = existingRes.data.data || []
          const poNumbers = existingPOs
            .filter(po => po.po_type === currentTab)
            .map(po => po.po_number)
            .join(', ')
          
          if (poNumbers) {
            alert(`${errorMsg}\n\nExisting ${currentTab} POs: ${poNumbers}\n\nPlease delete them first if you want to regenerate.`)
          } else {
            alert(errorMsg)
          }
        } catch {
          alert(errorMsg)
        }
      } else {
        alert(errorMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleDeletePOs = async () => {
    setSubmitting(true)
    try {
      const currentTab = activeTab === 0 ? 'RM' : activeTab === 1 ? 'PM' : 'FG'
      const existingList = activeTab === 0 ? existingRmPOs : activeTab === 1 ? existingPmPOs : existingFgPOs
      
      const selectedPOs = existingList.filter(po => po.selected)
      
      if (selectedPOs.length === 0) {
        alert('Please select at least one PO to delete')
        setSubmitting(false)
        return
      }
      
      const deletePromises = selectedPOs.map(po => api.delete(`/api/po/${po.id}`))
      await Promise.all(deletePromises)
      
      onSuccess(`Successfully deleted ${selectedPOs.length} ${currentTab} PO(s)`)
      onClose()
      
    } catch (err) {
      console.error('Failed to delete POs:', err)
      alert(err.response?.data?.message || 'Failed to delete POs')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handlePOSelectionToggle = (poType, index) => {
    const toggleSelection = (posList) => {
      const updated = [...posList]
      updated[index].selected = !updated[index].selected
      return updated
    }
    
    if (poType === 'RM') setExistingRmPOs(toggleSelection(existingRmPOs))
    else if (poType === 'PM') setExistingPmPOs(toggleSelection(existingPmPOs))
    else if (poType === 'FG') setExistingFgPOs(toggleSelection(existingFgPOs))
  }
  
  // Helper to find existing PO for a vendor
  const getExistingPOForVendor = (poType, vendorId) => {
    const existingList = poType === 'RM' ? existingRmPOs : poType === 'PM' ? existingPmPOs : existingFgPOs
    return existingList.find(po => po.vendor_id === vendorId)
  }
  
  const renderGenerateTab = (poType, posList) => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )
    }
    
    if (posList.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {poType} vendors found in EOPA items. Please ensure medicines have {poType} vendors assigned.
        </Alert>
      )
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        {/* Show existing POs if any */}
        {((poType === 'RM' && existingRmPOs.length > 0) ||
          (poType === 'PM' && existingPmPOs.length > 0) ||
          (poType === 'FG' && existingFgPOs.length > 0)) && (() => {
            // Check how many vendors already have POs
            const existingList = poType === 'RM' ? existingRmPOs : poType === 'PM' ? existingPmPOs : existingFgPOs
            const draftPOs = existingList.filter(po => po.status === 'DRAFT')
            const lockedPOs = existingList.filter(po => po.status !== 'DRAFT')
            const vendorsWithPOs = posList.filter(vendor => getExistingPOForVendor(poType, vendor.vendor_id))
            const vendorsWithLockedPOs = posList.filter(vendor => {
              const po = getExistingPOForVendor(poType, vendor.vendor_id)
              return po && po.status !== 'DRAFT'
            })
            const allVendorsLocked = vendorsWithLockedPOs.length === posList.length
            const hasAnyDraft = draftPOs.length > 0
            
            return (
              <>
                {hasAnyDraft && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>DRAFT {poType} POs found (editable):</strong>{' '}
                    {draftPOs.map(po => po.po_number).join(', ')}
                    {'. You can edit quantities and items for DRAFT POs.'}
                  </Alert>
                )}
                {lockedPOs.length > 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Approved/Locked {poType} POs:</strong>{' '}
                    {lockedPOs.map(po => `${po.po_number} (${po.status})`).join(', ')}
                    {allVendorsLocked 
                      ? '. All POs are locked and cannot be edited. They must return to DRAFT status first.' 
                      : '. These POs are locked and cannot be edited until they return to DRAFT status.'
                    }
                  </Alert>
                )}
              </>
            )
          })()}
        
        {!((poType === 'RM' && existingRmPOs.length > 0) ||
           (poType === 'PM' && existingPmPOs.length > 0) ||
           (poType === 'FG' && existingFgPOs.length > 0)) && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>Ready to generate {poType} POs!</strong> The system has automatically detected {posList.length} vendor(s) 
            from your medicines. Review quantities and click "Generate {poType} POs" to create all POs at once.
          </Alert>
        )}
        
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {poType} Purchase Orders ({posList.filter(v => v.selected).length} vendor(s) selected)
        </Typography>
        
        {posList.map((vendorGroup, vendorIndex) => {
          const existingPO = getExistingPOForVendor(poType, vendorGroup.vendor_id)
          const hasExistingPO = !!existingPO
          const isDraftPO = existingPO?.status === 'DRAFT'
          const isEditable = !hasExistingPO || isDraftPO
          const isLocked = hasExistingPO && !isDraftPO
          
          return (
          <Paper key={vendorIndex} sx={{ 
            mb: 2, 
            p: 2, 
            bgcolor: isLocked ? 'grey.100' : isEditable && vendorGroup.selected ? 'white' : 'grey.50',
            border: isDraftPO ? '2px solid' : 'none',
            borderColor: 'warning.main'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Checkbox
                checked={vendorGroup.selected && isEditable}
                onChange={() => handleVendorSelectToggle(poType, vendorIndex)}
                disabled={isLocked}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: isLocked ? 'text.disabled' : 'primary.main' }}>
                    {vendorGroup.vendor_name}
                  </Typography>
                  {existingPO && (
                    <>
                      <Chip
                        label={existingPO.po_number}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderStyle: 'dashed',
                          borderWidth: 2,
                          borderColor: isDraftPO ? 'warning.main' : 'success.main',
                          color: isDraftPO ? 'warning.main' : 'success.main',
                          fontWeight: 'bold'
                        }}
                      />
                      <Chip
                        label={existingPO.status}
                        size="small"
                        color={isDraftPO ? 'warning' : existingPO.status === 'APPROVED' ? 'success' : 'default'}
                      />
                    </>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {isLocked ? `PO ${existingPO.status} - Locked (cannot edit)` : 
                   isDraftPO ? `${vendorGroup.items.length} item(s) - DRAFT (editable)` :
                   `${vendorGroup.items.length} item(s)`}
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleAddLineItem(poType, vendorIndex)}
                sx={{ mr: 1 }}
                disabled={isLocked}
              >
                Add Line Item
              </Button>
              <Chip
                icon={getVendorTypeIcon(poType)}
                label={poType}
                size="small"
                color={poType === 'FG' ? 'primary' : poType === 'RM' ? 'success' : 'warning'}
              />
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.200' }}>
                    <TableCell padding="checkbox">Select</TableCell>
                    <TableCell>{poType === 'FG' ? 'Medicine' : poType === 'RM' ? 'Raw Material' : 'Packing Material'}</TableCell>
                    <TableCell>Medicine</TableCell>
                    <TableCell align="right">EOPA Qty</TableCell>
                    <TableCell align="right">Qty/Unit</TableCell>
                    <TableCell align="right" width="120px">PO Quantity *</TableCell>
                    <TableCell width="120px">Unit</TableCell>
                    <TableCell width="50px">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorGroup.items.map((item, itemIndex) => (
                    <TableRow 
                      key={itemIndex}
                      sx={{ 
                        bgcolor: item.selected ? 'white' : 'grey.50',
                        opacity: item.selected ? 1 : 0.6
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={item.selected}
                          onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'selected', e.target.checked)}
                          disabled={isLocked}
                        />  
                      </TableCell>
                      <TableCell>
                        {item.isNew || item.isEditing ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FormControl fullWidth size="small">
                              {poType === 'RM' && (
                                <Select
                                  value={item.raw_material_id || ''}
                                  onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'raw_material_id', e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="" disabled>
                                    <em>Select Raw Material</em>
                                  </MenuItem>
                                  {rawMaterials.map(rm => (
                                    <MenuItem key={rm.id} value={rm.id}>
                                      {rm.rm_code} - {rm.rm_name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              )}
                              {poType === 'PM' && (
                                <Select
                                  value={item.packing_material_id || ''}
                                  onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'packing_material_id', e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="" disabled>
                                    <em>Select Packing Material</em>
                                  </MenuItem>
                                  {packingMaterials.map(pm => (
                                    <MenuItem key={pm.id} value={pm.id}>
                                      {pm.pm_code} - {pm.pm_name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              )}
                              {poType === 'FG' && (
                                <Select
                                  value={item.medicine_id || ''}
                                  onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'medicine_id', e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="" disabled>
                                    <em>Select Medicine</em>
                                  </MenuItem>
                                  {medicines.map(med => (
                                    <MenuItem key={med.id} value={med.id}>
                                      {med.medicine_name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              )}
                            </FormControl>
                            {item.isEditing && !item.isNew && (
                              <IconButton
                                size="small"
                                onClick={() => handleItemChange(poType, vendorIndex, itemIndex, 'isEditing', false)}
                                color="success"
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              {poType === 'RM' && (
                                <>
                                  <Typography variant="body2">
                                    <strong>{item.raw_material_code}</strong> - {item.raw_material_name}
                                  </Typography>
                                  <RawMaterialInfo raw_material_id={item.raw_material_id} />
                                </>
                              )}
                              {poType === 'PM' && (
                                <>
                                  <Typography variant="body2">
                                    <strong>{item.packing_material_code}</strong> - {item.packing_material_name}
                                    {item.language && <Chip label={item.language} size="small" sx={{ ml: 1 }} />}
                                    {item.artwork_version && <Chip label={item.artwork_version} size="small" sx={{ ml: 0.5 }} />}
                                  </Typography>
                                  <PackingMaterialInfo packing_material_id={item.packing_material_id} />
                                </>
                              )}
                              {poType === 'FG' && (
                                <Typography variant="body2">{item.medicine_name}</Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleItemChange(poType, vendorIndex, itemIndex, 'isEditing', true)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.medicine_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.eopa_quantity?.toLocaleString('en-IN') || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {item.qty_per_unit ? `${item.qty_per_unit}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'quantity', e.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          fullWidth
                          disabled={!item.selected || isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small" disabled={!item.selected}>
                          <Select
                            value={item.uom || item.unit || ''}
                            onChange={(e) => handleItemChange(poType, vendorIndex, itemIndex, 'unit', e.target.value)}
                            disabled={!item.selected || isLocked}
                          >
                            <MenuItem value="pcs">pcs</MenuItem>
                            <MenuItem value="kg">kg</MenuItem>
                            <MenuItem value="g">g</MenuItem>
                            <MenuItem value="mg">mg</MenuItem>
                            <MenuItem value="L">L</MenuItem>
                            <MenuItem value="ml">ml</MenuItem>
                            <MenuItem value="box">box</MenuItem>
                            <MenuItem value="piece">piece</MenuItem>
                            <MenuItem value="boxes">boxes</MenuItem>
                            <MenuItem value="bottles">bottles</MenuItem>
                            <MenuItem value="labels">labels</MenuItem>
                            <MenuItem value="cartons">cartons</MenuItem>
                            <MenuItem value="strips">strips</MenuItem>
                            <MenuItem value="vials">vials</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteLineItem(poType, vendorIndex, itemIndex)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )})}
      </Box>
    )
  }
  
  const renderDeleteTab = (poType, existingList) => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )
    }
    
    if (existingList.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {poType} POs found for this EOPA.
        </Alert>
      )
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Select {poType} POs to delete. This action cannot be undone.
        </Alert>
        
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={existingList.length > 0 && existingList.every(po => po.selected)}
                    indeterminate={existingList.some(po => po.selected) && !existingList.every(po => po.selected)}
                    onChange={(e) => {
                      const updateAll = (list) => list.map(po => ({ ...po, selected: e.target.checked }))
                      if (poType === 'RM') setExistingRmPOs(updateAll(existingRmPOs))
                      else if (poType === 'PM') setExistingPmPOs(updateAll(existingPmPOs))
                      else if (poType === 'FG') setExistingFgPOs(updateAll(existingFgPOs))
                    }}
                  />
                </TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell>Created Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {existingList.map((po, index) => (
                <TableRow 
                  key={po.id}
                  sx={{ 
                    bgcolor: po.selected ? 'error.50' : 'white',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={po.selected}
                      onChange={() => handlePOSelectionToggle(poType, index)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {po.po_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{po.vendor?.vendor_name || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={po.status}
                      size="small"
                      color={po.status === 'CLOSED' ? 'success' : po.status === 'PARTIAL' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{po.items?.length || 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(po.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Total POs selected for deletion: {existingList.filter(po => po.selected).length} / {existingList.length}
        </Typography>
      </Box>
    )
  }
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {mode === 'generate' ? 'Generate Purchase Orders' : 'Delete Purchase Orders'}
        <Typography variant="caption" display="block" color="text.secondary">
          EOPA: {eopa?.eopa_number}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<Inventory2 />} 
            iconPosition="start" 
            label={`RM (${mode === 'generate' ? rmPOs.filter(v => v.selected).length : existingRmPOs.filter(p => p.selected).length})`}
          />
          <Tab 
            icon={<LocalShipping />} 
            iconPosition="start" 
            label={`PM (${mode === 'generate' ? pmPOs.filter(v => v.selected).length : existingPmPOs.filter(p => p.selected).length})`}
          />
          <Tab 
            icon={<Business />} 
            iconPosition="start" 
            label={`FG (${mode === 'generate' ? fgPOs.filter(v => v.selected).length : existingFgPOs.filter(p => p.selected).length})`}
          />
        </Tabs>
        
        {/* Tab Panels */}
        {activeTab === 0 && (
          mode === 'generate' 
            ? renderGenerateTab('RM', rmPOs)
            : renderDeleteTab('RM', existingRmPOs)
        )}
        {activeTab === 1 && (
          mode === 'generate' 
            ? renderGenerateTab('PM', pmPOs)
            : renderDeleteTab('PM', existingPmPOs)
        )}
        {activeTab === 2 && (
          mode === 'generate' 
            ? renderGenerateTab('FG', fgPOs)
            : renderDeleteTab('FG', existingFgPOs)
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {mode === 'generate' ? (() => {
          const currentTab = activeTab === 0 ? 'RM' : activeTab === 1 ? 'PM' : 'FG'
          const posList = activeTab === 0 ? rmPOs : activeTab === 1 ? pmPOs : fgPOs
          const existingList = activeTab === 0 ? existingRmPOs : activeTab === 1 ? existingPmPOs : existingFgPOs
          
          // Check if all selected vendors have locked (non-DRAFT) POs
          const selectedVendors = posList.filter(v => v.selected)
          const vendorsWithLockedPOs = selectedVendors.filter(vendor => {
            const po = getExistingPOForVendor(currentTab, vendor.vendor_id)
            return po && po.status !== 'DRAFT'
          })
          const allSelectedLocked = selectedVendors.length > 0 && vendorsWithLockedPOs.length === selectedVendors.length
          
          const hasAnyDraft = selectedVendors.some(vendor => {
            const po = getExistingPOForVendor(currentTab, vendor.vendor_id)
            return po && po.status === 'DRAFT'
          })
          
          return (
            <Button
              onClick={handleGeneratePOs}
              variant="contained"
              color="primary"
              disabled={submitting || allSelectedLocked}
              startIcon={<ShoppingCartIcon />}
            >
              {submitting ? 'Generating...' : 
               allSelectedLocked ? `${currentTab} POs Locked (Cannot Edit)` :
               hasAnyDraft ? `Update ${currentTab} POs` :
               `Generate ${currentTab} POs`}
            </Button>
          )
        })() : (
          <Button
            onClick={handleDeletePOs}
            variant="contained"
            color="error"
            disabled={submitting}
            startIcon={<DeleteIcon />}
          >
            {submitting ? 'Deleting...' : `Delete ${activeTab === 0 ? 'RM' : activeTab === 1 ? 'PM' : 'FG'} POs`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default POManagementDialog
