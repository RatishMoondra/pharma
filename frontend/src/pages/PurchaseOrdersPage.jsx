import { useState, useEffect, useMemo, useCallback } from 'react'; 
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  IconButton, 
  Tooltip, 
  FormControl, 
  Select, 
  MenuItem, 
  Menu, // Added for Context Menu
} from '@mui/material';
import {
  DataGrid,
  GridToolbar, 
  GridToolbarContainer, 
  GridToolbarQuickFilter, 
  gridClasses, 
} from '@mui/x-data-grid';
import { styled, alpha } from '@mui/material/styles'; 

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close'; 
import WarningIcon from '@mui/icons-material/Warning'; 
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api';


// --- Constants ---
const ODD_OPACITY = 0.05; 
const SLA_HOURS = 48; 
const statusColor = {
  OPEN: 'warning',
  PARTIAL: 'info',
  CLOSED: 'success',
  DRAFT: 'default',
  PENDING_APPROVAL: 'primary',
  APPROVED: 'secondary',
  READY: 'info',
};


// --- Helper Functions ---
const isSlaBreached = (po) => {
  if (po.status !== 'PENDING_APPROVAL' || !po.created_at) return false;
  
  const createdDate = new Date(po.created_at);
  const now = new Date();
  const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  
  return diffInHours > SLA_HOURS; 
};

const getStatusChipColor = (status) => statusColor[status] || 'default';

// --- Styled Components ---

// MODIFICATION: Added styling for error rows
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
    },
  },
  // Row click/Context Menu styling
  '& .MuiDataGrid-row': {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  // NEW: Critical Row Styling for SLA Breach
  '& .Mui-sla-breached-row': {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    '&:hover': {
      backgroundColor: alpha(theme.palette.error.main, 0.2),
    },
  },
}));

function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">No Purchase Orders Found</Typography>
    </Box>
  );
}

