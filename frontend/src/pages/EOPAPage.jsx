// EOPAPage.jsx
// UI-only refactor: compact layout, improved DataGrid, filter toolbar, right-side summary panel.
// Business logic (API calls, handlers, state) kept exactly as in the original file.
// Source file reference: backend file uploaded by user. :contentReference[oaicite:1]{index=1}

import { useState, useEffect, useMemo } from 'react'
import {
  Container,
  Typography,
  Button,
  Box,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider,
} from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import {
  DataGrid,
  gridClasses
} from '@mui/x-data-grid'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoIcon from '@mui/icons-material/Info'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'
import SimplePODialog from '../components/SimplePODialog'

// --- DataGrid Helper Styles and Components ---
const ODD_OPACITY = 0.06

const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.85rem',

  // cells
  '& .MuiDataGrid-cell': {
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // header
  '& .MuiDataGrid-columnHeaders': {
    background: `linear-gradient(180deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[50]} 100%)`,
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: '0.86rem',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    boxShadow: 'none',
  },

  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
    letterSpacing: 0.2,
  },

  // striping & hover
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + 0.03),
    },
  },

  '& .MuiDataGrid-row:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },

  // compact toolbar / quick filter styles (if present)
  '& .MuiDataGrid-virtualScroller': {
    padding: 0,
  },

  // small footer text if footer exists
  '& .MuiDataGrid-footerContainer': {
    padding: '6px 12px',
  },
}))

function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2 }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 34, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
      <Typography variant="subtitle2" color="text.secondary">No Line Items Found</Typography>
    </Box>
  )
}

// small helper: vendor label/icon (unchanged logic)
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

