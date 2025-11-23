// src/components/ERPTopbar.jsx
import React from 'react'
import { AppBar, Toolbar, IconButton, Box, InputBase, Avatar, Menu, MenuItem, Tooltip, Badge } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo-pharmaflow.png'

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.06),
  '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.08) },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: { marginLeft: theme.spacing(1), width: 'auto' },
}))

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  paddingLeft: theme.spacing(5),
  width: 240,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: { width: 240 },
  },
}))

const ERPTopbar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth()
  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleOpenProfile = (e) => setAnchorEl(e.currentTarget)
  const handleCloseProfile = () => setAnchorEl(null)
  const handleLogout = () => { logout(); handleCloseProfile() }

  return (
    <AppBar position="sticky" color="transparent" elevation={1} sx={{ bgcolor: (t) => t.palette.background.paper }}>
      <Toolbar sx={{ minHeight: 56 }}>
        <IconButton edge="start" onClick={onToggle} size="large">
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
          <Box component="img" src={logo} alt="logo" sx={{ height: 36, cursor: 'pointer' }} />
        </Box>

        <Box sx={{ flexGrow: 1, ml: 2 }}>
          <Search>
            <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
            <StyledInputBase placeholder="Quick search EOPA, PI, Vendor..." inputProps={{ 'aria-label': 'search' }} />
          </Search>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Notifications">
            <IconButton><Badge badgeContent={3} color="error"><NotificationsIcon /></Badge></IconButton>
          </Tooltip>

          <Tooltip title={user?.full_name || 'Profile'}>
            <IconButton onClick={handleOpenProfile} size="large">
              <Avatar sx={{ width: 34, height: 34 }}>{(user?.full_name || 'U').charAt(0)}</Avatar>
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleCloseProfile}>
            <MenuItem onClick={handleCloseProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default ERPTopbar
