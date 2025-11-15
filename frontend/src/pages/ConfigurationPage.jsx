import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useApiError } from '../hooks/useApiError';

const ConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showSensitive, setShowSensitive] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { error, handleApiError, clearError } = useApiError();
  const [successMessage, setSuccessMessage] = useState('');

  const categories = [
    { value: 'system', label: 'System' },
    { value: 'workflow', label: 'Workflow Rules' },
    { value: 'numbering', label: 'Document Numbering' },
    { value: 'vendor', label: 'Vendor Rules' },
    { value: 'email', label: 'Email' },
    { value: 'security', label: 'Security' },
    { value: 'ui', label: 'UI/UX' },
    { value: 'integration', label: 'Integration' }
  ];

  const currentCategory = categories[activeTab].value;

  useEffect(() => {
    fetchConfigs();
  }, [activeTab]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/config/', {
        params: { 
          category: currentCategory,
          include_sensitive: showSensitive
        }
      });
      if (response.data.success) {
        setConfigs(response.data.data);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setEditValue(JSON.stringify(config.config_value, null, 2));
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setEditValue('');
  };

  const handleSaveClick = () => {
    // Validate JSON
    try {
      JSON.parse(editValue);
      setSaveDialogOpen(true);
    } catch (e) {
      handleApiError({ response: { data: { message: 'Invalid JSON format' } } });
    }
  };

  const handleSaveConfirm = async () => {
    setSaveDialogOpen(false);
    try {
      const parsedValue = JSON.parse(editValue);
      const response = await api.put(`/api/config/${editingConfig.config_key}`, {
        config_value: parsedValue
      });
      
      if (response.data.success) {
        setSuccessMessage(`Configuration '${editingConfig.config_key}' updated successfully`);
        setEditingConfig(null);
        setEditValue('');
        fetchConfigs();
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  const formatConfigValue = (value, isSensitive) => {
    if (isSensitive && !showSensitive) {
      return '••••••••';
    }
    
    if (typeof value === 'object' && value !== null) {
      // Check if it's a simple single-value object like {value: "something"}
      if (Object.keys(value).length === 1 && 'value' in value) {
        return String(value.value);
      }
      
      // Check if it's a simple object with common patterns
      if ('enabled' in value && Object.keys(value).length === 1) {
        return value.enabled ? '✓ Enabled' : '✗ Disabled';
      }
      
      // For arrays, show as comma-separated list
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      // For other objects, show key-value pairs in readable format
      return Object.entries(value)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return `${k}: ${JSON.stringify(v)}`;
          }
          return `${k}: ${v}`;
        })
        .join('\n');
    }
    
    return String(value);
  };

  const getCategoryColor = (category) => {
    const colors = {
      system: 'primary',
      workflow: 'success',
      numbering: 'info',
      vendor: 'warning',
      email: 'secondary',
      security: 'error',
      ui: 'info',
      integration: 'primary'
    };
    return colors[category] || 'primary';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            System Configuration
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={showSensitive ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => {
                setShowSensitive(!showSensitive);
                setTimeout(() => fetchConfigs(), 100);
              }}
              color={showSensitive ? 'error' : 'inherit'}
            >
              {showSensitive ? 'Hide' : 'Show'} Sensitive
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchConfigs}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {categories.map((cat, idx) => (
              <Tab key={cat.value} label={cat.label} />
            ))}
          </Tabs>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Configs Table */}
        {!loading && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Configuration Key</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '45%' }}>Value</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No configurations found in this category
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((config) => (
                    <TableRow 
                      key={config.config_key}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: editingConfig?.config_key === config.config_key ? 'action.selected' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {config.config_key}
                          </Typography>
                          {config.is_sensitive && (
                            <Chip label="Sensitive" size="small" color="error" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {editingConfig?.config_key === config.config_key ? (
                          <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={10}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                          />
                        ) : (
                          <Typography 
                            variant="body2" 
                            component="pre"
                            sx={{ 
                              fontFamily: 'monospace', 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              m: 0
                            }}
                          >
                            {formatConfigValue(config.config_value, config.is_sensitive)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {config.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {editingConfig?.config_key === config.config_key ? (
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={handleSaveClick}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={handleCancelEdit}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEdit(config)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Info Box */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="caption" color="info.dark" display="block">
            💡 <strong>Note:</strong> Configuration changes take effect immediately for new requests. 
            Cached values refresh every 5 minutes.
          </Typography>
        </Box>
      </Paper>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Confirm Configuration Update</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to update <strong>{editingConfig?.config_key}</strong>?
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              New Value:
            </Typography>
            <Typography 
              variant="body2" 
              component="pre"
              sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1 }}
            >
              {editValue}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfirm} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
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
  );
};

export default ConfigurationPage;
