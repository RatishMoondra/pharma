import { useState, useCallback } from 'react'

/**
 * Custom hook for stable row editing behavior
 * - Maintains row position on update (no re-sorting)
 * - Highlights active editing row
 * - Shows saved row indicator with auto-clear
 * - Provides clean state management
 */
export const useStableRowEditing = () => {
  const [editingRowId, setEditingRowId] = useState(null)
  const [savedRowId, setSavedRowId] = useState(null)

  /**
   * Open form for editing a specific row
   */
  const openEditForm = useCallback((rowId) => {
    setEditingRowId(rowId)
    setSavedRowId(null) // Clear any previous saved indicator
  }, [])

  /**
   * Close the edit form
   */
  const closeEditForm = useCallback(() => {
    setEditingRowId(null)
  }, [])

  /**
   * Mark a row as saved and auto-clear after delay
   */
  const markAsSaved = useCallback((rowId, delay = 2000) => {
    setSavedRowId(rowId)
    setTimeout(() => {
      setSavedRowId(null)
    }, delay)
  }, [])

  /**
   * Update data array while preserving original order
   * Uses map() to maintain array indices
   */
  const updateDataStably = useCallback((dataArray, updatedItem, idField = 'id') => {
    return dataArray.map(item => 
      item[idField] === updatedItem[idField] ? updatedItem : item
    )
  }, [])

  /**
   * Add new item to the beginning of array (or end based on preference)
   */
  const addDataStably = useCallback((dataArray, newItem, addToStart = false) => {
    return addToStart ? [newItem, ...dataArray] : [...dataArray, newItem]
  }, [])

  /**
   * Remove item from array
   */
  const removeDataStably = useCallback((dataArray, itemId, idField = 'id') => {
    return dataArray.filter(item => item[idField] !== itemId)
  }, [])

  /**
   * Get row styling based on state
   */
  const getRowStyle = useCallback((rowId) => {
    if (editingRowId === rowId) {
      return {
        bgcolor: 'action.selected',
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
        transition: 'all 0.3s ease',
      }
    }
    if (savedRowId === rowId) {
      return {
        bgcolor: 'success.light',
        transition: 'all 0.3s ease',
        animation: 'pulse 0.5s ease-in-out',
        '@keyframes pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
      }
    }
    return {
      '&:hover': { bgcolor: 'action.hover' },
      transition: 'all 0.2s ease',
    }
  }, [editingRowId, savedRowId])

  /**
   * Check if a specific row is being edited
   */
  const isEditing = useCallback((rowId) => {
    return editingRowId === rowId
  }, [editingRowId])

  /**
   * Check if a specific row was just saved
   */
  const isSaved = useCallback((rowId) => {
    return savedRowId === rowId
  }, [savedRowId])

  return {
    // State
    editingRowId,
    savedRowId,
    
    // Actions
    openEditForm,
    closeEditForm,
    markAsSaved,
    
    // Data manipulation
    updateDataStably,
    addDataStably,
    removeDataStably,
    
    // UI helpers
    getRowStyle,
    isEditing,
    isSaved,
  }
}
