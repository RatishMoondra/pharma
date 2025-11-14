import { useState } from 'react'

export const useApiError = () => {
  const [error, setError] = useState(null)

  const handleApiError = (error) => {
    const errorCode = error.response?.data?.error_code
    const message = error.response?.data?.message || error.message || 'Unknown error occurred'
    const errors = error.response?.data?.errors // Array of validation errors
    
    // Map error codes to user-friendly messages
    const friendlyMessages = {
      ERR_AUTH_FAILED: 'Invalid username or password',
      ERR_FORBIDDEN: "You don't have permission to perform this action",
      ERR_VENDOR_MISMATCH: 'Vendor not mapped in Medicine Master',
      ERR_VALIDATION: 'Validation failed. Please check your input.',
      ERR_NOT_FOUND: 'Record not found',
      ERR_DB: 'Database error occurred',
      ERR_PO_GENERATION: 'Failed to generate Purchase Order',
      ERR_EOPA_CREATION: 'Failed to create EOPA',
      ERR_PI_VALIDATION: 'PI validation failed',
      ERR_SERVER: 'Server error occurred',
    }
    
    let displayMessage = friendlyMessages[errorCode] || message
    
    // If there are validation errors, format them nicely
    if (errors && Array.isArray(errors) && errors.length > 0) {
      const fieldErrors = errors.map(e => {
        const fieldName = e.field.split('.').pop() // Get last part of field path
        const readableField = fieldName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
        return `${readableField}: ${e.message}`
      }).join('; ')
      displayMessage = `Validation errors - ${fieldErrors}`
    }
    
    // Log error for debugging
    console.error({
      errorCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      response: error.response?.data
    })
    
    setError(displayMessage)
    return displayMessage
  }

  const clearError = () => setError(null)

  return { error, handleApiError, clearError }
}
