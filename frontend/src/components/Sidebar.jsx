import { Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
import ApprovalIcon from '@mui/icons-material/Approval'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptIcon from '@mui/icons-material/Receipt'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useAuth } from '../context/AuthContext'

const drawerWidth = 240

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'] },
    { text: 'Countries', icon: <PublicIcon />, path: '/countries', roles: ['ADMIN'] },
    { text: 'Vendors', icon: <PeopleIcon />, path: '/vendors', roles: ['ADMIN', 'PROCUREMENT_OFFICER'] },
    { text: 'Products', icon: <InventoryIcon />, path: '/products', roles: ['ADMIN', 'PROCUREMENT_OFFICER'] },
    { text: 'Proforma Invoice (PI)', icon: <DescriptionIcon />, path: '/pi', roles: ['ADMIN', 'PROCUREMENT_OFFICER'] },
    { text: 'EOPA', icon: <ApprovalIcon />, path: '/eopa', roles: ['ADMIN', 'PROCUREMENT_OFFICER'] },
    { text: 'Purchase Orders', icon: <ShoppingCartIcon />, path: '/po', roles: ['ADMIN', 'PROCUREMENT_OFFICER'] },
    { text: 'Invoices', icon: <ReceiptIcon />, path: '/invoices', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'] },
    { text: 'Material Management', icon: <LocalShippingIcon />, path: '/material', roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
    { text: 'Analytics & Insights', icon: <AssessmentIcon />, path: '/analytics', roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT'] },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  )

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
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
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
    </Drawer>
  )
}

export default Sidebar
