import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi, { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import useTheme from '../../hooks/useTheme'
import ThemeToggle from '../ui/ThemeToggle'
import brandLogo from '../../assets/favicon/favicon-96x96.png'
import usePlatformSettings from '../../hooks/usePlatformSettings'

const LANDING_SECTION_HASHES = ['#features', '#platform', '#trust']

export default function PublicNavbar() {
  const LIVE_NOTIFICATION_POLL_INTERVAL = 15_000  // 15 seconds instead of 3 (to reduce server load)
  const [menuOpen, setMenuOpen] = useState(false)
  const [docsMenuOpen, setDocsMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileDocsOpen, setMobileDocsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const pendingSectionRef = useRef(null)
  const pendingSectionTimerRef = useRef(null)
  const { isAuthenticated, user, logout } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = usePlatformSettings()

  const platformName = settings?.branding?.platformName || 'Lexio AI'
  const logoSrc = settings?.branding?.logoUrl || brandLogo

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['user-notifications-unread'],
    enabled: Boolean(isAuthenticated),
    queryFn: async () => {
      const res = await clientApi.get('/notifications/unread-count')
      return Number(res?.data?.data?.unreadCount || 0)
    },
    refetchInterval: isAuthenticated ? LIVE_NOTIFICATION_POLL_INTERVAL : false,
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

  const isNavActive = ({ hash, path }) => {
    if (hash) {
      return location.pathname === '/' && activeSection === hash
    }
    if (path) {
      return location.pathname.startsWith(path)
    }
    return false
  }

  const desktopNavClass = (active) =>
    active
      ? 'relative rounded-lg bg-primary-500/14 px-3 py-1.5 text-primary-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35),0_12px_24px_-20px_rgba(99,102,241,0.85)] after:absolute after:-bottom-2 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-primary-500'
      : 'relative rounded-lg px-3 py-1.5 text-[var(--text-muted)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-500/8 hover:text-primary-500 hover:shadow-[0_14px_24px_-22px_rgba(99,102,241,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35'

  const pillNavClass = (active) =>
    active
      ? 'rounded-full bg-[var(--bg-card)] px-3.5 py-1.5 text-[13px] font-semibold text-primary-500 shadow-sm transition-all duration-200'
      : 'rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text)] hover:shadow-sm'

  const mobileNavClass = (active) =>
    active
      ? 'sidebar-item-active border border-primary-500/35 bg-primary-500/12 text-primary-500 shadow-[0_12px_24px_-20px_rgba(99,102,241,0.8)]'
      : 'sidebar-item transition-all duration-200 ease-out hover:border-primary-500/25 hover:bg-primary-500/8 hover:text-primary-500'

  useEffect(() => {
    setMenuOpen(false)
    setDocsMenuOpen(false)
    setMobileNavOpen(false)
    setMobileDocsOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      pendingSectionRef.current = null
      return
    }

    const resolveActiveSection = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0
      const topOffset = 140

      const sectionsWithTop = LANDING_SECTION_HASHES
        .map((sectionHash) => {
          const section = document.querySelector(sectionHash)
          if (!section) return null

          return {
            hash: sectionHash,
            top: section.getBoundingClientRect().top + scrollY - topOffset,
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.top - b.top)

      if (!sectionsWithTop.length) {
        setActiveSection('')
        return
      }

      if (pendingSectionRef.current) {
        setActiveSection(pendingSectionRef.current)
        return
      }

      if (scrollY < Math.max(80, sectionsWithTop[0].top)) {
        setActiveSection('')
        return
      }

      let currentSection = sectionsWithTop[0].hash
      for (const section of sectionsWithTop) {
        if (scrollY >= section.top) {
          currentSection = section.hash
        } else {
          break
        }
      }

      setActiveSection(currentSection)
    }

    resolveActiveSection()
    window.addEventListener('scroll', resolveActiveSection)
    window.addEventListener('resize', resolveActiveSection)

    return () => {
      window.removeEventListener('scroll', resolveActiveSection)
      window.removeEventListener('resize', resolveActiveSection)

      if (pendingSectionTimerRef.current) {
        window.clearTimeout(pendingSectionTimerRef.current)
        pendingSectionTimerRef.current = null
      }
    }
  }, [location.pathname, location.hash])

  const handleLogout = async () => {
    try {
      await authApi.post('/auth/logout')
    } catch {
      // Ignore logout API errors and continue local logout.
    }
    logout()
    setMenuOpen(false)
    setMobileNavOpen(false)
    toast.success('Logged out')
    navigate('/login', { replace: true })
  }

  const handleSectionNavigation = (hash) => {
    setMenuOpen(false)
    setDocsMenuOpen(false)
    setMobileNavOpen(false)
    setMobileDocsOpen(false)

    const targetHash = hash.startsWith('#') ? hash : `#${hash}`
    pendingSectionRef.current = targetHash

    if (pendingSectionTimerRef.current) {
      window.clearTimeout(pendingSectionTimerRef.current)
    }

    // Keep the clicked item active during smooth scroll to avoid mid-scroll flicker.
    pendingSectionTimerRef.current = window.setTimeout(() => {
      pendingSectionRef.current = null
      pendingSectionTimerRef.current = null
    }, 1200)

    setActiveSection(targetHash)

    const scrollToSection = () => {
      const section = document.querySelector(targetHash)
      if (!section) return false
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return true
    }

    navigate(
      { pathname: '/', hash: targetHash },
      { replace: location.pathname === '/' },
    )

    if (!scrollToSection()) {
      window.setTimeout(scrollToSection, 120)
    }
  }

  const handleRouteNavigation = () => {
    setMenuOpen(false)
    setDocsMenuOpen(false)
    setMobileNavOpen(false)
    setMobileDocsOpen(false)
  }

  const isDocsRouteActive =
    location.pathname.startsWith('/setup-guide') ||
    location.pathname.startsWith('/help-center')

  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-2.5 pb-1">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full border border-[var(--border)] bg-[var(--bg-card)]/80 px-5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.3)]">
          {/* Left — Logo */}
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
            <img src={logoSrc} alt={platformName} className="h-9 w-9 rounded-lg object-cover" />
            {platformName}
          </Link>

          {/* Center — Nav links inside a pill capsule */}
          <nav className="hidden items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-soft)]/60 px-1.5 py-1 text-sm font-medium lg:flex">
            <button type="button" className={pillNavClass(isNavActive({ hash: '#features' }))} onClick={() => handleSectionNavigation('#features')}>Features</button>
            <button type="button" className={pillNavClass(isNavActive({ hash: '#platform' }))} onClick={() => handleSectionNavigation('#platform')}>Platform</button>
            <button type="button" className={pillNavClass(isNavActive({ hash: '#trust' }))} onClick={() => handleSectionNavigation('#trust')}>Trust</button>

            {/* Docs Dropdown */}
            <div className="relative">
              <button
                type="button"
                className={pillNavClass(isDocsRouteActive)}
                onClick={() => {
                  setMenuOpen(false)
                  setDocsMenuOpen((v) => !v)
                }}
              >
                <span className="inline-flex items-center gap-1">
                  Docs
                  <ChevronDown size={13} className={`transition ${docsMenuOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              <div
                className={`absolute left-1/2 top-11 z-50 w-44 -translate-x-1/2 origin-top rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-soft transition-all duration-200 ${docsMenuOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'}`}
              >
                <Link to="/setup-guide" className="sidebar-item text-[13px]" onClick={handleRouteNavigation}>
                  Setup Guide
                </Link>
                <Link to="/help-center" className="sidebar-item text-[13px]" onClick={handleRouteNavigation}>
                  Help Center
                </Link>
              </div>
            </div>

            <Link to="/pricing" className={pillNavClass(isNavActive({ path: '/pricing' }))} onClick={handleRouteNavigation}>Pricing</Link>
          </nav>

          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <button
              type="button"
              className="btn-secondary px-2 lg:hidden"
              onClick={() => {
                setMenuOpen(false)
                setDocsMenuOpen(false)
                setMobileNavOpen((v) => !v)
              }}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn-secondary hidden lg:inline-flex">Login</Link>
                <Link to="/register" className="btn-primary hidden lg:inline-flex">Get Started</Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] transition hover:border-primary-400/50 hover:bg-primary-500/5 lg:inline-flex"
                  onClick={() => navigate('/notifications')}
                  aria-label="Open notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                <div className="relative hidden lg:block">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 text-sm font-semibold transition hover:border-primary-400/50 hover:bg-primary-500/5"
                    onClick={() => {
                      setDocsMenuOpen(false)
                      setMobileNavOpen(false)
                      setMenuOpen((v) => !v)
                    }}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="avatar" className="h-7 w-7 rounded-md object-cover" />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/15 text-[11px] font-bold text-primary-500">
                          {avatarInitial}
                        </span>
                      )}
                      <span className="hidden truncate text-left xl:block max-w-[120px]">{displayName}</span>
                    </span>
                    <ChevronDown size={14} className={`transition ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute right-0 top-12 z-50 w-48 origin-top-right rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-soft transition-all duration-200 ${menuOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'}`}
                  >
                    <Link to="/profile" className="sidebar-item" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    <Link to="/dashboard" className="sidebar-item" onClick={() => setMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <button type="button" className="sidebar-item w-full" onClick={handleLogout}>
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-black/45 transition-opacity duration-200 lg:hidden ${mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileNavOpen(false)}
      >
        <div
          className={`ml-auto h-full w-[86vw] max-w-[320px] border-l border-[var(--border)] bg-[var(--bg-card)] p-4 transition-transform duration-300 ${mobileNavOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-bold">Menu</p>
            <button type="button" className="btn-secondary px-2" onClick={() => setMobileNavOpen(false)}>
              <X size={14} />
            </button>
          </div>

          {isAuthenticated ? (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
              <div className="flex items-center gap-2">
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary-500/15 text-xs font-bold text-primary-500">
                    {avatarInitial}
                  </span>
                )}
                <p className="text-sm font-semibold">{displayName}</p>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{user?.email || 'Signed in user'}</p>
            </div>
          ) : null}

          <nav className="grid gap-1 text-sm font-semibold">
            {!isAuthenticated ? (
              <>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#features' }))} onClick={() => handleSectionNavigation('#features')}>Features</button>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#platform' }))} onClick={() => handleSectionNavigation('#platform')}>Platform</button>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#trust' }))} onClick={() => handleSectionNavigation('#trust')}>Trust</button>
                
                <button
                  type="button"
                  className={mobileNavClass(isDocsRouteActive)}
                  onClick={() => setMobileDocsOpen((v) => !v)}
                >
                  <span className="inline-flex items-center gap-2">
                    Docs
                    <ChevronDown size={14} className={`transition ${mobileDocsOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {mobileDocsOpen ? (
                  <div className="ml-3 grid gap-1">
                    <Link to="/setup-guide" className={mobileNavClass(isNavActive({ path: '/setup-guide' }))} onClick={handleRouteNavigation}>Setup Guide</Link>
                    <Link to="/help-center" className={mobileNavClass(isNavActive({ path: '/help-center' }))} onClick={handleRouteNavigation}>Help Center</Link>
                  </div>
                ) : null}

                <Link to="/blog" className={mobileNavClass(isNavActive({ path: '/blog' }))} onClick={handleRouteNavigation}>Blog</Link>
                <Link to="/pricing" className={mobileNavClass(isNavActive({ path: '/pricing' }))} onClick={handleRouteNavigation}>Pricing</Link>
              </>
            ) : (
              <>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#features' }))} onClick={() => handleSectionNavigation('#features')}>Features</button>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#platform' }))} onClick={() => handleSectionNavigation('#platform')}>Platform</button>
                <button type="button" className={mobileNavClass(isNavActive({ hash: '#trust' }))} onClick={() => handleSectionNavigation('#trust')}>Trust</button>
                
                <button
                  type="button"
                  className={mobileNavClass(isDocsRouteActive)}
                  onClick={() => setMobileDocsOpen((v) => !v)}
                >
                  <span className="inline-flex items-center gap-2">
                    Docs
                    <ChevronDown size={14} className={`transition ${mobileDocsOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {mobileDocsOpen ? (
                  <div className="ml-3 grid gap-1">
                    <Link to="/setup-guide" className={mobileNavClass(isNavActive({ path: '/setup-guide' }))} onClick={handleRouteNavigation}>Setup Guide</Link>
                    <Link to="/help-center" className={mobileNavClass(isNavActive({ path: '/help-center' }))} onClick={handleRouteNavigation}>Help Center</Link>
                  </div>
                ) : null}

                <Link to="/blog" className={mobileNavClass(isNavActive({ path: '/blog' }))} onClick={handleRouteNavigation}>Blog</Link>
                <Link to="/pricing" className={mobileNavClass(isNavActive({ path: '/pricing' }))} onClick={handleRouteNavigation}>Pricing</Link>
              </>
            )}

            {!isAuthenticated ? (
              <div className="mt-3 grid gap-2">
                <Link to="/login" className="btn-secondary" onClick={() => setMobileNavOpen(false)}>Login</Link>
                <Link to="/register" className="btn-primary" onClick={() => setMobileNavOpen(false)}>Get Started</Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                <Link to="/notifications" className="btn-secondary" onClick={() => setMobileNavOpen(false)}>Notifications</Link>
                <Link to="/profile" className="btn-secondary" onClick={() => setMobileNavOpen(false)}>Profile</Link>
                <Link to="/dashboard" className="btn-secondary" onClick={() => setMobileNavOpen(false)}>Dashboard</Link>
                <button type="button" className="btn-danger" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
