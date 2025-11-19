import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../services/api';

const CATEGORIES = [
  'PAYMENT',
  'DELIVERY',
  'WARRANTY',
  'QUALITY',
  'LEGAL',
  'GENERAL',
  'OTHER',
];

const getCategoryColor = (category) => {
  const colors = {
    PAYMENT: 'success',
    DELIVERY: 'info',
    WARRANTY: 'warning',
    QUALITY: 'primary',
    LEGAL: 'error',
    GENERAL: 'default',
    OTHER: 'secondary',
  };
  return colors[category] || 'default';
};

const TermsConditionsPage = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({
    term_text: '',
    category: 'GENERAL',
    priority: 100,
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchTerms();
  }, [selectedCategory, showActiveOnly, searchText]);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (showActiveOnly) params.is_active = true;
      if (searchText) params.search = searchText;

      const response = await api.get('/api/terms/', { params });
      if (response.data.success) {
        setTerms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      showSnackbar('Failed to fetch terms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (term = null) => {
    if (term) {
      setEditingTerm(term);
      setFormData({
        term_text: term.term_text,
        category: term.category,
        priority: term.priority,
        is_active: term.is_active,
      });
    } else {
      setEditingTerm(null);
      setFormData({
        term_text: '',
        category: 'GENERAL',
        priority: 100,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTerm(null);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingTerm) {
        // Update existing term
        const response = await api.put(`/api/terms/${editingTerm.id}`, formData);
        if (response.data.success) {
          showSnackbar('Term updated successfully', 'success');
          fetchTerms();
          handleCloseDialog();
        }
      } else {
        // Create new term
        const response = await api.post('/api/terms/', formData);
        if (response.data.success) {
          showSnackbar('Term created successfully', 'success');
          fetchTerms();
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error('Failed to save term:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save term';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (termId) => {
    if (!confirm('Are you sure you want to delete this term? This cannot be undone if the term is not assigned to any vendors.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/terms/${termId}`);
      if (response.data.success) {
        showSnackbar('Term deleted successfully', 'success');
        fetchTerms();
      }
    } catch (error) {
      console.error('Failed to delete term:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete term';
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Terms & Conditions Master Library
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Term
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search */}
          <TextField
            label="Search term text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            variant="outlined"
            sx={{ flexGrow: 1, minWidth: 300 }}
            InputProps={{
              endAdornment: <SearchIcon />,
            }}
          />

          {/* Active Only Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
              />
            }
            label="Active Only"
          />
        </Box>
      </Paper>

      {/* Terms Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="60">Priority</TableCell>
                <TableCell width="120">Category</TableCell>
                <TableCell>Term Text</TableCell>
                <TableCell width="100" align="center">Status</TableCell>
                <TableCell width="180" align="center">Created</TableCell>
                <TableCell width="120" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No terms found. {!showActiveOnly && 'Try adjusting your filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((term) => (
                  <TableRow
                    key={term.id}
                    sx={{
                      bgcolor: term.is_active ? 'inherit' : 'action.disabledBackground',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={term.priority}
                        size="small"
                        color={term.priority <= 50 ? 'error' : term.priority <= 100 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={term.category}
                        size="small"
                        color={getCategoryColor(term.category)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          textDecoration: term.is_active ? 'none' : 'line-through',
                        }}
                      >
                        {term.term_text}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={term.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={term.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption">
                        {new Date(term.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(term)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(term.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTerm ? 'Edit Term' : 'Add New Term'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              name="term_text"
              label="Term Text"
              value={formData.term_text}
              onChange={handleChange}
              multiline
              rows={4}
              required
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Category"
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              name="priority"
              label="Priority (1-999, lower = higher priority)"
              type="number"
              value={formData.priority}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1, max: 999 }}
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
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.term_text || !formData.category}
          >
            {editingTerm ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TermsConditionsPage;
