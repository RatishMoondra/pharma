import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Collapse,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Inventory2 as Inventory2Icon,
  LocalShipping as LocalShippingIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const PORow = ({ po, vendors, onVendorUpdate, onInvoiceSubmit }) => {
  const [open, setOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [editingVendor, setEditingVendor] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(po.vendor_id)
  const [savingVendor, setSavingVendor] = useState(false)
  
  // Available vendor invoices (from external system/paper)
  const [availableInvoices, setAvailableInvoices] = useState([])
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('')
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]) // Available invoice items from selected invoice
  
  // Invoice entry state
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    items: []
  })

  const handleVendorEdit = () => {
    setEditingVendor(true)
  }

  const handleVendorSave = async () => {
    setSavingVendor(true)
    await onVendorUpdate(po.id, selectedVendor)
    setSavingVendor(false)
    setEditingVendor(false)
  }

  const handleVendorCancel = () => {
    setSelectedVendor(po.vendor_id)
    setEditingVendor(false)
  }

  const initializeInvoice = async () => {
    // Fetch all invoices to populate dropdown
    try {
      const response = await api.get(`/api/invoice/`)
      if (response.data.success) {
        // Show all invoices for reference (user can select any to copy data from)
        setAvailableInvoices(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    }
    
    // Only initialize items if we don't have them yet OR if we're resetting
    if (invoiceData.items.length === 0) {
      const invoiceItems = po.items?.map(item => {
        const orderedQty = parseFloat(item.ordered_quantity || 0)
        const fulfilledQty = parseFloat(item.fulfilled_quantity || 0)
        return {
          medicine_id: item.medicine_id,
          medicine_name: item.medicine?.medicine_name || 'N/A',
          ordered_quantity: orderedQty,
          fulfilled_quantity: fulfilledQty,
          remaining_quantity: orderedQty - fulfilledQty,
          shipped_quantity: 0,
          unit_price: 0,
          tax_rate: 18,
          batch_number: '',
          expiry_date: '',
          line_total: 0,
          tax_amount: 0,
          total_with_tax: 0
        }
      }) || []

      setInvoiceData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        dispatch_note_number: '',
        dispatch_date: '',
        warehouse_location: '',
        warehouse_received_by: '',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        items: invoiceItems
      })
    }
  }

  const handleInvoiceSelect = (invoiceNumber) => {
    setSelectedInvoiceNumber(invoiceNumber)
    
    if (!invoiceNumber) {
      // Reset to default
      setSelectedInvoiceItems([])
      initializeInvoice()
      return
    }
    
    const selectedInv = availableInvoices.find(inv => inv.invoice_number === invoiceNumber)
    if (!selectedInv) {
      setSelectedInvoiceItems([])
      return
    }
    
    // Store available invoice items for dropdown
    setSelectedInvoiceItems(selectedInv.items || [])
    
    // Map invoice items to PO items
    const updatedPoItems = invoiceData.items.map(poItem => {
      // Find matching invoice item by medicine_id
      const invItem = selectedInv.items?.find(item => item.medicine_id === poItem.medicine_id)
      
      if (invItem) {
        const shippedQty = parseFloat(invItem.shipped_quantity || 0)
        const unitPrice = parseFloat(invItem.unit_price || 0)
        const taxRate = parseFloat(invItem.tax_rate || 0)
        const lineTotal = shippedQty * unitPrice
        const taxAmount = lineTotal * (taxRate / 100)
        
        return {
          ...poItem,
          invoice_item_id: invItem.id, // Track which invoice item is mapped
          shipped_quantity: shippedQty,
          unit_price: unitPrice,
          tax_rate: taxRate,
          batch_number: invItem.batch_number || '',
          expiry_date: invItem.expiry_date || '',
          line_total: lineTotal,
          tax_amount: taxAmount,
          total_with_tax: lineTotal + taxAmount
        }
      }
      
      return { ...poItem, invoice_item_id: null } // No automatic mapping
    })
    
    const subtotal = updatedPoItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const tax_amount = updatedPoItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const total_amount = subtotal + tax_amount
    
    setInvoiceData({
      invoice_number: selectedInv.invoice_number,
      invoice_date: selectedInv.invoice_date,
      dispatch_note_number: selectedInv.dispatch_note_number || '',
      dispatch_date: selectedInv.dispatch_date || '',
      warehouse_location: selectedInv.warehouse_location || '',
      warehouse_received_by: selectedInv.warehouse_received_by || '',
      subtotal,
      tax_amount,
      total_amount,
      items: updatedPoItems
    })
  }

  const handleInvoiceItemMapping = (poItemIndex, invoiceItemId) => {
    const updatedItems = [...invoiceData.items]
    const poItem = updatedItems[poItemIndex]
    
    if (!invoiceItemId) {
      // Clear mapping
      poItem.invoice_item_id = null
    } else {
      // Find the selected invoice item
      const invItem = selectedInvoiceItems.find(item => item.id === parseInt(invoiceItemId))
      
      if (invItem) {
        const shippedQty = parseFloat(invItem.shipped_quantity || 0)
        const unitPrice = parseFloat(invItem.unit_price || 0)
        const taxRate = parseFloat(invItem.tax_rate || 0)
        const lineTotal = shippedQty * unitPrice
        const taxAmount = lineTotal * (taxRate / 100)
        
        poItem.invoice_item_id = invItem.id
        poItem.shipped_quantity = shippedQty
        poItem.unit_price = unitPrice
        poItem.tax_rate = taxRate
        poItem.batch_number = invItem.batch_number || ''
        poItem.expiry_date = invItem.expiry_date || ''
        poItem.line_total = lineTotal
        poItem.tax_amount = taxAmount
        poItem.total_with_tax = lineTotal + taxAmount
      }
    }
    
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const tax_amount = updatedItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const total_amount = subtotal + tax_amount

    setInvoiceData({
      ...invoiceData,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount
    })
  }

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceData.items]
    updatedItems[index][field] = value

    if (field === 'shipped_quantity' || field === 'unit_price' || field === 'tax_rate') {
      const item = updatedItems[index]
      const shippedQty = parseFloat(item.shipped_quantity || 0)
      const unitPrice = parseFloat(item.unit_price || 0)
      const taxRate = parseFloat(item.tax_rate || 0)
      
      item.line_total = shippedQty * unitPrice
      item.tax_amount = item.line_total * (taxRate / 100)
      item.total_with_tax = item.line_total + item.tax_amount
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const tax_amount = updatedItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const total_amount = subtotal + tax_amount

    setInvoiceData({
      ...invoiceData,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount
    })
  }

  const handleSubmitInvoice = async () => {
    await onInvoiceSubmit(po.id, invoiceData)
    // Reset invoice data and force re-initialization
    setInvoiceData({
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      items: []
    })
    setSelectedInvoiceNumber('')
    setSelectedInvoiceItems([])
    setTabValue(0) // Switch back to items tab
  }

  useEffect(() => {
    if (tabValue === 1 && open) {
      initializeInvoice()
    }
  }, [tabValue, open])

  return (
    <>
      <TableRow 
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            {po.po_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={
              po.po_type === 'FG' ? <BusinessIcon fontSize="small" /> :
              po.po_type === 'RM' ? <Inventory2Icon fontSize="small" /> :
              po.po_type === 'PM' ? <LocalShippingIcon fontSize="small" /> : null
            }
            label={
              po.po_type === 'FG' ? 'Finished Goods' :
              po.po_type === 'RM' ? 'Raw Materials' :
              po.po_type === 'PM' ? 'Packing Materials' : po.po_type
            }
            size="small"
            color={
              po.po_type === 'FG' ? 'primary' :
              po.po_type === 'RM' ? 'success' :
              po.po_type === 'PM' ? 'warning' : 'default'
            }
          />
        </TableCell>
        <TableCell>
          {editingVendor ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  disabled={savingVendor}
                >
                  {vendors
                    .filter(v => 
                      (po.po_type === 'FG' && v.vendor_type === 'MANUFACTURER') ||
                      (po.po_type === 'RM' && v.vendor_type === 'RM') ||
                      (po.po_type === 'PM' && v.vendor_type === 'PM')
                    )
                    .map(vendor => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name} ({vendor.vendor_code})
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              <IconButton size="small" onClick={handleVendorSave} disabled={savingVendor} color="success">
                <SaveIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleVendorCancel} disabled={savingVendor} color="error">
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="body2">
                  {po.vendor?.vendor_name || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {po.vendor?.vendor_code || ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={handleVendorEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {new Date(po.po_date).toLocaleDateString('en-IN')}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium">
            {parseFloat(po.total_ordered_qty || 0).toLocaleString('en-IN', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Fulfilled: {parseFloat(po.total_fulfilled_qty || 0).toLocaleString('en-IN')}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={po.status || 'OPEN'}
            size="small"
            color={
              po.status === 'CLOSED' ? 'success' :
              po.status === 'PARTIAL' ? 'warning' : 'default'
            }
          />
        </TableCell>
        <TableCell align="center">
          <Chip label={po.items?.length || 0} size="small" />
        </TableCell>
      </TableRow>

      {/* Expandable Section with Tabs */}
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, borderBottom: 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="PO Line Items" />
                <Tab 
                  label="Enter Invoice" 
                  icon={<ReceiptIcon />} 
                  iconPosition="start"
                  disabled={po.status === 'CLOSED'}
                />
              </Tabs>

              {/* Tab 0: PO Items */}
              {tabValue === 0 && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    PO Line Items ({po.items?.length || 0})
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Medicine</TableCell>
                        <TableCell>Dosage Form</TableCell>
                        <TableCell align="right">Ordered Qty</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Fulfilled Qty</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {po.items?.map((item, idx) => {
                        const orderedQty = parseFloat(item.ordered_quantity || 0)
                        const fulfilledQty = parseFloat(item.fulfilled_quantity || 0)
                        const fulfillmentPercent = orderedQty > 0 ? (fulfilledQty / orderedQty) * 100 : 0
                        
                        return (
                          <TableRow 
                            key={idx}
                            sx={{ 
                              bgcolor: idx % 2 === 0 ? 'white' : 'grey.100',
                              '&:hover': { bgcolor: 'primary.50' }
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.medicine?.medicine_name || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.medicine?.dosage_form || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {orderedQty.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={item.unit || 'pcs'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color={fulfilledQty > 0 ? 'success.main' : 'text.secondary'}>
                                {fulfilledQty.toLocaleString('en-IN')}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={
                                  fulfillmentPercent === 0 ? 'Open' :
                                  fulfillmentPercent === 100 ? 'Closed' : `${fulfillmentPercent.toFixed(0)}%`
                                }
                                size="small"
                                color={
                                  fulfillmentPercent === 0 ? 'default' :
                                  fulfillmentPercent === 100 ? 'success' : 'warning'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* Tab 1: Invoice Entry */}
              {tabValue === 1 && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Invoice Number *</InputLabel>
                        <Select
                          value={selectedInvoiceNumber}
                          onChange={(e) => handleInvoiceSelect(e.target.value)}
                          label="Invoice Number *"
                        >
                          <MenuItem value="">
                            <em>Select or Enter New Invoice</em>
                          </MenuItem>
                          {availableInvoices.map((inv) => (
                            <MenuItem key={inv.id} value={inv.invoice_number}>
                              {inv.invoice_number} ({new Date(inv.invoice_date).toLocaleDateString()})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedInvoiceNumber === '' && (
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Or type new invoice number"
                          value={invoiceData.invoice_number}
                          onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                          sx={{ mt: 1 }}
                          helperText="Select from dropdown or enter new invoice number"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Invoice Date"
                        type="date"
                        value={invoiceData.invoice_date}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        disabled={!!selectedInvoiceNumber}
                        helperText={selectedInvoiceNumber ? "Auto-populated from selected invoice" : ""}
                      />
                    </Grid>

                    {/* FG-Specific Fields: Dispatch Note & Warehouse Details */}
                    {po.po_type === 'FG' && (
                      <>
                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ mb: 1 }}>
                            <strong>Finished Goods:</strong> Enter dispatch note details and warehouse location
                          </Alert>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Dispatch Note Number"
                            placeholder="Enter dispatch note number"
                            value={invoiceData.dispatch_note_number || ''}
                            onChange={(e) => setInvoiceData({ ...invoiceData, dispatch_note_number: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Dispatch Date"
                            type="date"
                            value={invoiceData.dispatch_date || ''}
                            onChange={(e) => setInvoiceData({ ...invoiceData, dispatch_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Warehouse Location"
                            placeholder="e.g., Warehouse A, Rack 3, Shelf 5"
                            value={invoiceData.warehouse_location || ''}
                            onChange={(e) => setInvoiceData({ ...invoiceData, warehouse_location: e.target.value })}
                            helperText="Where goods are stored in warehouse"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Received By (Warehouse Person)"
                            placeholder="Enter warehouse person name"
                            value={invoiceData.warehouse_received_by || ''}
                            onChange={(e) => setInvoiceData({ ...invoiceData, warehouse_received_by: e.target.value })}
                            helperText="Who received the goods at warehouse"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>

                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.200' }}>
                        <TableCell>Medicine</TableCell>
                        <TableCell>Invoice Item</TableCell>
                        <TableCell align="right">Ordered</TableCell>
                        <TableCell align="right">Fulfilled</TableCell>
                        <TableCell align="right">Shipped Qty*</TableCell>
                        <TableCell align="right">Unit Price*</TableCell>
                        <TableCell align="right">Tax %</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell>Batch #</TableCell>
                        <TableCell>Expiry</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoiceData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.medicine_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                              <Select
                                value={item.invoice_item_id || ''}
                                onChange={(e) => handleInvoiceItemMapping(index, e.target.value)}
                                displayEmpty
                                disabled={!selectedInvoiceNumber}
                              >
                                <MenuItem value="">
                                  <em>{selectedInvoiceNumber ? 'Select Invoice Item' : 'Select Invoice First'}</em>
                                </MenuItem>
                                {selectedInvoiceItems.map((invItem) => {
                                  // Get medicine name from invoice item
                                  const invMedicineName = invItem.medicine?.medicine_name || invItem.medicine_name || 'Unknown'
                                  const qty = parseFloat(invItem.shipped_quantity || 0).toFixed(2)
                                  const price = parseFloat(invItem.unit_price || 0).toFixed(2)
                                  
                                  return (
                                    <MenuItem key={invItem.id} value={invItem.id}>
                                      {invMedicineName} (Qty: {qty}, Price: ₹{price})
                                    </MenuItem>
                                  )
                                })}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {item.ordered_quantity.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {item.fulfilled_quantity.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.shipped_quantity}
                              onChange={(e) => handleInvoiceItemChange(index, 'shipped_quantity', e.target.value)}
                              inputProps={{ min: 0, max: item.remaining_quantity, step: 0.01 }}
                              sx={{ width: 90 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.unit_price}
                              onChange={(e) => handleInvoiceItemChange(index, 'unit_price', e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 90 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.tax_rate}
                              onChange={(e) => handleInvoiceItemChange(index, 'tax_rate', e.target.value)}
                              inputProps={{ min: 0, max: 100, step: 0.01 }}
                              sx={{ width: 70 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              ₹{(item.total_with_tax || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.batch_number}
                              onChange={(e) => handleInvoiceItemChange(index, 'batch_number', e.target.value)}
                              sx={{ width: 90 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="date"
                              size="small"
                              value={item.expiry_date}
                              onChange={(e) => handleInvoiceItemChange(index, 'expiry_date', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: 130 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Box sx={{ mt: 2, p: 2.5, bgcolor: 'grey.100', borderRadius: 1, border: '2px solid', borderColor: 'grey.300' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" fontWeight="medium">
                          Subtotal: <strong>₹{invoiceData.subtotal.toFixed(2)}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" fontWeight="medium">
                          Tax: <strong>₹{invoiceData.tax_amount.toFixed(2)}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          Total: ₹{invoiceData.total_amount.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          onClick={handleSubmitInvoice}
                          disabled={!invoiceData.invoice_number?.trim()}
                          sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            '&:hover': {
                              bgcolor: 'success.dark',
                            },
                            '&.Mui-disabled': {
                              bgcolor: 'grey.400',
                              color: 'grey.700',
                            }
                          }}
                        >
                          {!invoiceData.invoice_number?.trim() 
                            ? 'Enter Invoice Number' 
                            : 'Submit Invoice'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const POPage = () => {
  const [eopas, setEopas] = useState([])
  const [pos, setPos] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      clearError()
      
      // Fetch EOPAs with PI details
      const eopaResponse = await api.get('/api/eopa/')
      if (eopaResponse.data.success) {
        setEopas(eopaResponse.data.data)
      }

      // Fetch all POs
      const poResponse = await api.get('/api/po/')
      if (poResponse.data.success) {
        setPos(poResponse.data.data)
      }

      // Fetch vendors
      const vendorsResponse = await api.get('/api/vendors/')
      if (vendorsResponse.data.success) {
        setVendors(vendorsResponse.data.data)
      }
    } catch (err) {
      console.error('Error fetching PO data:', err)
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVendorUpdate = async (poId, vendorId) => {
    try {
      clearError()
      const response = await api.put(`/api/po/${poId}`, { vendor_id: vendorId })
      if (response.data.success) {
        setSuccessMessage('Vendor updated successfully')
        fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Error updating vendor:', err)
      handleApiError(err)
      throw err
    }
  }

  const handleInvoiceSubmit = async (poId, invoiceData) => {
    try {
      clearError()
      
      const validItems = invoiceData.items.filter(item => 
        parseFloat(item.shipped_quantity || 0) > 0
      )

      if (validItems.length === 0) {
        handleApiError({ response: { data: { message: 'At least one item must have a shipped quantity greater than 0' } } })
        return
      }

      const payload = {
        po_id: poId,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        subtotal: parseFloat(invoiceData.subtotal.toFixed(2)),
        tax_amount: parseFloat(invoiceData.tax_amount.toFixed(2)),
        total_amount: parseFloat(invoiceData.total_amount.toFixed(2)),
        // FG-specific fields (optional)
        dispatch_note_number: invoiceData.dispatch_note_number || null,
        dispatch_date: invoiceData.dispatch_date || null,
        warehouse_location: invoiceData.warehouse_location || null,
        warehouse_received_by: invoiceData.warehouse_received_by || null,
        items: validItems.map(item => ({
          medicine_id: item.medicine_id,
          shipped_quantity: parseFloat(item.shipped_quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null
        }))
      }

      const response = await api.post(`/api/invoice/vendor/${poId}`, payload)
      
      if (response.data.success) {
        setSuccessMessage(`Invoice ${invoiceData.invoice_number} processed successfully`)
        fetchData() // Refresh to show updated fulfillment
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      handleApiError(err)
      throw err
    }
  }

  const getPOsForEOPA = (eopaId) => {
    return pos.filter(po => po.eopa_id === eopaId)
  }

  // Filter EOPAs that have POs
  const eopasWithPOs = eopas.filter(eopa => {
    const eopaPos = getPOsForEOPA(eopa.id)
    if (eopaPos.length === 0) return false

    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      eopa.eopa_number?.toLowerCase().includes(searchLower) ||
      eopa.pi?.pi_number?.toLowerCase().includes(searchLower) ||
      eopaPos.some(po => 
        po.po_number?.toLowerCase().includes(searchLower) ||
        po.vendor?.vendor_name?.toLowerCase().includes(searchLower)
      )
    )
  })

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" color="primary.main">
          Purchase Orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View Purchase Orders grouped by EOPA
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by EOPA number, PI number, PO number, or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Summary Stats */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Total EOPAs with POs</Typography>
          <Typography variant="h5" fontWeight="bold">{eopasWithPOs.length}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Total POs</Typography>
          <Typography variant="h5" fontWeight="bold">{pos.length}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Total Ordered Quantity</Typography>
          <Typography variant="h5" fontWeight="bold">
            {pos.reduce((sum, po) => sum + parseFloat(po.total_ordered_qty || 0), 0).toLocaleString('en-IN')}
          </Typography>
        </Paper>
      </Box>

      {/* EOPA Accordions with POs */}
      {eopasWithPOs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {searchTerm ? 'No purchase orders match your search' : 'No purchase orders generated yet'}
          </Typography>
        </Paper>
      ) : (
        eopasWithPOs.map(eopa => {
          const eopaPos = getPOsForEOPA(eopa.id)
          const totalOrderedQty = eopaPos.reduce((sum, po) => sum + parseFloat(po.total_ordered_qty || 0), 0)

          return (
            <Accordion key={eopa.id} sx={{ mb: 2, boxShadow: 2 }}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ bgcolor: 'primary.50' }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%',
                  pr: 2 
                }}>
                  <Box>
                    <Typography variant="h6" color="primary.main">
                      {eopa.eopa_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PI: {eopa.pi?.pi_number} | Partner: {eopa.pi?.partner_vendor?.vendor_name} | Date: {new Date(eopa.eopa_date).toLocaleDateString('en-IN')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip 
                      label={`${eopaPos.length} PO${eopaPos.length !== 1 ? 's' : ''}`}
                      color="primary" 
                      size="small" 
                    />
                    <Chip 
                      label={`Qty: ${totalOrderedQty.toLocaleString('en-IN')}`}
                      color="success" 
                      size="small" 
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell width="50px" />
                        <TableCell>PO Number</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>PO Date</TableCell>
                        <TableCell align="right">Ordered Qty</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Items</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {eopaPos.map(po => (
                        <PORow 
                          key={po.id} 
                          po={po} 
                          vendors={vendors}
                          onVendorUpdate={handleVendorUpdate}
                          onInvoiceSubmit={handleInvoiceSubmit}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* EOPA Summary Footer */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">
                      EOPA Total Ordered Quantity
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {totalOrderedQty.toLocaleString('en-IN', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {eopaPos.length} Purchase Order{eopaPos.length !== 1 ? 's' : ''} | {eopaPos.reduce((sum, po) => sum + (po.items?.length || 0), 0)} Line Items
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          )
        })
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default POPage
