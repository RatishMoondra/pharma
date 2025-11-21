import React from 'react'; // Explicit React import added for JSX parsing
import { Business, Inventory2, LocalShipping } from '@mui/icons-material';

/**
 * Utility function to get the Material-UI icon component based on the PO type.
 * @param {string} type - The PO type ('RM', 'PM', 'FG', 'MANUFACTURER').
 * @returns {React.Component} The corresponding icon component or null.
 */
export const getVendorTypeIcon = (type) => {
  switch (type) {
    case 'MANUFACTURER':
    case 'FG':
      return <Business fontSize="small" />;
    case 'RM':
      return <Inventory2 fontSize="small" />;
    case 'PM':
      return <LocalShipping fontSize="small" />;
    default:
      return null;
  }
};