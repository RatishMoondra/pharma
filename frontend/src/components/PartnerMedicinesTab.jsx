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
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../services/api';

const PartnerMedicinesTab = ({ vendor }) => {
  const [partnerMedicines, setPartnerMedicines] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (vendor?.id && vendor?.vendor_type === 'PARTNER') {
      fetchPartnerMedicines();
    }
  }, [vendor]);

  const fetchPartnerMedicines = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/terms/partner-medicines/', {
        params: { vendor_id: vendor.id },
      });
      if (response.data.success) {
        setPartnerMedicines(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch partner medicines:', error);
      showSnackbar('Failed to load partner medicines', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMedicines = async () => {
    try {
      const response = await api.get('/api/products/medicines');
      if (response.data.success) {
        setAllMedicines(response.data.data.filter((m) => m.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
      showSnackbar('Failed to load medicines', 'error');
    }
  };

  const handleOpenAssignDialog = async () => {
    await fetchAllMedicines();
    setSelectedMedicines([]);
    setDefaultNotes('');
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
    setSelectedMedicines([]);
    setDefaultNotes('');
  };

  const handleToggleMedicine = (medicineId) => {
    setSelectedMedicines((prev) =>
      prev.includes(medicineId) ? prev.filter((id) => id !== medicineId) : [...prev, medicineId]
    );
  };

  const handleBatchAssign = async () => {
    if (selectedMedicines.length === 0) {
      showSnackbar('Please select at least one medicine', 'warning');
      return;
    }

    try {
      const response = await api.post('/api/terms/partner-medicines/batch', {
        vendor_id: vendor.id,
        medicine_ids: selectedMedicines,
        default_notes: defaultNotes || null,
      });

      if (response.data.success) {
        const assignedCount = response.data.data.length;
        showSnackbar(`Successfully assigned ${assignedCount} medicine(s)`, 'success');
        fetchPartnerMedicines();
        handleCloseAssignDialog();
      }
    } catch (error) {
      console.error('Failed to assign medicines:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign medicines';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleOpenEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setEditNotes(assignment.notes || '');
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingAssignment(null);
    setEditNotes('');
  };

  const handleUpdateAssignment = async () => {
    try {
      const response = await api.put(`/api/terms/partner-medicines/${editingAssignment.id}`, {
        notes: editNotes || null,
      });

      if (response.data.success) {
        showSnackbar('Assignment updated successfully', 'success');
        fetchPartnerMedicines();
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update assignment';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this medicine from the partner whitelist?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/terms/partner-medicines/${assignmentId}`);
      if (response.data.success) {
        showSnackbar('Medicine removed from whitelist successfully', 'success');
        fetchPartnerMedicines();
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

  // Check if vendor is a PARTNER type
  if (vendor?.vendor_type !== 'PARTNER') {
    return (
      <Alert severity="info">
        Medicine whitelist is only available for PARTNER vendors. Current vendor type: {vendor?.vendor_type}
      </Alert>
    );
  }

  // Get assigned medicine IDs to filter master list
  const assignedMedicineIds = partnerMedicines.map((pm) => pm.medicine_id);
  const availableMedicines = allMedicines.filter((med) => !assignedMedicineIds.includes(med.id));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Partner Medicine Whitelist</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAssignDialog}>
          Add Medicines
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Medicines listed here will be available for selection when creating PI for this partner vendor.
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : partnerMedicines.length === 0 ? (
        <Alert severity="warning">
          No medicines assigned to this partner yet. Click "Add Medicines" to create a whitelist.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="150">Medicine Code</TableCell>
                <TableCell>Medicine Name</TableCell>
                <TableCell width="100">Unit</TableCell>
                <TableCell width="250">Notes</TableCell>
                <TableCell width="120" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partnerMedicines.map((pm, index) => (
                <TableRow
                  key={pm.id}
                  sx={{ bgcolor: index % 2 === 0 ? 'white' : 'grey.50', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {pm.medicine?.medicine_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{pm.medicine?.medicine_name}</Typography>
                    {pm.medicine?.description && (
                      <Typography variant="caption" color="text.secondary">
                        {pm.medicine.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={pm.medicine?.unit} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {pm.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenEditDialog(pm)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRemoveAssignment(pm.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Medicines Dialog */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add Medicines to {vendor?.vendor_name} Whitelist</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {availableMedicines.length === 0 ? (
              <Alert severity="info">All active medicines are already assigned to this partner.</Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select medicines that this partner vendor can order via PI. Only selected medicines will appear in PI
                  creation form for this partner.
                </Typography>

                <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                  {availableMedicines.map((medicine) => (
                    <ListItem key={medicine.id} dense button onClick={() => handleToggleMedicine(medicine.id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedMedicines.includes(medicine.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip label={medicine.medicine_code} size="small" color="primary" variant="outlined" />
                            <Typography variant="body2" fontWeight="medium">
                              {medicine.medicine_name}
                            </Typography>
                            <Chip label={medicine.unit} size="small" />
                          </Box>
                        }
                        secondary={medicine.description}
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
                  helperText="These notes will be applied to all selected medicines"
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
            disabled={selectedMedicines.length === 0}
            startIcon={<CheckCircleIcon />}
          >
            Add {selectedMedicines.length} Medicine(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Medicine Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {editingAssignment && (
              <>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Medicine:</strong> {editingAssignment.medicine?.medicine_name} (
                    {editingAssignment.medicine?.medicine_code})
                  </Typography>
                  <Typography variant="caption">Unit: {editingAssignment.medicine?.unit}</Typography>
                </Alert>

                <TextField
                  label="Partner-Specific Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                  helperText="Add any partner-specific notes about this medicine"
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

export default PartnerMedicinesTab;
