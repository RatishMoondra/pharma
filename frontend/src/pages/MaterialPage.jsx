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
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from '@mui/material'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const MaterialPage = () => {
  const [tab, setTab] = useState(0)
  const [receipts, setReceipts] = useState([])
  const [balance, setBalance] = useState([])
  const [loading, setLoading] = useState(true)
  const { error, handleApiError, clearError } = useApiError()

  const fetchMaterialReceipts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/material/receipts')
      if (response.data.success) {
        setReceipts(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterialBalance = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/material/balance')
      if (response.data.success) {
        setBalance(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 0) {
      fetchMaterialReceipts()
    } else {
      fetchMaterialBalance()
    }
  }, [tab])

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Material Management</Typography>
      </Box>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Material Receipts" />
        <Tab label="Material Balance" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        receipts.length === 0 ? (
          <Alert severity="info">
            No material receipts found. Receipts are created when materials arrive from vendors.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Receipt Number</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Receipt Date</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>{receipt.receipt_number}</TableCell>
                    <TableCell>{receipt.po?.po_number || '-'}</TableCell>
                    <TableCell>{receipt.po?.vendor?.name || '-'}</TableCell>
                    <TableCell>{new Date(receipt.receipt_date).toLocaleDateString()}</TableCell>
                    <TableCell>{receipt.quantity_received}</TableCell>
                    <TableCell>
                      <Chip
                        label={receipt.status || 'RECEIVED'}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : balance.length === 0 ? (
        <Alert severity="info">No material balance records found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Medicine</TableCell>
                <TableCell>Material Type</TableCell>
                <TableCell>Opening Balance</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell>Closing Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balance.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.medicine?.medicine_name || '-'}</TableCell>
                  <TableCell>
                    <Chip label={item.material_type} color="info" size="small" />
                  </TableCell>
                  <TableCell>{item.opening_balance}</TableCell>
                  <TableCell style={{ color: 'green' }}>+{item.received_quantity}</TableCell>
                  <TableCell style={{ color: 'red' }}>-{item.issued_quantity}</TableCell>
                  <TableCell>
                    <strong>{item.closing_balance}</strong>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default MaterialPage
