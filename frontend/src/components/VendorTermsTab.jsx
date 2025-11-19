import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../services/api';

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

const VendorTermsTab = ({ vendor }) => {
  const [vendorTerms, setVendorTerms] = useState([]);
  const [masterTerms, setMasterTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [editFormData, setEditFormData] = useState({
    priority_override: '',
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (vendor?.id) {
      fetchVendorTerms();
    }
  }, [vendor]);

  const fetchVendorTerms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/terms/vendor-terms/', {
        params: { vendor_id: vendor.id, is_active: true },
      });
      if (response.data.success) {
        // Sort by effective priority
        const sorted = response.data.data.sort((a, b) => {
          const priorityA = a.priority_override || a.term?.priority || 999;
          const priorityB = b.priority_override || b.term?.priority || 999;
          return priorityA - priorityB;
        });
        setVendorTerms(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch vendor terms:', error);
      showSnackbar('Failed to load vendor terms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterTerms = async () => {
    try {
      const response = await api.get('/api/terms/', {
        params: { is_active: true },
      });
      if (response.data.success) {
        setMasterTerms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch master terms:', error);
      showSnackbar('Failed to load master terms', 'error');
    }
  };

  const handleOpenAssignDialog = async () => {
    await fetchMasterTerms();
    setSelectedTerms([]);
    setDefaultNotes('');
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setSelectedTerms([]);
    setDefaultNotes('');
  };

  const handleToggleTerm = (termId) => {
    setSelectedTerms((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    );
  };

  const handleBatchAssign = async () => {
    if (selectedTerms.length === 0) {
      showSnackbar('Please select at least one term', 'warning');
      return;
    }

    try {
      const response = await api.post('/api/terms/vendor-terms/batch', {
        vendor_id: vendor.id,
        term_ids: selectedTerms,
        default_notes: defaultNotes || null,
      });

      if (response.data.success) {
        const assignedCount = response.data.data.length;
        showSnackbar(`Successfully assigned ${assignedCount} term(s)`, 'success');
        fetchVendorTerms();
        handleCloseAssignDialog();
      }
    } catch (error) {
      console.error('Failed to assign terms:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign terms';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleOpenEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      priority_override: assignment.priority_override || '',
      notes: assignment.notes || '',
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingAssignment(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateAssignment = async () => {
    try {
      const response = await api.put(
        `/api/terms/vendor-terms/${editingAssignment.id}`,
        {
          priority_override: editFormData.priority_override ? parseInt(editFormData.priority_override) : null,
          notes: editFormData.notes || null,
        }
      );

      if (response.data.success) {
        showSnackbar('Assignment updated successfully', 'success');
        fetchVendorTerms();
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update assignment';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this term assignment?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/terms/vendor-terms/${assignmentId}`);
      if (response.data.success) {
        showSnackbar('Term assignment removed successfully', 'success');
        fetchVendorTerms();
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove assignment';
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get assigned term IDs to filter master list
  const assignedTermIds = vendorTerms.map((vt) => vt.term_id);
  const availableTerms = masterTerms.filter((term) => !assignedTermIds.includes(term.id));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Vendor Terms & Conditions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAssignDialog}>
          Assign Terms
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : vendorTerms.length === 0 ? (
        <Alert severity="info">
          No terms assigned to this vendor yet. Click "Assign Terms" to add terms from the master library.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="80">Priority</TableCell>
                <TableCell width="120">Category</TableCell>
                <TableCell>Term Text</TableCell>
                <TableCell width="200">Notes</TableCell>
                <TableCell width="120" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendorTerms.map((vt, index) => {
                const effectivePriority = vt.priority_override || vt.term?.priority || 999;
                const hasPriorityOverride = vt.priority_override !== null;

                return (
                  <TableRow key={vt.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={effectivePriority}
                          size="small"
                          color={effectivePriority <= 50 ? 'error' : effectivePriority <= 100 ? 'warning' : 'default'}
                        />
                        {hasPriorityOverride && (
                          <Chip label="Override" size="small" color="secondary" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={vt.term?.category} size="small" color={getCategoryColor(vt.term?.category)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {vt.term?.term_text}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {vt.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleOpenEditDialog(vt)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRemoveAssignment(vt.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Terms Dialog */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="md" fullWidth>
        <DialogTitle>Assign Terms to {vendor?.vendor_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {availableTerms.length === 0 ? (
              <Alert severity="info">All active terms are already assigned to this vendor.</Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select terms to assign to this vendor. Selected terms will use their master priority unless you override
                  it later.
                </Typography>

                <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                  {availableTerms.map((term) => (
                    <ListItem key={term.id} dense button onClick={() => handleToggleTerm(term.id)}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={selectedTerms.includes(term.id)} tabIndex={-1} disableRipple />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip label={term.category} size="small" color={getCategoryColor(term.category)} />
                            <Chip label={`Priority: ${term.priority}`} size="small" />
                            <Typography variant="body2">{term.term_text}</Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <TextField
                  label="Default Notes (optional)"
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                  sx={{ mt: 2 }}
                  helperText="These notes will be applied to all selected terms"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button
            onClick={handleBatchAssign}
            variant="contained"
            disabled={selectedTerms.length === 0}
            startIcon={<CheckCircleIcon />}
          >
            Assign {selectedTerms.length} Term(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Term Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {editingAssignment && (
              <>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Term:</strong> {editingAssignment.term?.term_text}
                  </Typography>
                  <Typography variant="caption">
                    Master Priority: {editingAssignment.term?.priority} | Category: {editingAssignment.term?.category}
                  </Typography>
                </Alert>

                <TextField
                  name="priority_override"
                  label="Priority Override (1-999)"
                  type="number"
                  value={editFormData.priority_override}
                  onChange={handleEditChange}
                  fullWidth
                  inputProps={{ min: 1, max: 999 }}
                  helperText="Leave empty to use master priority"
                />

                <TextField
                  name="notes"
                  label="Vendor-Specific Notes"
                  value={editFormData.notes}
                  onChange={handleEditChange}
                  multiline
                  rows={3}
                  fullWidth
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleUpdateAssignment} variant="contained">
            Update
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
    </Box>
  );
};

export default VendorTermsTab;
