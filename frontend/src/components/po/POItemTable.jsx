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
  InputAdornment, // Added for integrated UOM
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { RawMaterialInfo, PackingMaterialInfo } from './MaterialInfoTooltips'; // Re-use tooltips

// Common list of UOMs for the Select
const UOM_OPTIONS = ['pcs', 'kg', 'g', 'mg', 'L', 'ml', 'box', 'piece', 'boxes', 'bottles', 'labels', 'cartons', 'strips', 'vials'];

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
  
  // NOTE: isEditing/isNew logic removed for live, in-line editing when NOT locked.
  
  const MaterialSelect = ({ item, itemIndex }) => {
    // Only allow selection if not locked
    const isEditable = !isLocked;
    
    return (
      <FormControl fullWidth size="small">
        <Select
          value={item[materialKey] || ''}
          onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, materialKey, e.target.value)}
          displayEmpty
          disabled={!isEditable || item.isNew === false} // Only editable if not locked AND is a NEW item (prevent re-mapping existing items)
          sx={{ minWidth: 200, bgcolor: 'background.paper' }}
        >
          <MenuItem value="" disabled>
            <em>Select {poType === 'FG' ? 'Medicine' : poType === 'RM' ? 'Raw Material' : 'Packing Material'}</em>
          </MenuItem>
          {materials.map(mat => (
            <MenuItem key={mat.id} value={mat.id}>
              {poType === 'FG' 
                ? mat.medicine_name
                : `${mat.rm_code || mat.pm_code || ''} - ${mat.rm_name || mat.pm_name}`
              }
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };
  
  const MaterialDisplay = ({ item }) => {
    const materialId = item[materialKey];
    const materialName = item[materialNameKey];
    const material = materials.find(m => m.id === materialId);
    
    // Fallback to name/id if material object is not found in the props list
    const displayName = (material && (material.medicine_name || material.rm_name || material.pm_name)) || materialName || `ID: ${materialId}`;

    // Get material code for better display
    const displayCode = material ? (material.rm_code || material.pm_code || '') : '';

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {displayName}
            </Typography>
            {displayCode && <Typography variant="caption" color="text.secondary">{displayCode}</Typography>}
        </Box>
        {poType !== 'FG' && materialId && (
            // Pass the resolved name to the tooltip for better context
            poType === 'RM' 
                ? <RawMaterialInfo raw_material_id={materialId} raw_material_name={displayName} />
                : <PackingMaterialInfo packing_material_id={materialId} packing_material_name={displayName} />
        )}
      </Stack>
    );
  };
  
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell padding="checkbox" sx={{ width: 40 }}>
              {/* Only show select all if not locked */}
              {!isLocked && (
                  <Checkbox 
                      // Implement select all logic if needed, or leave for single row selection
                      // The current context suggests only selecting/deselecting individual items
                      disabled
                  />
              )}
            </TableCell>
            <TableCell sx={{ width: '40%', fontWeight: 'bold' }}>
                {poType === 'FG' ? 'Medicine' : 'Material'}
            </TableCell>
            <TableCell sx={{ width: '25%', fontWeight: 'bold', textAlign: 'right' }}>
                Ordered Quantity
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>Remarks</TableCell>
            <TableCell sx={{ width: '10%', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(items || []).map((item, itemIndex) => {
            const isEditable = !isLocked;
            
            return (
              <TableRow key={item.key || itemIndex} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={item.selected || false}
                    onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'selected', e.target.checked)}
                    disabled={isLocked}
                  />
                </TableCell>
                
                <TableCell>
                  {/* Select or Display */}
                  {item.isNew || !item[materialKey] ? (
                    <MaterialSelect item={item} itemIndex={itemIndex} />
                  ) : (
                    <MaterialDisplay item={item} />
                  )}
                </TableCell>
                
                <TableCell>
                  {/* Quantity Field with integrated UOM Select */}
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity || ''}
                    onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'quantity', e.target.value)}
                    inputProps={{ min: 0, step: 0.001 }}
                    fullWidth
                    disabled={!item.selected || isLocked}
                    sx={{ '& input': { textAlign: 'right' } }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end" sx={{ m: 0, p: 0, height: '100%', maxHeight: 40 }}>
                                <FormControl size="small" sx={{ m: 0, p: 0, minWidth: 80 }}>
                                    <Select
                                        value={item.uom || item.unit || 'pcs'}
                                        onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'unit', e.target.value)}
                                        disabled={!item.selected || isLocked}
                                        sx={{ 
                                            '.MuiSelect-select': { py: '6px', px: '8px', minHeight: 'unset' },
                                            '.MuiOutlinedInput-notchedOutline': { border: 'none' }, // Remove internal border
                                            '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                        }}
                                    >
                                        {UOM_OPTIONS.map(unit => (
                                            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </InputAdornment>
                        ),
                    }}
                  />
                </TableCell>
                
                <TableCell>
                    <TextField
                        size="small"
                        value={item.remarks || ''}
                        onChange={(e) => onItemChange(poType, vendorIndex, itemIndex, 'remarks', e.target.value)}
                        fullWidth
                        disabled={!item.selected || isLocked}
                    />
                </TableCell>
                
                <TableCell align="center">
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
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default POItemTable;