import { useState, useEffect } from 'react'
import { Container, Typography, Paper, Grid, Box, CircularProgress } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const DashboardPage = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    vendors: 0,
    products: 0,
    openPOs: 0,
    pendingEOPAs: 0,
    totalPIs: 0,
    totalInvoices: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [vendorsRes, productsRes, posRes, eopasRes, pisRes, invoicesRes] = await Promise.all([
          api.get('/api/vendors/'),
          api.get('/api/products/medicines'),
          api.get('/api/po/'),
          api.get('/api/eopa/'),
          api.get('/api/pi/'),
          api.get('/api/invoice/')
        ])

        setStats({
          vendors: vendorsRes.data.success ? vendorsRes.data.data.length : 0,
          products: productsRes.data.success ? productsRes.data.data.length : 0,
          openPOs: posRes.data.success ? posRes.data.data.filter(po => po.status !== 'CLOSED').length : 0,
          pendingEOPAs: eopasRes.data.success ? eopasRes.data.data.filter(e => e.status === 'PENDING').length : 0,
          totalPIs: pisRes.data.success ? pisRes.data.data.length : 0,
          totalInvoices: invoicesRes.data.success ? invoicesRes.data.data.length : 0
        })
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4">
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.full_name || user?.username}!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Vendors
            </Typography>
            <Typography variant="h3">{stats.vendors}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Products
            </Typography>
            <Typography variant="h3">{stats.products}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Open POs
            </Typography>
            <Typography variant="h3">{stats.openPOs}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Pending EOPAs
            </Typography>
            <Typography variant="h3">{stats.pendingEOPAs}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              Proforma Invoices
            </Typography>
            <Typography variant="h3">{stats.totalPIs}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              Tax Invoices
            </Typography>
            <Typography variant="h3">{stats.totalInvoices}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No recent activity to display
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}

export default DashboardPage