// --- PIItemRow component preserved (no logic changes) ---
const PIItemRow = ({ piItem, eopas, onApprove, onDelete, getRowStyle }) => {
  const [open, setOpen] = useState(false)
  const itemEopas = eopas.filter(e => e.pi_item_id === piItem.id)
  const hasEopa = itemEopas.length > 0

  return (
    <>
      <TableRow
        sx={{
          ...getRowStyle(piItem.id),
          ...(open ? { bgcolor: 'action.selected' } : {})
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
                            ...getRowStyle(eopa.id),
                            bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
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

                {piItem?.medicine && (
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

// --- EOPAPage Component (UI-only edits) ---

const EOPAPage = () => {
  // === State & logic (UNCHANGED) ===
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
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortField, setSortField] = useState('eopa_date')
  const [sortDirection, setSortDirection] = useState('desc')

  const [poDialogOpen, setPoDialogOpen] = useState(false)
  const [poDialogMode, setPoDialogMode] = useState('generate')
  const [selectedEopa, setSelectedEopa] = useState(null)

  const { error, handleApiError, clearError } = useApiError()
  const {
    markAsSaved,
    updateDataStably,
    removeDataStably,
    getRowStyle,
  } = useStableRowEditing()

  const fetchData = async () => {
    try {
      setLoading(true)

      const piResponse = await api.get('/api/pi/')
      const allPis = piResponse.data.success ? piResponse.data.data : []

      const approvedPis = allPis.filter(pi => pi.status === 'APPROVED')
      setPis(approvedPis)

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

  // Filtering & sorting logic (UNCHANGED)
  const sortedEopas = useMemo(() => {
    let list = eopas.filter(eopa => {
      if (statusFilter !== 'ALL' && eopa.status !== statusFilter) {
        return false
      }
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const pi = pis.find(p => p.id === eopa.pi_id)
      const passesSearch = (
        eopa.eopa_number?.toLowerCase().includes(query) ||
        eopa.items?.some(item =>
          item.pi_item?.medicine?.medicine_name?.toLowerCase().includes(query)
        ) ||
        pi?.pi_number?.toLowerCase().includes(query) ||
        pi?.partner_vendor?.vendor_name?.toLowerCase().includes(query)
      )
      return passesSearch
    })

    return list.sort((a, b) => {
      let comparison = 0
      const piA = pis.find(p => p.id === a.pi_id)
      const piB = pis.find(p => p.id === b.pi_id)

      const getTotal = (eopa) =>
        eopa.items.reduce((sum, item) => sum + (parseFloat(item.estimated_total) || 0), 0)

      switch (sortField) {
        case 'eopa_number':
          comparison = (a.eopa_number || '').localeCompare(b.eopa_number || '')
          break
        case 'eopa_date':
          comparison = new Date(a.eopa_date).getTime() - new Date(b.eopa_date).getTime()
          break
        case 'total_value':
          comparison = getTotal(a) - getTotal(b)
          break
        case 'pi_number':
          comparison = (piA?.pi_number || '').localeCompare(piB?.pi_number || '')
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [eopas, pis, searchQuery, statusFilter, sortField, sortDirection])

  // handlers (UNCHANGED)
  const handleApproveClick = (eopa) => {
    setEopaToApprove(eopa)
    setApproveDialogOpen(true)
  }

  const handleGeneratePO = (eopa, poType) => {
    setSelectedEopa({ ...eopa, selectedPOType: poType })
    setPoDialogMode('generate')
    setPoDialogOpen(true)
  }

  
  const handlePODialogClose = () => {
    setPoDialogOpen(false)
    setSelectedEopa(null)
  }

  const handlePODialogSuccess = (message) => {
    setSuccessMessage(message)
    fetchData()
  }

  const handleApproveConfirm = async () => {
    if (!eopaToApprove) return

    try {
      setApproving(true)
      clearError()

      const response = await api.post(`/api/eopa/${eopaToApprove.id}/approve`, {
        approved: true
      })
      if (response.data.success) {
        const updatedEopa = response.data.data
        setEopas(prevEopas => updateDataStably(prevEopas, updatedEopa))
        markAsSaved(eopaToApprove.id)
        setSuccessMessage('EOPA approved successfully')
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
        setEopas(prevEopas => removeDataStably(prevEopas, eopaToDelete.id))
        setSuccessMessage('EOPA deleted successfully')
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

  // --- EOPA Item columns (UNCHANGED logic; styling preserved) ---
  const EOPA_ITEM_COLUMNS = useMemo(() => [
    {
      field: 'index',
      headerName: '#',
      width: 56,
      sortable: false,
      filterable: false,
      valueGetter: (value, row) => row.index + 1,
      renderCell: (params) => params.row.index + 1,
    },
    {
      field: 'medicine_name',
      headerName: 'Medicine Name',
      minWidth: 180,
      flex: 1.6,
      valueGetter: (value, row) => row.pi_item?.medicine?.medicine_name || '-',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'dosage_form',
      headerName: 'Form',
      width: 110,
      flex: 0.8,
      valueGetter: (value, row) => row.pi_item?.medicine?.dosage_form || '-',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color="info"
          sx={{ height: 26 }}
        />
      ),
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2">{params.value?.toLocaleString('en-IN')}</Typography>
      ),
    },
    {
      field: 'estimated_unit_price',
      headerName: 'Est. Unit Price',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2">₹{params.value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
      ),
    },
    {
      field: 'estimated_total',
      headerName: 'Est. Total',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      type: 'number',
      valueGetter: (value, row) => row.estimated_total,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
          ₹{params.value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      ),
    },
  ], [])

  // === RENDER ===
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Estimated Order & Price Approval (EOPA)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            EOPAs are generated from approved PIs. Use the controls to search, filter, and generate POs.
          </Typography>
        </Box>

        {/* compact action area */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" variant="contained" startIcon={<ShoppingCartIcon />}>New EOPA</Button>
          <Button size="small" variant="outlined">Export</Button>
        </Box>
      </Box>

      {/* FILTER TOOLBAR: compact, improved */}
      <Paper elevation={1} sx={{ p: 1, mb: 2, borderRadius: 1 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Quick search EOPA #, PI #, Partner, Medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-field-label">Sort By</InputLabel>
              <Select
                labelId="sort-field-label"
                value={sortField}
                label="Sort By"
                onChange={(e) => setSortField(e.target.value)}
              >
                <MenuItem value="eopa_date">Date</MenuItem>
                <MenuItem value="eopa_number">EOPA #</MenuItem>
                <MenuItem value="pi_number">PI #</MenuItem>
                <MenuItem value="total_value">Total</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              color="primary"
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
              size="large"
            >
              {sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : sortedEopas.length === 0 ? (
        <Alert severity="info">
          {eopas.length === 0
            ? 'No approved PIs with EOPAs found. Approve PIs to auto-generate EOPAs.'
            : 'No EOPAs match your current filter or search criteria.'}
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedEopas.map(eopa => {
            const pi = pis.find(p => p.id === eopa.pi_id)
            if (!pi) return null

            const eopaItemsWithIds = eopa.items?.map((item, index) => ({
              ...item,
              id: item.id || `temp-eopa-item-${eopa.id}-${index}`,
              index: index
            })) || []

            const totalAmount = eopaItemsWithIds.reduce((sum, item) => sum + parseFloat(item.estimated_total || 0), 0)

            return (
              <Accordion
                key={eopa.id}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  boxShadow: 2,
                  '& .MuiAccordionSummary-root': { minHeight: 48 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: 'background.paper',
                    px: 2,
                    py: 1,
                    '&.Mui-expanded': { bgcolor: 'action.hover' }
                  }}
                >
                  <Grid container alignItems="center">
                    <Grid item xs={8} md={9}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {eopa.eopa_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PI: {pi.pi_number} | Partner: {pi.partner_vendor?.vendor_name || '-'} | Date: {new Date(eopa.eopa_date).toLocaleDateString()}
                      </Typography>
                    </Grid>

                    <Grid item xs={4} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Chip
                        label={eopa.status}
                        size="small"
                        color={
                          eopa.status === 'APPROVED' ? 'success' :
                            eopa.status === 'REJECTED' ? 'error' : 'warning'
                        }
                      />
                      <Chip label={`${eopaItemsWithIds.length || 0} item${(eopaItemsWithIds.length || 0) !== 1 ? 's' : ''}`} size="small" />
                    </Grid>
                  </Grid>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 1, pb: 2, px: 2 }}>
                  <Grid container spacing={2}>
                    {/* Left: main DataGrid */}
                    <Grid item xs={12} md={8}>
                      <Box sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        backgroundColor: 'background.paper',
                        height: eopaItemsWithIds.length === 0 ? 140 : Math.min(360, (eopaItemsWithIds.length * 38) + 56),
                      }}>
                        <StripedDataGrid
                          rows={eopaItemsWithIds}
                          columns={EOPA_ITEM_COLUMNS}
                          disableColumnMenu
                          disableRowSelectionOnClick
                          hideFooter
                          density="compact"
                          rowHeight={34}
                          headerHeight={34}
                          slots={{
                            noRowsOverlay: CustomNoRowsOverlay
                          }}
                          getRowClassName={(params) =>
                            params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                          }
                          initialState={{
                            filter: {
                              filterModel: {
                                items: [],
                                quickFilterExcludeHiddenColumns: true,
                              },
                            },
                          }}
                        />
                      </Box>

                      {/* compact total footer */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Paper elevation={0} sx={{
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'success.50',
                          borderRadius: 1,
                          width: 300,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Estimated Total</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>
                            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </Paper>
                      </Box>
                    </Grid>

                    {/* Right: summary & actions */}
                    <Grid item xs={12} md={4}>
                      <Paper elevation={1} sx={{ p: 2, borderRadius: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>EOPA Summary</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">EOPA #</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{eopa.eopa_number}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">PI #</Typography>
                          <Typography variant="body2">{pi.pi_number}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Items</Typography>
                          <Typography variant="body2">{eopaItemsWithIds.length}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Total Est.</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                          {eopa.status === 'PENDING' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleApproveClick(eopa)}
                                size="small"
                                fullWidth
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteClick(eopa)}
                                size="small"
                              >
                                Delete
                              </Button>
                            </Box>
                          )}

                          {eopa.status === 'APPROVED' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Inventory2 />}
                                onClick={() => handleGeneratePO(eopa, 'RM')}
                                size="small"
                                fullWidth
                              >
                                Generate RM PO
                              </Button>
                              <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<LocalShipping />}
                                onClick={() => handleGeneratePO(eopa, 'PM')}
                                size="small"
                                fullWidth
                              >
                                Generate PM PO
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<Business />}
                                onClick={() => handleGeneratePO(eopa, 'FG')}
                                size="small"
                                fullWidth
                              >
                                Generate FG PO
                              </Button>

                              
                            </Box>
                          )}
                        </Box>

                        {/* small footnote */}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
                          Vendor selection is resolved from Medicine Master during PO creation.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      )}

      {/* Approve Dialog (UNCHANGED) */}
      <Dialog open={approveDialogOpen} onClose={handleApproveCancel}>
        <DialogTitle>Approve EOPA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to approve EOPA <strong>{eopaToApprove?.eopa_number}</strong>? This will allow it to be used for PO generation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApproveCancel} disabled={approving}>Cancel</Button>
          <Button onClick={handleApproveConfirm} color="success" variant="contained" disabled={approving}>
            {approving ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PO Generation Dialog (UNCHANGED) */}
      <SimplePODialog
        open={poDialogOpen}
        onClose={handlePODialogClose}
        eopa={selectedEopa}
        onSuccess={handlePODialogSuccess}
      />

      {/* Delete EOPA Dialog (UNCHANGED) */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete EOPA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete EOPA <strong>{eopaToDelete?.eopa_number}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars (UNCHANGED) */}
      <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage('')}>
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
