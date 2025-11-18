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
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import TimelineIcon from '@mui/icons-material/Timeline'
import PIForm from '../components/PIForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'
import { useNavigate } from 'react-router-dom'

const PIRow = ({ pi, onEdit, onDelete, onApprove, onDownloadPDF, onViewWorkflow, getRowStyle }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow 
        sx={{
          ...getRowStyle(pi.id),
          ...(open ? { bgcolor: 'action.selected' } : {})
        }}
      >
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            {pi.pi_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {pi.partner_vendor?.vendor_name || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pi.partner_vendor?.vendor_code || ''}
          </Typography>
        </TableCell>
        <TableCell>{new Date(pi.pi_date).toLocaleDateString()}</TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            ₹{pi.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={pi.status || 'PENDING'}
            color={
              pi.status === 'APPROVED' ? 'success' : 
              pi.status === 'REJECTED' ? 'error' : 
              'warning'
            }
            size="small"
          />
        </TableCell>
        <TableCell align="right">
          {pi.status === 'PENDING' && (
            <>
              <IconButton
                size="small"
                color="success"
                onClick={() => onApprove(pi, true)}
                sx={{ mr: 1 }}
                title="Approve PI (Auto-generates EOPAs)"
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onApprove(pi, false)}
                sx={{ mr: 1 }}
                title="Reject PI"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
          <IconButton
            size="small"
            color="secondary"
            onClick={() => onViewWorkflow(pi)}
            sx={{ mr: 1 }}
            title="View Document Flow"
          >
            <TimelineIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => onDownloadPDF(pi)}
            sx={{ mr: 1 }}
            title="Download PDF"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => onEdit(pi)}
            sx={{ mr: 1 }}
            title="Edit PI"
            disabled={pi.status === 'APPROVED' || pi.status === 'REJECTED'}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(pi)}
            title="Delete PI"
            disabled={pi.status === 'APPROVED'}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
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
                  label={`${pi.items?.length || 0} item${pi.items?.length !== 1 ? 's' : ''}`}
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
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>HSN Code</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pack Size</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dosage Form</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Unit Price</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pi.items?.map((item, idx) => (
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
                            label={item.hsn_code || item.medicine?.hsn_code || 'N/A'} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.pack_size || item.medicine?.pack_size || '-'}
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
                          ₹{pi.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              {pi.remarks && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    REMARKS
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {pi.remarks}
                  </Typography>
                </Box>
              )}
              {pi.status === 'APPROVED' && pi.approved_at && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderLeft: 4, borderColor: 'success.main', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    APPROVAL INFORMATION
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Approved At:</strong> {new Date(pi.approved_at).toLocaleString()}
                  </Typography>
                  {pi.approved_by && (
                    <Typography variant="body2">
                      <strong>Approved By:</strong> User ID {pi.approved_by}
                    </Typography>
                  )}
                  {pi.eopa_numbers && pi.eopa_numbers.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Auto-generated EOPAs:</strong> {pi.eopa_numbers.join(', ')}
                    </Typography>
                  )}
                </Box>
              )}
              {pi.status === 'REJECTED' && pi.approved_at && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'error.50', borderLeft: 4, borderColor: 'error.main', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    REJECTION INFORMATION
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Rejected At:</strong> {new Date(pi.approved_at).toLocaleString()}
                  </Typography>
                  {pi.approved_by && (
                    <Typography variant="body2">
                      <strong>Rejected By:</strong> User ID {pi.approved_by}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const PIPage = () => {
  const navigate = useNavigate()
  const [pis, setPis] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPI, setEditingPI] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [piToDelete, setPiToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [piToApprove, setPiToApprove] = useState(null)
  const [approvalAction, setApprovalAction] = useState(true)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [approving, setApproving] = useState(false)
  const { error, handleApiError, clearError } = useApiError()
  const {
    openEditForm,
    closeEditForm,
    markAsSaved,
    updateDataStably,
    addDataStably,
    removeDataStably,
    getRowStyle,
  } = useStableRowEditing()

  const fetchPIs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/pi/')
      if (response.data.success) {
        setPis(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPIs()
  }, [])

  const handleSubmit = async (formData, piId = null) => {
    try {
      setSubmitting(true)
      clearError()
      
      let response
      if (piId) {
        response = await api.put(`/api/pi/${piId}`, formData)
        if (response.data.success) {
          const updatedPI = response.data.data
          setPis(prevPis => updateDataStably(prevPis, updatedPI))
          setSuccessMessage('PI updated successfully')
          markAsSaved(piId)
        }
      } else {
        response = await api.post('/api/pi/', formData)
        if (response.data.success) {
          const newPI = response.data.data
          setPis(prevPis => addDataStably(prevPis, newPI, true))
          setSuccessMessage('PI created successfully')
          markAsSaved(newPI.id)
        }
      }
      
      if (response.data.success) {
        setFormOpen(false)
        setEditingPI(null)
        closeEditForm()
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (pi) => {
    setEditingPI(pi)
    setFormOpen(true)
    openEditForm(pi.id)
  }

  const handleDeleteClick = (pi) => {
    setPiToDelete(pi)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!piToDelete) return
    
    try {
      setDeleting(true)
      clearError()
      
      const response = await api.delete(`/api/pi/${piToDelete.id}`)
      if (response.data.success) {
        setPis(prevPis => removeDataStably(prevPis, piToDelete.id))
        setSuccessMessage('PI deleted successfully')
        setDeleteDialogOpen(false)
        setPiToDelete(null)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setPiToDelete(null)
  }

  const handleDownloadPDF = async (pi) => {
    try {
      const response = await api.get(`/api/pi/${pi.id}/download-pdf`, {
        responseType: 'blob'
      })

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${pi.pi_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)

      setSuccessMessage(`PDF downloaded: ${pi.pi_number}.pdf`)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      handleApiError(err)
    }
  }

  const handleViewWorkflow = (pi) => {
    navigate(`/pi/${pi.id}/visual`)
  }

  const handleCreateNew = () => {
    setEditingPI(null)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingPI(null)
  }

  const handleApprovalClick = (pi, approve) => {
    setPiToApprove(pi)
    setApprovalAction(approve)
    setApprovalRemarks('')
    setApprovalDialogOpen(true)
  }

  const handleApprovalConfirm = async () => {
    if (!piToApprove) return
    
    try {
      setApproving(true)
      clearError()
      
      const response = await api.post(`/api/pi/${piToApprove.id}/approve`, {
        approved: approvalAction,
        remarks: approvalRemarks || undefined
      })
      
      if (response.data.success) {
        const action = approvalAction ? 'approved' : 'rejected'
        let message = `PI ${action} successfully`
        
        if (approvalAction && response.data.data.eopa_number) {
          message += ` - EOPA ${response.data.data.eopa_number} created with ${piToApprove.items?.length || 0} line items`
        }
        
        // Update PI in-place to preserve row order
        const updatedPI = response.data.data.pi || response.data.data
        setPis(prevPis => updateDataStably(prevPis, updatedPI))
        markAsSaved(piToApprove.id)
        setSuccessMessage(message)
        setApprovalDialogOpen(false)
        setPiToApprove(null)
        setApprovalRemarks('')
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setApproving(false)
    }
  }

  const handleApprovalCancel = () => {
    setApprovalDialogOpen(false)
    setPiToApprove(null)
    setApprovalRemarks('')
  }

  // Filter PIs based on search query
  const filteredPis = pis.filter(pi => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      pi.pi_number?.toLowerCase().includes(query) ||
      pi.partner_vendor?.vendor_name?.toLowerCase().includes(query) ||
      pi.partner_vendor?.vendor_code?.toLowerCase().includes(query) ||
      pi.items?.some(item => 
        item.medicine?.medicine_name?.toLowerCase().includes(query) ||
        item.medicine?.dosage_form?.toLowerCase().includes(query)
      )
    )
  })

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Proforma Invoice (PI)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create PI
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by PI Number, Vendor Name, Medicine Name..."
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
            ? 'No PIs found. Click "Create PI" to create one.' 
            : 'No PIs match your search criteria.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }} width={50} />
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PI Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Partner Vendor</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} width={120} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPis.map((pi, index) => (
                <PIRow 
                  key={pi.id} 
                  pi={pi} 
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onApprove={handleApprovalClick}
                  onDownloadPDF={handleDownloadPDF}
                  onViewWorkflow={handleViewWorkflow}
                  getRowStyle={getRowStyle}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PIForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        isLoading={submitting}
        pi={editingPI}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete PI</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete PI <strong>{piToDelete?.pi_number}</strong>?
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

      <Dialog
        open={approvalDialogOpen}
        onClose={handleApprovalCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction ? 'Approve' : 'Reject'} PI
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to {approvalAction ? 'approve' : 'reject'} PI <strong>{piToApprove?.pi_number}</strong>?
          </DialogContentText>
          {approvalAction && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Auto-EOPA Generation:</strong> Approving this PI will automatically create ONE EOPA with {piToApprove?.items?.length || 0} line items.
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Remarks (Optional)"
            value={approvalRemarks}
            onChange={(e) => setApprovalRemarks(e.target.value)}
            placeholder="Add any remarks about this decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApprovalCancel} disabled={approving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprovalConfirm} 
            color={approvalAction ? 'success' : 'error'}
            variant="contained"
            disabled={approving}
          >
            {approving ? 'Processing...' : (approvalAction ? 'Approve' : 'Reject')}
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

export default PIPage
