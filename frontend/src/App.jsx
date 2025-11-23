import { Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline } from '@mui/material'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CountriesPage from './pages/CountriesPage'
import VendorsPage from './pages/VendorsPage'
import ProductsPage from './pages/ProductsPage'
import RawMaterialPage from './pages/RawMaterialPage'
import PackingMaterialPage from './pages/PackingMaterialPage'
import PIPage from './pages/PIPage'
import PIWorkflowVisualPage from './pages/PIWorkflowVisualPage'
import EOPAPage from './pages/EOPAPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import InvoicesPage from './pages/InvoicesPage'
import MaterialPage from './pages/MaterialPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ConfigurationPage from './pages/ConfigurationPage'
import TermsConditionsPage from './pages/TermsConditionsPage'
import PrivateRoute from './guards/PrivateRoute'
// import Layout from './components/Layout'
import ERPLayout from './components/ERPLayout'
import MedicinePage from './pages/MedicinePage'

import MaterialBalanceImpactPage from './pages/MaterialBalanceImpactPage'

function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <ERPLayout />
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
          <Route path="medicines" element={<MedicinePage />} />
          <Route path="raw-materials" element={<RawMaterialPage />} />
          <Route path="packing-materials" element={<PackingMaterialPage />} />
          <Route
            path="pi"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <PIPage />
              </PrivateRoute>
            }
          />
          <Route
            path="pi/:id/visual"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <PIWorkflowVisualPage />
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
            path="purchase-orders"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <PurchaseOrdersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT']}>
                <InvoicesPage />
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
          <Route
            path="analytics"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'PROCUREMENT_OFFICER', 'ACCOUNTANT']}>
                <AnalyticsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="configuration"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <ConfigurationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="terms-conditions"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <TermsConditionsPage />
              </PrivateRoute>
            }
          />
          <Route path="/material-balance-impact" element={<MaterialBalanceImpactPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
