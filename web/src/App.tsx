import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'
import Vouchers from './pages/Vouchers'
import Damage from './pages/Damage'
import Reports from './pages/Reports'
import Approvals from './pages/Approvals'
import Admin from './pages/Admin'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sales" element={<Sales />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="vouchers" element={<Vouchers />} />
          <Route path="damage" element={<Damage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="approvals" element={
            <ProtectedRoute requiredRoles={['super_user', 'accounts_incharge']}>
              <Approvals />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute requiredRoles={['super_user']}>
              <Admin />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App