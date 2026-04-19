import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Bot, MessageSquare, BarChart3,
  CreditCard, Tag, Megaphone, TicketCheck, Settings,
  FileText, Key, ScrollText, Shield, LogOut, Menu,
  Moon, Sun, Search, ChevronRight
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { filterNavByPermissions } from '../../utils/permissions'
import adminApi from '../../api/axios'
import toast from 'react-hot-toast'
import NotificationsPopover from '../ui/NotificationsPopover'

// ----------------------------------------------------------------
// THEME HOOK
// ----------------------------------------------------------------
const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  return { theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }
}

// ----------------------------------------------------------------
// NAV CONFIG
// ----------------------------------------------------------------
const navItems = [
  {
    section: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    ]
  },
  {
    section: 'Management',
    items: [
      { path: '/users', icon: Users, label: 'Users' },
      { path: '/bots', icon: Bot, label: 'Bots' },
      { path: '/conversations', icon: MessageSquare, label: 'Conversations' },
    ]
  },
  {
    section: 'Business',
    items: [
      { path: '/plans', icon: CreditCard, label: 'Plans' },
      { path: '/coupons', icon: Tag, label: 'Coupons' },
      { path: '/announcements', icon: Megaphone, label: 'Announcements' },
      { path: '/tickets', icon: TicketCheck, label: 'Support Tickets' },
    ]
  },
  {
    section: 'System',
    items: [
      { path: '/blog', icon: FileText, label: 'Blog' },
      { path: '/ai-keys', icon: Key, label: 'AI Keys' },
      { path: '/audit', icon: ScrollText, label: 'Audit Logs' },
      { path: '/admins', icon: Shield, label: 'Admins' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

// ----------------------------------------------------------------
// SIDEBAR NAV — defined outside to prevent remount on state change
// ----------------------------------------------------------------
const SidebarNav = ({ collapsed, onItemClick, filteredNavItems }) => {
  const itemsToShow = filteredNavItems || navItems
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
      {itemsToShow.map((section) => (
      <div key={section.section}>
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-1"
            >
              {section.section}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="space-y-0.5">
          {section.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onItemClick}
              className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item'}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-[.sidebar-item-active]:opacity-100 text-primary-400" />
              )}
            </NavLink>
          ))}
        </div>
      </div>
    ))}
  </nav>
  )
}

// ----------------------------------------------------------------
// MAIN LAYOUT
// ----------------------------------------------------------------
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarScrollPos, setSidebarScrollPos] = useState(0) // Save scroll position
  const { admin, logout, adminType } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: platformSettings } = useQuery({
    queryKey: ['admin-layout-platform-settings'],
    queryFn: async () => {
      const res = await adminApi.get('/settings')
      return res?.data?.data?.settings || null
    },
    staleTime: 60_000,
  })

  const platformName = platformSettings?.branding?.platformName || 'Lexioai'

  // Set page title based on admin type
  useEffect(() => {
    if (adminType === 'support') {
      document.title = `${platformName} Support`;
    } else {
      document.title = `${platformName} Admin`;
    }
  }, [adminType, platformName]);

  // Save sidebar scroll position before permissions update
  useEffect(() => {
    const sidebar = document.querySelector('nav.flex-1.overflow-y-auto')
    if (sidebar) {
      setSidebarScrollPos(sidebar.scrollTop)
    }
  }, [admin?.permissions]) // Save position when permissions change

  // Restore sidebar scroll position after permissions updated
  useEffect(() => {
    const sidebar = document.querySelector('nav.flex-1.overflow-y-auto')
    if (sidebar && sidebarScrollPos > 0) {
      sidebar.scrollTop = sidebarScrollPos
    }
  }, [sidebarScrollPos])

  // Scroll active nav item into view when ROUTE changes (not permission changes)
  useEffect(() => {
    setTimeout(() => {
      const activeNav = document.querySelector('.sidebar-item-active')
      if (activeNav) {
        activeNav.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [location.pathname])

  const handleLogout = async () => {
    try { await adminApi.post('/auth/logout') } catch {}
    logout()
    toast.success('Logged out')
    // Redirect based on admin type — stay on correct portal
    const redirectPath = adminType === 'admin' ? '/admin/login' : '/support/login'
    navigate(redirectPath, { replace: true })
  }

  // Filter nav items based on user permissions
  const filteredNavItems = filterNavByPermissions(navItems, admin)

  const SidebarContent = ({ mobile = false }) => {
    const width = mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'
    return (
      <div className={`flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] ${width} transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--sidebar-border)]">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {(!collapsed || mobile) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden">
                <p className="font-bold text-sm text-[var(--text)]">{platformName}</p>
                <p className="text-xs text-[var(--text-muted)]">Admin Panel</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!mobile && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0">
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <SidebarNav
          filteredNavItems={filteredNavItems}
          collapsed={collapsed && !mobile}
          onItemClick={() => mobile && setMobileOpen(false)}
        />

        {/* User footer */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <div
            onClick={() => { navigate('/profile'); mobile && setMobileOpen(false) }}
            className={`flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${collapsed && !mobile ? 'justify-center' : ''}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
              {admin?.avatar
                ? <img src={admin.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                : <span className="text-xs font-bold text-primary-400">{admin?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
              }
            </div>
            <AnimatePresence>
              {(!collapsed || mobile) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text)] truncate">{admin?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{admin?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(!collapsed || mobile) && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); handleLogout() }}
                  className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 rounded"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">

      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <SidebarContent mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center gap-3 px-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text)]">
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search..." className="input pl-9 py-1.5 text-sm h-9 w-full" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationsPopover />
            
            {/* Admin Profile Button — No Switcher */}
            <button 
              onClick={() => navigate('/profile')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] cursor-pointer hover:border-primary-500/50 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                {admin?.avatar ? (
                  <img src={admin.avatar} alt={admin.name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-primary-400">{admin?.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs font-medium text-[var(--text)]">{admin?.name}</span>
              <span className={`badge text-[10px] capitalize font-semibold ${adminType === 'admin' ? 'badge-primary' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                {adminType || 'admin'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content — Outlet renders the matched child route */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

      </div>
    </div>
  )
}