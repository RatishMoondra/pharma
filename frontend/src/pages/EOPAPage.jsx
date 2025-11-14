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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'
import EOPAForm from '../components/EOPAForm'
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

const PIItemRow = ({ piItem, eopas, onCreateEOPA, onApprove, onDelete }) => {
  const [open, setOpen] = useState(false)

  // Group EOPAs by vendor type
  const eopaByVendorType = {
    MANUFACTURER: eopas.find(e => e.vendor_type === 'MANUFACTURER'),
    RM: eopas.find(e => e.vendor_type === 'RM'),
    PM: eopas.find(e => e.vendor_type === 'PM'),
  }

  const hasEOPAs = eopas.length > 0

  return (
    <>
      <TableRow 
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell>
          {hasEOPAs && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {piItem.medicine?.medicine_name}
          </Typography>
        </TableCell>
        <TableCell align="right">{piItem.quantity}</TableCell>
        <TableCell align="right">
          ₹{parseFloat(piItem.unit_price).toFixed(2)}
        </TableCell>
        <TableCell align="right">
          ₹{parseFloat(piItem.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {eopas.map(eopa => (
              <Chip
                key={eopa.id}
                size="small"
                label={getVendorTypeLabel(eopa.vendor_type)}
                icon={getVendorTypeIcon(eopa.vendor_type)}
                color={
                  eopa.status === 'APPROVED' ? 'success' :
                  eopa.status === 'REJECTED' ? 'error' : 'warning'
                }
              />
            ))}
            {eopas.length === 0 && (
              <Chip label="No EOPAs" size="small" color="default" />
            )}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => onCreateEOPA(piItem)}
          >
            Create EOPA
          </Button>
        </TableCell>
      </TableRow>
      
      {hasEOPAs && (
        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0, borderBottom: 'none' }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  EOPAs for this PI Item ({eopas.length})
                </Typography>
                
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.100' }}>
                        <TableCell><strong>EOPA Number</strong></TableCell>
                        <TableCell><strong>Vendor Type</strong></TableCell>
                        <TableCell><strong>Vendor Name</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Est. Unit Price</strong></TableCell>
                        <TableCell align="right"><strong>Est. Total</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {eopas.map((eopa, idx) => (
                        <TableRow
                          key={eopa.id}
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                            '&:hover': { bgcolor: 'primary.50' }
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" color="primary.main" fontWeight="medium">
                              {eopa.eopa_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getVendorTypeIcon(eopa.vendor_type)}
                              <Typography variant="body2">
                                {getVendorTypeLabel(eopa.vendor_type)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {eopa.vendor?.vendor_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{eopa.quantity}</TableCell>
                          <TableCell align="right">
                            ₹{parseFloat(eopa.estimated_unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ₹{parseFloat(eopa.estimated_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                  onClick={() => onApprove(eopa.id)}
                                  title="Approve"
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => onDelete(eopa)}
                                  title="Delete"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                            {eopa.status === 'APPROVED' && (
                              <Chip label="Approved" size="small" color="success" icon={<CheckCircleIcon />} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {eopas.some(e => e.remarks) && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      REMARKS
                    </Typography>
                    {eopas.filter(e => e.remarks).map(eopa => (
                      <Typography key={eopa.id} variant="body2" sx={{ mt: 0.5 }}>
                        <strong>{getVendorTypeLabel(eopa.vendor_type)}:</strong> {eopa.remarks}
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

const PIAccordion = ({ pi, piItems, eopas, onCreateEOPA, onApprove, onDelete }) => {
  return (
    <Accordion sx={{ mb: 2, boxShadow: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
          <Box>
            <Typography variant="h6" color="primary.main">
              {pi.pi_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Partner Vendor: {pi.partner_vendor?.vendor_name} | Date: {new Date(pi.pi_date).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip 
            label={`${piItems.length} item${piItems.length !== 1 ? 's' : ''}`}
            color="primary"
            size="small"
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                <TableCell width={50} />
                <TableCell><strong>Medicine</strong></TableCell>
                <TableCell align="right"><strong>Quantity</strong></TableCell>
                <TableCell align="right"><strong>PI Unit Price</strong></TableCell>
                <TableCell align="right"><strong>PI Total</strong></TableCell>
                <TableCell><strong>EOPA Status</strong></TableCell>
                <TableCell align="right" width={150}><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {piItems.map(piItem => {
                const itemEopas = eopas.filter(e => e.pi_item_id === piItem.id)
                return (
                  <PIItemRow
                    key={piItem.id}
                    piItem={piItem}
                    eopas={itemEopas}
                    onCreateEOPA={onCreateEOPA}
                    onApprove={onApprove}
                    onDelete={onDelete}
                  />
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  )
}

const EOPAPage = () => {
  const [pis, setPis] = useState([])
  const [eopas, setEopas] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPIItem, setSelectedPIItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eopaToDelete, setEopaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { error, handleApiError, clearError } = useApiError()

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch PIs with items
      const piResponse = await api.get('/api/pi/')
      if (piResponse.data.success) {
        setPis(piResponse.data.data)
      }

      // Fetch all EOPAs
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

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()
      
      // Use bulk create endpoint
      const response = await api.post('/api/eopa/bulk-create', formData)
      
      if (response.data.success) {
        const count = response.data.data?.length || 0
        setSuccessMessage(`${count} EOPA(s) created successfully`)
        fetchData()
        setFormOpen(false)
        setSelectedPIItem(null)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateEOPA = (piItem) => {
    setSelectedPIItem(piItem)
    setFormOpen(true)
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

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedPIItem(null)
  }

  const handleApprove = async (eopaId) => {
    if (!window.confirm('Are you sure you want to approve this EOPA?')) return

    try {
      const response = await api.post(`/api/eopa/${eopaId}/approve`, { approved: true })
      if (response.data.success) {
        setSuccessMessage('EOPA approved successfully')
        fetchData()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">EOPA Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Estimated Order & Price Approval - Organized by PI and Line Items
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : pis.length === 0 ? (
        <Alert severity="info">No PIs found. Create a PI with items to generate EOPAs.</Alert>
      ) : (
        <>
          {pis.map(pi => (
            <PIAccordion
              key={pi.id}
              pi={pi}
              piItems={pi.items || []}
              eopas={eopas}
              onCreateEOPA={handleCreateEOPA}
              onApprove={handleApprove}
              onDelete={handleDeleteClick}
            />
          ))}
        </>
      )}

      <EOPAForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        isLoading={submitting}
        piItem={selectedPIItem}
        mode="bulk"
      />

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
