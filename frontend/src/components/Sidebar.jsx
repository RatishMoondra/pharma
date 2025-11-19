import { Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, Typography, Box, Tooltip } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import InventoryIcon from '@mui/icons-material/Inventory'
import ScienceIcon from '@mui/icons-material/Science'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import DescriptionIcon from '@mui/icons-material/Description'
import ApprovalIcon from '@mui/icons-material/Approval'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptIcon from '@mui/icons-material/Receipt'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArticleIcon from '@mui/icons-material/Article'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo-pharmaflow.png'

const drawerWidth = 240

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'], section: 'main' },
    { text: 'Countries', icon: <PublicIcon />, path: '/countries', roles: ['ADMIN'], section: 'main' },
    { text: 'Vendors', icon: <PeopleIcon />, path: '/vendors', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'main' },
    { text: 'Products', icon: <InventoryIcon />, path: '/products', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'main' },
    { text: 'Raw Materials', icon: <ScienceIcon />, path: '/raw-materials', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'master' },
    { text: 'Packing Materials', icon: <Inventory2Icon />, path: '/packing-materials', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'master' },
    { text: 'Proforma Invoice (PI)', icon: <DescriptionIcon />, path: '/pi', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'EOPA', icon: <ApprovalIcon />, path: '/eopa', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'Purchase Orders (Merged)', icon: <ShoppingCartIcon />, path: '/purchase-orders', roles: ['ADMIN', 'PROCUREMENT_OFFICER'], section: 'workflow' },
    { text: 'Invoices', icon: <ReceiptIcon />, path: '/invoices', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'], section: 'workflow' },
    { text: 'Material Management', icon: <LocalShippingIcon />, path: '/material', roles: ['ADMIN', 'WAREHOUSE_MANAGER'], section: 'workflow' },
    { text: 'Analytics & Insights', icon: <AssessmentIcon />, path: '/analytics', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'], section: 'analytics' },
    { text: 'System Configuration', icon: <SettingsIcon />, path: '/configuration', roles: ['ADMIN'], section: 'admin' },
    { text: 'Terms & Conditions', icon: <ArticleIcon />, path: '/terms-conditions', roles: ['ADMIN'], section: 'admin' },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  )

  // Group menu items by section
  const sections = {
    main: filteredMenuItems.filter(item => item.section === 'main'),
    master: filteredMenuItems.filter(item => item.section === 'master'),
    workflow: filteredMenuItems.filter(item => item.section === 'workflow'),
    analytics: filteredMenuItems.filter(item => item.section === 'analytics'),
    admin: filteredMenuItems.filter(item => item.section === 'admin'),
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Logo Section */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'primary.main',
          minHeight: 64
        }}
      >
        <Tooltip title="PharmaFlow 360" arrow placement="right">
          <Box 
            component="img" 
            src={logo} 
            alt="PharmaFlow 360" 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              height: 32,
              objectFit: 'contain',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9,
                transform: 'scale(1.05)',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </Tooltip>
      </Box>
      <Divider />
      
      {/* Main Section */}
      {sections.main.length > 0 && (
        <List>
          {sections.main.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Master Data Section */}
      {sections.master.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              MASTER DATA
            </Typography>
          </Box>
          <List>
            {sections.master.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Workflow Section */}
      {sections.workflow.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              WORKFLOW
            </Typography>
          </Box>
          <List>
            {sections.workflow.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Analytics Section */}
      {sections.analytics.length > 0 && (
        <>
          <Divider />
          <List>
            {sections.analytics.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Admin Section */}
      {sections.admin.length > 0 && (
        <>
          <Divider />
          <List>
            {sections.admin.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Drawer>
  )
}

export default Sidebar
