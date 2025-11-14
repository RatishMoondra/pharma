import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ProductForm from '../components/ProductForm'
import MedicineForm from '../components/MedicineForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'

const ProductsPage = () => {
  const [tab, setTab] = useState(0)
  const [products, setProducts] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const { error, handleApiError, clearError } = useApiError()

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/products/')
      if (response.data.success) {
        setProducts(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMedicines = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/products/medicines')
      if (response.data.success) {
        setMedicines(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 0) {
      fetchProducts()
    } else {
      fetchMedicines()
    }
  }, [tab])

  const handleOpenForm = (item = null) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingItem(null)
  }

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true)
      clearError()

      if (tab === 0) {
        // Product operations
        if (editingItem) {
          const response = await api.put(`/api/products/${editingItem.id}`, formData)
          if (response.data.success) {
            setSuccessMessage('Product updated successfully')
            fetchProducts()
            handleCloseForm()
          }
        } else {
          const response = await api.post('/api/products/', formData)
          if (response.data.success) {
            setSuccessMessage('Product created successfully')
            fetchProducts()
            handleCloseForm()
          }
        }
      } else {
        // Medicine operations
        if (editingItem) {
          const response = await api.put(`/api/products/medicines/${editingItem.id}`, formData)
          if (response.data.success) {
            setSuccessMessage('Medicine updated successfully')
            fetchMedicines()
            handleCloseForm()
          }
        } else {
          const response = await api.post('/api/products/medicines', formData)
          if (response.data.success) {
            setSuccessMessage('Medicine created successfully')
            fetchMedicines()
            handleCloseForm()
          }
        }
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm(`Are you sure you want to delete this ${tab === 0 ? 'product' : 'medicine'}?`)) {
      return
    }

    try {
      if (tab === 0) {
        const response = await api.delete(`/api/products/${itemId}`)
        if (response.data.success) {
          setSuccessMessage('Product deleted successfully')
          fetchProducts()
        }
      } else {
        const response = await api.delete(`/api/products/medicines/${itemId}`)
        if (response.data.success) {
          setSuccessMessage('Medicine deleted successfully')
          fetchMedicines()
        }
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products & Medicines</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          {tab === 0 ? 'Add Product' : 'Add Medicine'}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Product Master" />
        <Tab label="Medicine Master" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        products.length === 0 ? (
          <Alert severity="info">No products found. Click "Add Product" to create one.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Code</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Unit of Measure</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell>{product.product_name}</TableCell>
                    <TableCell>{product.unit_of_measure || '-'}</TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenForm(product)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(product.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : medicines.length === 0 ? (
        <Alert severity="info">No medicines found. Click "Add Medicine" to create one.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Medicine Name</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Dosage Form</TableCell>
                <TableCell>Strength</TableCell>
                <TableCell>Pack Size</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>RM Vendor</TableCell>
                <TableCell>PM Vendor</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {medicines.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell>{medicine.medicine_name}</TableCell>
                  <TableCell>{medicine.product?.product_name || '-'}</TableCell>
                  <TableCell>{medicine.dosage_form}</TableCell>
                  <TableCell>{medicine.strength || '-'}</TableCell>
                  <TableCell>{medicine.pack_size || '-'}</TableCell>
                  <TableCell>{medicine.manufacturer_vendor?.vendor_name || '-'}</TableCell>
                  <TableCell>{medicine.rm_vendor?.vendor_name || '-'}</TableCell>
                  <TableCell>{medicine.pm_vendor?.vendor_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenForm(medicine)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(medicine.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 0 ? (
        <ProductForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          product={editingItem}
          isLoading={submitting}
        />
      ) : (
        <MedicineForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          medicine={editingItem}
          isLoading={submitting}
        />
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default ProductsPage
