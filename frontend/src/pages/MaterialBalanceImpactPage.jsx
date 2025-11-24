import React, { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'

import DeleteIcon from '@mui/icons-material/Delete'
import InventoryIcon from '@mui/icons-material/Inventory'

import { alpha, styled } from '@mui/material/styles'
import {
  DataGrid,
  gridClasses,
  GridToolbar,
  GridToolbarContainer,
} from '@mui/x-data-grid'

import ERPPage from '../components/ERPPage'
import api from '../services/api'
import { useApiError } from '../hooks/useApiError'


/* -------------------------------------------
   ERP Striped DataGrid
-------------------------------------------- */
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
  // Color coding for negative/positive stock
  [`& .${gridClasses.row}.negative-stock`]: {
    backgroundColor: '#ffebee', // light red
    '&:hover': {
      backgroundColor: '#ffcdd2',
    },
  },
  [`& .${gridClasses.row}.positive-stock`]: {
    backgroundColor: '#e8f5e9', // light green
    '&:hover': {
      backgroundColor: '#c8e6c9',
    },
  },
}))

const CustomToolbar = () => (
  <GridToolbarContainer sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <GridToolbar />
  </GridToolbarContainer>
)


/* -------------------------------------------
       MAIN COMPONENT
-------------------------------------------- */

const MaterialBalanceImpactPage = () => {
  const [loading, setLoading] = useState(true)
  const [impacts, setImpacts] = useState([])
  const [filterType, setFilterType] = useState('ALL') // ALL | RM | PM
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const { error, handleApiError, clearError } = useApiError()

  useEffect(() => {
    fetchMaterialBalanceImpact()
  }, [])

  const fetchMaterialBalanceImpact = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/material-balance/all')
      console.log(res.data)
      if (res.data) {
        setImpacts(res.data)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    try {
      const res = await api.delete(`/api/material-balance/${id}`)
      if (res.data.success) {
        setImpacts(prev => prev.filter(i => i.id !== id))
        setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' })
      }
    } catch (err) {
      handleApiError(err)
      setSnackbar({ open: true, message: 'Delete failed', severity: 'error' })
    }
  }

  /* -------------------------------------------
      FILTERED DATA BY MATERIAL TYPE
  -------------------------------------------- */
  const filteredRows = useMemo(() => {
    if (filterType === 'ALL') return impacts
    if (filterType === 'RM') return impacts.filter(i => i.material_type === 'RM')
    if (filterType === 'PM') return impacts.filter(i => i.material_type === 'PM')
    return impacts
  }, [impacts, filterType])

  /* -------------------------------------------
      DATAGRID COLUMNS WITH PROPER MATERIAL NAMES
  -------------------------------------------- */
  const columns = [
    { field: 'material_code', headerName: 'Material Code', flex: 1 },
    { field: 'material_name', headerName: 'Material Name', flex: 1.5 },

    {
      field: 'material_type',
      headerName: 'Type',
      flex: 0.7,
      renderCell: (params) =>
        params.row.material_type === 'RM' ? 'Raw Material' : 'Packing Material',
    },

    { 
      field: 'ordered_qty', 
      headerName: 'Ordered Qty', 
      flex: 0.8,
      type: 'number',
      valueFormatter: (params) => params.value?.toFixed(2) || '0.00'
    },
    { 
      field: 'received_qty', 
      headerName: 'Received Qty', 
      flex: 0.8,
      type: 'number',
      valueFormatter: (params) => params.value?.toFixed(2) || '0.00'
    },
    { 
      field: 'balance_qty', 
      headerName: 'Balance Qty', 
      flex: 0.8,
      type: 'number',
      valueFormatter: (params) => params.value?.toFixed(2) || '0.00',
      renderCell: (params) => {
        const balance = params.value || 0
        const isNegative = balance < 0
        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              px: 1,
              fontWeight: isNegative ? 'bold' : 'normal',
              color: isNegative ? '#d32f2f' : '#2e7d32'
            }}
          >
            {balance.toFixed(2)}
          </Box>
        )
      }
    },

    {
      field: 'reference_document',
      headerName: 'Reference Document',
      flex: 1.2,
    },

    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
          onClick={() => handleDelete(params.row.id)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <ERPPage
      title="Material Balance Impact"
      icon={<InventoryIcon sx={{ fontSize: 36, color: 'primary.main' }} />}
      actions={
        <Button variant="outlined" onClick={fetchMaterialBalanceImpact}>
          Refresh
        </Button>
      }
    >
      {/* ---------------------------------------
           SEGMENTED FILTER BUTTON GROUP
      ---------------------------------------- */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start' }}>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={(e, v) => v && setFilterType(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '6px !important',
              px: 2.5,
            },
          }}
        >
          <ToggleButton value="ALL">All Materials</ToggleButton>
          <ToggleButton value="RM">Raw Only</ToggleButton>
          <ToggleButton value="PM">Packing Only</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ---------------------------------------
           LOADING
      ---------------------------------------- */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', p: 1 }}>
          <StripedDataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            slots={{ toolbar: CustomToolbar }}
            density="comfortable"
            getRowClassName={(params) => {
              const balance = params.row.balance_qty || 0
              if (balance < 0) return 'negative-stock'
              if (balance > 0) return 'positive-stock'
              return params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
            }}
          />
        </Paper>
      )}

      {/* ---------------------------------------
           FEEDBACK MESSAGES
      ---------------------------------------- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* API error from useApiError */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
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

export default MaterialBalanceImpactPage
