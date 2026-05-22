import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Pages
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ConfirmPage from './pages/ConfirmPage'
import DashboardLayout from './pages/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import BundlesPage from './pages/BundlesPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import WalletPage from './pages/WalletPage'
import ReferralsPage from './pages/ReferralsPage'
import ResellerPage from './pages/ResellerPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import WalletVerifyPage from './pages/WalletVerifyPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#070B14', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#3B82F6', fontSize:14 }}>Loading…</div>
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  return isAdmin ? children : <Navigate to="/dashboard" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public */}
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/auth/confirm" element={<ConfirmPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="bundles" element={<BundlesPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="wallet/verify" element={<WalletVerifyPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="reseller" element={<ResellerPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background:'#1A2235', color:'#EEF2FF', border:'1px solid #1C2E46', borderRadius:12 },
            success: { iconTheme: { primary:'#10B981', secondary:'#fff' } },
            error: { iconTheme: { primary:'#EF4444', secondary:'#fff' } },
            duration: 4000,
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
