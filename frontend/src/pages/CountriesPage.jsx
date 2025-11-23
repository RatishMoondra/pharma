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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import { useStableRowEditing } from '../hooks/useStableRowEditing'

const CountriesPage = () => {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState(null)
  const [formData, setFormData] = useState({
    country_code: '',
    country_name: '',
    language: '',
    currency: '',
    is_active: true,
  })
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

  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/countries/')
      if (response.data.success) {
        setCountries(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (country = null) => {
    if (country) {
      setEditingCountry(country)
      setFormData({
        country_code: country.country_code || '',
        country_name: country.country_name || '',
        language: country.language || '',
        currency: country.currency || '',
        is_active: country.is_active !== undefined ? country.is_active : true,
      })
      openEditForm(country.id)
    } else {
      setEditingCountry(null)
      setFormData({
        country_code: '',
        country_name: '',
        language: '',
        currency: '',
        is_active: true,
      })
    }
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingCountry(null)
    setFormData({
      country_code: '',
      country_name: '',
      language: '',
      currency: '',
      is_active: true,
    })
    closeEditForm()
  }

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      if (editingCountry) {
        const response = await api.put(`/api/countries/${editingCountry.id}`, formData)
        if (response.data.success) {
          const updatedCountry = response.data.data
          setCountries(prevCountries => updateDataStably(prevCountries, updatedCountry))
          setSuccessMessage('Country updated successfully')
          markAsSaved(editingCountry.id)
        }
      } else {
        const response = await api.post('/api/countries/', formData)
        if (response.data.success) {
          const newCountry = response.data.data
          setCountries(prevCountries => addDataStably(prevCountries, newCountry, true))
          setSuccessMessage('Country created successfully')
          markAsSaved(newCountry.id)
        }
      }
      
      handleCloseForm()
    } catch (err) {
      handleApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this country? This will fail if there are associated vendors or PIs.')) {
      return
    }

    try {
      const response = await api.delete(`/api/countries/${id}`)
      if (response.data.success) {
        setCountries(prevCountries => removeDataStably(prevCountries, id))
        setSuccessMessage('Country deleted successfully')
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const filteredCountries = countries.filter(country => {
    const query = searchQuery.toLowerCase()
    return (
      country.country_name?.toLowerCase().includes(query) ||
      country.country_code?.toLowerCase().includes(query) ||
      country.language?.toLowerCase().includes(query) ||
      country.currency?.toLowerCase().includes(query)
    )
  })

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Country Master</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Country
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by Country Name, Code, Language, or Currency..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredCountries.length === 0 ? (
        <Alert severity="info">
          {countries.length === 0 
            ? 'No countries found. Click "Add Country" to create one.' 
            : 'No countries match your search criteria.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Country Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Country Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Language</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Currency</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCountries.map((country) => (
                <TableRow 
                  key={country.id}
                  sx={getRowStyle(country.id)}
                >
                  <TableCell>{country.country_code}</TableCell>
                  <TableCell>{country.country_name}</TableCell>
                  <TableCell>{country.language}</TableCell>
                  <TableCell>{country.currency || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={country.is_active ? 'Active' : 'Inactive'}
                      color={country.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenForm(country)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(country.id)}
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

      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCountry ? 'Edit Country' : 'Add New Country'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              name="country_code"
              label="Country Code"
              value={formData.country_code}
              onChange={handleChange}
              required
              placeholder="e.g., USA, GBR, IND"
              helperText="ISO 3166-1 alpha-3 code (2-3 characters)"
              inputProps={{ maxLength: 3 }}
            />
            <TextField
              name="country_name"
              label="Country Name"
              value={formData.country_name}
              onChange={handleChange}
              required
            />
            <TextField
              name="language"
              label="Primary Language"
              value={formData.language}
              onChange={handleChange}
              required
              helperText="Language for printing materials"
            />
            <TextField
              name="currency"
              label="Currency Code"
              value={formData.currency}
              onChange={handleChange}
              placeholder="e.g., USD, EUR, INR"
              helperText="ISO 4217 currency code (optional)"
              inputProps={{ maxLength: 3 }}
            />
            <FormControlLabel
              control={
                <Switch
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.country_code || !formData.country_name || !formData.language}
          >
            {submitting ? <CircularProgress size={24} /> : (editingCountry ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default CountriesPage
