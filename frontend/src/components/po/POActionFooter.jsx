import React from 'react'; // Explicit React import added
import {
  DialogActions,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

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
    
    // Check if any selected vendor has a locked (non-DRAFT) PO
    const vendorsWithLockedPOs = selectedVendors.filter(vendor => {
      const po = getExistingPOForVendor(poType, vendor.vendor_id);
      return po && po.status !== 'DRAFT';
    });
    const allSelectedLocked = selectedVendors.length > 0 && vendorsWithLockedPOs.length === selectedVendors.length;
    
    // Check if any selected vendor has a DRAFT PO
    const hasAnyDraft = selectedVendors.some(vendor => {
      const po = getExistingPOForVendor(poType, vendor.vendor_id);
      return po && po.status === 'DRAFT';
    });
    
    const selectedCount = selectedVendors.length;

    let buttonText = `Generate ${poType} POs`;
    if (submitting) {
      buttonText = 'Generating...';
    } else if (allSelectedLocked) {
      buttonText = `${poType} POs Locked (Cannot Edit)`;
    } else if (hasAnyDraft) {
      buttonText = `Update ${poType} POs`;
    }
    
    const isDisabled = submitting || allSelectedLocked || selectedCount === 0;

    return (
      <Button
        onClick={onGeneratePOs}
        variant="contained"
        color="primary"
        disabled={isDisabled}
        startIcon={<ShoppingCartIcon />}
      >
        {buttonText}
      </Button>
    );
  };
  
  // Logic for Delete Mode Button
  const renderDeleteButton = () => {
    const selectedCount = existingList.filter(po => po.selected).length;
    
    let buttonText = `Delete ${poType} POs`;
    if (submitting) {
      buttonText = 'Deleting...';
    } else if (selectedCount > 0) {
      buttonText = `Delete ${selectedCount} ${poType} PO(s)`;
    }

    return (
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
  };

  return (
    <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
      <Button onClick={onClose} disabled={submitting} variant="outlined">
        Cancel
      </Button>
      {mode === 'generate' ? renderGenerateButton() : renderDeleteButton()}
    </DialogActions>
  );
};

export default POActionFooter;