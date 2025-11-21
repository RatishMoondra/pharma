import React from 'react'; // Explicit React import added
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { RawMaterialInfo, PackingMaterialInfo } from './MaterialInfoTooltips'; // Re-use tooltips

/**
 * Renders the table of line items for a single vendor group in the PO generation tab.
 */
const POItemTable = ({
  poType,
  vendorIndex,
  items,
  materials,
  materialKey,
  materialNameKey,
  medicineList,
  isLocked,
  onItemChange,
  onDeleteLineItem,
}) => {
  // Debug: log items received from parent
  console.log(`[POItemTable] items received for vendorIndex ${vendorIndex}:`, items);
  
  const MaterialSelect = ({ item, itemIndex }) => {
    return (
      <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
        <Select
          value={item[materialKey] || ''}
          onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, materialKey, e.target.value)}
          displayEmpty
        >
          <MenuItem value="" disabled>
            <em>Select {poType === 'FG' ? 'Medicine' : poType === 'RM' ? 'Raw Material' : 'Packing Material'}</em>
          </MenuItem>
          {materials.map(mat => (
            <MenuItem key={mat.id} value={mat.id}>
              {poType === 'FG' 
                ? mat.medicine_name
                : `${mat.rm_code || mat.pm_code} - ${mat.rm_name || mat.pm_name}`
              }
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };
  
  const MaterialDisplay = ({ item }) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {item.raw_material_code || item.packing_material_code || '-'} - {item[materialNameKey]}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {poType === 'RM' && <RawMaterialInfo raw_material_id={item.raw_material_id} />}
          {poType === 'PM' && <PackingMaterialInfo packing_material_id={item.packing_material_id} />}
          {poType === 'PM' && item.language && <Chip label={item.language} size="small" />}
          {poType === 'PM' && item.artwork_version && <Chip label={item.artwork_version} size="small" />}
        </Box>
      </Box>
    );
  };

  return (
    <TableContainer component={Paper} elevation={0} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell padding="checkbox">Select</TableCell>
            <TableCell sx={{ minWidth: 280 }}>
              {poType === 'FG' ? 'Medicine (FG)' : poType === 'RM' ? 'Raw Material (RM)' : 'Packing Material (PM)'}
            </TableCell>
            {poType !== 'FG' && <TableCell>For Medicine (FG)</TableCell>}
            <TableCell align="right">EOPA Qty</TableCell>
            <TableCell align="right">Qty/Unit</TableCell>
            <TableCell align="right" width="130px">PO Quantity *</TableCell>
            <TableCell width="120px">Unit</TableCell>
            <TableCell width="50px">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, itemIndex) => (
            <TableRow
              key={itemIndex}
              sx={{
                bgcolor: item.selected ? 'white' : 'action.hover',
                opacity: item.selected ? 1 : 0.7,
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={item.selected}
                  onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'selected', e.target.checked)}
                  disabled={isLocked}
                />
              </TableCell>
              
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  {(item.isNew || item.isEditing) ? (
                    <>
                      <MaterialSelect item={item} itemIndex={itemIndex} />
                      {item.isEditing && !item.isNew && (
                        <IconButton
                          size="small"
                          onClick={() => onItemChange(poType, vendorIndex, itemIndex, 'isEditing', false)}
                          color="success"
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      )}
                    </>
                  ) : (
                    <>
                      <MaterialDisplay item={item} />
                      <IconButton
                        size="small"
                        onClick={() => onItemChange(poType, vendorIndex, itemIndex, 'isEditing', true)}
                        color="primary"
                        disabled={isLocked}
                        sx={{ mt: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </TableCell>

              {poType !== 'FG' && (
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.medicine_name}
                  </Typography>
                </TableCell>
              )}
              
              <TableCell align="right">
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  {item.eopa_quantity?.toLocaleString('en-IN') || '-'}
                </Typography>
              </TableCell>
              
              <TableCell align="right">
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {item.qty_per_unit ? `${item.qty_per_unit}` : '-'}
                </Typography>
              </TableCell>
              
              <TableCell align="right">
                <TextField
                  type="number"
                  size="small"
                  value={
                    item.quantity !== undefined && item.quantity !== null
                      ? item.quantity
                      : (item.ordered_quantity !== undefined ? item.ordered_quantity : '')
                  }
                  onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'quantity', e.target.value)}
                  inputProps={{ min: 0, step: 0.001 }}
                  fullWidth
                  disabled={!item.selected || isLocked}
                  sx={{ '& input': { textAlign: 'right' } }}
                />
              </TableCell>
              
              <TableCell>
                <FormControl fullWidth size="small" disabled={!item.selected || isLocked}>
                  <Select
                    value={item.uom || item.unit || 'pcs'}
                    onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'unit', e.target.value)}
                  >
                    {['pcs', 'kg', 'g', 'mg', 'L', 'ml', 'box', 'piece', 'boxes', 'bottles', 'labels', 'cartons', 'strips', 'vials'].map(unit => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => onDeleteLineItem(poType, vendorIndex, itemIndex)}
                  color="error"
                  disabled={isLocked}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default POItemTable;