import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import { alpha, styled } from '@mui/material/styles'
import {
  DataGrid,
  GridToolbar,
  GridToolbarContainer,
  gridClasses,
} from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'

import ERPPage from '../components/ERPPage'
import ProductForm from '../components/ProductForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'

// ---------------------------
// Striped DataGrid Styling
// ---------------------------
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontWeight: 700,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.06),
    },
  },
  '& .edited-row': {
    boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.05)}`,
  },
}))

const CustomToolbar = () => (
  <GridToolbarContainer sx={{ p: 1 }}>
    <GridToolbar />
  </GridToolbarContainer>
)

const ProductMasterPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { error, handleApiError, clearError } = useApiError()
  const {
    openEditForm,
    closeEditForm,
    updateDataStably,
    addDataStably,
    removeDataStably,
    markAsSaved,
    getRowStyle,
  } = useStableRowEditing()

  // --------------------------------
  // Fetch Products
  // --------------------------------
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/products/')
      if (res.data.success) setProducts(res.data.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // --------------------------------
  // Open / Close Form
  // --------------------------------
  const handleOpenForm = (product = null) => {
    setEditingProduct(product)
    if (product) openEditForm(product.id)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setEditingProduct(null)
    closeEditForm()
    setFormOpen(false)
  }

  // --------------------------------
  // Submit Product
  // --------------------------------
  const handleSubmit = async (data) => {
    try {
      setSubmitting(true)

      if (editingProduct) {
        const res = await api.put(`/api/products/${editingProduct.id}`, data)
        if (res.data.success) {
          const updated = res.data.data
          setProducts(prev => updateDataStably(prev, updated))
          markAsSaved(editingProduct.id)
          setSuccessMessage('Product updated successfully')
        }
      } else {
        const res = await api.post('/api/products/', data)
        if (res.data.success) {
          const created = res.data.data
          setProducts(prev => addDataStably(prev, created, true))
          markAsSaved(created.id)
          setSuccessMessage('Product created successfully')
        }
      }

      handleCloseForm()
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  // --------------------------------
  // Delete
  // --------------------------------
  const handleDelete = async (id) => {
    if (!window.confirm('Delete product?')) return
    try {
      const res = await api.delete(`/api/products/${id}`)
      if (res.data.success) {
        setProducts(prev => removeDataStably(prev, id))
        setSuccessMessage('Product deleted successfully')
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  // --------------------------------
  // Filtered rows
  // --------------------------------
  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    )
  })

  // --------------------------------
  // DataGrid columns
  // --------------------------------
  const columns = [
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleOpenForm(params.row)} size="small" color="primary">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)} size="small" color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    },
    { field: 'product_code', headerName: 'Product Code', flex: 1 },
    { field: 'hsn_code', headerName: 'HSN', flex: 0.7 },
    { field: 'product_name', headerName: 'Product Name', flex: 1.5 },
    { field: 'unit_of_measure', headerName: 'UOM', flex: 0.7 },
    { field: 'description', headerName: 'Description', flex: 2 },
  ]

  return (
    <ERPPage
      title="Product Master"
      icon={<AddIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
          Add Product
        </Button>
      }
    >
      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by Product Name, Code, Category..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
      />

      {/* DataGrid */}
      <StripedDataGrid
        autoHeight
        rows={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } }
        }}
        disableRowSelectionOnClick
        slots={{
          toolbar: CustomToolbar
        }}
        getRowClassName={(params) => {
          const base = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
          const styleObj = getRowStyle(params.id) || {}
          return Object.keys(styleObj).length > 0 ? `${base} edited-row` : base
        }}
      />

      {/* Form */}
      <ProductForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        product={editingProduct}
        isLoading={submitting}
      />

      {/* Success */}
      <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage('')}>
        <Alert severity="success">{successMessage}</Alert>
      </Snackbar>

      {/* Error */}
      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </ERPPage>
  )
}

export default ProductMasterPage
