import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BadgeCheck, Bell, Camera, ChevronDown, Home, LockKeyhole, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react'
import clientApi, { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ThemeToggle from '../../components/ui/ThemeToggle'
import useTheme from '../../hooks/useTheme'

export default function ProfilePage() {
  const LIVE_NOTIFICATION_POLL_INTERVAL = 15_000  // 15 seconds instead of 3 (to reduce server load)
  const { theme, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState({})
  const profileMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const onProfilePage = location.pathname.startsWith('/profile')
  const onDashboardPage = location.pathname.startsWith('/dashboard')
  const onSettingsPage = location.pathname.startsWith('/settings')

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['user-notifications-unread'],
    queryFn: async () => {
      const res = await clientApi.get('/notifications/unread-count')
      return Number(res?.data?.data?.unreadCount || 0)
    },
    refetchInterval: LIVE_NOTIFICATION_POLL_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    const load = async () => {
      const res = await clientApi.get('/user/profile')
      const current = res?.data?.data?.user || {}
      setProfile({
        firstName: current.firstName || '',
        lastName: current.lastName || '',
        username: current.username || '',
        professionalTitle: current.professionalTitle || '',
        bio: current.bio || '',
        website: current.website || '',
        timezone: current.timezone || 'Asia/Kolkata',
        phone: current.phone?.number || '',
      })
    }

    load()
  }, [])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const profileCompletion = useMemo(() => {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.username,
      profile.professionalTitle,
      profile.bio,
      profile.website,
      profile.phone,
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }, [profile])

  const completionTag = profileCompletion >= 80 ? 'Excellent' : profileCompletion >= 50 ? 'Good' : 'Needs work'

  const saveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await clientApi.put('/user/profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        professionalTitle: profile.professionalTitle,
        bio: profile.bio,
        website: profile.website,
        timezone: profile.timezone,
        phone: { countryCode: '+91', number: profile.phone },
      })
      updateUser(res?.data?.data?.user || {})
      toast.success('Profile updated successfully')
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be less than 2MB')
      return
    }
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await clientApi.post('/user/avatar', formData)
      updateUser({ avatar: res?.data?.data?.avatar })
      toast.success('Avatar updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.post('/auth/logout')
    } catch {
      // Ignore logout API errors and continue local logout.
    }
    setProfileOpen(false)
    logout()
    toast.success('Logged out')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6">
      <div className="mx-auto mb-5 flex w-full max-w-[1700px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Link to="/" className="btn-secondary h-9 px-3 text-xs">
            <Home size={14} />
            Home
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">Account</p>
            <p className="text-sm text-[var(--text-muted)]">Profile workspace</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] transition hover:border-primary-400/50 hover:bg-primary-500/5"
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

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="btn-secondary min-w-[150px] justify-between sm:min-w-[190px]"
            >
              <span className="truncate text-left">{user?.name || user?.email || 'User menu'}</span>
              <ChevronDown size={14} className={`transition ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-soft">
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
                {!onSettingsPage ? (
                  <button
                    type="button"
                    className="sidebar-item w-full"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/settings')
                    }}
                  >
                    Settings
                  </button>
                ) : null}
                <button type="button" className="sidebar-item w-full" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-1">
        <section className="card overflow-hidden p-0">
          <div className="bg-[radial-gradient(circle_at_20%_20%,rgba(127,119,221,0.28),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(245,158,11,0.18),transparent_40%),linear-gradient(135deg,#101827_0%,#111a2a_100%)] p-6 text-white md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserRound size={28} />
                    </div>
                  )}
                  <label className={`absolute bottom-1 right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/90 text-black transition-opacity ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}>
                    {uploading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Camera size={13} />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                  </label>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Profile</p>
                  <h1 className="text-2xl font-extrabold md:text-3xl">{user?.name || 'User Account'}</h1>
                  <p className="text-sm text-white/80">{user?.email}</p>
                </div>
              </div>

              <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wider text-white/70">Profile Completion</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-3xl font-extrabold">{profileCompletion}%</p>
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold">{completionTag}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[var(--text-muted)]">Identity</p>
            <p className="mt-2 text-lg font-bold">{profile.firstName || user?.name || 'Not set'}</p>
            <p className="text-xs text-[var(--text-muted)]">Public display on account-level interactions</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[var(--text-muted)]">Security</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-bold"><LockKeyhole size={16} className="text-primary-500" /> Protected</p>
            <p className="text-xs text-[var(--text-muted)]">Session, OTP, and account controls active</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.13em] text-[var(--text-muted)]">Trust Score</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-bold"><BadgeCheck size={16} className="text-primary-500" /> {completionTag}</p>
            <p className="text-xs text-[var(--text-muted)]">Higher completion improves account trust signals</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="p-6">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
              <div className="md:col-span-2">
                <p className="text-lg font-bold">Public Profile Details</p>
                <p className="text-sm text-[var(--text-muted)]">This information is used for your account identity, widget ownership, and brand visibility.</p>
              </div>

              <Input label="First Name" value={profile.firstName || ''} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
              <Input label="Last Name" value={profile.lastName || ''} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
              <Input label="Username" value={profile.username || ''} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
              <Input label="Professional Title" value={profile.professionalTitle || ''} onChange={(e) => setProfile((p) => ({ ...p, professionalTitle: e.target.value }))} />
              <Input label="Website" value={profile.website || ''} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))} />
              <Input label="Phone" value={profile.phone || ''} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              <Input label="Timezone" value={profile.timezone || ''} onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))} />

              <div className="md:col-span-2">
                <label>
                  <span className="label">Bio</span>
                  <textarea
                    className="input min-h-[120px]"
                    value={profile.bio || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Short introduction about your business or role"
                  />
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <p className="text-lg font-bold">Trust Signals</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Professional account completeness boosts brand trust.</p>

            <div className="mt-5 space-y-3">
              {[
                'Profile image uploaded',
                'Brand website configured',
                'Contact number verified',
                'Professional bio ready',
                'Timezone and identity complete',
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck size={16} className="text-primary-500" />
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
