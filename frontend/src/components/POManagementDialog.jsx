import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'

// Local Service/Utility Imports
import api from '../services/api'
import { getVendorTypeIcon } from '../utils/poUtilities.jsx' 
import { RawMaterialInfo, PackingMaterialInfo } from '../components/po/MaterialInfoTooltips'

// Subcomponent Imports
import POGenerateTab from '../components/po/POGenerateTab'
import PODeleteTab from '../components/po/PODeleteTab'
import POActionFooter from '../components/po/POActionFooter'
import { usePODataFetcher } from '../hooks/usePODataFetcher'

// --- Main Component ---

/**
 * Main dialog for managing (generating or deleting) Purchase Orders (POs) related to an EOPA.
 */
const POManagementDialog = ({ open, onClose, eopa, mode, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0) // 0=RM, 1=PM, 2=FG
  const [submitting, setSubmitting] = useState(false)

  // 1. Data Fetching and State Management (Extracted to Hook)
  const {
    loading,
    setLoading,
    rmPOs,
    setRmPOs,
    pmPOs,
    setPmPOs,
    fgPOs,
    setFgPOs,
    existingRmPOs,
    setExistingRmPOs,
    existingPmPOs,
    setExistingPmPOs,
    existingFgPOs,
    setExistingFgPOs,
    medicines,
    vendors,
    rawMaterials,
    packingMaterials,
    fetchGenerateData,
    fetchExistingPOs,
    getExistingPOForVendor,
  } = usePODataFetcher(eopa, api)

  // 2. Initial Data Load Effect
  useEffect(() => {
    console.log('🎬 Dialog state changed:', { open, mode, eopaId: eopa?.id })
    if (open && eopa) {
      if (mode === 'generate') {
        fetchGenerateData()
        fetchExistingPOs() // Fetch existing POs even in generate mode for display
      } else if (mode === 'delete') {
        fetchExistingPOs()
      } else {
        // Reset state when not open or EOPA changes
        setRmPOs([])
        setPmPOs([])
        setFgPOs([])
        setExistingRmPOs([])
        setExistingPmPOs([])
        setExistingFgPOs([])
      }
    }
    setActiveTab(0); // Always start on RM tab
  }, [open, eopa, mode, fetchGenerateData, fetchExistingPOs, setRmPOs, setPmPOs, setFgPOs, setExistingRmPOs, setExistingPmPOs, setExistingFgPOs])

  // 3. Handlers for PO Generation Tab (Item & Vendor Level)
  const handleVendorSelectToggle = useCallback((poType, vendorIndex) => {
    const setters = { RM: setRmPOs, PM: setPmPOs, FG: setFgPOs };
    const lists = { RM: rmPOs, PM: pmPOs, FG: fgPOs };

    const toggleVendor = (posList) => {
      const updated = [...posList];
      if (updated[vendorIndex]) {
        updated[vendorIndex].selected = !updated[vendorIndex].selected;
      }
      return updated;
    };

    setters[poType](toggleVendor(lists[poType]));
  }, [rmPOs, pmPOs, fgPOs]);

  const handleAddLineItem = useCallback((poType, vendorIndex) => {
    let newItem = {};
    if (poType === 'RM') {
      newItem = { raw_material_id: '', ordered_quantity: 0, unit: 'kg', selected: true, isNew: true, isEditing: true };
    } else if (poType === 'PM') {
      newItem = { packing_material_id: '', ordered_quantity: 0, unit: 'boxes', selected: true, isNew: true, isEditing: true };
    } else {
      newItem = { medicine_id: '', ordered_quantity: 0, unit: 'pcs', selected: true, isNew: true, isEditing: true };
    }

    const setters = { RM: setRmPOs, PM: setPmPOs, FG: setFgPOs };
    const lists = { RM: rmPOs, PM: pmPOs, FG: fgPOs };

    const updated = [...lists[poType]];
    updated[vendorIndex].items.push(newItem);
    setters[poType](updated);
  }, [rmPOs, pmPOs, fgPOs]);

  const handleItemChange = useCallback((poType, vendorIndex, itemIndex, field, value) => {
    const setters = { RM: setRmPOs, PM: setPmPOs, FG: setFgPOs };
    const lists = { RM: rmPOs, PM: pmPOs, FG: fgPOs };

    const updatePOs = (posList) => {
      const updated = [...posList];
      const item = updated[vendorIndex].items[itemIndex];
      item[field] = value;

      // Update names/codes when ID changes
      if (field === 'raw_material_id' && poType === 'RM') {
        const rm = rawMaterials.find(r => r.id === value);
        item.raw_material_name = rm?.rm_name || '';
        item.raw_material_code = rm?.rm_code || '';
      } else if (field === 'packing_material_id' && poType === 'PM') {
        const pm = packingMaterials.find(p => p.id === value);
        item.packing_material_name = pm?.pm_name || '';
        item.packing_material_code = pm?.pm_code || '';
      } else if (field === 'medicine_id' && poType === 'FG') {
        const med = medicines.find(m => m.id === value);
        item.medicine_name = med?.medicine_name || '';
      }

      // Automatically exit editing mode when key fields are selected
      if (field === 'raw_material_id' || field === 'packing_material_id' || field === 'medicine_id') {
         item.isEditing = false;
         item.isNew = false;
      }
      
      // Ensure ordered_quantity is a number
      if (field === 'ordered_quantity') {
          item.ordered_quantity = parseFloat(value);
      }

      return updated;
    };

    setters[poType](updatePOs(lists[poType]));
  }, [rmPOs, pmPOs, fgPOs, rawMaterials, packingMaterials, medicines]);

  const handleDeleteLineItem = useCallback((poType, vendorIndex, itemIndex) => {
    const setters = { RM: setRmPOs, PM: setPmPOs, FG: setFgPOs };
    const lists = { RM: rmPOs, PM: pmPOs, FG: fgPOs };

    const updated = [...lists[poType]];
    updated[vendorIndex].items.splice(itemIndex, 1);
    setters[poType](updated);
  }, [rmPOs, pmPOs, fgPOs]);

  // 4. Handlers for PO Deletion Tab
  const handlePOSelectionToggle = useCallback((poType, index) => {
    const setters = { RM: setExistingRmPOs, PM: setExistingPmPOs, FG: setExistingFgPOs };
    const lists = { RM: existingRmPOs, PM: existingPmPOs, FG: existingFgPOs };

    const toggleSelection = (posList) => {
      const updated = [...posList];
      if (updated[index]) {
        updated[index].selected = !updated[index].selected;
      }
      return updated;
    };

    setters[poType](toggleSelection(lists[poType]));
  }, [existingRmPOs, existingPmPOs, existingFgPOs]);

  const handlePOSelectAllToggle = useCallback((poType, checked) => {
    const setters = { RM: setExistingRmPOs, PM: setExistingPmPOs, FG: setExistingFgPOs };
    const lists = { RM: existingRmPOs, PM: existingPmPOs, FG: existingFgPOs };
    const updated = lists[poType].map(po => ({ ...po, selected: checked }));
    setters[poType](updated);
  }, [existingRmPOs, existingPmPOs, existingFgPOs]);

  // 5. Action Handlers (Generate/Delete)
// 5. Action Handlers (Generate/Delete)
  const handleGeneratePOs = async () => {
    setSubmitting(true)
    try {
      const currentTab = activeTab === 0 ? 'RM' : activeTab === 1 ? 'PM' : 'FG'
      const posList = activeTab === 0 ? rmPOs : activeTab === 1 ? pmPOs : fgPOs

      const selectedVendors = posList.filter(v => v.selected)

      if (selectedVendors.length === 0) {
        alert('Please select at least one vendor to generate POs.')
        setSubmitting(false)
        return
      }

      // Logic to send data for generation/update
      const generatePromises = selectedVendors.map(async (vendorGroup) => {
        const existingPO = getExistingPOForVendor(currentTab, vendorGroup.vendor_id);
        
        // Skip locked POs (or handle update for draft)
        if (existingPO && existingPO.status !== 'DRAFT') return null;

        const selectedItems = vendorGroup.items.filter(item => item.selected && (item.raw_material_id || item.packing_material_id || item.medicine_id));
        if (selectedItems.length === 0) return null;

        const payload = {
          eopa_id: eopa.id,
          vendor_id: vendorGroup.vendor_id,
          po_type: currentTab,
          items: selectedItems.map(item => {
            // For FG, always include all items, even if id is missing
            const itemPayload = {
              ordered_quantity: parseFloat(item.ordered_quantity) || 0,
              unit: item.unit || 'pcs',
            };
            if (item.id) itemPayload.id = item.id;
            if (currentTab === 'RM') itemPayload.raw_material_id = item.raw_material_id;
            if (currentTab === 'PM') itemPayload.packing_material_id = item.packing_material_id;
            if (currentTab === 'FG') itemPayload.medicine_id = item.medicine_id;
            return itemPayload;
          })
        };
        
        if (existingPO) {
          // PUT to update existing DRAFT PO
          if (currentTab === 'FG') {
            console.log('UPDATE FG POS payload:', payload);
          }
          return api.put(`/api/po/${existingPO.id}`, payload); 
        } else {
          // POST to create new PO
          return api.post('/api/po', payload); 
        }
      });
      

      await Promise.all(generatePromises.filter(p => p !== null));
      // Re-fetch existing POs to refresh UI state with updated quantities
      await fetchExistingPOs();

      onSuccess(`Successfully generated/updated ${selectedVendors.length} ${currentTab} PO(s)`)
      onClose();

    } catch (err) {
      console.error('Failed to generate POs:', err)
      const errorMsg = err.response?.data?.message || 'Failed to generate/update POs'
      alert(errorMsg)
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

  // 6. Data for current tab
  const tabData = useMemo(() => {
    if (activeTab === 0) { // RM
      return {
        poType: 'RM',
        posList: rmPOs,
        existingList: existingRmPOs,
      };
    } else if (activeTab === 1) { // PM
      return {
        poType: 'PM',
        posList: pmPOs,
        existingList: existingPmPOs,
      };
    } else { // FG
      return {
        poType: 'FG',
        posList: fgPOs,
        existingList: existingFgPOs,
      };
    }
  }, [activeTab, rmPOs, pmPOs, fgPOs, existingRmPOs, existingPmPOs, existingFgPOs]);

  // 7. Render Logic
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {mode === 'generate' ? 'Generate Purchase Orders' : 'Delete Purchase Orders'}
        <Typography variant="caption" display="block" color="text.secondary">
          EOPA: **{eopa?.eopa_number}**
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="PO Type Tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {/* Tabs read from state directly */}
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

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && (
          <Box sx={{ minHeight: 400, pt: 2 }}>
            {/* Tab Panels: RM */}
            {activeTab === 0 && (
              mode === 'generate'
                ? <POGenerateTab
                    {...tabData}
                    // Raw Materials data for dropdowns
                    materials={rawMaterials}
                    materialKey="raw_material_id"
                    materialNameKey="raw_material_name"
                    materialCodeKey="raw_material_code"
                    medicineList={medicines}
                    getExistingPOForVendor={getExistingPOForVendor}
                    onVendorSelectToggle={handleVendorSelectToggle}
                    onAddLineItem={handleAddLineItem}
                    onItemChange={handleItemChange}
                    onDeleteLineItem={handleDeleteLineItem}
                  />
                : <PODeleteTab 
                    {...tabData}
                    onPOSelectionToggle={handlePOSelectionToggle} 
                    onPOSelectAllToggle={handlePOSelectAllToggle} 
                  />
            )}
            
            {/* Tab Panels: PM */}
            {activeTab === 1 && (
              mode === 'generate'
                ? <POGenerateTab
                    {...tabData}
                    // Packing Materials data for dropdowns
                    materials={packingMaterials}
                    materialKey="packing_material_id"
                    materialNameKey="packing_material_name"
                    materialCodeKey="packing_material_code"
                    medicineList={medicines}
                    getExistingPOForVendor={getExistingPOForVendor}
                    onVendorSelectToggle={handleVendorSelectToggle}
                    onAddLineItem={handleAddLineItem}
                    onItemChange={handleItemChange}
                    onDeleteLineItem={handleDeleteLineItem}
                  />
                : <PODeleteTab 
                    {...tabData}
                    onPOSelectionToggle={handlePOSelectionToggle} 
                    onPOSelectAllToggle={handlePOSelectAllToggle} 
                  />
            )}
            
            {/* Tab Panels: FG */}
            {activeTab === 2 && (
              mode === 'generate'
                ? <POGenerateTab
                    {...tabData}
                    // Finished Goods (FG) uses medicines as 'materials' for selection
                    materials={medicines}
                    materialKey="medicine_id"
                    materialNameKey="medicine_name"
                    materialCodeKey="medicine_code" 
                    medicineList={medicines}
                    getExistingPOForVendor={getExistingPOForVendor}
                    onVendorSelectToggle={handleVendorSelectToggle}
                    onAddLineItem={handleAddLineItem}
                    onItemChange={handleItemChange}
                    onDeleteLineItem={handleDeleteLineItem}
                  />
                : <PODeleteTab 
                    {...tabData}
                    onPOSelectionToggle={handlePOSelectionToggle} 
                    onPOSelectAllToggle={handlePOSelectAllToggle} 
                  />
            )}
          </Box>
        )}
      </DialogContent>

      {/* Action Footer */}
      <POActionFooter
        mode={mode}
        poType={tabData.poType}
        posList={tabData.posList}
        existingList={tabData.existingList}
        submitting={submitting}
        onGeneratePOs={handleGeneratePOs}
        onDeletePOs={handleDeletePOs}
        onClose={onClose}
        getExistingPOForVendor={getExistingPOForVendor}
      />
    </Dialog>
  )
}

export default POManagementDialog