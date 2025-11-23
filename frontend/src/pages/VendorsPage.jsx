import { useState, useEffect, useMemo } from 'react'
import {
  Typography,
  Button,
  Box,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Tooltip, 
  Link, 
  TextField, 
  InputAdornment, 
} from '@mui/material'
const ynh=10
import { 
  DataGrid, 
  GridToolbar, 
  GridToolbarContainer, 
  gridClasses 
} from '@mui/x-data-grid' 

import { alpha, styled } from '@mui/material/styles';

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CallIcon from '@mui/icons-material/Call'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import MailOutlineIcon from '@mui/icons-material/MailOutline'; 
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SearchIcon from '@mui/icons-material/Search';

import VendorForm from '../components/VendorForm'
import api from '../services/api'
// 🟢 FIX: Added missing imports for custom hooks
import { useApiError } from '../hooks/useApiError' 
import { useStableRowEditing } from '../hooks/useStableRowEditing' 

const ODD_OPACITY = 0.2;

// 1. STYLED COMPONENT (Striping + Header Styling)
const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: 'background.default', 
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
  },
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[50],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
      '@media (hover: none)': { backgroundColor: 'transparent' },
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
        '@media (hover: none)': {
          backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY + theme.palette.action.selectedOpacity),
        },
      },
    },
  },
}));

// 2. SIMPLIFIED CUSTOM TOOLBAR (No QuickFilter here)
function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 1, display: 'flex', justifyContent: 'flex-start', borderBottom: '1px solid #e0e0e0' }}>
      <GridToolbar />
    </GridToolbarContainer>
  );
}

// 3. CUSTOM NO ROWS OVERLAY
function CustomNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" color="text.secondary">No Vendors Found</Typography>
      <Typography variant="body2" color="text.secondary">Try adjusting your search terms.</Typography>
    </Box>
  );
}

