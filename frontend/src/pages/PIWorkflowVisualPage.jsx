import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material'
import {
  ArrowBack,
  Print,
  FileDownload
} from '@mui/icons-material'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import PIWorkflowVisualizer from '../components/PIWorkflowVisualizer'

const PIWorkflowVisualPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [piData, setPiData] = useState(null)

  useEffect(() => {
    if (id) {
      fetchPIData()
    }
  }, [id])

  const fetchPIData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get(`/api/pi/${id}`)
      if (response.data.success) {
        setPiData(response.data.data)
      } else {
        setError(response.data.message || 'Failed to load PI data')
      }
    } catch (err) {
      console.error('Error fetching PI data:', err)
      setError(err.response?.data?.message || 'Failed to load PI data')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    // TODO: Implement export to PDF functionality
    alert('Export to PDF functionality coming soon!')
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading PI data...
          </Typography>
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/pi')}
        >
          Back to PIs
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Home
        </MuiLink>
        <MuiLink component={Link} to="/pi" underline="hover" color="inherit">
          Proforma Invoices
        </MuiLink>
        {piData && (
          <MuiLink component={Link} to={`/pi/${id}`} underline="hover" color="inherit">
            {piData.pi_number}
          </MuiLink>
        )}
        <Typography color="text.primary">Workflow Visualization</Typography>
      </Breadcrumbs>

      {/* Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Document Workflow
          </Typography>
          {piData && (
            <Typography variant="body1" color="text.secondary">
              {piData.pi_number} - {piData.partner_vendor?.vendor_name}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/pi/${id}`)}
          >
            Back to PI
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* PI Context Card */}
      {piData && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            PI Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                PI Number
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {piData.pi_number}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Partner/Customer
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {piData.partner_vendor?.vendor_name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                PI Date
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {new Date(piData.pi_date).toLocaleDateString('en-IN')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Items
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {piData.items?.length || 0}
              </Typography>
            </Box>
          </Box>
          {piData.remarks && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Remarks
              </Typography>
              <Typography variant="body2">
                {piData.remarks}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Workflow Visualizer */}
      <Paper sx={{ p: 3 }}>
        <PIWorkflowVisualizer piId={id} piData={piData} />
      </Paper>
    </Container>
  )
}

export default PIWorkflowVisualPage
