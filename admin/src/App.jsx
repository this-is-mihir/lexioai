import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import usePermissionSync from './hooks/usePermissionSync'
import { canAccessPage } from './utils/permissions'
import LoginPage from './pages/auth/LoginPage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/dashboard/DashboardPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import UsersPage from './pages/users/UsersPage'
import BotsPage from './pages/bots/BotsPage'
import ConversationsPage from './pages/conversations/ConversationsPage'
import PlansPage from './pages/plans/PlansPage'
import CouponsPage from './pages/coupons/CouponsPage'
import AnnouncementsPage from './pages/announcements/AnnouncementsPage'
import TicketsPage from './pages/tickets/TicketsPage'
import BlogPage from './pages/blog/BlogPage'
import AIKeysPage from './pages/settings/AIKeysPage'
import AuditPage from './pages/audit/AuditPage'
import AdminsPage from './pages/admins/AdminsPage'
import SettingsPage from './pages/settings/SettingsPage'
import ProfilePage from './pages/profile/ProfilePage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// ----------------------------------------------------------------
// Protected Route — redirects to appropriate login based on adminType
// ----------------------------------------------------------------
const ProtectedRoute = () => {
  const { isAuthenticated, adminType, isInitialized } = useAuthStore()
  
  // Don't render anything while initializing - prevent premature redirects
  if (!isInitialized) {
    return <div className="h-screen flex items-center justify-center bg-[var(--bg)]" />
  }
  
  if (!isAuthenticated) {
    const loginPath = adminType === 'support' ? '/support/login' : '/admin/login'
    return <Navigate to={loginPath} replace />
  }
  return <Outlet />
}

// ----------------------------------------------------------------
// Protected Page Route — Checks page-level permissions
// ----------------------------------------------------------------
const ProtectedPageRoute = ({ pageName, element }) => {
  const { admin } = useAuthStore()
  
  if (!canAccessPage(admin, pageName)) {
    return <Navigate to="/" replace />
  }
  
  return element
}

// ----------------------------------------------------------------
// 404 Page
// ----------------------------------------------------------------
const NotFound = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <p className="text-6xl font-bold text-[var(--border)]">404</p>
      <p className="text-[var(--text-muted)] mt-2">Page not found</p>
    </div>
  </div>
)

// ----------------------------------------------------------------
// App
// ----------------------------------------------------------------
export default function App() {
  const { initAuth } = useAuthStore()
  
  // Start syncing admin permissions from server every 30 seconds
  usePermissionSync()

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <Routes>
      {/* Public — Multiple login routes for different admin types */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/support/login" element={<LoginPage />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/support/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected — all routes inside DashboardLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="bots" element={<BotsPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="ai-keys" element={<AIKeysPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          {/* <Route path="*" element={<NotFound />} /> */}
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}