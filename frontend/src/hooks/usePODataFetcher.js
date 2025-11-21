import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage all data fetching and state for PO Management Dialog.
 * @param {object} eopa - The EOPA object.
 * @param {object} api - The API service object.
 * @returns {object} State variables and fetching functions.
 */
export const usePODataFetcher = (eopa, api) => {
  const [loading, setLoading] = useState(false);
  
  // PO Data grouped by vendor
  const [rmPOs, setRmPOs] = useState([]);
  const [pmPOs, setPmPOs] = useState([]);
  const [fgPOs, setFgPOs] = useState([]);
  
  // Existing POs (for delete mode/display in generate mode)
  const [existingRmPOs, setExistingRmPOs] = useState([]);
  const [existingPmPOs, setExistingPmPOs] = useState([]);
  const [existingFgPOs, setExistingFgPOs] = useState([]);
  
  // Reference data
  const [medicines, setMedicines] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  
  // Helper to find existing PO for a vendor
  const getExistingPOForVendor = useCallback((poType, vendorId) => {
    const existingList = poType === 'RM' ? existingRmPOs : poType === 'PM' ? existingPmPOs : existingFgPOs;
    return existingList.find(po => po.vendor_id === vendorId);
  }, [existingRmPOs, existingPmPOs, existingFgPOs]);


  const fetchExistingPOs = useCallback(async () => {
    setLoading(true);
    try {
      if (!eopa?.id) return;
      const response = await api.get(`/api/po/by-eopa/${eopa.id}`);
      const pos = response.data.data;
      

      const mapPOs = (type) => pos.filter(po => po.po_type === type).map(po => ({
        ...po,
        selected: false,
        items: (po.items || []).map(item => ({
          ...item,
          quantity: item.ordered_quantity // Always map ordered_quantity to quantity for UI
        }))
      }));

      setExistingRmPOs(mapPOs('RM'));
      setExistingPmPOs(mapPOs('PM'));
      setExistingFgPOs(mapPOs('FG'));
      
    } catch (err) {
      console.error('Failed to fetch existing POs:', err);
    } finally {
      setLoading(false);
    }
  }, [eopa, api]);
  

  const fetchGenerateData = useCallback(async () => {
    setLoading(true);
    try {
      if (!eopa?.id) throw new Error('EOPA object is missing or has no ID');
      
      // 1. Fetch EOPA items
      const eopaRes = await api.get(`/api/eopa/${eopa.id}`);
      const eopaData = eopaRes.data.data;
      
      // 2. Fetch Reference Data in parallel
      const [vendorsRes, medicinesRes, rawMaterialsRes, packingMaterialsRes] = await Promise.all([
        api.get('/api/vendors/'),
        api.get('/api/products/medicines'),
        api.get('/api/raw-materials/'),
        api.get('/api/packing-materials/')
      ]);
      
      setVendors(vendorsRes.data.data || []);
      setMedicines(medicinesRes.data.data || []);
      setRawMaterials(rawMaterialsRes.data.data || []);
      setPackingMaterials(packingMaterialsRes.data.data || []);
      
      // 3. Group items by vendor type and vendor
      const rmVendorMap = new Map();
      const pmVendorMap = new Map();
      const fgVendorMap = new Map();
      
      for (const eopaItem of eopaData.items || []) {
        const medicine = eopaItem.pi_item?.medicine;
        if (!medicine) continue;

        const eopaQty = eopaItem.quantity || 0;
        
        // --- RM POs: Fetch BOM and explode ---
        try { 
          const rmBomRes = await api.get(`/api/medicines/${medicine.id}/raw-materials/`);
          const rmBomItems = rmBomRes.data.data || [];
          
          rmBomItems.forEach(bomItem => {
            const explodedQty = parseFloat(eopaQty) * parseFloat(bomItem.qty_required_per_unit);
            
            const vendorId = bomItem.vendor_id || bomItem.raw_material?.default_vendor_id || medicine.rm_vendor_id;
            const vendorName = bomItem.vendor?.vendor_name || bomItem.raw_material?.default_vendor?.vendor_name || medicine.rm_vendor?.vendor_name || 'Unknown';
            
            if (!vendorId) return;
            
            if (!rmVendorMap.has(vendorId)) {
              rmVendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                items: [],
                selected: true
              });
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
            });
          });
        } catch (err) {
          console.error(`  ❌ Failed to fetch RM BOM for medicine ${medicine.id}:`, err);
        } // End of inner RM try/catch
        
        // --- PM POs: Fetch BOM and explode ---
        try { 
          const pmBomRes = await api.get(`/api/medicines/${medicine.id}/packing-materials/`);
          const pmBomItems = pmBomRes.data.data || [];
          
          pmBomItems.forEach(bomItem => {
            const explodedQty = parseFloat(eopaQty) * parseFloat(bomItem.qty_required_per_unit);
            
            const vendorId = bomItem.vendor_id || bomItem.packing_material?.default_vendor_id || medicine.pm_vendor_id;
            const vendorName = bomItem.vendor?.vendor_name || bomItem.packing_material?.default_vendor?.vendor_name || medicine.pm_vendor?.vendor_name || 'Unknown';
            
            if (!vendorId) return;
            
            if (!pmVendorMap.has(vendorId)) {
              pmVendorMap.set(vendorId, {
                vendor_id: vendorId,
                vendor_name: vendorName,
                items: [],
                selected: true
              });
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
            });
          });
        } catch (err) {
          console.error(`  ❌ Failed to fetch PM BOM for medicine ${medicine.id}:`, err);
        } // End of inner PM try/catch
        
        // --- FG POs: Use Medicine Master manufacturer vendor ---
        if (medicine?.manufacturer_vendor_id) {
          const vendorKey = medicine.manufacturer_vendor_id;
          if (!fgVendorMap.has(vendorKey)) {
            fgVendorMap.set(vendorKey, {
              vendor_id: medicine.manufacturer_vendor_id,
              vendor_name: medicine.manufacturer_vendor?.vendor_name || 'Unknown',
              items: [],
              selected: true
            });
          }
          fgVendorMap.get(vendorKey).items.push({
            medicine_id: medicine.id,
            medicine_name: medicine.medicine_name,
            eopa_quantity: eopaQty,
            quantity: eopaQty,
            unit: 'pcs',
            selected: true
          });
        }
      } // End of for...of loop
      
      setRmPOs(Array.from(rmVendorMap.values()));
      setPmPOs(Array.from(pmVendorMap.values()));
      setFgPOs(Array.from(fgVendorMap.values()));
      
    } catch (err) {
      console.error('❌ Failed to fetch PO generation data (main block):', err);
    } finally {
      setLoading(false);
    }
  }, [eopa, api]);

  return {
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
  };
};