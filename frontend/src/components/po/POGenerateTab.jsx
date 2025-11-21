import React from 'react'; 
import {
  Box,
  Alert,
  Typography,
  Paper,
  Stack,
  Checkbox,
  Chip,
  Button,
  Tooltip, // Added Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock'; // Added Lock Icon
import WarningIcon from '@mui/icons-material/Warning'; // Added Warning Icon
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Added Check Icon

// Ensure the explicit .jsx extension is used here
import { getVendorTypeIcon } from '../../utils/poUtilities.jsx'; 
import POItemTable from './POItemTable';

/**
 * Renders the content for the PO Generation tab (RM, PM, or FG).
 */
const POGenerateTab = ({
  poType,
  posList,
  existingList,
  materials,
  materialKey,
  materialNameKey,
  medicineList,
  getExistingPOForVendor,
  onVendorSelectToggle,
  onAddLineItem,
  onItemChange,
  onDeleteLineItem,
}) => {
  
  if (posList.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No **{poType}** vendors found in EOPA items. Please ensure medicines have **{poType}** vendors assigned.
      </Alert>
    );
  }
  
  // Logic to determine existing PO status
  const draftPOs = existingList.filter(po => po.status === 'DRAFT');
  const lockedPOs = existingList.filter(po => po.status !== 'DRAFT');

  return (
    <Box sx={{ mt: 2 }}>
      
      {/* NEW: Inline Status Summary Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {draftPOs.length > 0 && (
          <Tooltip title={`These POs are in DRAFT status and will be UPDATED upon generation.`}>
            <Chip 
              icon={<WarningIcon />}
              label={`${draftPOs.length} DRAFT POs Found`}
              color="warning" 
              variant="outlined"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Tooltip>
        )}
        {lockedPOs.length > 0 && (
          <Tooltip title={`These POs are in NON-DRAFT status and CANNOT be updated via this tool.`}>
            <Chip 
              icon={<LockIcon />}
              label={`${lockedPOs.length} Locked POs`}
              color="error" 
              variant="outlined"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Tooltip>
        )}
        {posList.length > 0 && lockedPOs.length === 0 && draftPOs.length === 0 && (
           <Chip 
              icon={<CheckCircleIcon />}
              label={`All New ${poType} POs`}
              color="success" 
              variant="outlined"
              size="small"
            />
        )}
      </Stack>

      {/* Vendor Groups */}
      <Stack spacing={2}>
        {posList.map((vendorGroup, vendorIndex) => {
          const po = getExistingPOForVendor(poType, vendorGroup.vendor_id);
          const isDraftPO = po && po.status === 'DRAFT';
          const isLocked = po && po.status !== 'DRAFT';
          
          return (
            <Paper 
              key={vendorGroup.vendor_id}
              variant="outlined"
              sx={{ 
                p: 2, 
                // Subtle visual distinction for status: DRAFT is editable (warning), LOCKED is disabled (grey)
                bgcolor: isLocked ? 'grey.50' : isDraftPO ? 'warning.lighter' : 'background.paper',
                border: isDraftPO ? '2px solid' : '1px solid',
                borderColor: isDraftPO ? 'warning.main' : 'divider',
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              
              {/* Vendor Header - Made clickable for selection toggle */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1, p: 0.5, cursor: isLocked ? 'default' : 'pointer' }}
                onClick={isLocked ? null : () => onVendorSelectToggle(poType, vendorIndex)}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Checkbox 
                    checked={vendorGroup.selected}
                    disabled={isLocked}
                    // Stop propagation to prevent dual toggling
                    onChange={(e) => { 
                      e.stopPropagation(); 
                      onVendorSelectToggle(poType, vendorIndex); 
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: isLocked ? 'text.disabled' : 'primary.dark' }}>
                    {vendorGroup.vendor_name}
                  </Typography>
                  <Tooltip title={`PO Status: ${po ? po.status : 'None'}`}>
                      {po && (
                          <Chip 
                              label={po.status} 
                              size="small" 
                              icon={isLocked ? <LockIcon fontSize="small" /> : <WarningIcon fontSize="small" />}
                              color={isLocked ? 'error' : 'warning'}
                              sx={{ fontWeight: 'bold' }}
                          />
                      )}
                  </Tooltip>
                  {isLocked && (
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                        (LOCKED - Cannot Edit)
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    {po 
                        ? `${vendorGroup.items.length} item(s) - ${isDraftPO ? 'DRAFT (Editable)' : 'LOCKED'}` 
                        : `${vendorGroup.items.length} item(s) - NEW PO`
                    }
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => { e.stopPropagation(); onAddLineItem(poType, vendorIndex); }}
                    variant="outlined"
                    disabled={isLocked}
                  >
                    Add Item
                  </Button>
                </Stack>
              </Stack>
              
              {/* Items Table (Delegated) */}
              <POItemTable
                poType={poType}
                vendorIndex={vendorIndex}
                items={vendorGroup.items}
                materials={materials}
                materialKey={materialKey}
                materialNameKey={materialNameKey}
                medicineList={medicineList}
                isLocked={isLocked}
                onItemChange={onItemChange}
                onDeleteLineItem={onDeleteLineItem}
              />
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default POGenerateTab;