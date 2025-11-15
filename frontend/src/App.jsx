import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CountriesPage from './pages/CountriesPage'
import VendorsPage from './pages/VendorsPage'
import ProductsPage from './pages/ProductsPage'
import PIPage from './pages/PIPage'
import EOPAPage from './pages/EOPAPage'
import POPage from './pages/POPage'
import MaterialPage from './pages/MaterialPage'
import PrivateRoute from './guards/PrivateRoute'
import Layout from './components/Layout'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route 
            path="countries" 
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <CountriesPage />
              </PrivateRoute>
            } 
          />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route 
            path="pi" 
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <PIPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="eopa" 
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <EOPAPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="po" 
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <POPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="material" 
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']}>
                <MaterialPage />
              </PrivateRoute>
            } 
          />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

export default App
