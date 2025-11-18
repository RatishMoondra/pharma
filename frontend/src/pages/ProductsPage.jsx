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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ProductForm from '../components/ProductForm'
import MedicineForm from '../components/MedicineForm'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'

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
  const {
    openEditForm,
    closeEditForm,
    markAsSaved,
    updateDataStably,
    addDataStably,
    removeDataStably,
    getRowStyle,
  } = useStableRowEditing()

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

  const fetchProductsWithMedicines = async () => {
    try {
      setLoading(true)
      // Fetch both products and medicines
      const [productsRes, medicinesRes] = await Promise.all([
        api.get('/api/products/'),
        api.get('/api/products/medicines')
      ])
      
      if (productsRes.data.success) {
        setProducts(productsRes.data.data)
      }
      if (medicinesRes.data.success) {
        setMedicines(medicinesRes.data.data)
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
      fetchProductsWithMedicines()
    }
  }, [tab])

  const handleOpenForm = (item = null) => {
    setEditingItem(item)
    setFormOpen(true)
    if (item) {
      openEditForm(item.id)
    }
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingItem(null)
    closeEditForm()
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
            const updatedProduct = response.data.data
            setProducts(prevProducts => updateDataStably(prevProducts, updatedProduct))
            setSuccessMessage('Product updated successfully')
            markAsSaved(editingItem.id)
            handleCloseForm()
          }
        } else {
          const response = await api.post('/api/products/', formData)
          if (response.data.success) {
            const newProduct = response.data.data
            setProducts(prevProducts => addDataStably(prevProducts, newProduct, true))
            setSuccessMessage('Product created successfully')
            markAsSaved(newProduct.id)
            handleCloseForm()
          }
        }
      } else {
        // Medicine operations
        if (editingItem) {
          const response = await api.put(`/api/products/medicines/${editingItem.id}`, formData)
          if (response.data.success) {
            const updatedMedicine = response.data.data
            setMedicines(prevMedicines => updateDataStably(prevMedicines, updatedMedicine))
            setSuccessMessage('Medicine updated successfully')
            markAsSaved(editingItem.id)
            handleCloseForm()
          }
        } else {
          const response = await api.post('/api/products/medicines', formData)
          if (response.data.success) {
            const newMedicine = response.data.data
            setMedicines(prevMedicines => addDataStably(prevMedicines, newMedicine, true))
            setSuccessMessage('Medicine created successfully')
            markAsSaved(newMedicine.id)
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
          setProducts(prevProducts => removeDataStably(prevProducts, itemId))
          setSuccessMessage('Product deleted successfully')
        }
      } else {
        const response = await api.delete(`/api/products/medicines/${itemId}`)
        if (response.data.success) {
          setMedicines(prevMedicines => removeDataStably(prevMedicines, itemId))
          setSuccessMessage('Medicine deleted successfully')
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
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>HSN Code</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit of Measure</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow 
                    key={product.id}
                    sx={getRowStyle(product.id)}
                  >
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell>{product.hsn_code || '-'}</TableCell>
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
        <Box>
          {/* Group medicines by product */}
          {products.map((product) => {
            const productMedicines = filteredMedicines.filter(m => m.product_id === product.id)
            
            if (productMedicines.length === 0 && searchQuery) {
              // Skip products with no matching medicines when searching
              return null
            }
            
            return (
              <Accordion key={product.id} sx={{ mb: 2, boxShadow: 2 }}>
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box>
                      <Typography variant="h6" color="primary.main">
                        {product.product_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Code: {product.product_code} | HSN: {product.hsn_code || 'N/A'} | UOM: {product.unit_of_measure || 'N/A'}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${productMedicines.length} medicine${productMedicines.length !== 1 ? 's' : ''}`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {productMedicines.length === 0 ? (
                    <Alert severity="info">
                      No medicines under this product. Click "Add Medicine" to create one.
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Medicine Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>HSN</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Dosage Form</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Strength</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Pack Size</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Units</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productMedicines.map((medicine, idx) => (
                            <TableRow 
                              key={medicine.id}
                              sx={{
                                bgcolor: idx % 2 === 0 ? 'white' : 'grey.50',
                                '&:hover': { bgcolor: 'action.hover' },
                                ...getRowStyle(medicine.id)
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {medicine.medicine_name}
                                </Typography>
                                {medicine.composition && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {medicine.composition}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{medicine.medicine_code}</TableCell>
                              <TableCell>{medicine.hsn_code || '-'}</TableCell>
                              <TableCell>
                                <Chip label={medicine.dosage_form} size="small" color="info" />
                              </TableCell>
                              <TableCell>{medicine.strength || '-'}</TableCell>
                              <TableCell>{medicine.pack_size || '-'}</TableCell>
                              <TableCell>
                                {medicine.primary_unit && medicine.secondary_unit && medicine.conversion_factor
                                  ? `${medicine.conversion_factor} ${medicine.primary_unit}/${medicine.secondary_unit}`
                                  : medicine.primary_unit || '-'}
                              </TableCell>
                              <TableCell>
                                {medicine.manufacturer_vendor?.vendor_name || '-'}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenForm(medicine)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(medicine.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
          
          {/* Show products with no medicines if not searching */}
          {!searchQuery && products.filter(p => !medicines.some(m => m.product_id === p.id)).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Products with no medicines:
              </Typography>
              {products.filter(p => !medicines.some(m => m.product_id === p.id)).map(product => (
                <Alert key={product.id} severity="warning" sx={{ mb: 1 }}>
                  <strong>{product.product_name}</strong> ({product.product_code}) has no medicines.
                </Alert>
              ))}
            </Box>
          )}
        </Box>
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
