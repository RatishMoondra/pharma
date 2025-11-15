import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
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
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoIcon from '@mui/icons-material/Info'
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const getVendorTypeIcon = (type) => {
  switch (type) {
    case 'MANUFACTURER':
      return <Business fontSize="small" />
    case 'RM':
      return <Inventory2 fontSize="small" />
    case 'PM':
      return <LocalShipping fontSize="small" />
    default:
      return null
  }
}

const getVendorTypeLabel = (type) => {
  switch (type) {
    case 'MANUFACTURER':
      return 'Manufacturer'
    case 'RM':
      return 'Raw Material'
    case 'PM':
      return 'Packing Material'
    default:
      return type
  }
}

const PIItemRow = ({ piItem, eopas, onApprove, onDelete }) => {
  const [open, setOpen] = useState(false)
  const itemEopas = eopas.filter(e => e.pi_item_id === piItem.id)
  const hasEopa = itemEopas.length > 0

  return (
    <>
      <TableRow 
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell>
          {hasEopa && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {piItem.medicine?.medicine_name || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {piItem.medicine?.dosage_form || ''}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">
            {piItem.quantity?.toLocaleString('en-IN')}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">
            ₹{piItem.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            ₹{piItem.total_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </TableCell>
        <TableCell>
          {hasEopa ? (
            itemEopas.map(eopa => (
              <Chip
                key={eopa.id}
                size="small"
                label={eopa.eopa_number}
                color={
                  eopa.status === 'APPROVED' ? 'success' :
                  eopa.status === 'REJECTED' ? 'error' : 'warning'
                }
                sx={{ mb: 0.5 }}
              />
            ))
          ) : (
            <Chip label="No EOPA" size="small" color="default" />
          )}
        </TableCell>
      </TableRow>
      {hasEopa && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  EOPA Details ({itemEopas.length})
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>EOPA Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Est. Unit Price</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Est. Total</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itemEopas.map((eopa, idx) => (
                        <TableRow
                          key={eopa.id}
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                            '&:hover': { bgcolor: 'primary.50' }
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                              {eopa.eopa_number}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {eopa.quantity?.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ₹{eopa.estimated_unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                              ₹{eopa.estimated_total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={eopa.status}
                              size="small"
                              color={
                                eopa.status === 'APPROVED' ? 'success' :
                                eopa.status === 'REJECTED' ? 'error' : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {eopa.status === 'PENDING' && (
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => onApprove(eopa)}
                                  title="Approve EOPA"
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDelete(eopa)}
                                  title="Delete EOPA"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Medicine Master Vendor Information */}
                {piItem.medicine && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <InfoIcon fontSize="small" color="info" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Medicine Master - Vendor Mappings
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Vendors will be selected from these mappings during PO generation
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {piItem.medicine.manufacturer_vendor && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Business fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Manufacturer:</strong> {piItem.medicine.manufacturer_vendor.vendor_name}
                            {piItem.medicine.manufacturer_vendor.vendor_code && 
                              ` (${piItem.medicine.manufacturer_vendor.vendor_code})`
                            }
                          </Typography>
                        </Box>
                      )}
                      {piItem.medicine.rm_vendor && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Inventory2 fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Raw Material:</strong> {piItem.medicine.rm_vendor.vendor_name}
                            {piItem.medicine.rm_vendor.vendor_code && 
                              ` (${piItem.medicine.rm_vendor.vendor_code})`
                            }
                          </Typography>
                        </Box>
                      )}
                      {piItem.medicine.pm_vendor && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalShipping fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Packing Material:</strong> {piItem.medicine.pm_vendor.vendor_name}
                            {piItem.medicine.pm_vendor.vendor_code && 
                              ` (${piItem.medicine.pm_vendor.vendor_code})`
                            }
                          </Typography>
                        </Box>
                      )}
                      {!piItem.medicine.manufacturer_vendor && !piItem.medicine.rm_vendor && !piItem.medicine.pm_vendor && (
                        <Typography variant="body2" color="error">
                          No vendors mapped in Medicine Master
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {itemEopas.some(e => e.remarks) && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderLeft: 4, borderColor: 'warning.main', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      REMARKS
                    </Typography>
                    {itemEopas.filter(e => e.remarks).map(eopa => (
                      <Typography key={eopa.id} variant="body2" sx={{ mt: 0.5 }}>
                        <strong>{eopa.eopa_number}:</strong> {eopa.remarks}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

const EOPAPage = () => {
  const [pis, setPis] = useState([])
  const [eopas, setEopas] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eopaToDelete, setEopaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [eopaToApprove, setEopaToApprove] = useState(null)
  const [approving, setApproving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch PIs with items
      const piResponse = await api.get('/api/pi/')
      const allPis = piResponse.data.success ? piResponse.data.data : []
      
      // Filter only approved PIs
      const approvedPis = allPis.filter(pi => pi.status === 'APPROVED')
      setPis(approvedPis)
      
      // Fetch EOPAs
      const eopaResponse = await api.get('/api/eopa/')
      if (eopaResponse.data.success) {
        setEopas(eopaResponse.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApproveClick = (eopa) => {
    setEopaToApprove(eopa)
    setApproveDialogOpen(true)
  }

  const handleApproveConfirm = async () => {
    if (!eopaToApprove) return
    
    try {
      setApproving(true)
      clearError()
      
      const response = await api.post(`/api/eopa/${eopaToApprove.id}/approve`)
      if (response.data.success) {
        setSuccessMessage('EOPA approved successfully')
        fetchData()
        setApproveDialogOpen(false)
        setEopaToApprove(null)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setApproving(false)
    }
  }

  const handleApproveCancel = () => {
    setApproveDialogOpen(false)
    setEopaToApprove(null)
  }

  const handleDeleteClick = (eopa) => {
    setEopaToDelete(eopa)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!eopaToDelete) return
    
    try {
      setDeleting(true)
      clearError()
      
      const response = await api.delete(`/api/eopa/${eopaToDelete.id}`)
      if (response.data.success) {
        setSuccessMessage('EOPA deleted successfully')
        fetchData()
        setDeleteDialogOpen(false)
        setEopaToDelete(null)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setEopaToDelete(null)
  }

  // Filter PIs based on search query
  const filteredPis = pis.filter(pi => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      pi.pi_number?.toLowerCase().includes(query) ||
      pi.partner_vendor?.vendor_name?.toLowerCase().includes(query) ||
      pi.items?.some(item => 
        item.medicine?.medicine_name?.toLowerCase().includes(query)
      )
    )
  })

  // Filter EOPAs based on search query
  const filteredEopas = eopas.filter(eopa => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      eopa.eopa_number?.toLowerCase().includes(query) ||
      eopa.pi_item?.medicine?.medicine_name?.toLowerCase().includes(query)
    )
  })

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Estimated Order & Price Approval (EOPA)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            EOPAs are automatically generated when PIs are approved
          </Typography>
        </Box>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by PI Number, EOPA Number, Medicine Name..."
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredPis.length === 0 ? (
        <Alert severity="info">
          {pis.length === 0 
            ? 'No approved PIs with EOPAs found. Approve PIs to auto-generate EOPAs.' 
            : 'No PIs match your search criteria.'}
        </Alert>
      ) : (
        <>
          {/* NEW: Show EOPAs (one per PI) with their line items */}
          {filteredEopas.map(eopa => {
            // Find the PI for this EOPA
            const pi = pis.find(p => p.id === eopa.pi_id)
            if (!pi) return null
            
            return (
              <Accordion key={eopa.id} sx={{ mb: 2, boxShadow: 2 }}>
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ bgcolor: 'primary.50' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box>
                      <Typography variant="h6" color="primary.main">
                        {eopa.eopa_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PI: {pi.pi_number} | 
                        Partner: {pi.partner_vendor?.vendor_name || '-'} | 
                        Date: {new Date(eopa.eopa_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={eopa.status}
                        size="small"
                        color={
                          eopa.status === 'APPROVED' ? 'success' :
                          eopa.status === 'REJECTED' ? 'error' : 'warning'
                        }
                      />
                      <Chip 
                        label={`${eopa.items?.length || 0} item${(eopa.items?.length || 0) !== 1 ? 's' : ''}`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* EOPA Line Items Table */}
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Medicine</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Est. Unit Price</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Est. Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {eopa.items && eopa.items.length > 0 ? (
                          <>
                            {eopa.items.map((item, idx) => (
                              <TableRow
                                key={item.id}
                                sx={{
                                  bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                                  '&:hover': { bgcolor: 'primary.50' }
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    {item.pi_item?.medicine?.medicine_name || '-'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.pi_item?.medicine?.dosage_form || ''}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {item.quantity?.toLocaleString('en-IN')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    ₹{item.estimated_unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                                    ₹{item.estimated_total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Total Row */}
                            <TableRow sx={{ bgcolor: 'primary.50' }}>
                              <TableCell colSpan={3} align="right">
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                  TOTAL:
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                  ₹{eopa.items.reduce((sum, item) => sum + parseFloat(item.estimated_total || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography variant="body2" color="text.secondary">No items</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Remarks Section */}
                  {eopa.remarks && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">REMARKS:</Typography>
                      <Typography variant="body2">{eopa.remarks}</Typography>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  {eopa.status === 'PENDING' && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleApproveClick(eopa)}
                        size="small"
                      >
                        Approve EOPA
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(eopa)}
                        size="small"
                      >
                        Delete EOPA
                      </Button>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </>
      )}

      <Dialog
        open={approveDialogOpen}
        onClose={handleApproveCancel}
      >
        <DialogTitle>Approve EOPA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to approve EOPA <strong>{eopaToApprove?.eopa_number}</strong>?
            This will allow it to be used for PO generation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApproveCancel} disabled={approving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApproveConfirm} 
            color="success"
            variant="contained"
            disabled={approving}
          >
            {approving ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete EOPA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete EOPA <strong>{eopaToDelete?.eopa_number}</strong>?
            This action cannot be undone.
          </DialogContentText>
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
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default EOPAPage
