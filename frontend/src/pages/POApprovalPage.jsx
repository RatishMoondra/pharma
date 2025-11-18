import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material'
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Send as SendIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  TaskAlt as ReadyIcon
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const POApprovalPage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pos, setPOs] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, po: null })
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [activeTab, setActiveTab] = useState(0) // 0=Draft, 1=Pending, 2=Approved, 3=Ready, 4=Sent

  const statusFilters = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Ready', value: 'READY' },
    { label: 'Sent', value: 'SENT' }
  ]

  useEffect(() => {
    fetchPOs()
  }, [])

  const fetchPOs = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/po/')
      setPOs(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch POs:', err)
      showSnackbar('Failed to load purchase orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleAction = (action, po) => {
    setActionDialog({ open: true, action, po })
    setRejectRemarks('')
  }

  const executeAction = async () => {
    const { action, po } = actionDialog
    
    try {
      let response
      let message = ''

      switch (action) {
        case 'submit':
          response = await api.post(`/api/po/${po.id}/submit-for-approval`)
          message = `PO ${po.po_number} submitted for approval`
          break
        
        case 'approve':
          response = await api.post(`/api/po/${po.id}/approve`)
          message = `PO ${response.data.data.po_number} approved`
          break
        
        case 'ready':
          response = await api.post(`/api/po/${po.id}/mark-ready`)
          message = `PO ${po.po_number} marked as ready`
          break
        
        case 'send':
          response = await api.post(`/api/po/${po.id}/send-to-vendor`, null, {
            params: { send_email: true }
          })
          message = `PO ${po.po_number} sent to vendor`
          break
        
        case 'reject':
          if (!rejectRemarks.trim()) {
            showSnackbar('Please provide rejection remarks', 'warning')
            return
          }
          response = await api.post(`/api/po/${po.id}/reject`, null, {
            params: { remarks: rejectRemarks }
          })
          message = `PO ${po.po_number} rejected`
          break
      }

      showSnackbar(message, 'success')
      setActionDialog({ open: false, action: null, po: null })
      fetchPOs()
    } catch (err) {
      console.error('Action failed:', err)
      showSnackbar(err.response?.data?.message || 'Action failed', 'error')
    }
  }

  const downloadPDF = async (poId) => {
    try {
      const response = await api.get(`/api/po/${poId}/pdf`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `PO_${poId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('PDF download failed:', err)
      showSnackbar('Failed to download PDF', 'error')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'default'
      case 'PENDING_APPROVAL': return 'warning'
      case 'APPROVED': return 'success'
      case 'READY': return 'info'
      case 'SENT': return 'primary'
      default: return 'default'
    }
  }

  const canSubmit = (po) => po.status === 'DRAFT'
  const canApprove = (po) => po.status === 'PENDING_APPROVAL' && user?.role === 'ADMIN'
  const canReject = (po) => (po.status === 'PENDING_APPROVAL' || po.status === 'APPROVED') && user?.role === 'ADMIN'
  const canMarkReady = (po) => po.status === 'APPROVED'
  const canSend = (po) => po.status === 'READY'

  const filteredPOs = pos.filter(po => po.status === statusFilters[activeTab].value)

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Purchase Order Approval Workflow
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {statusFilters.map((filter, index) => (
              <Tab
                key={filter.value}
                label={`${filter.label} (${pos.filter(po => po.status === filter.value).length})`}
              />
            ))}
          </Tabs>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Workflow:</strong> DRAFT → Submit for Approval → PENDING_APPROVAL → Approve → APPROVED → Mark Ready → READY → Send to Vendor → SENT
        </Alert>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>PO Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      No {statusFilters[activeTab].label} POs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {po.po_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={po.po_type} size="small" />
                    </TableCell>
                    <TableCell>{po.vendor?.vendor_name || '-'}</TableCell>
                    <TableCell>
                      {new Date(po.po_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={po.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(po.status)}
                      />
                    </TableCell>
                    <TableCell>{po.items?.length || 0}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Download PDF">
                          <IconButton size="small" onClick={() => downloadPDF(po.id)}>
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {canSubmit(po) && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAction('submit', po)}
                          >
                            Submit for Approval
                          </Button>
                        )}

                        {canApprove(po) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleAction('approve', po)}
                          >
                            Approve
                          </Button>
                        )}

                        {canReject(po) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleAction('reject', po)}
                          >
                            Reject
                          </Button>
                        )}

                        {canMarkReady(po) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<ReadyIcon />}
                            onClick={() => handleAction('ready', po)}
                          >
                            Mark Ready
                          </Button>
                        )}

                        {canSend(po) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={() => handleAction('send', po)}
                          >
                            Send to Vendor
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, action: null, po: null })}>
        <DialogTitle>
          {actionDialog.action === 'reject' ? 'Reject Purchase Order' : 'Confirm Action'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.action === 'reject' ? (
            <Box>
              <Typography variant="body2" gutterBottom>
                Are you sure you want to reject PO {actionDialog.po?.po_number}?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Rejection Remarks *"
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                margin="normal"
                required
              />
            </Box>
          ) : (
            <Typography>
              {actionDialog.action === 'submit' && `Submit PO ${actionDialog.po?.po_number} for approval?`}
              {actionDialog.action === 'approve' && `Approve PO ${actionDialog.po?.po_number}? This will assign a final PO number.`}
              {actionDialog.action === 'ready' && `Mark PO ${actionDialog.po?.po_number} as ready to send?`}
              {actionDialog.action === 'send' && `Send PO ${actionDialog.po?.po_number} to vendor via email?`}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, action: null, po: null })}>
            Cancel
          </Button>
          <Button
            onClick={executeAction}
            variant="contained"
            color={actionDialog.action === 'reject' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default POApprovalPage
