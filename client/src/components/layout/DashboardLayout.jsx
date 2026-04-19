import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  Users,
  MessageSquare,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi, { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { cn } from '../../utils/cn'
import useTheme from '../../hooks/useTheme'
import ThemeToggle from '../ui/ThemeToggle'
import brandLogo from '../../assets/favicon/web-app-manifest-512x512.png'
import { playNotificationSound } from '../../utils/notificationSound'
import usePlatformSettings from '../../hooks/usePlatformSettings'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Bots', href: '/bots', icon: Bot },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout() {
  const LIVE_NOTIFICATION_POLL_INTERVAL = 15_000  // 15 seconds instead of 3 (to reduce server load)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const previousUnreadCount = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const { user, token, isAuthenticated, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = usePlatformSettings()
  const onProfilePage = location.pathname.startsWith('/profile')
  const onDashboardPage = location.pathname.startsWith('/dashboard')

  const platformName = settings?.branding?.platformName || 'Lexio AI'
  const logoSrc = settings?.branding?.logoUrl || brandLogo

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['user-notifications-unread'],
    enabled: Boolean(isAuthenticated && token),
    queryFn: async () => {
      const res = await clientApi.get('/notifications/unread-count')
      return Number(res?.data?.data?.unreadCount || 0)
    },
    refetchInterval: isAuthenticated && token ? LIVE_NOTIFICATION_POLL_INTERVAL : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
  })

  const displayName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email?.split('@')?.[0] ||
    'User'

  const avatarInitial = (displayName || 'U').slice(0, 1).toUpperCase()

  useEffect(() => {
    const soundEnabled = Boolean(user?.preferences?.notificationSound)

    if (typeof unreadCount !== 'number') return

    if (previousUnreadCount.current === null) {
      previousUnreadCount.current = unreadCount
      return
    }

    const hasNewNotification = unreadCount > previousUnreadCount.current
    previousUnreadCount.current = unreadCount

    if (soundEnabled && hasNewNotification) {
      playNotificationSound()
    }
  }, [unreadCount, user?.preferences?.notificationSound])

  useEffect(() => {
    if (!isAuthenticated || !token) return

    let isMounted = true

    const syncCurrentUser = async () => {
      try {
        const res = await clientApi.get('/auth/me')
        const currentUser = res?.data?.data?.user
        if (isMounted && currentUser) {
          updateUser(currentUser)
        }
      } catch {
        // Silent fail because route guard already handles non-auth sessions.
      }
    }

    syncCurrentUser()

    const handleWindowFocus = () => {
      syncCurrentUser()
    }

    window.addEventListener('focus', handleWindowFocus)

    return () => {
      isMounted = false
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [isAuthenticated, token, updateUser])

  const handleLogout = async () => {
    try {
      await authApi.post('/auth/logout')
    } catch {
      // Ignore logout API errors and continue local logout.
    }
    logout()
    toast.success('Logged out')
    navigate('/login', { replace: true })
  }

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={cn(
        'flex w-72 flex-col border-r bg-[var(--sidebar-bg)] p-4',
        mobile ? 'h-full w-full' : 'sticky top-0 h-screen shrink-0',
      )}
    >
      <Link to="/dashboard" className="mb-6 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
        <img src={logoSrc} alt={platformName} className="h-9 w-9 rounded-lg object-cover" />
        <div>
          <p className="font-bold">{platformName}</p>
          <p className="text-xs text-[var(--text-muted)]">Client Dashboard</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {nav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => (isActive ? 'sidebar-item-active' : 'sidebar-item')}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 border-t pt-4">
        <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
          <div className="flex items-center gap-2">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-xs font-bold text-primary-500">
                {avatarInitial}
              </span>
            )}
            <p className="text-sm font-semibold">{displayName}</p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
          <p className="mt-1 text-xs text-primary-500">Plan: {user?.plan || 'free'}</p>
        </div>
        <button onClick={handleLogout} className="btn-danger w-full justify-center">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-72" onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card)]/85 px-4 backdrop-blur-xl">
          <button
            className="btn-secondary lg:hidden"
            onClick={() => {
              setProfileOpen(false)
              setMobileOpen(true)
            }}
          >
            <Menu size={16} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <button
              type="button"
              className={cn(
                'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
                location.pathname.startsWith('/notifications')
                  ? 'border-primary-500/40 bg-primary-500/10 text-primary-500'
                  : 'border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] hover:border-primary-400/50 hover:bg-primary-500/5',
              )}
              onClick={() => {
                setProfileOpen(false)
                navigate('/notifications')
              }}
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  setProfileOpen((v) => !v)
                }}
                className="btn-secondary min-w-[190px] justify-between"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-7 w-7 rounded-md object-cover" />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/15 text-[11px] font-bold text-primary-500">
                      {avatarInitial}
                    </span>
                  )}
                  <span className="truncate text-left">{displayName}</span>
                </span>
                <ChevronDown size={14} className={`transition ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-soft">
                  {!onProfilePage ? (
                    <button
                      type="button"
                      className="sidebar-item w-full"
                      onClick={() => {
                        setProfileOpen(false)
                        navigate('/profile')
                      }}
                    >
                      Profile
                    </button>
                  ) : null}
                  {!onDashboardPage ? (
                    <button
                      type="button"
                      className="sidebar-item w-full"
                      onClick={() => {
                        setProfileOpen(false)
                        navigate('/dashboard')
                      }}
                    >
                      Dashboard
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="sidebar-item w-full"
                    onClick={() => {
                      setProfileOpen(false)
                      handleLogout()
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
