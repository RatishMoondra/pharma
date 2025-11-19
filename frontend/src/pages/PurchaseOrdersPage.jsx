import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../services/api';

const statusColor = {
  OPEN: 'warning',
  PARTIAL: 'info',
  CLOSED: 'success',
};

export default function PurchaseOrdersPage() {
    // Workflow handlers
    const handleMarkPending = async (poId) => {
      try {
        const res = await api.post(`/api/po/${poId}/mark-pending`);
        if (res.data.success) {
          setSnackbar({ open: true, message: 'PO marked as Pending Approval', severity: 'success' });
          fetchPOs();
          setSelectedPO(null);
          setTab(0);
        }
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to mark PO as Pending', severity: 'error' });
      }
    };

    const handleMarkReady = async (poId) => {
      try {
        const res = await api.post(`/api/po/${poId}/mark-ready`);
        if (res.data.success) {
          setSnackbar({ open: true, message: 'PO marked as Ready', severity: 'success' });
          fetchPOs();
          setSelectedPO(null);
          setTab(0);
        }
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to mark PO as Ready', severity: 'error' });
      }
    };

    const handleSendPO = async (poId) => {
      try {
        const res = await api.post(`/api/po/${poId}/send`);
        if (res.data.success) {
          setSnackbar({ open: true, message: 'PO sent', severity: 'success' });
          fetchPOs();
          setSelectedPO(null);
          setTab(0);
        }
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to send PO', severity: 'error' });
      }
    };
  const [tab, setTab] = useState(0);
  const [poList, setPoList] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/po/');
      if (res.data.success) {
        setPoList(res.data.data);
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load POs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPO = (po) => {
    setSelectedPO(po);
    setTab(1);
  };

  const handleApprovePO = async (poId) => {
    try {
      const res = await api.post(`/api/po/${poId}/approve`);
      if (res.data.success) {
        setSnackbar({ open: true, message: 'PO approved', severity: 'success' });
        fetchPOs();
        setSelectedPO(null);
        setTab(0);
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve PO', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Purchase Orders
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="PO List" />
        <Tab label="PO Details & Approval" disabled={!selectedPO} />
      </Tabs>
      {tab === 0 && (
        <Box>
          {loading ? (
            <CircularProgress />
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {poList.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>{po.po_number}</TableCell>
                      <TableCell>{po.po_type}</TableCell>
                      <TableCell>
                        <Chip label={po.status} color={statusColor[po.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{po.vendor?.vendor_name}</TableCell>
                      <TableCell>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell align="right">
                        <Button variant="outlined" size="small" onClick={() => handleSelectPO(po)}>
                          View & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      {tab === 1 && selectedPO && (
        <Box>
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">PO Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2"><strong>PO Number:</strong> {selectedPO.po_number}</Typography>
              <Typography variant="body2"><strong>Type:</strong> {selectedPO.po_type}</Typography>
              <Typography variant="body2"><strong>Status:</strong> <Chip label={selectedPO.status} color={statusColor[selectedPO.status] || 'default'} size="small" /></Typography>
              <Typography variant="body2"><strong>Vendor:</strong> {selectedPO.vendor?.vendor_name}</Typography>
              <Typography variant="body2"><strong>Delivery Date:</strong> {selectedPO.delivery_date ? new Date(selectedPO.delivery_date).toLocaleDateString() : '-'}</Typography>
              <Typography variant="body2"><strong>Remarks:</strong> {selectedPO.remarks || '-'}</Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">PO Items</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Ordered Qty</TableCell>
                    <TableCell>Fulfilled Qty</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Artwork Version</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedPO.items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.medicine?.medicine_name}</TableCell>
                      <TableCell>{item.ordered_quantity}</TableCell>
                      <TableCell>{item.fulfilled_quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.language || '-'}</TableCell>
                      <TableCell>{item.artwork_version || '-'}</TableCell>
                      <TableCell>{item.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
          <Box sx={{ mt: 2 }}>
            {/* PO Workflow Buttons */}
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
            <Button variant="outlined" sx={{ ml: 2 }} onClick={() => { setSelectedPO(null); setTab(0); }}>
              Back to List
            </Button>
          </Box>
        </Box>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
