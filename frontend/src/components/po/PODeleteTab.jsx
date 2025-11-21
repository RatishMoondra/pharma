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
  Tooltip, // Added Tooltip
} from '@mui/material';

// Custom status color mapping for deletion view
const poStatusColors = {
    DRAFT: 'warning',
    PENDING_APPROVAL: 'primary',
    APPROVED: 'info',
    READY: 'secondary',
    CLOSED: 'success',
    PARTIAL: 'default',
};

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
        Select **{poType}** POs to delete. Only POs in **DRAFT** status can be safely deleted. Deleting others may require manual intervention.
      </Alert>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell padding="checkbox">
                <Tooltip title={isAllSelected ? "Deselect All" : "Select All"} arrow>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={() => onPOSelectAllToggle(poType)}
                  />
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vendor</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created On</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {existingList.map((po, index) => (
              // Highlight rows that are NOT DRAFT to denote deletion danger
              <TableRow 
                key={po.id} 
                hover 
                onClick={() => onPOSelectionToggle(poType, index)}
                sx={{ 
                    cursor: 'pointer',
                    bgcolor: po.status !== 'DRAFT' ? 'error.lighter' : 'transparent', // Visual warning for locked POs
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={po.selected}
                    onChange={() => onPOSelectionToggle(poType, index)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
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
                    // Use consistent, defined colors
                    color={poStatusColors[po.status.toUpperCase()] || 'default'} 
                    sx={{ fontWeight: 'medium' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {po.items?.length || 0}
                  </Typography>
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
      
      <Typography variant="subtitle2" color="text.primary" sx={{ mt: 2, display: 'block', fontWeight: 'bold' }}>
        Selected for deletion: <span style={{ color: selectedCount > 0 ? 'error.main' : 'text.secondary' }}>{selectedCount}</span> / {existingList.length} POs
      </Typography>
    </Box>
  );
};

export default PODeleteTab;