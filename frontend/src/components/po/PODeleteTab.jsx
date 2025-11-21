import React from 'react'; // Explicit React import added
import {
  Box,
  Alert,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
} from '@mui/material';

/**
 * Renders the content for the PO Deletion tab (RM, PM, or FG).
 */
const PODeleteTab = ({ poType, existingList, onPOSelectionToggle, onPOSelectAllToggle }) => {
  
  if (existingList.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No **{poType}** POs found for this EOPA.
      </Alert>
    );
  }
  
  const selectedCount = existingList.filter(po => po.selected).length;
  const isAllSelected = existingList.length > 0 && selectedCount === existingList.length;
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  return (
    <Box sx={{ mt: 2 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Select **{poType}** POs to delete. This action cannot be undone.
      </Alert>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => onPOSelectAllToggle(poType, e.target.checked)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vendor</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {existingList.map((po, index) => (
              <TableRow
                key={po.id}
                sx={{
                  bgcolor: po.selected ? 'error.50' : 'white',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={po.selected}
                    onChange={() => onPOSelectionToggle(poType, index)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {po.po_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{po.vendor?.vendor_name || '-'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={po.status}
                    size="small"
                    color={po.status === 'CLOSED' ? 'success' : po.status === 'PARTIAL' ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{po.items?.length || 0}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(po.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Total POs selected for deletion: **{selectedCount}** / {existingList.length}
      </Typography>
    </Box>
  );
};

export default PODeleteTab;