import { useState } from 'react'

/**
 * Custom hook for handling data fetching with loading and error states
 * @returns {object} - { data, loading, error, fetchData, setData, clearError }
 */
export const useFetch = (initialData = []) => {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = async (fetchFn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
      return result
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return { data, loading, error, fetchData, setData, clearError }
}

/**
 * Custom hook for handling form submission with loading and error states
 * @returns {object} - { submitting, error, submitForm, clearError }
 */
export const useSubmit = () => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submitForm = async (submitFn) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitFn()
      return result
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Submission failed'
      setError(errorMessage)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const clearError = () => setError(null)

  return { submitting, error, submitForm, clearError }
}

/**
 * Custom hook for managing delete confirmations
 * @returns {object} - { deleteItem, confirmOpen, openConfirm, closeConfirm, handleConfirm }
 */
export const useDelete = () => {
  const [deleteItem, setDeleteItem] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const openConfirm = (item) => {
    setDeleteItem(item)
    setConfirmOpen(true)
  }

  const closeConfirm = () => {
    setDeleteItem(null)
    setConfirmOpen(false)
  }

  const handleConfirm = async (deleteFn) => {
    if (deleteItem) {
      await deleteFn(deleteItem)
      closeConfirm()
    }
  }

  return { deleteItem, confirmOpen, openConfirm, closeConfirm, handleConfirm }
}
