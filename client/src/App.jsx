import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Loader from './components/ui/Loader'
import usePlatformSettings from './hooks/usePlatformSettings'

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'))
const LandingPage = lazy(() => import('./pages/public/LandingPage'))
const BlogPage = lazy(() => import('./pages/public/BlogPage'))
const BlogDetailPage = lazy(() => import('./pages/public/BlogDetailPage'))
const PricingPage = lazy(() => import('./pages/public/PricingPage'))
const TermsPage = lazy(() => import('./pages/public/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'))

const SetupGuide = lazy(() => import('./pages/public/SetupGuide'))
const HelpCenter = lazy(() => import('./pages/public/HelpCenter'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const GoogleSuccessPage = lazy(() => import('./pages/auth/GoogleSuccessPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const BotsPage = lazy(() => import('./pages/bots/BotsPage'))
const NewBotPage = lazy(() => import('./pages/bots/NewBotPage'))
const BotDetailPage = lazy(() => import('./pages/bots/BotDetailPage'))
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'))
const LeadsPage = lazy(() => import('./pages/leads/LeadsPage'))
const ConversationsPage = lazy(() => import('./pages/conversations/ConversationsPage'))
const BillingPage = lazy(() => import('./pages/billing/BillingPage'))
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const SupportTicketsPage = lazy(() => import('./pages/support-tickets/SupportTicketsPage'))
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage'))

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function RouteFallback() {
  return <Loader label="Loading page" variant="route" />
}

function GlobalPlatformBranding() {
  const { settings } = usePlatformSettings()

  useEffect(() => {
    const title =
      settings?.branding?.platformName ||
      settings?.general?.siteName ||
      'Lexio AI'

    document.title = title

    const faviconSource = settings?.branding?.faviconUrl || settings?.branding?.logoUrl
    if (faviconSource) {
      const cacheBustedFavicon = `${faviconSource}${faviconSource.includes('?') ? '&' : '?'}v=${encodeURIComponent(settings?.timestamp || '1')}`

      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      existingFavicons.forEach((linkEl) => {
        linkEl.setAttribute('href', cacheBustedFavicon)
        linkEl.setAttribute('data-platform-favicon', 'true')
      })

      // Ensure at least one plain rel="icon" exists for browsers that prioritize first-match.
      let primaryFavicon = document.querySelector('link[rel="icon"][data-platform-primary="true"]')
      if (!primaryFavicon) {
        primaryFavicon = document.createElement('link')
        primaryFavicon.setAttribute('rel', 'icon')
        primaryFavicon.setAttribute('type', 'image/png')
        primaryFavicon.setAttribute('data-platform-primary', 'true')
        document.head.appendChild(primaryFavicon)
      }
      primaryFavicon.setAttribute('href', cacheBustedFavicon)
    }

    if (settings?.branding?.primaryColor) {
      document.documentElement.style.setProperty('--platform-primary', settings.branding.primaryColor)

      const dynamicStyleId = 'dynamic-platform-primary-style'
      const dynamicCss = `
        .text-primary-500, .text-primary-400 { color: var(--platform-primary) !important; }
        .bg-primary-500, .bg-primary-400 { background-color: var(--platform-primary) !important; }
        .border-primary-500, .border-primary-400 { border-color: var(--platform-primary) !important; }
        .hover\\:text-primary-500:hover,
        .hover\\:text-primary-400:hover { color: var(--platform-primary) !important; }
        .hover\\:border-primary-500\\/50:hover,
        .hover\\:border-primary-400\\/60:hover { border-color: var(--platform-primary) !important; }
        .hover\\:bg-primary-500:hover { background-color: var(--platform-primary) !important; }
        .hover\\:bg-primary-600:hover,
        .hover\\:bg-primary-700:hover {
          background-color: color-mix(in srgb, var(--platform-primary) 90%, black 10%) !important;
        }
      `

      let styleEl = document.getElementById(dynamicStyleId)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = dynamicStyleId
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = dynamicCss
    }
    if (settings?.branding?.secondaryColor) {
      document.documentElement.style.setProperty('--platform-secondary', settings.branding.secondaryColor)
    }
    if (settings?.branding?.accentColor) {
      document.documentElement.style.setProperty('--platform-accent', settings.branding.accentColor)
    }
  }, [settings])

  return null
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <GlobalPlatformBranding />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup-guide" element={<SetupGuide />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />


        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/google/success" element={<GoogleSuccessPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bots" element={<BotsPage />} />
            <Route path="/bots/new" element={<NewBotPage />} />
            <Route path="/bots/:botId" element={<BotDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