const VendorsPage = () => {
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editingVendor, setEditingVendor] = useState(null)
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
    } = useStableRowEditing()

    const getVendorTypeColor = (type) => {
        const colors = { PARTNER: 'primary', RM: 'success', PM: 'warning', MANUFACTURER: 'info' }
        return colors[type] || 'default'
    }

    const filteredVendors = useMemo(() => {
        if (!searchQuery) return vendors;

        const query = searchQuery.toLowerCase();
        return vendors.filter(vendor => 
            vendor.vendor_name?.toLowerCase().includes(query) ||
            vendor.vendor_code?.toLowerCase().includes(query) ||
            vendor.vendor_type?.toLowerCase().includes(query) ||
            vendor.contact_person?.toLowerCase().includes(query) ||
            vendor.phone?.toLowerCase().includes(query) ||
            vendor.email?.toLowerCase().includes(query) ||
            vendor.country?.country_code?.toLowerCase().includes(query) ||
            vendor.credit_days?.toString().includes(query)
        );
    }, [vendors, searchQuery]);


    const COLUMNS = useMemo(() => [
        {
            field: 'actions',
            headerName: 'Actions',
            minWidth: 100, 
            sortable: false,
            filterable: false,
            align: 'center',
            headerAlign: 'center',
            flex: 0.8,
            renderCell: (params) => (
                <Box>
                    <IconButton size="small" onClick={() => handleOpenForm(params.row)} color="primary">
                        <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
        { 
            field: 'vendor_name', 
            headerName: 'Vendor Name', 
            minWidth: 180, 
            flex: 1.5,     
            editable: false,
            align: 'left',
            headerAlign: 'left',
        },
        { 
            field: 'vendor_type', 
            headerName: 'Type', 
            minWidth: 100, 
            flex: 0.8,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={getVendorTypeColor(params.value)}
                    size="small"
                    variant="outlined" 
                />
            ),
        },
        { 
            field: 'country', 
            headerName: 'Country', 
            minWidth: 100, 
            flex: 1,
            align: 'left',
            headerAlign: 'left',
            valueGetter: (value, row) => row.country?.country_code,
            renderCell: (params) => params.row.country ? (
                <Chip
                    label={`${params.row.country.country_code}`}
                    size="small"
                    sx={{ bgcolor: 'transparent', border: '1px solid #e0e0e0' }} 
                />
            ) : ('-'),
        },
        { 
            field: 'contact_person', 
            headerName: 'Contact', 
            minWidth: 120, 
            flex: 1,
            align: 'left',
            headerAlign: 'left',
        },
        { 
            field: 'phone', 
            headerName: 'Phone', 
            minWidth: 160, 
            flex: 1.2,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => {
                const phoneNumber = params.value;
                if (!phoneNumber) return '-';
                const normalizedPhone = phoneNumber.replace(/\D/g, ''); 
                
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, height: '100%' }}>
                        <Typography variant="body2" sx={{ mr: 1, fontSize: '0.85rem' }}>{phoneNumber}</Typography>
                        <Tooltip title="Call">
                            <IconButton size="small" component="a" href={`tel:${normalizedPhone}`} color="primary">
                                <CallIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="WhatsApp">
                            <IconButton 
                                size="small" 
                                component="a" 
                                href={`https://wa.me/${normalizedPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: '#25D366' }} 
                            >
                                <WhatsAppIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            }
        },
        { 
            field: 'email', 
            headerName: 'Email', 
            minWidth: 180, 
            flex: 1.5,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => {
                if (!params.value) return '-';
                return (
                    <Link 
                        href={`mailto:${params.value}`} 
                        underline="hover" 
                        sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', '&:hover': { color: 'primary.main' }, width: '100%', height: '100%' }}
                    >
                        <Typography variant="body2" noWrap sx={{ maxWidth: '150px', mr: 0.5 }}>
                            {params.value}
                        </Typography>
                        <MailOutlineIcon fontSize="small" color="action" sx={{ fontSize: 16 }} />
                    </Link>
                );
            }
        },
        { 
            field: 'certifications', 
            headerName: 'Cert.', 
            minWidth: 100, 
            sortable: false,
            filterable: false,
            flex: 1,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
                    {params.row.gmp_certified && (
                        <Tooltip title="GMP Certified">
                            <CheckCircleIcon color="success" fontSize="small" />
                        </Tooltip>
                    )}
                    {params.row.iso_certified && (
                        <Tooltip title="ISO Certified">
                            <CheckCircleIcon color="info" fontSize="small" />
                        </Tooltip>
                    )}
                    {!params.row.gmp_certified && !params.row.iso_certified && <Typography variant="caption" color="text.secondary">-</Typography>}
                </Box>
            ),
        },
        { 
            field: 'credit_days', 
            headerName: 'Credit', 
            minWidth: 80, 
            flex: 0.8,
            align: 'left',
            headerAlign: 'left',
            renderCell: (params) => {
                const val = Number(params.value);
                if (params.value === null || params.value === undefined || isNaN(val)) {
                    return <Typography variant="body2" color="text.secondary">-</Typography>;
                }
                
                const isHighRisk = val > 60;
                
                return (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontWeight: isHighRisk ? 'bold' : 'normal',
                            color: isHighRisk ? 'error.main' : 'text.primary'
                        }}
                    >
                        {val} d
                    </Typography>
                );
            }
        },
    ], []) 

    const fetchVendors = async () => {
        try {
            setLoading(true)
            const response = await api.get('/api/vendors/')
            if (response.data.success) {
                const dataWithId = response.data.data.map(v => ({ ...v, id: v.id }));
                setVendors(dataWithId)
            }
        } catch (err) {
            handleApiError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVendors()
    }, [])

    const handleOpenForm = (vendor = null) => {
        setEditingVendor(vendor)
        setFormOpen(true)
        if (vendor) {
            openEditForm(vendor.id)
        }
    }

    const handleCloseForm = () => {
        setFormOpen(false)
        setEditingVendor(null)
        closeEditForm()
    }

    const handleSubmit = async (formData) => {
        try {
            setSubmitting(true)
            clearError()

            if (editingVendor) {
                const response = await api.put(`/api/vendors/${editingVendor.id}`, formData)
                if (response.data.success) {
                    const updatedVendor = response.data.data
                    setVendors(prevVendors => updateDataStably(prevVendors, updatedVendor))
                    setSuccessMessage('Vendor updated successfully')
                    markAsSaved(editingVendor.id)
                    handleCloseForm()
                }
            } else {
                const response = await api.post('/api/vendors/', formData)
                if (response.data.success) {
                    const newVendor = { ...response.data.data, id: response.data.data.id } 
                    setVendors(prevVendors => addDataStably(prevVendors, newVendor, true))
                    setSuccessMessage('Vendor created successfully')
                    markAsSaved(newVendor.id)
                    handleCloseForm()
                }
            }
        } catch (err) {
            handleApiError(err)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (vendorId) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) {
            return
        }

        try {
            const response = await api.delete(`/api/vendors/${vendorId}`)
            if (response.data.success) {
                setVendors(prevVendors => removeDataStably(prevVendors, vendorId))
                setSuccessMessage('Vendor deleted successfully')
            }
        } catch (err) {
            handleApiError(err)
        }
    }

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Vendors</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenForm()}
                >
                    Add Vendor
                </Button>
            </Box>
            
            <TextField
                fullWidth
                placeholder="Global Search (Name, Code, Contact, etc.)"
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

            <Box sx={{ minHeight: 'calc(100vh - 200px)', width: '100%' }}>
                <StripedDataGrid
                    loading={loading}
                    rows={filteredVendors} 
                    columns={COLUMNS}
                    initialState={{
                        pagination: { 
                            paginationModel: { pageSize: 25 }, 
                        },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    disableRowSelectionOnClick
                    
                    slots={{ 
                        toolbar: CustomToolbar,
                        noRowsOverlay: CustomNoRowsOverlay
                    }}
                    
                    density="comfortable" 
                    getRowClassName={(params) =>
                        params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
                    }
                />
            </Box>

            <VendorForm
                open={formOpen}
                onClose={handleCloseForm}
                onSubmit={handleSubmit}
                vendor={editingVendor}
                isLoading={submitting}
            />

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
        </Box>
    )
}

export default VendorsPage