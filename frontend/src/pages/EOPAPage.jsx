import { useState, useEffect, useMemo } from 'react'
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { styled, alpha } from '@mui/material/styles' // Added alpha and styled
import {
  DataGrid,
  gridClasses // Used for striped row styling
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
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'; // New icon for No Rows Overlay
import { Business, Inventory2, LocalShipping } from '@mui/icons-material'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'
import SimplePODialog from '../components/SimplePODialog'

// --- DataGrid Helper Styles and Components ---
const ODD_OPACITY = 0.05; 

// Styled component for the DataGrid
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: '1px solid',
  borderColor: theme.palette.divider,
  borderRadius: theme.shape.borderRadius,
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.text.primary,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderRadius: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + 0.05),
      '@media (hover: none)': { backgroundColor: 'transparent' },
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity),
    },
  },
}));

// Custom No Rows Overlay for the inner DataGrid
function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2 }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
      <Typography variant="subtitle2" color="text.secondary">No Line Items Found</Typography>
    </Box>
  );
}
// --- End of DataGrid Helpers ---


// --- Helper Functions (Left untouched) ---

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

// --- PIItemRow Component (Left untouched, as it's a detail component and is currently unused in EOPAPage's main body) ---

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

                {/* Medicine Master Vendor Information */}
                {piItem.medicine && (
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

// --- EOPAPage Component (Revised) ---

const EOPAPage = () => {
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

  // Filtering and Sorting States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortField, setSortField] = useState('eopa_date')
  const [sortDirection, setSortDirection] = useState('desc')

  // PO Management Dialog
  const [poDialogOpen, setPoDialogOpen] = useState(false)
  const [poDialogMode, setPoDialogMode] = useState('generate') // 'generate' or 'delete'
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

      // Fetch PIs with items
      const piResponse = await api.get('/api/pi/')
      const allPis = piResponse.data.success ? piResponse.data.data : []

      // Filter only approved PIs
      const approvedPis = allPis.filter(pi => pi.status === 'APPROVED')
      setPis(approvedPis)

      // Fetch EOPAs
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

  // --- Filtering and Sorting Logic ---
  const sortedEopas = useMemo(() => {
    let list = eopas.filter(eopa => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && eopa.status !== statusFilter) {
        return false
      }

      // 2. Search Filter
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()

      // Find the associated PI for comprehensive search
      const pi = pis.find(p => p.id === eopa.pi_id)

      const passesSearch = (
        eopa.eopa_number?.toLowerCase().includes(query) ||
        // Search by medicine name in EOPA items
        eopa.items?.some(item =>
          item.pi_item?.medicine?.medicine_name?.toLowerCase().includes(query)
        ) ||
        // Search by PI Number or Partner Vendor Name
        pi?.pi_number?.toLowerCase().includes(query) ||
        pi?.partner_vendor?.vendor_name?.toLowerCase().includes(query)
      )
      return passesSearch
    })

    // 3. Sorting
    return list.sort((a, b) => {
      let comparison = 0;

      const piA = pis.find(p => p.id === a.pi_id)
      const piB = pis.find(p => p.id === b.pi_id)
      
      const getTotal = (eopa) => 
        eopa.items.reduce((sum, item) => sum + (parseFloat(item.estimated_total) || 0), 0);

      switch (sortField) {
        case 'eopa_number':
          comparison = (a.eopa_number || '').localeCompare(b.eopa_number || '');
          break;
        case 'eopa_date':
          comparison = new Date(a.eopa_date).getTime() - new Date(b.eopa_date).getTime();
          break;
        case 'total_value':
          comparison = getTotal(a) - getTotal(b);
          break;
        case 'pi_number':
          comparison = (piA?.pi_number || '').localeCompare(piB?.pi_number || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    })

  }, [eopas, pis, searchQuery, statusFilter, sortField, sortDirection])
  // --- End of Filtering and Sorting Logic ---


  const handleApproveClick = (eopa) => {
    setEopaToApprove(eopa)
    setApproveDialogOpen(true)
  }

  const handleGeneratePO = (eopa, poType) => {
    setSelectedEopa({ ...eopa, selectedPOType: poType })
    setPoDialogMode('generate')
    setPoDialogOpen(true)
  }

  const handleDeletePOsClick = (eopa) => {
    setSelectedEopa(eopa)
    setPoDialogMode('delete')
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

      // The backend will handle the EOPA status update
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

  // --- EOPA Line Item DataGrid Column Definition (MODIFIED) ---
  const EOPA_ITEM_COLUMNS = useMemo(() => [
    { 
        field: 'index', 
        headerName: '#', 
        width: 50, 
        sortable: false, 
        filterable: false,
        valueGetter: (value, row) => row.index + 1,
        renderCell: (params) => params.row.index + 1,
    },
    { 
        field: 'medicine_name', 
        headerName: 'Medicine Name', 
        minWidth: 180, 
        flex: 1.5,
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
        width: 120, 
        flex: 0.8,
        valueGetter: (value, row) => row.pi_item?.medicine?.dosage_form || '-',
        renderCell: (params) => (
            <Chip 
                label={params.value} 
                size="small" 
                variant="outlined" 
                color="info"
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
        width: 150, 
        align: 'right', 
        headerAlign: 'right',
        type: 'number',
        renderCell: (params) => (
            <Typography variant="body2">
                ₹
                {params.value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
        ),
    },
    { 
        field: 'estimated_total', 
        headerName: 'Est. Total', 
        width: 150, 
        align: 'right', 
        headerAlign: 'right',
        type: 'number',
        valueGetter: (value, row) => row.estimated_total,
        renderCell: (params) => (
            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                ₹
                {params.value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
        ),
    },
  ], [])


  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Estimated Order & Price Approval (EOPA)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            EOPAs are automatically generated when Proforma Invoices (PIs) are approved
          </Typography>
        </Box>
      </Box>

      {/* Filter and Sort Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Search EOPA #, PI #, Vendor, Medicine..."
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

        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel id="sort-field-label">Sort By</InputLabel>
          <Select
            labelId="sort-field-label"
            value={sortField}
            label="Sort By"
            onChange={(e) => setSortField(e.target.value)}
          >
            <MenuItem value="eopa_date">Date</MenuItem>
            <MenuItem value="eopa_number">EOPA Number</MenuItem>
            <MenuItem value="pi_number">PI Number</MenuItem>
            <MenuItem value="total_value">Total Value</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>

        <IconButton
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
          color="primary"
        >
          {sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : sortedEopas.length === 0 ? (
        <Alert severity="info">
          {eopas.length === 0
            ? 'No approved PIs with EOPAs found. Approve PIs to auto-generate EOPAs.'
            : 'No EOPAs match your current filter or search criteria.'}
        </Alert>
      ) : (
        <>
          {sortedEopas.map(eopa => {
            const pi = pis.find(p => p.id === eopa.pi_id)
            if (!pi) return null 

            // Prepare data for DataGrid (must have a stable 'id' field)
            const eopaItemsWithIds = eopa.items?.map((item, index) => ({
                ...item,
                id: item.id || `temp-eopa-item-${eopa.id}-${index}`, // Ensure a stable ID
                index: index // To use for the '#' column
            })) || []

            const totalAmount = eopaItemsWithIds.reduce((sum, item) => sum + parseFloat(item.estimated_total || 0), 0);

            return (
              <Accordion key={eopa.id} sx={{ mb: 2, boxShadow: 2 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    bgcolor: 'grey.50',
                    '&.Mui-expanded': { bgcolor: 'primary.50' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box>
                      <Typography variant="h6" color="primary.main">
                        {eopa.eopa_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PI: {pi.pi_number} |
                        Partner: {pi.partner_vendor?.vendor_name || '-'} |
                        Date: {new Date(eopa.eopa_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={eopa.status}
                        size="small"
                        color={
                          eopa.status === 'APPROVED' ? 'success' :
                          eopa.status === 'REJECTED' ? 'error' : 'warning'
                        }
                      />
                      <Chip
                        label={`${eopaItemsWithIds.length || 0} item${(eopaItemsWithIds.length || 0) !== 1 ? 's' : ''}`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            EOPA Line Items
                        </Typography>
                    </Box>

                    {/* NEW: DataGrid for EOPA Line Items */}
                    <Box sx={{ 
                        height: eopaItemsWithIds.length === 0 ? 150 : Math.min(400, (eopaItemsWithIds.length * 52) + 56), 
                        width: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden'
                    }}>
                        <StripedDataGrid
                            rows={eopaItemsWithIds}
                            columns={EOPA_ITEM_COLUMNS}
                            disableColumnMenu
                            disableRowSelectionOnClick
                            hideFooter
                            density="comfortable" 
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

                    {/* Grand Total Footer Box - Replaces the Total Row in the old table */}
                    <Paper elevation={0} sx={{ 
                        mt: 0, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderTop: 'none',
                        bgcolor: 'success.100',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        p: 1.5,
                        borderBottomLeftRadius: 4,
                        borderBottomRightRadius: 4,
                    }}>
                        <Box sx={{ display: 'flex', width: 300, justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Estimated Total:</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                                ₹
                                {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                        </Box>
                    </Paper>


                  {/* Remarks Section */}
                  {eopa.remarks && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">REMARKS:</Typography>
                      <Typography variant="body2">{eopa.remarks}</Typography>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  {eopa.status === 'PENDING' && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleApproveClick(eopa)}
                        size="small"
                      >
                        Approve EOPA
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(eopa)}
                        size="small"
                      >
                        Delete EOPA
                      </Button>
                    </Box>
                  )}
                  {eopa.status === 'APPROVED' && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Inventory2 />}
                        onClick={() => handleGeneratePO(eopa, 'RM')}
                        size="small"
                      >
                        Generate RM PO
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<LocalShipping />}
                        onClick={() => handleGeneratePO(eopa, 'PM')}
                        size="small"
                      >
                        Generate PM PO
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Business />}
                        onClick={() => handleGeneratePO(eopa, 'FG')}
                        size="small"
                      >
                        Generate FG PO
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeletePOsClick(eopa)}
                        size="small"
                      >
                        Delete All POs
                      </Button>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </>
      )}

      {/* Approve Dialog */}
      <Dialog
        open={approveDialogOpen}
        onClose={handleApproveCancel}
      >
        <DialogTitle>Approve EOPA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to approve EOPA <strong>{eopaToApprove?.eopa_number}</strong>?
            This will allow it to be used for PO generation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApproveCancel} disabled={approving}>
            Cancel
          </Button>
          <Button
            onClick={handleApproveConfirm}
            color="success"
            variant="contained"
            disabled={approving}
          >
            {approving ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PO Generation Dialog - Simplified single PO type */}
      <SimplePODialog
        open={poDialogOpen}
        onClose={handlePODialogClose}
        eopa={selectedEopa}
        onSuccess={handlePODialogSuccess}
      />

      {/* Delete EOPA Dialog */}
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

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default EOPAPage