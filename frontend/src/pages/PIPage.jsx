import { useState, useEffect, useMemo } from 'react'
import {
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
  TableSortLabel,
  Menu,
  MenuItem,
  Link,
} from '@mui/material'
import { styled } from '@mui/material/styles'
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
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import PIForm from '../components/PIForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'
import { useNavigate } from 'react-router-dom'

// --- GLOBAL SORTING UTILITIES ---
// Helper to safely access nested properties for sorting
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj)
}

const descendingComparator = (a, b, property) => {
  if (property === 'total_amount') {
      const numA = a[property] || 0;
      const numB = b[property] || 0;
      if (numB < numA) return -1;
      if (numB > numA) return 1;
      return 0;
  }
  if (property === 'pi_date') {
      const dateA = new Date(a[property]).getTime();
      const dateB = new Date(b[property]).getTime();
      if (dateB < dateA) return -1;
      if (dateB > dateA) return 1;
      return 0;
  }
  
  const valA = getNestedValue(a, property)?.toString().toLowerCase() || '';
  const valB = getNestedValue(b, property)?.toString().toLowerCase() || '';

  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}

const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const stableSort = (array, comparator) => {
  const stabilized = array.map((el, idx) => [el, idx]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}
// -------------------------

// Styled component for striped rows (Mimics DataGrid row styling)
const StripedTableRow = styled(TableRow)(({ theme, index }) => ({
  backgroundColor: index % 2 === 0 ? 'white' : theme.palette.grey[50],
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

// --- WORKFLOW HELPERS ---
const SLA_DAYS = 3;

const calculateNextAction = (pi) => {
    if (pi.status === 'PENDING') {
        return 'Awaiting Finance Review'; 
    }
    if (pi.status === 'APPROVED') {
        return 'Completed';
    }
    if (pi.status === 'REJECTED') {
        return 'Closed/Rejected';
    }
    return '-';
};

const checkSLAStatus = (pi) => {
    if (pi.status !== 'PENDING') return null; 
    
    const piDate = new Date(pi.pi_date);
    const today = new Date();
    const diffTime = Math.abs(today - piDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > SLA_DAYS) {
        return 'SLA_BREACH';
    }
    return null;
};
// -----------------------------------


const PIRow = ({ pi, onEdit, onDelete, onApprove, onDownloadPDF, onViewWorkflow, getRowStyle, index, navigate }) => {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Line Item State
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [itemOrder, setItemOrder] = useState('asc');
  const [itemOrderBy, setItemOrderBy] = useState('medicine.medicine_name');

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action, ...args) => {
    handleMenuClose();
    action(...args);
  };
  
  const handleItemSort = (property) => {
    const isAsc = itemOrderBy === property && itemOrder === 'asc';
    setItemOrder(isAsc ? 'desc' : 'asc');
    setItemOrderBy(property);
  };

  const isPending = pi.status === 'PENDING';
  const isFinal = pi.status === 'APPROVED' || pi.status === 'REJECTED';
  const slaStatus = checkSLAStatus(pi);

  // --- LINE ITEM SORTING & FILTERING LOGIC ---
  const filteredAndSortedItems = useMemo(() => {
    let currentItems = pi.items || [];
    const query = itemSearchQuery.toLowerCase();

    // 1. Filtering
    if (query) {
        currentItems = currentItems.filter(item => {
            return (
                item.medicine?.medicine_name?.toLowerCase().includes(query) ||
                item.medicine?.dosage_form?.toLowerCase().includes(query) ||
                item.pack_size?.toString().toLowerCase().includes(query) ||
                item.unit_price?.toString().includes(query) ||
                (item.quantity * item.unit_price)?.toString().includes(query)
            );
        });
    }

    // 2. Custom Comparator for Line Items (handles nested properties and calculated total)
    const itemDescendingComparator = (a, b, property) => {
      // Custom logic for the calculated 'total' column
      if (property === 'total') {
          const totalA = (a.quantity || 0) * (a.unit_price || 0);
          const totalB = (b.quantity || 0) * (b.unit_price || 0);
          if (totalB < totalA) return -1;
          if (totalB > totalA) return 1;
          return 0;
      }
      
      const valA = getNestedValue(a, property)?.toString().toLowerCase() || '';
      const valB = getNestedValue(b, property)?.toString().toLowerCase() || '';

      // Standard alphabetical/numerical comparison for other properties
      if (valB < valA) return -1;
      if (valB > valA) return 1;
      return 0;
    };

    const getItemComparator = (order, orderBy) => {
      return order === 'desc'
        ? (a, b) => itemDescendingComparator(a, b, orderBy)
        : (a, b) => -itemDescendingComparator(a, b, orderBy);
    }
    
    // 3. Apply Sorting
    return stableSort(currentItems, getItemComparator(itemOrder, itemOrderBy));
  }, [pi.items, itemSearchQuery, itemOrder, itemOrderBy]);

  // 4. Calculate the total of the currently visible (filtered) items
  const filteredItemsTotal = useMemo(() => {
      return filteredAndSortedItems.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price || 0);
      }, 0);
  }, [filteredAndSortedItems]);
  // -----------------------------------


  return (
    <>
      {/* Main PI Row - DataGrid visual appearance */}
      <StripedTableRow 
        sx={{
          ...getRowStyle(pi.id),
          ...(open ? { bgcolor: 'action.selected !important' } : {}),
          // SLA Row Highlighting
          ...(slaStatus === 'SLA_BREACH' ? { borderLeft: '4px solid', borderLeftColor: 'error.main', bgcolor: 'error.50' } : {}),
        }}
        index={index} 
        onContextMenu={(e) => {
            e.preventDefault();
            handleMenuClick(e);
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
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            <Link 
                component="button" 
                variant="body2" 
                color="primary"
                sx={{ fontWeight: 'medium', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} 
                onClick={() => handleAction(() => navigate(`/vendors?search=${pi.partner_vendor?.vendor_name}`))}
            >
                {pi.partner_vendor?.vendor_name || '-'}
            </Link>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pi.partner_vendor?.vendor_code || ''}
          </Typography>
        </TableCell>
        <TableCell>{new Date(pi.pi_date).toLocaleDateString()}</TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {'₹'}{pi.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </Typography>
        </TableCell>
        <TableCell>
            <Typography variant="body2">
                {calculateNextAction(pi)}
            </Typography>
            {slaStatus === 'SLA_BREACH' && (
                <Chip
                    icon={<AccessTimeFilledIcon fontSize="small" />}
                    label="SLA BREACH"
                    color="error"
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5, fontWeight: 'bold' }}
                />
            )}
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
            sx={{ fontWeight: 'bold' }}
          />
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {isPending && (
            <>
              <IconButton
                size="small"
                color="success"
                onClick={() => onApprove(pi, true)}
                title="Approve PI (Auto-generates EOPAs)"
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onApprove(pi, false)}
                title="Reject PI"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}

          <IconButton
            size="small"
            onClick={handleMenuClick}
            title="More Options"
            sx={{ ml: isPending ? 1 : 0 }}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handleAction(onDownloadPDF, pi)}>
              <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download PDF
            </MenuItem>
            
            <MenuItem onClick={() => handleAction(onViewWorkflow, pi)}>
              <TimelineIcon fontSize="small" sx={{ mr: 1 }} /> View Workflow
            </MenuItem>

            <MenuItem onClick={() => handleAction(onEdit, pi)} disabled={isFinal}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem onClick={() => handleAction(onDelete, pi)} disabled={pi.status === 'APPROVED'}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </Menu>
        </TableCell>
      </StripedTableRow>
      
      {/* Collapsible Detail Row - LINE ITEMS */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}> 
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom component="div">
                  Line Items
                </Typography>
                <Chip 
                  label={`${filteredAndSortedItems.length} item${filteredAndSortedItems.length !== 1 ? 's' : ''} shown (Total: ${pi.items?.length || 0})`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>

              {/* Line Item Search/Filter */}
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search items by name, quantity, or price..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.light' }}>
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }} width={50}>#</TableCell>
                      
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>
                        <TableSortLabel
                          active={itemOrderBy === 'medicine.medicine_name'}
                          direction={itemOrderBy === 'medicine.medicine_name' ? itemOrder : 'asc'}
                          onClick={() => handleItemSort('medicine.medicine_name')}
                        >
                          Medicine
                        </TableSortLabel>
                      </TableCell>
                      
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Pack Size</TableCell>
                      
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }} align="right">
                        <TableSortLabel
                          active={itemOrderBy === 'quantity'}
                          direction={itemOrderBy === 'quantity' ? itemOrder : 'asc'}
                          onClick={() => handleItemSort('quantity')}
                        >
                          Quantity
                        </TableSortLabel>
                      </TableCell>
                      
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }} align="right">
                        <TableSortLabel
                          active={itemOrderBy === 'unit_price'}
                          direction={itemOrderBy === 'unit_price' ? itemOrder : 'asc'}
                          onClick={() => handleItemSort('unit_price')}
                        >
                          Unit Price
                        </TableSortLabel>
                      </TableCell>
                      
                      <TableCell sx={{ color: 'black', fontWeight: 'bold' }} align="right">
                        <TableSortLabel
                          active={itemOrderBy === 'total'}
                          direction={itemOrderBy === 'total' ? itemOrder : 'asc'}
                          onClick={() => handleItemSort('total')}
                        >
                          Total
                        </TableSortLabel>
                      </TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No line items match your search criteria.</TableCell>
                      </TableRow>
                    ) : (
                        filteredAndSortedItems.map((item, idx) => (
                          <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? 'white' : 'grey.50', '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {item.medicine?.medicine_name || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.medicine?.dosage_form || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.pack_size || item.medicine?.pack_size || '-'}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{item.quantity?.toLocaleString('en-IN')}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {'₹'}{item.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                                {'₹'}{(item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                      ))
                    )}
                    <TableRow sx={{ bgcolor: 'success.50' }}>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {itemSearchQuery ? 'Total (Filtered Items):' : 'Grand Total (PI Total):'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" colSpan={2}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                          {'₹'}{filteredItemsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Approval/Rejection Info Boxes */}
              {pi.remarks && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>REMARKS</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{pi.remarks}</Typography>
                </Alert>
              )}
              {pi.status === 'APPROVED' && pi.approved_at && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>APPROVAL INFORMATION</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Approved At:</strong> {new Date(pi.approved_at).toLocaleString()}
                  </Typography>
                  {pi.approved_by && (<Typography variant="body2"><strong>Approved By:</strong> User ID {pi.approved_by}</Typography>)}
                  {pi.eopa_numbers && pi.eopa_numbers.length > 0 && (<Typography variant="body2" sx={{ mt: 1 }}><strong>Auto-generated EOPAs:</strong> {pi.eopa_numbers.join(', ')}</Typography>)}
                </Alert>
              )}
              {pi.status === 'REJECTED' && pi.approved_at && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>REJECTION INFORMATION</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Rejected At:</strong> {new Date(pi.approved_at).toLocaleString()}
                  </Typography>
                  {pi.approved_by && (<Typography variant="body2"><strong>Rejected By:</strong> User ID {pi.approved_by}</Typography>)}
                </Alert>
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
  
  // STATE FOR FILTERING & SORTING
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('pi_date');
  const [startDate, setStartDate] = useState(null); 
  const [endDate, setEndDate] = useState(null);   
  
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

  // --- STATE PERSISTENCE ---
  useEffect(() => {
    const savedState = JSON.parse(localStorage.getItem('piTableState'));
    if (savedState) {
        setSearchQuery(savedState.searchQuery || '');
        setStatusFilter(savedState.statusFilter || 'ALL');
        setOrder(savedState.order || 'desc');
        setOrderBy(savedState.orderBy || 'pi_date');
        setStartDate(savedState.startDate || null);
        setEndDate(savedState.endDate || null);
    }
    fetchPIs()
  }, [])

  useEffect(() => {
    const stateToSave = {
        searchQuery, statusFilter, order, orderBy, startDate, endDate
    };
    localStorage.setItem('piTableState', JSON.stringify(stateToSave));
  }, [searchQuery, statusFilter, order, orderBy, startDate, endDate]);
  // ------------------------------------

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

  // Sorting Handler
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Memoized Filtering and Sorting Logic
  const filteredPis = useMemo(() => {
    let currentPis = pis;
    const globalQuery = searchQuery.toLowerCase();

    // 1. Status Quick-Filter
    if (statusFilter !== 'ALL') {
      currentPis = currentPis.filter(pi => pi.status === statusFilter);
    }

    // 2. Date Range Filter
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        currentPis = currentPis.filter(pi => {
            const piDateTime = new Date(pi.pi_date).getTime();
            return piDateTime >= start.getTime() && piDateTime <= end.getTime();
        });
    }

    // 3. Global Search Filter
    if (globalQuery) {
      currentPis = currentPis.filter(pi => {
        return (
          pi.pi_number?.toLowerCase().includes(globalQuery) ||
          pi.partner_vendor?.vendor_name?.toLowerCase().includes(globalQuery) ||
          pi.partner_vendor?.vendor_code?.toLowerCase().includes(globalQuery) ||
          pi.items?.some(item => 
            item.medicine?.medicine_name?.toLowerCase().includes(globalQuery) ||
            item.medicine?.dosage_form?.toLowerCase().includes(globalQuery)
          )
        );
      });
    }

    // 4. Apply Sorting
    return stableSort(currentPis, getComparator(order, orderBy));
  }, [pis, searchQuery, statusFilter, order, orderBy, startDate, endDate]);

  // --- API/Action Handlers ---
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
  
  const statusOptions = [
    { label: 'All', value: 'ALL', color: 'default' },
    { label: 'Pending', value: 'PENDING', color: 'warning' },
    { label: 'Approved', value: 'APPROVED', color: 'success' },
    { label: 'Rejected', value: 'REJECTED', color: 'error' },
  ];

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4"
>Proforma Invoice (PI)</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create PI
        </Button>
      </Box>

      {/* Date Range Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary">Filter by Date Range:</Typography>
        <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate || ''}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
        />
        <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate || ''}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
        />
      </Box>

      {/* Quick Status Filter Chips */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary">Filter by Status:</Typography>
        {statusOptions.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            color={option.color}
            variant={statusFilter === option.value ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(option.value)}
            size="small"
            clickable
            sx={{ fontWeight: 'bold' }}
          />
        ))}
      </Box>

      {/* Global Search - Mimics DataGrid Toolbar Search */}
      <TextField
        fullWidth
        placeholder="Search by PI Number, Vendor Name, Medicine Name (Global Filter)..."
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
        // Custom "No results found" overlay
        <Alert severity="info">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {pis.length === 0 
              ? 'No PIs found. Click "Create PI" to create one.' 
              : 'No PIs match your current filters or search criteria.'}
          </Box>
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              {/* DataGrid-Styled Header Row with Sorting */}
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white' }} width={50} />
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'pi_number'}
                    direction={orderBy === 'pi_number' ? order : 'asc'}
                    onClick={() => handleSort('pi_number')}
                  >
                    PI Number
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'partner_vendor.vendor_name'}
                    direction={orderBy === 'partner_vendor.vendor_name' ? order : 'asc'}
                    onClick={() => handleSort('partner_vendor.vendor_name')}
                  >
                    Partner Vendor
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'pi_date'}
                    direction={orderBy === 'pi_date' ? order : 'asc'}
                    onClick={() => handleSort('pi_date')}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'total_amount'}
                    direction={orderBy === 'total_amount' ? order : 'asc'}
                    onClick={() => handleSort('total_amount')}
                  >
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Next Action</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
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
                  index={index} 
                  navigate={navigate} 
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

      {/* Delete Dialog */}
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

      {/* Approval Dialog */}
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
    </Box>
  )
}

export default PIPage