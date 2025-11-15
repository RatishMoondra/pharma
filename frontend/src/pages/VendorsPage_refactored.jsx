import { useState, useEffect, useMemo } from 'react'
import { Container, Chip, IconButton } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  PageHeader,
  SearchField,
  LoadingSpinner,
  DataTable,
  NotificationSnackbar,
  ConfirmDialog,
} from '../components/common'
import VendorForm from '../components/VendorForm'
import api from '../services/api'
import { useFetch, useSubmit, useDelete } from '../hooks/useDataHandlers'
import { filterBySearch, searchConfigs } from '../utils/searchHelpers'
import { getStatusColor } from '../utils/tableHelpers'

const VendorsPage = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { data: vendors, loading, error, fetchData, setData, clearError } = useFetch([])
  const { submitting, error: submitError, submitForm, clearError: clearSubmitError } = useSubmit()
  const { deleteItem, confirmOpen, openConfirm, closeConfirm, handleConfirm } = useDelete()

  useEffect(() => {
    fetchData(() => api.get('/api/vendors/').then(res => res.data.data))
  }, [])

  const filteredVendors = useMemo(
    () => filterBySearch(vendors, searchQuery, searchConfigs.vendor),
    [vendors, searchQuery]
  )

  const handleOpenForm = (vendor = null) => {
    setEditingVendor(vendor)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingVendor(null)
    clearSubmitError()
  }

  const handleSubmit = async (formData) => {
    await submitForm(async () => {
      if (editingVendor) {
        await api.put(`/api/vendors/${editingVendor.id}`, formData)
        setSuccessMessage('Vendor updated successfully')
      } else {
        await api.post('/api/vendors/', formData)
        setSuccessMessage('Vendor created successfully')
      }
      await fetchData(() => api.get('/api/vendors/').then(res => res.data.data))
      handleCloseForm()
    })
  }

  const handleDeleteConfirm = async () => {
    await handleConfirm(async (vendor) => {
      await api.delete(`/api/vendors/${vendor.id}`)
      setSuccessMessage('Vendor deleted successfully')
      await fetchData(() => api.get('/api/vendors/').then(res => res.data.data))
    })
  }

  const columns = [
    { field: 'vendor_name', headerName: 'Vendor Name' },
    {
      field: 'vendor_type',
      headerName: 'Type',
      render: (row) => (
        <Chip
          label={row.vendor_type}
          color={getStatusColor(row.vendor_type, 'vendorType')}
          size="small"
        />
      ),
    },
    { field: 'contact_person', headerName: 'Contact Person' },
    { field: 'phone', headerName: 'Phone' },
    { field: 'email', headerName: 'Email' },
    { field: 'gst_number', headerName: 'GST Number' },
    {
      field: 'actions',
      headerName: 'Actions',
      align: 'right',
      width: 120,
      render: (row) => (
        <>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenForm(row)}
            sx={{ mr: 1 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => openConfirm(row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ]

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LoadingSpinner message="Loading vendors..." />
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title="Vendors"
        subtitle="Manage vendor information"
        onAdd={() => handleOpenForm()}
        addButtonText="Add Vendor"
      />

      <SearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by Vendor Name, Code, Type, Contact Person, Phone, Email..."
      />

      <DataTable columns={columns} data={filteredVendors} />

      <VendorForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        vendor={editingVendor}
        submitting={submitting}
        error={submitError}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Vendor"
        message={`Are you sure you want to delete ${deleteItem?.vendor_name}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={closeConfirm}
        confirmText="Delete"
        severity="error"
      />

      <NotificationSnackbar
        open={!!successMessage}
        message={successMessage}
        severity="success"
        onClose={() => setSuccessMessage('')}
      />

      <NotificationSnackbar
        open={!!error}
        message={error}
        severity="error"
        onClose={clearError}
      />
    </Container>
  )
}

export default VendorsPage
