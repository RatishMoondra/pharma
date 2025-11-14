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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import PIForm from '../components/PIForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const PIRow = ({ pi }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{pi.pi_number}</TableCell>
        <TableCell>{pi.partner_vendor?.name || '-'}</TableCell>
        <TableCell>{new Date(pi.pi_date).toLocaleDateString()}</TableCell>
        <TableCell>₹{pi.total_amount?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>
          <Chip
            label={pi.status || 'PENDING'}
            color={pi.status === 'APPROVED' ? 'success' : 'warning'}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pi.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.medicine?.medicine_name || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.unit_price?.toFixed(2)}</TableCell>
                      <TableCell>₹{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pi.remarks && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Remarks:</strong> {pi.remarks}
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

const PIPage = () => {
  const [pis, setPis] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { error, handleApiError, clearError } = useApiError()

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

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()
      
      const response = await api.post('/api/pi/', formData)
      if (response.data.success) {
        setSuccessMessage('PI created successfully')
        fetchPIs()
        setFormOpen(false)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Proforma Invoice (PI)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          Create PI
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : pis.length === 0 ? (
        <Alert severity="info">No PIs found. Click "Create PI" to create one.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>PI Number</TableCell>
                <TableCell>Partner Vendor</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pis.map((pi) => (
                <PIRow key={pi.id} pi={pi} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PIForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        isLoading={submitting}
      />

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
