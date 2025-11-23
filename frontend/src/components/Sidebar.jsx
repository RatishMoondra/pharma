// src/components/Sidebar.jsx
import React from 'react'
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Tooltip, Typography, IconButton } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo-pharmaflow.png'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import InventoryIcon from '@mui/icons-material/Inventory'
import ScienceIcon from '@mui/icons-material/Science'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import DescriptionIcon from '@mui/icons-material/Description'
import ApprovalIcon from '@mui/icons-material/Approval'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ReceiptIcon from '@mui/icons-material/Receipt'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import ArticleIcon from '@mui/icons-material/Article'
import BalanceIcon from '@mui/icons-material/Balance'

const drawerWidth = 240
const collapsedWidth = 72

const Sidebar = ({ collapsed = false, onToggle = () => {} }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'], section: 'main' },
    { text: 'Countries', icon: <PublicIcon />, path: '/countries', roles: ['ADMIN'], section: 'main' },
    { text: 'Vendors', icon: <PeopleIcon />, path: '/vendors', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'main' },
    { text: 'Products', icon: <InventoryIcon />, path: '/products', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'main' },
    { text: 'Medicine', icon: <InventoryIcon />, path: '/medicines', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'main' },
    { text: 'Raw Materials', icon: <ScienceIcon />, path: '/raw-materials', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'master' },
    { text: 'Packing Materials', icon: <Inventory2Icon />, path: '/packing-materials', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'master' },
    { text: 'Proforma Invoice (PI)', icon: <DescriptionIcon />, path: '/pi', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'EOPA', icon: <ApprovalIcon />, path: '/eopa', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'Purchase Orders (Merged)', icon: <ShoppingCartIcon />, path: '/purchase-orders', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'Invoices', icon: <ReceiptIcon />, path: '/invoices', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'], section: 'workflow' },
    { text: 'Analytics & Insights', icon: <AssessmentIcon />, path: '/analytics', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'], section: 'analytics' },
    { text: 'Material Balance Impact', icon: <BalanceIcon />, path: '/material-balance-impact', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'], section: 'analytics' },
    { text: 'System Configuration', icon: <SettingsIcon />, path: '/configuration', roles: ['ADMIN'], section: 'admin' },
    { text: 'Terms & Conditions', icon: <ArticleIcon />, path: '/terms-conditions', roles: ['ADMIN'], section: 'admin' },
  ]

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role)
  )

  const sections = {
    main: filteredMenuItems.filter(item => item.section === 'main'),
    master: filteredMenuItems.filter(item => item.section === 'master'),
    workflow: filteredMenuItems.filter(item => item.section === 'workflow'),
    analytics: filteredMenuItems.filter(item => item.section === 'analytics'),
    admin: filteredMenuItems.filter(item => item.section === 'admin'),
  }

  const renderList = (items) => (
    <List>
      {items.map((item) => {
        const active = location.pathname === item.path
        return (
          <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              selected={active}
              onClick={() => navigate(item.path)}
              sx={{
                py: 1,
                borderRadius: 1,
                '&.Mui-selected': { bgcolor: 'action.selected' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, justifyContent: 'center' }}>
                <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
                  <Box>{item.icon}</Box>
                </Tooltip>
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )

  return (
    <Box sx={{ width: collapsed ? collapsedWidth : drawerWidth, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        p: 2,
        bgcolor: 'primary.main',
        minHeight: 64
      }}>
        <Box component="img" src={logo} alt="logo" sx={{ height: collapsed ? 28 : 32, cursor: 'pointer' }} onClick={() => navigate('/dashboard')} />
        {!collapsed && (
          <IconButton onClick={onToggle} sx={{ color: 'white' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        {collapsed && (
          <IconButton onClick={onToggle} sx={{ color: 'white' }}>
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      {sections.main.length > 0 && renderList(sections.main)}
      {sections.master.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
            {!collapsed && <Typography variant="caption" color="text.secondary" fontWeight="bold">MASTER DATA</Typography>}
          </Box>
          {renderList(sections.master)}
        </>
      )}

      {sections.workflow.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
            {!collapsed && <Typography variant="caption" color="text.secondary" fontWeight="bold">WORKFLOW</Typography>}
          </Box>
          {renderList(sections.workflow)}
        </>
      )}

      {sections.analytics.length > 0 && (
        <>
          <Divider />
          {renderList(sections.analytics)}
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      {sections.admin.length > 0 && (
        <>
          <Divider />
          {renderList(sections.admin)}
        </>
      )}
    </Box>
  )
}

export default Sidebar
