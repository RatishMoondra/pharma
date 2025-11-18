import { AppBar, Toolbar, Typography, Button, Box, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoutIcon from '@mui/icons-material/Logout'
import logo from '../assets/logo-pharmaflow.png'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLogoClick = () => {
    navigate('/dashboard')
  }

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <Tooltip title="PharmaFlow 360 - Go to Dashboard" arrow>
          <Box 
            component="img" 
            src={logo} 
            alt="PharmaFlow 360" 
            className="app-logo"
            onClick={handleLogoClick}
            sx={{ 
              mr: 2, 
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9,
                transform: 'scale(1.02)',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {user?.full_name} ({user?.role})
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
