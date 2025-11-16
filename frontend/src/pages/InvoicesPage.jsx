import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
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
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  Select,
  MenuItem,
  Collapse,
  InputLabel,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ReceiptIcon from '@mui/icons-material/Receipt'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import BusinessIcon from '@mui/icons-material/Business'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useAuth } from '../context/AuthContext'

// Invoice Row Component with Expandable Items
const InvoiceRow = ({ invoice, onEdit, onDelete, canEdit, canDelete, getInvoiceTypeColor }) => {
  const [open, setOpen] = useState(false)

  const getVendorTypeIcon = (type) => {
    switch (type) {
      case 'FG':
        return <BusinessIcon fontSize="small" />
      case 'RM':
        return <Inventory2Icon fontSize="small" />
      case 'PM':
        return <LocalShippingIcon fontSize="small" />
      default:
        return <ReceiptIcon fontSize="small" />
    }
  }

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' }, bgcolor: open ? 'action.selected' : 'inherit' }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            {invoice.invoice_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {new Date(invoice.invoice_date).toLocaleDateString()}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={getVendorTypeIcon(invoice.invoice_type)}
            label={invoice.invoice_type}
            size="small"
            color={getInvoiceTypeColor(invoice.invoice_type)}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {invoice.vendor?.vendor_name || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {invoice.vendor?.vendor_code || ''}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {invoice.po?.po_number || 'N/A'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium">
            ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Tax: ₹{parseFloat(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Chip label={invoice.items?.length || 0} size="small" />
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {canEdit(invoice) && (
              <Tooltip title="Edit Invoice">
                <IconButton size="small" color="primary" onClick={() => onEdit(invoice)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete(invoice) && (
              <Tooltip title="Delete Invoice">
                <IconButton size="small" color="error" onClick={() => onDelete(invoice)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>

      {/* Expandable Items Section */}
      <TableRow>
        <TableCell colSpan={9} sx={{ p: 0, borderBottom: 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Invoice Items ({invoice.items?.length || 0})
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.200' }}>
                    <TableCell>Medicine</TableCell>
                    <TableCell align="right">Shipped Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Tax %</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2">{item.medicine?.medicine_name || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{parseFloat(item.shipped_quantity || 0).toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">₹{parseFloat(item.unit_price || 0).toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{parseFloat(item.tax_rate || 0).toFixed(2)}%</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.batch_number || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ₹{parseFloat(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* FG-specific details */}
              {invoice.invoice_type === 'FG' && (invoice.dispatch_note_number || invoice.warehouse_location) && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                    Dispatch & Warehouse Details
                  </Typography>
                  {invoice.dispatch_note_number && (
                    <Typography variant="caption" display="block">
                      <LocalShippingIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>Dispatch Note:</strong> {invoice.dispatch_note_number}
                      {invoice.dispatch_date && ` (${new Date(invoice.dispatch_date).toLocaleDateString()})`}
                    </Typography>
                  )}
                  {invoice.warehouse_location && (
                    <Typography variant="caption" display="block">
                      <WarehouseIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>Warehouse:</strong> {invoice.warehouse_location}
                    </Typography>
                  )}
                  {invoice.warehouse_received_by && (
                    <Typography variant="caption" display="block">
                      <strong>Received By:</strong> {invoice.warehouse_received_by}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Summary Card */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      ₹{parseFloat(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Tax Amount</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      ₹{parseFloat(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { user } = useAuth()

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [editFormData, setEditFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    po_id: null,
    dispatch_note_number: '',
    dispatch_date: '',
    warehouse_location: '',
    warehouse_received_by: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    remarks: '',
    items: []
  })
  const [submitting, setSubmitting] = useState(false)
  
  // For adding new items
  const [medicines, setMedicines] = useState([])
  
  // Create invoice dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pos, setPos] = useState([])
  const [vendors, setVendors] = useState([])
  const [createFormData, setCreateFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_type: 'RM',
    vendor_id: '',
    po_id: null,
    dispatch_note_number: '',
    dispatch_date: '',
    warehouse_location: '',
    warehouse_received_by: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    remarks: '',
    items: []
  })

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/invoice/')
      if (response.data.success) {
        setInvoices(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
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

  const fetchPOsAndVendors = async () => {
    try {
      const [posRes, vendorsRes] = await Promise.all([
        api.get('/api/po/'),
        api.get('/api/vendors/')
      ])
      if (posRes.data.success) {
        setPos(posRes.data.data)
      }
      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch POs and vendors:', err)
    }
  }

  useEffect(() => {
    fetchInvoices()
    fetchMedicines()
  }, [])

  const handleCreateClick = () => {
    fetchPOsAndVendors()
    setCreateFormData({
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_type: 'RM',
      vendor_id: '',
      po_id: null,
      dispatch_note_number: '',
      dispatch_date: '',
      warehouse_location: '',
      warehouse_received_by: '',
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      remarks: '',
      freight_charges: 0,
      insurance_charges: 0,
      currency_code: 'INR',
      exchange_rate: 1.0,
      items: [{ 
        medicine_id: '', 
        shipped_quantity: 0, 
        unit_price: 0, 
        tax_rate: 0, 
        hsn_code: '',
        gst_rate: 0,
        batch_number: '', 
        manufacturing_date: '',
        expiry_date: '' 
      }]
    })
    setCreateDialogOpen(true)
  }

  const handleCreateClose = () => {
    setCreateDialogOpen(false)
  }

  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateItemChange = (index, field, value) => {
    const updatedItems = [...createFormData.items]
    updatedItems[index][field] = value

    if (field === 'shipped_quantity' || field === 'unit_price' || field === 'tax_rate') {
      const item = updatedItems[index]
      const qty = parseFloat(item.shipped_quantity || 0)
      const price = parseFloat(item.unit_price || 0)
      const tax = parseFloat(item.tax_rate || 0)
      const lineTotal = qty * price
      const taxAmount = lineTotal * (tax / 100)
      item.total_price = lineTotal + taxAmount
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.shipped_quantity || 0) * parseFloat(item.unit_price || 0)), 0)
    const tax_amount = updatedItems.reduce((sum, item) => {
      const lineTotal = parseFloat(item.shipped_quantity || 0) * parseFloat(item.unit_price || 0)
      return sum + (lineTotal * parseFloat(item.tax_rate || 0) / 100)
    }, 0)

    setCreateFormData({
      ...createFormData,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount: subtotal + tax_amount
    })
  }

  const handleCreateAddItem = () => {
    setCreateFormData({
      ...createFormData,
      items: [...createFormData.items, { 
        medicine_id: '', 
        shipped_quantity: 0, 
        unit_price: 0, 
        tax_rate: 0, 
        hsn_code: '',
        gst_rate: 0,
        batch_number: '', 
        manufacturing_date: '',
        expiry_date: '' 
      }]
    })
  }

  const handleCreateRemoveItem = (index) => {
    const updatedItems = createFormData.items.filter((_, i) => i !== index)
    const subtotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.shipped_quantity || 0) * parseFloat(item.unit_price || 0)), 0)
    const tax_amount = updatedItems.reduce((sum, item) => {
      const lineTotal = parseFloat(item.shipped_quantity || 0) * parseFloat(item.unit_price || 0)
      return sum + (lineTotal * parseFloat(item.tax_rate || 0) / 100)
    }, 0)

    setCreateFormData({
      ...createFormData,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount: subtotal + tax_amount
    })
  }

  const handleCreateSubmit = async () => {
    try {
      setSubmitting(true)
      const payload = {
        invoice_number: createFormData.invoice_number,
        invoice_date: createFormData.invoice_date,
        invoice_type: createFormData.invoice_type,
        vendor_id: parseInt(createFormData.vendor_id),
        po_id: createFormData.po_id ? parseInt(createFormData.po_id) : null,
        dispatch_note_number: createFormData.dispatch_note_number,
        dispatch_date: createFormData.dispatch_date,
        warehouse_location: createFormData.warehouse_location,
        warehouse_received_by: createFormData.warehouse_received_by,
        subtotal: createFormData.subtotal,
        tax_amount: createFormData.tax_amount,
        total_amount: createFormData.total_amount,
        remarks: createFormData.remarks,
        items: createFormData.items.map(item => ({
          medicine_id: parseInt(item.medicine_id),
          shipped_quantity: parseFloat(item.shipped_quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          total_price: item.total_price
        }))
      }

      const response = await api.post('/api/invoice/create', payload)
      if (response.data.success) {
        setSuccessMessage('Invoice created successfully!')
        setCreateDialogOpen(false)
        fetchInvoices()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (invoice) => {
    setEditingInvoice(invoice)
    setEditFormData({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      po_id: invoice.po_id,
      dispatch_note_number: invoice.dispatch_note_number || '',
      dispatch_date: invoice.dispatch_date || '',
      warehouse_location: invoice.warehouse_location || '',
      warehouse_received_by: invoice.warehouse_received_by || '',
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      remarks: invoice.remarks || '',
      items: invoice.items.map(item => ({
        medicine_id: item.medicine_id,
        medicine_name: item.medicine?.medicine_name || 'N/A',
        shipped_quantity: item.shipped_quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        remarks: item.remarks || ''
      }))
    })
    setEditDialogOpen(true)
  }

  const handleEditClose = () => {
    setEditDialogOpen(false)
    setEditingInvoice(null)
  }

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEditItemChange = (index, field, value) => {
    const updatedItems = [...editFormData.items]
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

    setEditFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount
    }))
  }

  const handleAddItem = () => {
    const newItem = {
      medicine_id: '',
      medicine_name: '',
      shipped_quantity: 0,
      unit_price: 0,
      tax_rate: 18,
      batch_number: '',
      expiry_date: '',
      remarks: '',
      line_total: 0,
      tax_amount: 0,
      total_with_tax: 0
    }
    
    setEditFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const handleRemoveItem = (index) => {
    const updatedItems = editFormData.items.filter((_, i) => i !== index)
    
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const tax_amount = updatedItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const total_amount = subtotal + tax_amount

    setEditFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      tax_amount,
      total_amount
    }))
  }

  const handleMedicineSelect = (index, medicineId) => {
    const medicine = medicines.find(m => m.id === parseInt(medicineId))
    const updatedItems = [...editFormData.items]
    updatedItems[index].medicine_id = medicineId
    updatedItems[index].medicine_name = medicine?.medicine_name || ''
    
    setEditFormData(prev => ({
      ...prev,
      items: updatedItems
    }))
  }

  const handleEditSubmit = async () => {
    try {
      setSubmitting(true)

      const payload = {
        invoice_number: editFormData.invoice_number,
        invoice_date: editFormData.invoice_date,
        po_id: editFormData.po_id,
        dispatch_note_number: editFormData.dispatch_note_number,
        dispatch_date: editFormData.dispatch_date,
        warehouse_location: editFormData.warehouse_location,
        warehouse_received_by: editFormData.warehouse_received_by,
        subtotal: parseFloat(editFormData.subtotal),
        tax_amount: parseFloat(editFormData.tax_amount),
        total_amount: parseFloat(editFormData.total_amount),
        remarks: editFormData.remarks,
        items: editFormData.items.map(item => ({
          medicine_id: item.medicine_id,
          shipped_quantity: parseFloat(item.shipped_quantity),
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          batch_number: item.batch_number,
          expiry_date: item.expiry_date || null,
          remarks: item.remarks
        }))
      }

      const response = await api.put(`/api/invoice/${editingInvoice.id}`, payload)

      if (response.data.success) {
        setSuccessMessage(`Invoice ${editFormData.invoice_number} updated successfully`)
        setEditDialogOpen(false)
        setEditingInvoice(null)
        fetchInvoices()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return

    try {
      setDeleting(true)
      const response = await api.delete(`/api/invoice/${invoiceToDelete.id}`)
      
      if (response.data.success) {
        setSuccessMessage(`Invoice ${invoiceToDelete.invoice_number} deleted successfully`)
        setDeleteDialogOpen(false)
        setInvoiceToDelete(null)
        fetchInvoices()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setInvoiceToDelete(null)
  }

  const handleProcessInvoice = async (invoice) => {
    try {
      const response = await api.post(`/api/invoice/${invoice.id}/process`)
      
      if (response.data.success) {
        setSuccessMessage(`Invoice ${invoice.invoice_number} marked as processed`)
        fetchInvoices()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const canEdit = (invoice) => {
    // Allow editing for ADMIN and PROCUREMENT_OFFICER
    return user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER'
  }

  const canDelete = (invoice) => {
    // Only ADMIN can delete
    return user?.role === 'ADMIN'
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      invoice.invoice_number?.toLowerCase().includes(search) ||
      invoice.po?.po_number?.toLowerCase().includes(search) ||
      invoice.vendor?.vendor_name?.toLowerCase().includes(search)
    )
  })

  // Group invoices by PO
  const invoicesByPO = filteredInvoices.reduce((acc, invoice) => {
    const poId = invoice.po_id
    if (!acc[poId]) {
      acc[poId] = []
    }
    acc[poId].push(invoice)
    return acc
  }, {})

  const getInvoiceTypeColor = (type) => {
    switch (type) {
      case 'FG':
        return 'primary'
      case 'RM':
        return 'success'
      case 'PM':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 36 }} />
          Tax Invoices
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          disabled={!canEdit(null)}
        >
          Create New Invoice
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by invoice number, PO number, or vendor name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {filteredInvoices.length === 0 && (
        <Alert severity="info">
          No invoices found. {searchQuery ? 'Try a different search term.' : 'Create a new invoice to get started.'}
        </Alert>
      )}

      {filteredInvoices.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell width={50} />
                <TableCell>Invoice Number</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  getInvoiceTypeColor={getInvoiceTypeColor}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

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

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Edit Invoice: {editingInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Invoice Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>PO:</strong> {editingInvoice?.po?.po_number} | 
                <strong> Type:</strong> {editingInvoice?.invoice_type} | 
                <strong> Vendor:</strong> {editingInvoice?.vendor?.vendor_name}
              </Typography>
            </Alert>

            {/* Basic Fields */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={editFormData.invoice_number}
                  onChange={(e) => handleEditFormChange('invoice_number', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={editFormData.invoice_date}
                  onChange={(e) => handleEditFormChange('invoice_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>

            {/* FG-specific fields */}
            {editingInvoice?.invoice_type === 'FG' && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Finished Goods: Update dispatch note details and warehouse location
                </Alert>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dispatch Note Number"
                      value={editFormData.dispatch_note_number}
                      onChange={(e) => handleEditFormChange('dispatch_note_number', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dispatch Date"
                      type="date"
                      value={editFormData.dispatch_date}
                      onChange={(e) => handleEditFormChange('dispatch_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Warehouse Location"
                      value={editFormData.warehouse_location}
                      onChange={(e) => handleEditFormChange('warehouse_location', e.target.value)}
                      helperText="Where goods are stored in warehouse"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Received By (Warehouse Person)"
                      value={editFormData.warehouse_received_by}
                      onChange={(e) => handleEditFormChange('warehouse_received_by', e.target.value)}
                      helperText="Who received the goods"
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {/* Invoice Items */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Invoice Items</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                onClick={handleAddItem}
              >
                Add Item
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Shipped Qty</TableCell>
                    <TableCell>Unit Price (₹)</TableCell>
                    <TableCell>Tax %</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell align="right">Line Total (₹)</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editFormData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.medicine_id ? (
                          <Typography variant="body2">{item.medicine_name}</Typography>
                        ) : (
                          <FormControl size="small" fullWidth>
                            <Select
                              value={item.medicine_id}
                              onChange={(e) => handleMedicineSelect(index, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Select Medicine</em>
                              </MenuItem>
                              {medicines.map(med => (
                                <MenuItem key={med.id} value={med.id}>
                                  {med.medicine_name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.shipped_quantity}
                          onChange={(e) => handleEditItemChange(index, 'shipped_quantity', e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.unit_price}
                          onChange={(e) => handleEditItemChange(index, 'unit_price', e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.tax_rate}
                          onChange={(e) => handleEditItemChange(index, 'tax_rate', e.target.value)}
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.batch_number}
                          onChange={(e) => handleEditItemChange(index, 'batch_number', e.target.value)}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={item.expiry_date}
                          onChange={(e) => handleEditItemChange(index, 'expiry_date', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ₹{(item.total_with_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={editFormData.items.length === 1}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                  <Typography variant="h6">₹{editFormData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Tax Amount:</Typography>
                  <Typography variant="h6">₹{editFormData.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Total Amount:</Typography>
                  <Typography variant="h6" color="primary.main">₹{editFormData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Remarks */}
            <TextField
              fullWidth
              label="Remarks"
              multiline
              rows={2}
              value={editFormData.remarks}
              onChange={(e) => handleEditFormChange('remarks', e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
            disabled={submitting || !editFormData.invoice_number || editFormData.items.length === 0}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="lg" fullWidth>
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={createFormData.invoice_number}
                  onChange={(e) => handleCreateFormChange('invoice_number', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={createFormData.invoice_date}
                  onChange={(e) => handleCreateFormChange('invoice_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Invoice Type</InputLabel>
                  <Select
                    value={createFormData.invoice_type}
                    onChange={(e) => handleCreateFormChange('invoice_type', e.target.value)}
                    label="Invoice Type"
                  >
                    <MenuItem value="RM">Raw Materials (RM)</MenuItem>
                    <MenuItem value="PM">Packing Materials (PM)</MenuItem>
                    <MenuItem value="FG">Finished Goods (FG)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={createFormData.vendor_id}
                    onChange={(e) => handleCreateFormChange('vendor_id', e.target.value)}
                    label="Vendor"
                  >
                    <MenuItem value=""><em>Select Vendor</em></MenuItem>
                    {vendors.map(v => (
                      <MenuItem key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>PO (Optional)</InputLabel>
                  <Select
                    value={createFormData.po_id || ''}
                    onChange={(e) => handleCreateFormChange('po_id', e.target.value)}
                    label="PO (Optional)"
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {pos.map(po => (
                      <MenuItem key={po.id} value={po.id}>{po.po_number}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {createFormData.invoice_type === 'FG' && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Alert severity="info">Finished Goods: Enter dispatch and warehouse details</Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dispatch Note Number"
                    value={createFormData.dispatch_note_number}
                    onChange={(e) => handleCreateFormChange('dispatch_note_number', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dispatch Date"
                    type="date"
                    value={createFormData.dispatch_date}
                    onChange={(e) => handleCreateFormChange('dispatch_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warehouse Location"
                    value={createFormData.warehouse_location}
                    onChange={(e) => handleCreateFormChange('warehouse_location', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Received By"
                    value={createFormData.warehouse_received_by}
                    onChange={(e) => handleCreateFormChange('warehouse_received_by', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Invoice Items</Typography>
              <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleCreateAddItem}>
                Add Item
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine *</TableCell>
                    <TableCell>HSN Code</TableCell>
                    <TableCell>Qty *</TableCell>
                    <TableCell>Unit Price *</TableCell>
                    <TableCell>Tax %</TableCell>
                    <TableCell>GST %</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell>Mfg Date</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {createFormData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <FormControl size="small" fullWidth required>
                          <Select
                            value={item.medicine_id}
                            onChange={(e) => handleCreateItemChange(index, 'medicine_id', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value=""><em>Select Medicine</em></MenuItem>
                            {medicines.map(med => (
                              <MenuItem key={med.id} value={med.id}>{med.medicine_name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="HSN"
                          value={item.hsn_code}
                          onChange={(e) => handleCreateItemChange(index, 'hsn_code', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.shipped_quantity}
                          onChange={(e) => handleCreateItemChange(index, 'shipped_quantity', e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.unit_price}
                          onChange={(e) => handleCreateItemChange(index, 'unit_price', e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.tax_rate}
                          onChange={(e) => handleCreateItemChange(index, 'tax_rate', e.target.value)}
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          placeholder="GST %"
                          value={item.gst_rate}
                          onChange={(e) => handleCreateItemChange(index, 'gst_rate', e.target.value)}
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.batch_number}
                          onChange={(e) => handleCreateItemChange(index, 'batch_number', e.target.value)}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          placeholder="Mfg Date"
                          value={item.manufacturing_date}
                          onChange={(e) => handleCreateItemChange(index, 'manufacturing_date', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={item.expiry_date}
                          onChange={(e) => handleCreateItemChange(index, 'expiry_date', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ₹{(item.total_price || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCreateRemoveItem(index)}
                          disabled={createFormData.items.length === 1}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption">Subtotal</Typography>
                  <Typography variant="h6">₹{createFormData.subtotal.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption">Tax Amount</Typography>
                  <Typography variant="h6">₹{createFormData.tax_amount.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption">Total Amount</Typography>
                  <Typography variant="h6" color="primary">₹{createFormData.total_amount.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <TextField
              fullWidth
              label="Remarks"
              multiline
              rows={2}
              value={createFormData.remarks}
              onChange={(e) => handleCreateFormChange('remarks', e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoice_number}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default InvoicesPage
