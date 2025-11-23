// Refactored ConfigurationPage.jsx — replaced Table with ERP StripedDataGrid (UI only).
// Source (original): :contentReference[oaicite:0]{index=0}

import React, { useState, useEffect } from 'react'
import {
  Box,
  Tabs,
  Tab,
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
  Snackbar,
  Paper,
  Typography,
} from '@mui/material'

import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material'
import SettingsIcon from '@mui/icons-material/Settings'
import { alpha, styled } from '@mui/material/styles'

import {
  DataGrid,
  gridClasses,
  GridToolbar,
  GridToolbarContainer,
} from '@mui/x-data-grid'

import api from '../services/api'
import { useApiError } from '../hooks/useApiError'
import ERPPage from '../components/ERPPage'

/* ---------------------------
   StripedDataGrid (ERP style)
---------------------------- */
const ODD_OPACITY = 0.06
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.primary.main,
    fontWeight: 700,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
    },
  },
  '& .edited-row': {
    boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.08)}`,
  },
}))

const CustomToolbar = () => (
  <GridToolbarContainer sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <GridToolbar />
  </GridToolbarContainer>
)

const ConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showSensitive, setShowSensitive] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const { error, handleApiError, clearError } = useApiError()
  const [successMessage, setSuccessMessage] = useState('')

  const categories = [
    { value: 'system', label: 'System' },
    { value: 'workflow', label: 'Workflow Rules' },
    { value: 'numbering', label: 'Document Numbering' },
    { value: 'vendor', label: 'Vendor Rules' },
    { value: 'email', label: 'Email' },
    { value: 'security', label: 'Security' },
    { value: 'ui', label: 'UI/UX' },
    { value: 'integration', label: 'Integration' },
  ]

  const currentCategory = categories[activeTab].value

  useEffect(() => {
    fetchConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/config/', {
        params: {
          category: currentCategory,
          include_sensitive: showSensitive,
        },
      })
      if (response.data.success) {
        setConfigs(response.data.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config) => {
    setEditingConfig(config)
    setEditValue(JSON.stringify(config.config_value, null, 2))
  }

  const handleCancelEdit = () => {
    setEditingConfig(null)
    setEditValue('')
  }

  const handleSaveClick = () => {
    try {
      JSON.parse(editValue)
      setSaveDialogOpen(true)
    } catch (e) {
      handleApiError({ response: { data: { message: 'Invalid JSON format' } } })
    }
  }

  const handleSaveConfirm = async () => {
    setSaveDialogOpen(false)
    try {
      const parsedValue = JSON.parse(editValue)
      const response = await api.put(`/api/config/${editingConfig.config_key}`, {
        config_value: parsedValue,
      })

      if (response.data.success) {
        setSuccessMessage(`Configuration '${editingConfig.config_key}' updated successfully`)
        setEditingConfig(null)
        setEditValue('')
        fetchConfigs()
      }
    } catch (err) {
      handleApiError(err)
    }
  }

  const formatConfigValue = (value, isSensitive) => {
    if (isSensitive && !showSensitive) {
      return '••••••••'
    }

    if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length === 1 && 'value' in value) {
        return String(value.value)
      }

      if ('enabled' in value && Object.keys(value).length === 1) {
        return value.enabled ? '✓ Enabled' : '✗ Disabled'
      }

      if (Array.isArray(value)) {
        return value.join(', ')
      }

      return Object.entries(value)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return `${k}: ${JSON.stringify(v)}`
          }
          return `${k}: ${v}`
        })
        .join('\n')
    }

    return String(value)
  }

  const getCategoryColor = (category) => {
    const colors = {
      system: 'primary',
      workflow: 'success',
      numbering: 'info',
      vendor: 'warning',
      email: 'secondary',
      security: 'error',
      ui: 'info',
      integration: 'primary',
    }
    return colors[category] || 'primary'
  }

  // DataGrid columns — preserve all business logic, only make renderers/valueGetters safe
  const columns = [
    {
      field: 'config_key',
      headerName: 'Configuration Key',
      flex: 1.6,
      minWidth: 240,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {row.config_key}
            </Typography>
            {row.is_sensitive && <Chip label="Sensitive" size="small" color="error" />}
          </Box>
        )
      },
    },
    {
      field: 'config_value',
      headerName: 'Value',
      flex: 3,
      minWidth: 420,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params?.row ?? {}
        const isEditing = editingConfig?.config_key === row.config_key
        if (isEditing) {
          return (
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
          )
        }

        return (
          <Typography
            variant="body2"
            component="pre"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
            }}
          >
            {formatConfigValue(row.config_value, row.is_sensitive)}
          </Typography>
        )
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 240,
      renderCell: (params) => {
        const row = params?.row ?? {}
        return (
          <Typography variant="body2" color="text.secondary">
            {row.description || '-'}
          </Typography>
        )
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      minWidth: 140,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const row = params?.row ?? {}
        const key = row.config_key ?? params?.id
        const isEditing = editingConfig?.config_key === key

        if (isEditing) {
          return (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <IconButton size="small" color="primary" onClick={handleSaveClick}>
                <SaveIcon />
              </IconButton>
              <IconButton size="small" onClick={handleCancelEdit}>
                <CancelIcon />
              </IconButton>
            </Box>
          )
        }

        return (
          <IconButton size="small" color="primary" onClick={() => handleEdit(row)}>
            <EditIcon />
          </IconButton>
        )
      },
    },
  ]

  // rows -> use configs directly; DataGrid row id = config_key
  const rows = configs || []

  return (
    <ERPPage
      title="System Configuration"
      icon={<SettingsIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={showSensitive ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => {
              setShowSensitive(!showSensitive)
              setTimeout(() => fetchConfigs(), 100)
            }}
            color={showSensitive ? 'error' : 'inherit'}
          >
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>

          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchConfigs}>
            Refresh
          </Button>
        </Box>
      }
    >
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((cat) => (
            <Tab key={cat.value} label={cat.label} />
          ))}
        </Tabs>
      </Box>

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Paper sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <StripedDataGrid
              autoHeight
              rows={rows}
              columns={columns}
              getRowId={(row) => row.config_key}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              slots={{ toolbar: CustomToolbar }}
              density="comfortable"
              // simple row classname based on index for striping already handled by styled component
              getRowClassName={(params) => {
                const base = params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                return base
              }}
            />
          </Paper>

          {/* Info Box */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
            <Typography variant="caption" color="info.dark" display="block">
              💡 <strong>Note:</strong> Configuration changes take effect immediately. Cached values refresh every
              5 minutes.
            </Typography>
          </Box>
        </Box>
      )}

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
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1 }}>
              {editValue}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveConfirm}>
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
    </ERPPage>
  )
}

export default ConfigurationPage
