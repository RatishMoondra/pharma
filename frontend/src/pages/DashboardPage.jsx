import { Container, Typography, Paper, Grid, Box } from '@mui/material'
import { useAuth } from '../context/AuthContext'

const DashboardPage = () => {
  const { user } = useAuth()

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.full_name}!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Vendors
            </Typography>
            <Typography variant="h3">--</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Products
            </Typography>
            <Typography variant="h3">--</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Open POs
            </Typography>
            <Typography variant="h3">--</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Pending EOPAs
            </Typography>
            <Typography variant="h3">--</Typography>
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
