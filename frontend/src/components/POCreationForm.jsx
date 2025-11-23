import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Calculate as CalculateIcon } from '@mui/icons-material';
import apiService from '../services/apiService';

/**
 * PO Creation Form - Matches the screenshot layout exactly
 * 
 * Features:
 * - Editable table with material dropdown switching
 * - Auto-calculation of value, GST, and total amounts
 * - Support for RM, PM, and FG materials
 * - Material selection updates HSN, Unit, GST automatically
 * - Commercial fields: Rate, Value, GST%, GST Amt, Total Amount
 * - Delivery schedule per item
 */
const POCreationForm = ({ eopaId, poType, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [medicines, setMedicines] = useState([]);
  
  // PO Header
  const [poData, setPoData] = useState({
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    ship_to_address: '',
    ship_to_manufacturer_id: '',
    remarks: '',
    payment_terms: '',
    freight_terms: '',
    currency_code: 'INR',
    currency_exchange_rate: 1.0000
  });
  
  // PO Items (matching screenshot structure)
  const [items, setItems] = useState([
    {
      id: null,
      material_type: poType === 'RM' ? 'raw_material' : poType === 'PM' ? 'packing_material' : 'medicine',
      medicine_id: null,
      raw_material_id: null,
      packing_material_id: null,
      description: '',
      unit: '',
      hsn_code: '',
      quantity: 0,
      rate_per_unit: 0,
      value_amount: 0,
      gst_rate: 0,
      gst_amount: 0,
      total_amount: 0,
      delivery_schedule: 'Immediately',
      delivery_location: ''
    }
  ]);

  // Load master data
  useEffect(() => {
    loadMasterData();
  }, [poType]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      
      // Load vendors based on PO type
      const vendorType = poType === 'FG' ? 'MANUFACTURER' : poType === 'RM' ? 'RM' : 'PM';
      const vendorRes = await apiService.get(`/vendors/?vendor_type=${vendorType}`);
      setVendors(vendorRes.data.data || []);
      
      // Load materials based on PO type
      if (poType === 'RM') {
        const rmRes = await apiService.get('/raw-materials/');
        setRawMaterials(rmRes.data.data || []);
      } else if (poType === 'PM') {
        const pmRes = await apiService.get('/packing-materials/');
        setPackingMaterials(pmRes.data.data || []);
      } else if (poType === 'FG') {
        const medRes = await apiService.get('/medicines/');
        setMedicines(medRes.data.data || []);
      }
      
    } catch (err) {
      console.error('Error loading master data:', err);
      setError('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate amounts when rate or quantity changes
  const calculateItemAmounts = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate_per_unit) || 0;
    const gstRate = parseFloat(item.gst_rate) || 0;
    
    const value = qty * rate;
    const gstAmt = value * (gstRate / 100);
    const total = value + gstAmt;
    
    return {
      ...item,
      value_amount: value.toFixed(2),
      gst_amount: gstAmt.toFixed(2),
      total_amount: total.toFixed(2)
    };
  };

  // Handle material selection change
  const handleMaterialChange = async (index, materialType, materialId) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    
    // Reset material IDs
    item.medicine_id = null;
    item.raw_material_id = null;
    item.packing_material_id = null;
    
    // Set the selected material ID
    if (materialType === 'medicine') {
      item.medicine_id = materialId;
      const medicine = medicines.find(m => m.id === materialId);
      if (medicine) {
        item.description = medicine.medicine_name;
        item.unit = medicine.dosage_form || 'UNITS';
        item.hsn_code = medicine.hsn_code || '';
        item.gst_rate = medicine.gst_rate || 12;
      }
    } else if (materialType === 'raw_material') {
      item.raw_material_id = materialId;
      const rm = rawMaterials.find(r => r.id === materialId);
      if (rm) {
        item.description = rm.rm_name;
        item.unit = rm.unit_of_measure || 'KG';
        item.hsn_code = rm.hsn_code || '';
        item.gst_rate = rm.gst_rate || 18;
      }
    } else if (materialType === 'packing_material') {
      item.packing_material_id = materialId;
      const pm = packingMaterials.find(p => p.id === materialId);
      if (pm) {
        item.description = pm.pm_name;
        item.unit = pm.unit_of_measure || 'PCS';
        item.hsn_code = pm.hsn_code || '';
        item.gst_rate = pm.gst_rate || 18;
      }
    }
    
    item.material_type = materialType;
    updatedItems[index] = calculateItemAmounts(item);
    setItems(updatedItems);
  };

  // Handle field change for item
  const handleItemFieldChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    
    // Recalculate if it's a numeric field
    if (['quantity', 'rate_per_unit', 'gst_rate'].includes(field)) {
      updatedItems[index] = calculateItemAmounts(updatedItems[index]);
    }
    
    setItems(updatedItems);
  };

  // Add new row
  const addRow = () => {
    setItems([
      ...items,
      {
        id: null,
        material_type: poType === 'RM' ? 'raw_material' : poType === 'PM' ? 'packing_material' : 'medicine',
        medicine_id: null,
        raw_material_id: null,
        packing_material_id: null,
        description: '',
        unit: '',
        hsn_code: '',
        quantity: 0,
        rate_per_unit: 0,
        value_amount: 0,
        gst_rate: 0,
        gst_amount: 0,
        total_amount: 0,
        delivery_schedule: 'Immediately',
        delivery_location: ''
      }
    ]);
  };

  // Remove row
  const removeRow = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  // Calculate PO totals
  const calculateTotals = () => {
    const totalValue = items.reduce((sum, item) => sum + parseFloat(item.value_amount || 0), 0);
    const totalGST = items.reduce((sum, item) => sum + parseFloat(item.gst_amount || 0), 0);
    const totalInvoice = items.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
    
    return {
      totalValue: totalValue.toFixed(2),
      totalGST: totalGST.toFixed(2),
      totalInvoice: totalInvoice.toFixed(2)
    };
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const totals = calculateTotals();
      
      const payload = {
        ...poData,
        eopa_id: eopaId,
        po_type: poType,
        total_value_amount: parseFloat(totals.totalValue),
        total_gst_amount: parseFloat(totals.totalGST),
        total_invoice_amount: parseFloat(totals.totalInvoice),
        items: items.map(item => ({
          medicine_id: item.medicine_id,
          raw_material_id: item.raw_material_id,
          packing_material_id: item.packing_material_id,
          ordered_quantity: parseFloat(item.quantity),
          unit: item.unit,
          hsn_code: item.hsn_code,
          gst_rate: parseFloat(item.gst_rate),
          rate_per_unit: parseFloat(item.rate_per_unit),
          value_amount: parseFloat(item.value_amount),
          gst_amount: parseFloat(item.gst_amount),
          total_amount: parseFloat(item.total_amount),
          delivery_schedule: item.delivery_schedule,
          delivery_location: item.delivery_location
        }))
      };
      
      await onSubmit(payload);
      
    } catch (err) {
      console.error('Error submitting PO:', err);
      setError(err.response?.data?.message || 'Failed to create PO');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  // Get material options based on type
  const getMaterialOptions = (materialType) => {
    if (materialType === 'medicine') return medicines;
    if (materialType === 'raw_material') return rawMaterials;
    if (materialType === 'packing_material') return packingMaterials;
    return [];
  };

  if (loading && items.length === 1) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* PO Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Purchase Order - {poType} Type
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={poData.vendor_id}
                onChange={(e) => setPoData({ ...poData, vendor_id: e.target.value })}
                label="Vendor"
              >
                {vendors.map(v => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.vendor_code} - {v.vendor_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="PO Date"
              value={poData.po_date}
              onChange={(e) => setPoData({ ...poData, po_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Delivery Date"
              value={poData.delivery_date}
              onChange={(e) => setPoData({ ...poData, delivery_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ship To Address"
              value={poData.ship_to_address}
              onChange={(e) => setPoData({ ...poData, ship_to_address: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Payment Terms"
              value={poData.payment_terms}
              onChange={(e) => setPoData({ ...poData, payment_terms: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* PO Items Table (matching screenshot) */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Items</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addRow}
            variant="outlined"
            size="small"
          >
            Add Row
          </Button>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>CODE</TableCell>
                <TableCell>DESCRIPTION OF GOODS</TableCell>
                <TableCell>UNIT</TableCell>
                <TableCell>HSN CODE</TableCell>
                <TableCell>QUANTITY</TableCell>
                <TableCell>RATE PER UNIT(Rs)</TableCell>
                <TableCell>VALUE</TableCell>
                <TableCell>GST(Rate)</TableCell>
                <TableCell>GST AMT</TableCell>
                <TableCell>Total Amount(Rs)</TableCell>
                <TableCell>DELIVERY SCHEDULE</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => {
                const materialOptions = getMaterialOptions(item.material_type);
                const selectedMaterialId = item.medicine_id || item.raw_material_id || item.packing_material_id;
                const selectedMaterial = materialOptions.find(m => m.id === selectedMaterialId);
                
                return (
                  <TableRow key={index}>
                    {/* CODE - Material Dropdown */}
                    <TableCell>
                      <Select
                        size="small"
                        value={selectedMaterialId || ''}
                        onChange={(e) => handleMaterialChange(index, item.material_type, e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="">Select...</MenuItem>
                        {materialOptions.map(m => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.rm_code || m.pm_code || m.medicine_code || m.id}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    
                    {/* DESCRIPTION */}
                    <TableCell>
                      <TextField
                        size="small"
                        value={item.description}
                        onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                        sx={{ minWidth: 200 }}
                      />
                    </TableCell>
                    
                    {/* UNIT */}
                    <TableCell>
                      <TextField
                        size="small"
                        value={item.unit}
                        onChange={(e) => handleItemFieldChange(index, 'unit', e.target.value)}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    
                    {/* HSN CODE */}
                    <TableCell>
                      <TextField
                        size="small"
                        value={item.hsn_code}
                        onChange={(e) => handleItemFieldChange(index, 'hsn_code', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    
                    {/* QUANTITY */}
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    
                    {/* RATE PER UNIT */}
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={item.rate_per_unit}
                        onChange={(e) => handleItemFieldChange(index, 'rate_per_unit', e.target.value)}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    
                    {/* VALUE (calculated) */}
                    <TableCell>
                      <Typography variant="body2">{item.value_amount}</Typography>
                    </TableCell>
                    
                    {/* GST RATE */}
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={item.gst_rate}
                        onChange={(e) => handleItemFieldChange(index, 'gst_rate', e.target.value)}
                        sx={{ width: 80 }}
                        InputProps={{ endAdornment: '%' }}
                      />
                    </TableCell>
                    
                    {/* GST AMOUNT (calculated) */}
                    <TableCell>
                      <Typography variant="body2">{item.gst_amount}</Typography>
                    </TableCell>
                    
                    {/* TOTAL AMOUNT (calculated) */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{item.total_amount}</Typography>
                    </TableCell>
                    
                    {/* DELIVERY SCHEDULE */}
                    <TableCell>
                      <TextField
                        size="small"
                        value={item.delivery_schedule}
                        onChange={(e) => handleItemFieldChange(index, 'delivery_schedule', e.target.value)}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    
                    {/* DELETE */}
                    <TableCell>
                      <IconButton size="small" onClick={() => removeRow(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Totals Summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} justifyContent="flex-end">
          <Grid item xs={12} md={4}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Total Value:</Typography>
              <Typography fontWeight="bold">₹ {totals.totalValue}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Total GST:</Typography>
              <Typography fontWeight="bold">₹ {totals.totalGST}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="h6">Total Invoice Amount:</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                ₹ {totals.totalInvoice}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || items.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Create Purchase Order
        </Button>
      </Box>
    </Box>
  );
};

export default POCreationForm;
