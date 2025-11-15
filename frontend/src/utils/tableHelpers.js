// Shared table styles and configurations
export const tableStyles = {
  // Header row style - blue background with white text
  headerRow: {
    bgcolor: 'primary.main',
  },
  
  // Header cell style - white, bold text
  headerCell: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Alternating row colors for better readability
  bodyRow: (index) => ({
    bgcolor: index % 2 === 0 ? 'white' : 'grey.50',
    '&:hover': { bgcolor: 'primary.50' },
  }),
  
  // Expandable row style
  expandableRow: (isOpen) => ({
    '&:hover': { bgcolor: 'action.hover' },
    bgcolor: isOpen ? 'action.selected' : 'inherit',
  }),
  
  // Collapse cell style
  collapseCell: {
    paddingBottom: 0,
    paddingTop: 0,
    borderBottom: 'none',
  },
  
  // Nested table container style
  nestedTableContainer: {
    m: 2,
    p: 2,
    bgcolor: 'grey.50',
    borderRadius: 1,
  },
  
  // Total/summary row style
  summaryRow: {
    bgcolor: 'success.50',
  },
}

// Common chip color mappings
export const chipColors = {
  status: {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CLOSED: 'default',
  },
  vendorType: {
    MANUFACTURER: 'primary',
    RM: 'info',
    PM: 'secondary',
    PARTNER: 'success',
  },
}

// Currency formatting
export const formatCurrency = (amount, locale = 'en-IN') => {
  if (amount === null || amount === undefined) return '₹0.00'
  return `₹${parseFloat(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Number formatting
export const formatNumber = (number, locale = 'en-IN') => {
  if (number === null || number === undefined) return '0'
  return parseFloat(number).toLocaleString(locale)
}

// Date formatting
export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

// Get chip color based on status
export const getStatusColor = (status, type = 'status') => {
  return chipColors[type]?.[status] || 'default'
}
