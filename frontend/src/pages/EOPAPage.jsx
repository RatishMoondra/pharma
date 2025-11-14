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
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const EOPARow = ({ eopa, onApprove, onGeneratePO }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{eopa.eopa_number}</TableCell>
        <TableCell>{eopa.pi?.pi_number || '-'}</TableCell>
        <TableCell>{new Date(eopa.eopa_date).toLocaleDateString()}</TableCell>
        <TableCell>₹{eopa.estimated_total?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>
          <Chip
            label={eopa.status || 'PENDING'}
            color={eopa.status === 'APPROVED' ? 'success' : 'warning'}
            size="small"
          />
        </TableCell>
        <TableCell>
          {eopa.status === 'PENDING' && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              onClick={() => onApprove(eopa.id)}
            >
              Approve
            </Button>
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
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Estimated Price</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eopa.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.medicine?.medicine_name || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.estimated_unit_price?.toFixed(2)}</TableCell>
                      <TableCell>₹{(item.quantity * item.estimated_unit_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const EOPAPage = () => {
  const [eopas, setEopas] = useState([])
  const [pis, setPis] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPI, setSelectedPI] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
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

  const fetchPIs = async () => {
    try {
      const response = await api.get('/api/pi/')
      if (response.data.success) {
        // Filter PIs that don't have EOPA yet
        setPis(response.data.data.filter(pi => !pi.eopa_generated))
      }
    } catch (err) {
      console.error('Failed to fetch PIs:', err)
    }
  }

  useEffect(() => {
    fetchEOPAs()
    fetchPIs()
  }, [])

  const handleCreateEOPA = async () => {
    if (!selectedPI) return

    try {
      setSubmitting(true)
      const response = await api.post('/api/eopa/', { pi_id: parseInt(selectedPI) })
      if (response.data.success) {
        setSuccessMessage('EOPA created successfully')
        fetchEOPAs()
        fetchPIs()
        setDialogOpen(false)
        setSelectedPI('')
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
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
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>EOPA Number</TableCell>
                <TableCell>PI Number</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Estimated Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eopas.map((eopa) => (
                <EOPARow
                  key={eopa.id}
                  eopa={eopa}
                  onApprove={handleApprove}
                  onGeneratePO={handleGeneratePO}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create EOPA from PI</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Select PI"
            value={selectedPI}
            onChange={(e) => setSelectedPI(e.target.value)}
            sx={{ mt: 2 }}
            disabled={submitting}
          >
            <MenuItem value="">Select a PI</MenuItem>
            {pis.map((pi) => (
              <MenuItem key={pi.id} value={pi.id}>
                {pi.pi_number} - {pi.partner_vendor?.name} - ₹{pi.total_amount?.toFixed(2)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateEOPA}
            variant="contained"
            disabled={!selectedPI || submitting}
          >
            {submitting ? 'Creating...' : 'Create EOPA'}
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
