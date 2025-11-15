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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SearchIcon from '@mui/icons-material/Search'
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

const PIItemRow = ({ piItem, onCreateEOPA, onApprove, onDelete }) => {
  const [open, setOpen] = useState(false)
  const eopas = piItem.eopas || []

  return (
    <>
      <TableRow 
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell>
          {eopas.length > 0 && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            {piItem.pi?.pi_number || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {piItem.pi?.partner_vendor?.vendor_name || ''}
          </Typography>
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
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {eopas.length > 0 ? (
              eopas.map(eopa => (
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
              ))
            ) : (
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
      {eopas.length > 0 && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom component="div">
                    EOPAs for this PI Item
                  </Typography>
                  <Chip 
                    label={`${eopas.length} EOPA${eopas.length !== 1 ? 's' : ''}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} width={50}>#</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>EOPA Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vendor Type</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vendor Name</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Est. Unit Price</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Est. Total</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
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
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
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
                            <Typography variant="caption" color="text.secondary">
                              {eopa.vendor?.vendor_code || ''}
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
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                {eopas.some(e => e.remarks) && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
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

const EOPAPage = () => {
  const [piItems, setPiItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPIItem, setSelectedPIItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eopaToDelete, setEopaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch PIs with items
      const piResponse = await api.get('/api/pi/')
      if (!piResponse.data.success) {
        throw new Error('Failed to fetch PIs')
      }

      const pis = piResponse.data.data

      // Fetch all EOPAs
      const eopaResponse = await api.get('/api/eopa/')
      if (!eopaResponse.data.success) {
        throw new Error('Failed to fetch EOPAs')
      }

      const eopas = eopaResponse.data.data

      // Flatten PI items and attach PI info and EOPAs
      const allPIItems = []
      pis.forEach(pi => {
        if (pi.items && pi.items.length > 0) {
          pi.items.forEach(item => {
            allPIItems.push({
              ...item,
              pi: {
                id: pi.id,
                pi_number: pi.pi_number,
                pi_date: pi.pi_date,
                partner_vendor: pi.partner_vendor
              },
              eopas: eopas.filter(eopa => eopa.pi_item_id === item.id)
            })
          })
        }
      })

      setPiItems(allPIItems)
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateEOPA = (piItem) => {
    setSelectedPIItem(piItem)
    setFormOpen(true)
  }

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()
      
      const response = await api.post('/api/eopa/bulk-create', {
        ...formData,
        pi_item_id: selectedPIItem.id
      })
      
      if (response.data.success) {
        setSuccessMessage('EOPA(s) created successfully')
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

  const handleApprove = async (eopa) => {
    try {
      clearError()
      const response = await api.post(`/api/eopa/${eopa.id}/approve`, {
        approved: true
      })
      
      if (response.data.success) {
        setSuccessMessage('EOPA approved successfully')
        fetchData()
      }
    } catch (err) {
      handleApiError(err)
    }
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

  // Filter PI items based on search query
  const filteredPiItems = piItems.filter(piItem => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      piItem.pi?.pi_number?.toLowerCase().includes(query) ||
      piItem.pi?.partner_vendor?.vendor_name?.toLowerCase().includes(query) ||
      piItem.pi?.partner_vendor?.vendor_code?.toLowerCase().includes(query) ||
      piItem.medicine?.medicine_name?.toLowerCase().includes(query) ||
      piItem.medicine?.dosage_form?.toLowerCase().includes(query) ||
      piItem.eopas?.some(eopa => 
        eopa.eopa_number?.toLowerCase().includes(query) ||
        eopa.vendor?.vendor_name?.toLowerCase().includes(query) ||
        eopa.vendor?.vendor_code?.toLowerCase().includes(query)
      )
    )
  })

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">EOPA (Estimated Order & Price Approval)</Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by PI Number, EOPA Number, Vendor Name, Medicine Name..."
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
      ) : filteredPiItems.length === 0 ? (
        <Alert severity="info">
          {piItems.length === 0 
            ? 'No PI items found. Create a PI first.' 
            : 'No PI items match your search criteria.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }} width={50} />
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PI Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Medicine</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">PI Unit Price</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">PI Total</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>EOPA Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} width={150} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPiItems.map((piItem) => (
                <PIItemRow 
                  key={piItem.id} 
                  piItem={piItem}
                  onCreateEOPA={handleCreateEOPA}
                  onApprove={handleApprove}
                  onDelete={handleDeleteClick}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
