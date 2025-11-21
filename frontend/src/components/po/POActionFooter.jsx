import React from 'react'; // Explicit React import added
import {
  DialogActions,
  Button,
  Tooltip, // Added Tooltip
  Badge, // Added Badge
  Box, // Added Box for better layout control
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

/**
 * Renders the action buttons for the dialog footer.
 */
const POActionFooter = ({
  mode,
  poType,
  posList,
  existingList,
  submitting,
  onGeneratePOs,
  onDeletePOs,
  onClose,
  getExistingPOForVendor,
}) => {
  
  // Logic for Generate Mode Button
  const renderGenerateButton = () => {
    const selectedVendors = posList.filter(v => v.selected);
    const selectedCount = selectedVendors.length;
    
    // Check if any selected vendor has a locked (non-DRAFT) PO
    const vendorsWithLockedPOs = selectedVendors.filter(vendor => {
      const po = getExistingPOForVendor(poType, vendor.vendor_id);
      return po && po.status !== 'DRAFT';
    });
    const allSelectedLocked = selectedCount > 0 && vendorsWithLockedPOs.length === selectedCount;
    
    // Check if any selected vendor has a DRAFT PO
    const hasAnyDraft = selectedVendors.some(vendor => {
      const po = getExistingPOForVendor(poType, vendor.vendor_id);
      return po && po.status === 'DRAFT';
    });
    
    let buttonText = `Generate ${poType} POs`;
    let buttonIcon = <ShoppingCartIcon />;
    let tooltipMessage = '';

    if (submitting) {
      buttonText = 'Processing...';
    } else if (allSelectedLocked) {
      buttonText = 'Locked POs';
      tooltipMessage = `Cannot generate/update: All ${selectedCount} selected POs are already finalized (non-DRAFT).`;
      buttonIcon = <SaveIcon />;
    } else if (hasAnyDraft) {
      buttonText = `Update ${selectedCount} ${poType} PO(s)`;
      tooltipMessage = `Update the selected vendors' DRAFT POs.`;
      buttonIcon = <SaveIcon />;
    } else if (selectedCount > 0) {
      buttonText = `Generate ${selectedCount} New PO(s)`;
      tooltipMessage = `Generate new POs for ${selectedCount} selected vendors.`;
      buttonIcon = <AddIcon />;
    } else {
      buttonText = `Select Vendors to Generate PO`;
      tooltipMessage = `Please select at least one vendor group to generate a PO.`;
    }
    
    const isDisabled = submitting || allSelectedLocked || selectedCount === 0;

    const button = (
      <Button
        onClick={onGeneratePOs}
        variant="contained"
        color="primary"
        disabled={isDisabled}
        startIcon={buttonIcon}
      >
        {buttonText}
      </Button>
    );

    return isDisabled ? (
        <Tooltip title={tooltipMessage} arrow>
            <Box>{button}</Box>
        </Tooltip>
    ) : button;
  };
  
  // Logic for Delete Mode Button
  const renderDeleteButton = () => {
    const selectedCount = existingList.filter(po => po.selected).length;
    
    let buttonText = `Delete ${poType} POs`;
    if (submitting) {
      buttonText = 'Deleting...';
    } else if (selectedCount > 0) {
      buttonText = `Delete ${selectedCount} PO(s)`;
    }

    const button = (
        <Button
          onClick={onDeletePOs}
          variant="contained"
          color="error"
          disabled={submitting || selectedCount === 0}
          startIcon={<DeleteIcon />}
        >
          {buttonText}
        </Button>
    );
    
    return selectedCount === 0 ? (
        <Tooltip title="Select one or more POs to enable deletion" arrow>
            <Box>{button}</Box>
        </Tooltip>
    ) : button;
  };

  return (
    <DialogActions 
      sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        justifyContent: 'flex-end',
        gap: 1.5,
      }}
    >
      <Button onClick={onClose} variant="outlined" disabled={submitting}>
        Close
      </Button>
      {mode === 'generate' ? renderGenerateButton() : renderDeleteButton()}
    </DialogActions>
  );
};

export default POActionFooter;