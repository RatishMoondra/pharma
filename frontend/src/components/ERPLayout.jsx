// src/components/ERPLayout.jsx
import React, { useState } from 'react'
import { Box, Drawer, useMediaQuery } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import ERPTopbar from './ERPTopbar'
import Sidebar from './Sidebar' // upgraded version (replace file)
import { Outlet } from 'react-router-dom'

const drawerWidth = 240
const collapsedWidth = 72

const Main = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(3),
}))

const ERPLayout = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={!isMobile || !collapsed}
        onClose={() => setCollapsed(true)}
        sx={{
          width: collapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? collapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create(['width', 'transform'], { duration: 200 }),
          },
        }}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </Drawer>

      {/* Page area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <ERPTopbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <Main component="main">
          <Outlet />
        </Main>
      </Box>
    </Box>
  )
}

export default ERPLayout
