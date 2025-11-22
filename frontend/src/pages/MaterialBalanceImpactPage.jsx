import React, { useState } from 'react';
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
  TextField,
  Button,
  CircularProgress,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import api from '../services/api';

export default function MaterialBalanceImpactPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, RAW, PACKING
  const [success, setSuccess] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material balance record?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/api/material-balance/${id}`);
      setSuccess('Material balance record deleted successfully.');
      await handleFetch();
    } catch (err) {
      setError('Failed to delete material balance record.');
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/material-balance/all');
      const allRows = Array.isArray(res.data) ? res.data : res.data.data || [];
      setRows(allRows);
    } catch (err) {
      setRows([]);
      setError('Failed to fetch material balance records.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter rows by material type
  const filteredRows = rows.filter(row => {
    if (filter === 'RAW') return !!row.raw_material_id;
    if (filter === 'PACKING') return !!row.packing_material_id;
    return true;
  });

  // Helper to format row with related names
  const renderRow = (row) => (
    <TableRow key={row.id}>
      <TableCell>{row.po?.po_number || row.po_id || '-'}</TableCell>
      <TableCell>{row.invoice?.invoice_number || row.invoice_id || '-'}</TableCell>
      <TableCell>{row.vendor?.vendor_name || row.vendor_id || '-'}</TableCell>
      <TableCell>
        {row.raw_material_id
          ? (row.raw_material?.rm_name || row.raw_material_id)
          : row.packing_material_id
            ? (row.packing_material?.pm_name || row.packing_material_id)
            : '-'}
      </TableCell>
      <TableCell>{row.ordered_qty}</TableCell>
      <TableCell>{row.received_qty}</TableCell>
      <TableCell>{row.balance_qty}</TableCell>
      <TableCell>{new Date(row.last_updated).toLocaleString()}</TableCell>
      <TableCell>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => handleDelete(row.id)}
        >
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Material Balance Impact</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button variant="contained" onClick={handleFetch} disabled={loading} sx={{ mr: 2 }}>Fetch All</Button>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Material Type</InputLabel>
          <Select
            value={filter}
            label="Material Type"
            onChange={e => setFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Materials</MenuItem>
            <MenuItem value="RAW">Raw Material Only</MenuItem>
            <MenuItem value="PACKING">Packing Material Only</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}
      {filteredRows.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PO Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Invoice Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vendor</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Material Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ordered Qty</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Received Qty</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Balance Qty</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Last Updated</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map(renderRow)}
            </TableBody>
          </Table>
        </TableContainer>
      ) : !loading && (
        <Alert severity="info">No material balance records found.</Alert>
      )}
    </Container>
  );
}
