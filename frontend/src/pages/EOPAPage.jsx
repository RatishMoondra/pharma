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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EOPAForm from '../components/EOPAForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const EOPARow = ({ eopa, onEdit, onDelete, onApprove, onGeneratePO }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' }, bgcolor: open ? 'action.selected' : 'inherit' }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            {eopa.eopa_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {eopa.pi?.pi_number || '-'}
          </Typography>
        </TableCell>
        <TableCell>{new Date(eopa.eopa_date).toLocaleDateString()}</TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            ₹{eopa.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={eopa.status || 'PENDING'}
            color={eopa.status === 'APPROVED' ? 'success' : eopa.status === 'REJECTED' ? 'error' : 'warning'}
            size="small"
          />
        </TableCell>
        <TableCell align="right">
          {eopa.status === 'PENDING' && (
            <>
              <IconButton
                size="small"
                color="primary"
                onClick={() => onEdit(eopa)}
                sx={{ mr: 1 }}
                title="Edit EOPA"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="success"
                onClick={() => onApprove(eopa.id)}
                sx={{ mr: 1 }}
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
            </>
          )}
          {eopa.status === 'APPROVED' && !eopa.po_generated && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onGeneratePO(eopa.id)}
            >
              Generate PO
            </Button>
          )}
          {eopa.po_generated && (
            <Chip label="PO Generated" color="info" size="small" icon={<CheckCircleIcon />} />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom component="div">
                  Line Items
                </Typography>
                <Chip 
                  label={`${eopa.items?.length || 0} item${eopa.items?.length !== 1 ? 's' : ''}`}
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
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Medicine</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dosage Form</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Unit Price</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {eopa.items?.map((item, idx) => (
                      <TableRow 
                        key={idx}
                        sx={{
                          bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                          '&:hover': { bgcolor: 'primary.50' }
                        }}
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {item.medicine?.medicine_name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.medicine?.dosage_form || '-'} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.quantity?.toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            ₹{item.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                            ₹{(item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'success.50' }}>
                      <TableCell colSpan={5} align="right">
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Grand Total:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                          ₹{eopa.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              {eopa.remarks && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    REMARKS
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {eopa.remarks}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const EOPAPage = () => {
  const [eopas, setEopas] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEOPA, setEditingEOPA] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eopaToDelete, setEopaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { error, handleApiError, clearError } = useApiError()

  const fetchEOPAs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/eopa/')
      if (response.data.success) {
        setEopas(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEOPAs()
  }, [])

  const handleSubmit = async (formData, eopaId = null) => {
    try {
      setSubmitting(true)
      clearError()
      
      let response
      if (eopaId) {
        response = await api.put(`/api/eopa/${eopaId}`, formData)
        setSuccessMessage('EOPA updated successfully')
      } else {
        response = await api.post('/api/eopa/', formData)
        setSuccessMessage('EOPA created successfully')
      }
      
      if (response.data.success) {
        fetchEOPAs()
        setFormOpen(false)
        setEditingEOPA(null)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (eopa) => {
    setEditingEOPA(eopa)
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
        fetchEOPAs()
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

  const handleCreateNew = () => {
    setEditingEOPA(null)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingEOPA(null)
  }

  const handleApprove = async (eopaId) => {
    if (!window.confirm('Are you sure you want to approve this EOPA?')) return

    try {
      const response = await api.put(`/api/eopa/${eopaId}/approve`)
      if (response.data.success) {
        setSuccessMessage('EOPA approved successfully')
        fetchEOPAs()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const handleGeneratePO = async (eopaId) => {
    if (!window.confirm('Generate Purchase Orders for this EOPA?')) return

    try {
      const response = await api.post(`/api/eopa/${eopaId}/generate-po`)
      if (response.data.success) {
        setSuccessMessage('Purchase Orders generated successfully')
        fetchEOPAs()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">EOPA (Estimated Order & Price Approval)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create EOPA
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : eopas.length === 0 ? (
        <Alert severity="info">No EOPAs found. Create an EOPA from an approved PI.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }} width={50} />
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>EOPA Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PI Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estimated Total</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} width={200} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eopas.map((eopa) => (
                <EOPARow
                  key={eopa.id}
                  eopa={eopa}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onApprove={handleApprove}
                  onGeneratePO={handleGeneratePO}
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
        eopa={editingEOPA}
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
