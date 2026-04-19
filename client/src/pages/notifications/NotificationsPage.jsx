import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck, ChevronDown, Home, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi, { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import SelectMenu from '../../components/ui/SelectMenu'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import ThemeToggle from '../../components/ui/ThemeToggle'
import useTheme from '../../hooks/useTheme'
import { playNotificationSound } from '../../utils/notificationSound'
import { cn } from '../../utils/cn'

const formatDateTime = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function getNotifications({ page, priority, readStatus }) {
  const params = { page, limit: 12 }

  if (priority !== 'all') {
    params.priority = priority
  }

  if (readStatus === 'read') {
    params.isRead = true
  } else if (readStatus === 'unread') {
    params.isRead = false
  }

  const res = await clientApi.get('/notifications', { params })
  return res?.data?.data || { items: [], pagination: {} }
}

export default function NotificationsPage() {
  const LIVE_NOTIFICATION_POLL_INTERVAL = 15_000  // 15 seconds instead of 3 (to reduce server load)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const profileMenuRef = useRef(null)
  const previousUnreadCount = useRef(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [priority, setPriority] = useState('all')
  const [readStatus, setReadStatus] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [busyId, setBusyId] = useState(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [confirmState, setConfirmState] = useState({ open: false, type: null, id: null })

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['user-notifications', page, priority, readStatus],
    queryFn: () => getNotifications({ page, priority, readStatus }),
    refetchInterval: LIVE_NOTIFICATION_POLL_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
  })

  const { data: unreadTotalCount = 0 } = useQuery({
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

  const notifications = data?.items || []
  const sortedNotifications = useMemo(() => {
    const list = [...notifications]
    list.sort((a, b) => {
      const aTime = new Date(a.displayAt || a.sentAt || a.createdAt).getTime()
      const bTime = new Date(b.displayAt || b.sentAt || b.createdAt).getTime()
      return sortBy === 'latest' ? bTime - aTime : aTime - bTime
    })
    return list
  }, [notifications, sortBy])

  const pagination = data?.pagination || {}
  const total = pagination.total || 0
  const totalPages = Math.max(1, pagination.totalPages || 1)

  const pageUnreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications])

  const invalidateNotificationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread'] }),
    ])
  }

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const soundEnabled = Boolean(user?.preferences?.notificationSound)
    if (typeof unreadTotalCount !== 'number') return

    if (previousUnreadCount.current === null) {
      previousUnreadCount.current = unreadTotalCount
      return
    }

    const hasNewNotification = unreadTotalCount > previousUnreadCount.current
    previousUnreadCount.current = unreadTotalCount

    if (soundEnabled && hasNewNotification) {
      playNotificationSound()
    }
  }, [unreadTotalCount, user?.preferences?.notificationSound])

  const handleLogout = async () => {
    try {
      await authApi.post('/auth/logout')
    } catch {
      // Ignore API failure and continue local logout.
    }
    logout()
    toast.success('Logged out')
    navigate('/login', { replace: true })
  }

  const toggleReadState = async (item) => {
    try {
      setBusyId(item._id)
      if (item.isRead) {
        await clientApi.post(`/notifications/${item._id}/unread`)
        toast.success('Notification marked as unread')
      } else {
        await clientApi.post(`/notifications/${item._id}/read`)
        toast.success('Notification marked as read')
      }
      await invalidateNotificationQueries()
    } catch {
      toast.error('Unable to update notification state')
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true)
      await clientApi.post('/notifications/read-all')
      toast.success('All notifications marked as read')
      await invalidateNotificationQueries()
    } catch {
      toast.error('Failed to mark all notifications as read')
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleDeleteOne = async (id) => {
    try {
      setBusyId(id)
      await clientApi.post(`/notifications/${id}/delete`)
      toast.success('Notification deleted')
      await invalidateNotificationQueries()
    } catch {
      toast.error('Failed to delete notification')
    } finally {
      setBusyId(null)
      setConfirmState({ open: false, type: null, id: null })
    }
  }

  const handleDeleteAll = async () => {
    try {
      setIsMarkingAll(true)
      await clientApi.post('/notifications/delete-all')
      toast.success('All visible notifications deleted')
      await invalidateNotificationQueries()
    } catch {
      toast.error('Failed to delete notifications')
    } finally {
      setIsMarkingAll(false)
      setConfirmState({ open: false, type: null, id: null })
    }
  }

  const handlePriorityChange = (value) => {
    setPage(1)
    setPriority(value)
  }

  const handleReadStatusChange = (value) => {
    setPage(1)
    setReadStatus(value)
  }

  if (isLoading) {
    return <Loader label="Loading notifications" variant="generic" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6">
      <div className="mx-auto mb-5 flex w-full max-w-[1700px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Link to="/" className="btn-secondary h-9 px-3 text-xs">
            <Home size={14} />
            Home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">Inbox Workspace</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/40 bg-primary-500/10 text-primary-500"
            aria-label="Unread notifications"
          >
            <Bell size={18} />
            {unreadTotalCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadTotalCount > 99 ? '99+' : unreadTotalCount}
              </span>
            ) : null}
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="btn-secondary min-w-[190px] justify-between"
            >
              <span className="truncate text-left">{user?.name || user?.email || 'User menu'}</span>
              <ChevronDown size={14} className={cn('transition', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-soft">
                <button type="button" className="sidebar-item w-full" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button type="button" className="sidebar-item w-full" onClick={() => navigate('/profile')}>
                  Profile
                </button>
                <button type="button" className="sidebar-item w-full" onClick={() => navigate('/settings')}>
                  Settings
                </button>
                <button type="button" className="sidebar-item w-full" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1700px] space-y-5 px-1">
      <Card className="relative overflow-hidden border-primary-500/25 p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.32),transparent_42%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.2),transparent_40%),linear-gradient(130deg,#0f172a_0%,#111d34_48%,#0c2f3a_100%)]" />
        <div className="relative p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Bell size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">Inbox</p>
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Notifications</h1>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">Visible</p>
                <p className="mt-1 text-2xl font-bold leading-none">{total}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">Unread</p>
                <p className="mt-1 text-2xl font-bold leading-none">{unreadTotalCount}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">On Page</p>
                <p className="mt-1 text-2xl font-bold leading-none">{pageUnreadCount}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="label mb-0">Priority</span>
              <SelectMenu
                value={priority}
                onChange={handlePriorityChange}
                options={[
                  { label: 'All priorities', value: 'all' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' },
                ]}
              />
            </label>

            <label className="space-y-1">
              <span className="label mb-0">Read status</span>
              <SelectMenu
                value={readStatus}
                onChange={handleReadStatusChange}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Unread', value: 'unread' },
                  { label: 'Read', value: 'read' },
                ]}
              />
            </label>

            <label className="space-y-1">
              <span className="label mb-0">Sort</span>
              <SelectMenu
                value={sortBy}
                onChange={(value) => setSortBy(value)}
                options={[
                  { label: 'Latest first', value: 'latest' },
                  { label: 'Oldest first', value: 'oldest' },
                ]}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={invalidateNotificationQueries}
              disabled={isFetching}
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button type="button" className="btn-primary" onClick={handleMarkAllRead} disabled={isMarkingAll || total === 0}>
              <CheckCheck size={16} />
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={isMarkingAll || total === 0}
              onClick={() => setConfirmState({ open: true, type: 'deleteAll', id: null })}
            >
              <Trash2 size={16} />
              Delete all
            </button>
          </div>
        </div>
      </Card>

      {sortedNotifications.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)]">
            <BellRing size={22} className="text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 text-base font-semibold">No notifications found</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Try changing filters or check again later.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedNotifications.map((item) => {
            const isBusy = busyId === item._id

            return (
              <Card key={item._id} className={`p-4 sm:p-5 ${item.isRead ? 'opacity-85' : ''}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold sm:text-lg">{item.title || 'Announcement'}</h3>
                      {!item.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{item.message}</p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <p className="text-xs text-[var(--text-muted)]">{formatDateTime(item.displayAt || item.sentAt || item.createdAt)}</p>
                    <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={() => toggleReadState(item)} disabled={isBusy}>
                      {isBusy ? 'Updating...' : item.isRead ? 'Mark unread' : 'Mark read'}
                    </button>
                    <button
                      type="button"
                      className="btn-danger h-9 px-3 text-xs"
                      onClick={() => setConfirmState({ open: true, type: 'deleteOne', id: item._id })}
                      disabled={isBusy}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}

          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary h-9 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-soft">
            <h3 className="text-lg font-bold">Confirm action</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {confirmState.type === 'deleteAll'
                ? 'Are you sure you want to delete all visible notifications?'
                : 'Are you sure you want to delete this notification?'}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmState({ open: false, type: null, id: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirmState.type === 'deleteAll') {
                    handleDeleteAll()
                  } else if (confirmState.id) {
                    handleDeleteOne(confirmState.id)
                  }
                }}
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}
