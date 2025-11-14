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
  Collapse,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const PORow = ({ po }) => {
  const [open, setOpen] = useState(false)

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'warning',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      CLOSED: 'default',
    }
    return colors[status] || 'default'
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{po.po_number}</TableCell>
        <TableCell>
          <Chip label={po.po_type} color="primary" size="small" />
        </TableCell>
        <TableCell>{po.vendor?.name || '-'}</TableCell>
        <TableCell>{new Date(po.po_date).toLocaleDateString()}</TableCell>
        <TableCell>₹{po.total_amount?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>
          <Chip
            label={po.status || 'PENDING'}
            color={getStatusColor(po.status)}
            size="small"
          />
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
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quantity</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit Price</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {po.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {item.medicine?.medicine_name || item.item_description || '-'}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.unit_price?.toFixed(2)}</TableCell>
                      <TableCell>₹{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {po.remarks && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Remarks:</strong> {po.remarks}
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

const POPage = () => {
  const [tab, setTab] = useState(0)
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const { error, handleApiError, clearError } = useApiError()

  const PO_TYPES = ['RM', 'PM', 'FG']

  const fetchPOs = async (poType = null) => {
    try {
      setLoading(true)
      const url = poType ? `/api/po/?po_type=${poType}` : '/api/po/'
      const response = await api.get(url)
      if (response.data.success) {
        setPos(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const poType = tab === 0 ? null : PO_TYPES[tab - 1]
    fetchPOs(poType)
  }, [tab])

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Purchase Orders</Typography>
      </Box>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="All POs" />
        <Tab label="RM (Raw Material)" />
        <Tab label="PM (Packing Material)" />
        <Tab label="FG (Finished Goods)" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : pos.length === 0 ? (
        <Alert severity="info">
          No purchase orders found. POs are generated from approved EOPAs.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} />
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PO Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vendor</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pos.map((po) => (
                <PORow key={po.id} po={po} />
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

export default POPage
