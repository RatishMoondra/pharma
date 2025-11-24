import { useState, useEffect } from 'react'
import { Container, Typography, Paper, Grid, Box, CircularProgress } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

import StoreIcon from '@mui/icons-material/Store'
import CategoryIcon from '@mui/icons-material/Category'
import InventoryIcon from '@mui/icons-material/Inventory2'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import ReceiptIcon from '@mui/icons-material/ReceiptLong'
import LocalAtmIcon from '@mui/icons-material/LocalAtm'

const DashboardPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  const dashboardItems = [
    {
      label: 'Vendors',
      value: stats.vendors,
      icon: <StoreIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      route: '/vendors'
    },
    {
      label: 'Products',
      value: stats.products,
      icon: <CategoryIcon sx={{ fontSize: 40 }} />,
      color: 'secondary.main',
      route: '/products'
    },
    {
      label: 'Open POs',
      value: stats.openPOs,
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      route: '/purchase-orders'
    },
    {
      label: 'Pending EOPAs',
      value: stats.pendingEOPAs,
      icon: <PendingActionsIcon sx={{ fontSize: 40 }} />,
      color: 'error.main',
      route: '/eopa'
    },
    {
      label: 'Proforma Invoices',
      value: stats.totalPIs,
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      route: '/pi'
    },
    {
      label: 'Tax Invoices',
      value: stats.totalInvoices,
      icon: <LocalAtmIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      route: '/invoices'
    }
  ]

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.full_name || user?.username}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {dashboardItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.label}>
            <Paper
              onClick={() => navigate(item.route)}
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: 6,
                  bgcolor: 'grey.100'
                }
              }}
              elevation={4}
            >
              <Box sx={{ color: item.color, mb: 1 }}>
                {item.icon}
              </Box>
              <Typography variant="h6" sx={{ color: item.color }}>
                {item.label}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {item.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
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
