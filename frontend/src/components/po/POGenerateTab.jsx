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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
  
  // Logic to determine existing PO status (simplified for clean rendering)
  const draftPOs = existingList.filter(po => po.status === 'DRAFT');
  const lockedPOs = existingList.filter(po => po.status !== 'DRAFT');
  const allVendorsLocked = posList.every(vendor => {
    const po = getExistingPOForVendor(poType, vendor.vendor_id);
    return po && po.status !== 'DRAFT';
  });

  return (
    <Box sx={{ mt: 2 }}>
      {/* Existing PO Status Alerts */}
      {draftPOs.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          **DRAFT {poType} POs found (editable):** {draftPOs.map(po => po.po_number).join(', ')}. You can edit quantities and items for DRAFT POs.
        </Alert>
      )}
      {lockedPOs.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          **Approved/Locked {poType} POs:** {lockedPOs.map(po => `${po.po_number} (${po.status})`).join(', ')}
          {allVendorsLocked
            ? '. All POs are locked and cannot be edited. They must return to DRAFT status first.'
            : '. These POs are locked and cannot be edited until they return to DRAFT status.'
          }
        </Alert>
      )}

      {/* Initial Success Alert */}
      {!(draftPOs.length > 0 || lockedPOs.length > 0) && (
        <Alert severity="success" sx={{ mb: 2 }}>
          **Ready to generate {poType} POs!** The system has automatically detected **{posList.length}** vendor(s) 
          from your medicines. Review quantities and click "Generate {poType} POs" to create all POs at once.
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
        {poType} Purchase Orders ({posList.filter(v => v.selected).length} vendor(s) selected)
      </Typography>

      {/* Vendor Group List */}
      <Stack spacing={3}>
        {posList.map((vendorGroup, vendorIndex) => {
          const existingPO = getExistingPOForVendor(poType, vendorGroup.vendor_id);
          const hasExistingPO = !!existingPO;
          const isDraftPO = existingPO?.status === 'DRAFT';
          const isEditable = !hasExistingPO || isDraftPO;
          const isLocked = hasExistingPO && !isDraftPO;

          return (
            <Paper
              key={vendorGroup.vendor_id}
              variant="outlined"
              sx={{
                p: 3,
                // 🟢 FIX: Replaced 'warning.light' with a very subtle, safe hex code (#FFF3E0) 
                // to prevent the background color from bleeding or being too intense.
                bgcolor: isLocked ? 'grey.50' : isDraftPO ? '#FFF3E0' : 'white', 
                border: isDraftPO ? '2px solid' : '1px solid',
                borderColor: isDraftPO ? 'warning.main' : 'divider',
              }}
            >
              {/* Vendor Header */}
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Checkbox
                  checked={vendorGroup.selected && isEditable}
                  onChange={() => onVendorSelectToggle(poType, vendorIndex)}
                  disabled={isLocked}
                />
                <Stack sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6" color={isLocked ? 'text.disabled' : 'primary.main'} sx={{ fontWeight: 'bold' }}>
                      {vendorGroup.vendor_name}
                    </Typography>
                    {existingPO && (
                      <>
                        <Chip
                          label={existingPO.po_number}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderStyle: 'dashed',
                            borderWidth: 2,
                            borderColor: isDraftPO ? 'warning.main' : 'success.main',
                            color: isDraftPO ? 'warning.main' : 'success.main',
                            fontWeight: 'bold'
                          }}
                        />
                        <Chip
                          label={existingPO.status}
                          size="small"
                          color={isDraftPO ? 'warning' : existingPO.status === 'APPROVED' ? 'success' : 'default'}
                        />
                      </>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {isLocked 
                      ? `PO ${existingPO.status} - Locked (cannot edit)` 
                      : isDraftPO 
                        ? `${vendorGroup.items.length} item(s) - DRAFT (editable)` 
                        : `${vendorGroup.items.length} item(s)`
                    }
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => onAddLineItem(poType, vendorIndex)}
                  variant="outlined"
                  disabled={isLocked}
                >
                  Add Item
                </Button>
                <Chip
                  icon={getVendorTypeIcon(poType)}
                  label={poType}
                  size="medium"
                  color={poType === 'FG' ? 'primary' : poType === 'RM' ? 'success' : 'warning'}
                />
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