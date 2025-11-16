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
  TextField,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
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
  const [searchQuery, setSearchQuery] = useState('')
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

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.product_name?.toLowerCase().includes(query) ||
      product.product_code?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    )
  })

  // Filter medicines based on search query
  const filteredMedicines = medicines.filter(medicine => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      medicine.medicine_name?.toLowerCase().includes(query) ||
      medicine.medicine_code?.toLowerCase().includes(query) ||
      medicine.dosage_form?.toLowerCase().includes(query) ||
      medicine.strength?.toLowerCase().includes(query) ||
      medicine.manufacturer_vendor?.vendor_name?.toLowerCase().includes(query) ||
      medicine.rm_vendor?.vendor_name?.toLowerCase().includes(query) ||
      medicine.pm_vendor?.vendor_name?.toLowerCase().includes(query)
    )
  })

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

      <Tabs value={tab} onChange={(e, newValue) => { setTab(newValue); setSearchQuery('') }} sx={{ mb: 3 }}>
        <Tab label="Product Master" />
        <Tab label="Medicine Master" />
      </Tabs>

      <TextField
        fullWidth
        placeholder={tab === 0 
          ? "Search by Product Name, Code, Category..." 
          : "Search by Medicine Name, Code, Dosage Form, Strength, Vendor..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        filteredProducts.length === 0 ? (
          <Alert severity="info">
            {products.length === 0 
              ? 'No products found. Click "Add Product" to create one.' 
              : 'No products match your search criteria.'}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Code</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit of Measure</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
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
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Medicine Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>HSN Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dosage Form</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Strength</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Units</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Manufacturer</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMedicines.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell>{medicine.medicine_name}</TableCell>
                  <TableCell>{medicine.hsn_code || '-'}</TableCell>
                  <TableCell>{medicine.product?.product_name || '-'}</TableCell>
                  <TableCell>{medicine.dosage_form}</TableCell>
                  <TableCell>{medicine.strength || '-'}</TableCell>
                  <TableCell>
                    {medicine.primary_unit && medicine.secondary_unit && medicine.conversion_factor
                      ? `${medicine.conversion_factor} ${medicine.primary_unit}/${medicine.secondary_unit}`
                      : medicine.primary_unit || '-'}
                  </TableCell>
                  <TableCell>{medicine.manufacturer_vendor?.vendor_name || '-'}</TableCell>
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