// --- Custom Toolbar Component with Status Filter and Quick Filter ---
const PurchaseOrdersToolbar = (props) => {
    const { statusFilter, setStatusFilter } = props;
    const allStatuses = useMemo(() => Object.keys(statusColor).map(key => ({ 
        id: key, 
        name: key.replace(/_/g, ' ') 
    })), []);

    return (
        <GridToolbarContainer sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* Status Filter */}
                <FormControl variant="outlined" sx={{ minWidth: 150 }} size="small">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        displayEmpty
                        inputProps={{ 'aria-label': 'Select status' }}
                        sx={{ fontSize: '0.8rem', bgcolor: 'background.paper', fontWeight: 'medium' }}
                    >
                        <MenuItem value="ALL" sx={{ fontWeight: 'bold' }}>Filter By Status: ALL</MenuItem>
                        {allStatuses.map(status => (
                            <MenuItem key={status.id} value={status.id}>
                                {status.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                {/* Global Search (Quick Filter) */}
                <GridToolbarQuickFilter sx={{ minWidth: 250 }} />
            </Box>
            
            {/* Default DataGrid Toolbar Buttons (Export, Filter, Density) */}
            <Box>
                <GridToolbar 
                    csvOptions={{ allColumns: true }} 
                    printOptions={{ disableToolbarButton: true }}
                />
            </Box>
        </GridToolbarContainer>
    );
};
// --- End of Custom Toolbar ---


// --- Main Component ---
export default function PurchaseOrdersPage() {
    
  const [poList, setPoList] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [contextMenu, setContextMenu] = useState(null);

  // --- Workflow handlers (using useCallback for stability) ---
  const handleActionSuccess = useCallback((message) => {
    setSnackbar({ open: true, message, severity: 'success' });
    fetchPOs();
    setSelectedPO(null); // Close Drawer
    setContextMenu(null); // Close Menu
  }, []);

  const handleActionError = useCallback((message) => {
    setSnackbar({ open: true, message, severity: 'error' });
    setContextMenu(null); // Close Menu
  }, []);

  const handleMarkPending = useCallback(async (poId) => {
    try {
      const res = await api.post(`/api/po/${poId}/mark-pending`);
      if (res.data.success) handleActionSuccess('PO marked as Pending Approval');
    } catch (err) {
      handleActionError('Failed to mark PO as Pending');
    }
  }, [handleActionSuccess, handleActionError]);

  const handleMarkReady = useCallback(async (poId) => {
    try {
      const res = await api.post(`/api/po/${poId}/mark-ready`);
      if (res.data.success) handleActionSuccess('PO marked as Ready to Send');
    } catch (err) {
      handleActionError('Failed to mark PO as Ready');
    }
  }, [handleActionSuccess, handleActionError]);

  const handleSendPO = useCallback(async (poId) => {
    try {
      const res = await api.post(`/api/po/${poId}/send`);
      if (res.data.success) handleActionSuccess('PO sent successfully');
    } catch (err) {
      handleActionError('Failed to send PO');
    }
  }, [handleActionSuccess, handleActionError]);

  const handleApprovePO = useCallback(async (poId) => {
    try {
      const res = await api.post(`/api/po/${poId}/approve`);
      if (res.data.success) handleActionSuccess('PO approved successfully');
    } catch (err) {
      handleActionError('Failed to approve PO');
    }
  }, [handleActionSuccess, handleActionError]);
  // --- End of Workflow handlers ---


  useEffect(() => {
    fetchPOs();
    const interval = setInterval(fetchPOs, 1000 * 60 * 60 * 24); 
    return () => clearInterval(interval);
  }, []);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/po/');
      if (res.data.success) {
        setPoList(res.data.data.map((po, index) => ({ 
            ...po, 
            id: po.id,
            index: index 
        })));
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load POs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPO = (po) => {
    setSelectedPO(po);
  };
  
  const handleCloseDrawer = () => {
    setSelectedPO(null);
  };

  // NEW: Context Menu Handlers
  const handleContextMenu = (event) => {
    event.preventDefault();
    const row = poList.find(p => p.id === event.row.id);

    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            row,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  // --- End of Context Menu Handlers ---


  // --- DataGrid Column Definition (MODIFIED) ---
  const PO_COLUMNS = useMemo(() => [
    { 
        field: 'index', 
        headerName: '#', 
        width: 60, 
        sortable: false,
        filterable: false,
        renderCell: (params) => params.row.index + 1,
    },
    { 
        field: 'po_number', 
        headerName: 'PO Number', 
        width: 150, 
        renderCell: (params) => (
            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.dark' }}>
                {params.value}
            </Typography>
        ),
    },
    {
        field: 'sla_status',
        headerName: 'SLA Status',
        width: 120,
        sortable: false,
        filterable: false,
        valueGetter: (value, row) => isSlaBreached(row),
        renderCell: (params) => {
            if (!params.value) return null;

            return (
                <Tooltip title={`SLA Breached! PO pending approval for over ${SLA_HOURS} hours. Created on ${new Date(params.row.created_at).toLocaleString()}`}>
                    <Chip 
                        label="BREACHED" 
                        color="error" 
                        size="small" 
                        icon={<WarningIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold' }}
                    />
                </Tooltip>
            );
        }
    },
    { 
        field: 'status', 
        headerName: 'Status', 
        width: 150, 
        renderCell: (params) => (
            <Chip 
                label={params.value} 
                color={getStatusChipColor(params.value)} 
                size="small" 
                sx={{ fontWeight: 'bold' }}
            />
        ),
    },
    { 
        field: 'po_type', 
        headerName: 'Type', 
        width: 100, 
    },
    { 
        field: 'vendor_name', 
        headerName: 'Vendor', 
        minWidth: 200, 
        flex: 1,
        valueGetter: (value, row) => row.vendor?.vendor_name || '-',
    },
    { 
        field: 'delivery_date', 
        headerName: 'Delivery Date', 
        width: 150,
        type: 'date',
        valueGetter: (value, row) => row.delivery_date ? new Date(row.delivery_date) : null,
        valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
  ], []);

  const filterModel = useMemo(() => {
    if (statusFilter === 'ALL') {
      return undefined;
    }
    return {
      items: [
        {
          field: 'status',
          operator: 'is',
          value: statusFilter,
        },
      ],
      logicOperator: 'and',
      quickFilterLogicOperator: 'or',
      quickFilterValues: [],
    };
  }, [statusFilter]);
  // --- End of DataGrid Column Definition ---


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4"
 sx={{ mb: 2 }}>
        Purchase Orders
      </Typography>
      
      {/* PO List (Master View) - Now using DataGrid */}
      <Paper elevation={3} sx={{ height: 600, width: '100%', mb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
          ) : (
            <StripedDataGrid
                rows={poList}
                columns={PO_COLUMNS}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                filterModel={filterModel}
                slots={{ 
                    toolbar: PurchaseOrdersToolbar,
                    noRowsOverlay: CustomNoRowsOverlay,
                }}
                slotProps={{
                    toolbar: { 
                        statusFilter, 
                        setStatusFilter 
                    },
                    filterPanel: {
                        disableApplyFilterButton: true
                    }
                }}
                density="comfortable" 
                // MODIFICATION: Apply conditional row class for SLA Breach
                getRowClassName={(params) => {
                    let className = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd';
                    if (isSlaBreached(params.row)) {
                        className += ' Mui-sla-breached-row';
                    }
                    return className;
                }}
                onRowClick={(params) => handleSelectPO(params.row)}
                onRowContextMenu={handleContextMenu}
            />
          )}
      </Paper>

      {/* NEW: Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => { handleSelectPO(contextMenu.row); handleCloseContextMenu(); }}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        
        {contextMenu?.row.status === 'PENDING_APPROVAL' && (
             <MenuItem onClick={() => { handleApprovePO(contextMenu.row.id); handleCloseContextMenu(); }} sx={{ color: 'success.main', fontWeight: 'bold' }}>
                <CheckCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Approve PO
            </MenuItem>
        )}
        {contextMenu?.row.status === 'APPROVED' && (
             <MenuItem onClick={() => { handleMarkReady(contextMenu.row.id); handleCloseContextMenu(); }}>
                <SendIcon fontSize="small" sx={{ mr: 1 }} /> Mark Ready to Send
            </MenuItem>
        )}
        {contextMenu?.row.status === 'READY' && (
             <MenuItem onClick={() => { handleSendPO(contextMenu.row.id); handleCloseContextMenu(); }}>
                <SendIcon fontSize="small" sx={{ mr: 1 }} /> Send PO
            </MenuItem>
        )}
      </Menu>


      {/* PO Details (Detail View - using Drawer) */}
      <Drawer
        anchor="right"
        open={!!selectedPO}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 600, md: 800, lg: 900 } }, 
        }}
      >
        {selectedPO && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Scrollable Content */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                
                {/* NEW: Elevated and Clean Drawer Header */}
                <Paper elevation={2} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    p: 2, 
                    mb: 3, 
                    borderLeft: `4px solid ${getStatusChipColor(selectedPO.status) === 'default' ? '#ccc' : getStatusChipColor(selectedPO.status)}` 
                }}>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                            {selectedPO.po_number}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {selectedPO.po_type} PO for {selectedPO.vendor?.vendor_name || 'N/A'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                            label={selectedPO.status} 
                            color={getStatusChipColor(selectedPO.status)} 
                            size="medium" 
                            sx={{ fontWeight: 'bold', minWidth: 120, height: 32, fontSize: '1rem' }}
                        />
                        <IconButton onClick={handleCloseDrawer}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Paper>

                {/* PO Details Accordion */}
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">PO Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                    <Typography variant="body2"><strong>PO Number:</strong> {selectedPO.po_number}</Typography>
                    <Typography variant="body2">
                        <strong>Status:</strong> 
                        <Chip label={selectedPO.status} color={getStatusChipColor(selectedPO.status)} size="small" sx={{ ml: 1, fontWeight: 'medium' }} />
                        {isSlaBreached(selectedPO) && (
                            <Chip 
                                label="SLA BREACHED" 
                                color="error" 
                                size="small" 
                                icon={<WarningIcon fontSize="small" />}
                                sx={{ ml: 1, fontWeight: 'bold' }}
                            />
                        )}
                    </Typography>
                    <Typography variant="body2"><strong>Vendor:</strong> {selectedPO.vendor?.vendor_name}</Typography>
                    <Typography variant="body2"><strong>Delivery Date:</strong> {selectedPO.delivery_date ? new Date(selectedPO.delivery_date).toLocaleDateString() : '-'}</Typography>
                    <Typography variant="body2"><strong>Creation Date:</strong> {selectedPO.created_at ? new Date(selectedPO.created_at).toLocaleString() : '-'}</Typography>
                    <Typography variant="body2"><strong>Remarks:</strong> {selectedPO.remarks || '-'}</Typography>
                    </AccordionDetails>
                </Accordion>
                
                {/* PO Items Table (Added Total Footer) */}
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">PO Items</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                        <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {selectedPO.po_type === 'RM' && 'Raw Material'}
                                {selectedPO.po_type === 'PM' && 'Packing Material'}
                                {selectedPO.po_type === 'FG' && 'Medicine'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Ordered Qty</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Fulfilled Qty</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 80 }}>Unit</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Language</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Artwork Version</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(selectedPO.items || []).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                {selectedPO.po_type === 'RM' && (item.raw_material?.rm_name || item.raw_material_id || '-')}
                                {selectedPO.po_type === 'PM' && (item.packing_material?.pm_name || item.packing_material_id || '-')}
                                {selectedPO.po_type === 'FG' && (item.medicine?.medicine_name || item.medicine_id || '-')}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'medium' }}>{item.ordered_quantity}</TableCell>
                                <TableCell>{item.fulfilled_quantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>{item.language || '-'}</TableCell>
                                <TableCell>{item.artwork_version || '-'}</TableCell>
                                <TableCell>{item.remarks || '-'}</TableCell>
                            </TableRow>
                            ))}
                            {/* NEW: Total Footer Row */}
                            <TableRow sx={{ bgcolor: 'info.50', borderTop: '2px solid' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>TOTALS</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                                    {(selectedPO.items || []).reduce((sum, item) => sum + (parseFloat(item.ordered_quantity) || 0), 0)}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell colSpan={4}></TableCell>
                            </TableRow>
                        </TableBody>
                        </Table>
                    </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </Box>

            {/* MODIFICATION: Sticky Action Bar (Completed Block) */}
            <Paper 
                elevation={6} 
                sx={{ 
                    position: 'sticky', 
                    bottom: 0, 
                    p: 2, 
                    mt: 'auto', 
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    zIndex: 100,
                    bgcolor: 'background.paper'
                }}
            >
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                {selectedPO.status === 'DRAFT' && (
                    <Button variant="contained" color="primary" onClick={() => handleMarkPending(selectedPO.id)}>
                    Mark as Pending Approval
                    </Button>
                )}
                {selectedPO.status === 'PENDING_APPROVAL' && (
                    <Button variant="contained" color="success" onClick={() => handleApprovePO(selectedPO.id)}>
                    Approve PO
                    </Button>
                )}
                {selectedPO.status === 'APPROVED' && (
                    <Button variant="contained" color="info" onClick={() => handleMarkReady(selectedPO.id)}>
                    Mark as Ready to Send
                    </Button>
                )}
                {selectedPO.status === 'READY' && (
                    <Button variant="contained" color="secondary" onClick={() => handleSendPO(selectedPO.id)}>
                    Send PO
                    </Button>
                )}
                <Button variant="outlined" onClick={handleCloseDrawer}>
                    Close Details
                </Button>
                </Box>
            </Paper>
          </Box>
        )}
      </Drawer>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}