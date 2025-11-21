import { useState, useEffect, useMemo } from 'react'; // 🟢 Added useMemo
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
  CircularProgress,
  TableSortLabel, // 🟢 Added TableSortLabel
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles'; // 🟢 Added alpha and styled
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

// 🟢 SORTING HELPER FUNCTIONS (Copied from RawMaterialPage.jsx)
const descendingComparator = (a, b, property) => {
  if (b[property] < a[property]) return -1;
  if (b[property] > a[property]) return 1;
  return 0;
}

const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const stableSort = (array, comparator) => {
  const stabilized = array.map((el, idx) => [el, idx]);
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0]);
    if (cmp !== 0) return cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

// 🟢 Striped Row Styling (Modified to include inactive background color)
const StripedTableRow = styled(TableRow)(({ theme, index, isactive }) => ({
  backgroundColor: isactive === 'false' 
    ? theme.palette.action.disabledBackground // Distinct color for inactive terms
    : index % 2 === 0 ? 'white' : theme.palette.grey[50], // Striped colors for active terms
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
}));

const TermsConditionsPage = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Existing Filters (Now used for client-side filtering)
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState('');

  // 🟢 NEW SORTING & COLUMN FILTERING STATE
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('priority');
  const [columnFilters, setColumnFilters] = useState({
    priority: '',
    category: '',
    term_text: '',
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({
    term_text: '',
    category: 'GENERAL',
    priority: 100,
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 🟢 Fetch all terms once on mount
  useEffect(() => {
    fetchTerms();
  }, []); // Dependency array cleared to fetch all data once

  const fetchTerms = async () => {
    setLoading(true);
    try {
      // Fetch all terms to enable client-side sorting and column filtering
      const response = await api.get('/api/terms/'); 
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

  // 🟢 SORTING HANDLERS
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // 🟢 COLUMN FILTER HANDLER
  const handleColumnFilterChange = (field, value) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  // 🟢 COMBINED FILTERING AND SORTING LOGIC
  const filteredTerms = useMemo(() => {
    let filtered = terms;
    const query = searchText.toLowerCase();

    // 1. Global Search Filter (from the top text field)
    if (query) {
        filtered = filtered.filter(term =>
            term.term_text?.toLowerCase().includes(query) ||
            term.category?.toLowerCase().includes(query) ||
            term.priority?.toString().includes(query)
        );
    }

    // 2. Category Filter (from the top select)
    if (selectedCategory) {
        filtered = filtered.filter(term => term.category === selectedCategory);
    }

    // 3. Active Only Filter (from the top switch)
    if (showActiveOnly) {
        filtered = filtered.filter(term => term.is_active);
    }

    // 4. Column Filters (additive filter regardless of global search)
    filtered = filtered.filter(term => {
      return Object.entries(columnFilters).every(([key, val]) => {
        if (!val) return true;

        // Handle numeric filter (priority)
        if (key === 'priority') {
          return term.priority?.toString().includes(val);
        }

        // Handle string properties (category, term_text)
        return term[key]?.toLowerCase().includes(val.toLowerCase());
      });
    });

    // 5. Apply Sorting
    return stableSort(filtered, getComparator(order, orderBy));

  }, [terms, searchText, selectedCategory, showActiveOnly, order, orderBy, columnFilters]);

  // Rest of the handlers (handleOpenDialog, handleCloseDialog, handleChange, handleSubmit, handleDelete, showSnackbar, handleCloseSnackbar) remain unchanged
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

      {/* Filters (Now only update state for client-side filtering) */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <FormControl sx={{ minWidth: 200 }} size="small">
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

          {/* Search (Global Search) */}
          <TextField
            label="Global Search (Term Text, Category, Priority)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            variant="outlined"
            size="small"
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
              {/* 🟢 Main Header Row (Styled to match VendorsPage) */}
              <TableRow sx={{ bgcolor: 'primary.main' }}> 
                <TableCell width="60" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'priority'}
                    direction={orderBy === 'priority' ? order : 'asc'}
                    onClick={() => handleSort('priority')}
                  >Priority</TableSortLabel>
                </TableCell>
                <TableCell width="120" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'category'}
                    direction={orderBy === 'category' ? order : 'asc'}
                    onClick={() => handleSort('category')}
                  >Category</TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'term_text'}
                    direction={orderBy === 'term_text' ? order : 'asc'}
                    onClick={() => handleSort('term_text')}
                  >Term Text</TableSortLabel>
                </TableCell>
                <TableCell width="100" align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell width="180" align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'created_at'}
                    direction={orderBy === 'created_at' ? order : 'asc'}
                    onClick={() => handleSort('created_at')}
                  >Created</TableSortLabel>
                </TableCell>
                <TableCell width="120" align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
              
              {/* 🟢 Column Filter Row */}
              <TableRow>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Priority"
                    value={columnFilters.priority}
                    onChange={e => handleColumnFilterChange('priority', e.target.value)}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Category"
                    value={columnFilters.category}
                    onChange={e => handleColumnFilterChange('category', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Search Term"
                    value={columnFilters.term_text}
                    onChange={e => handleColumnFilterChange('term_text', e.target.value)}
                    fullWidth
                  />
                </TableCell>
                <TableCell /> {/* Status - No filter */}
                <TableCell /> {/* Created - No filter */}
                <TableCell /> {/* Actions - No filter */}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTerms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No terms found. Try adjusting your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTerms.map((term, idx) => (
                  <StripedTableRow // 🟢 Use StripedTableRow
                    key={term.id}
                    index={idx}
                    isactive={term.is_active.toString()} // Pass active status for conditional background
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
                  </StripedTableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add/Edit Dialog (Unchanged) */}
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

      {/* Snackbar (Unchanged) */}
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