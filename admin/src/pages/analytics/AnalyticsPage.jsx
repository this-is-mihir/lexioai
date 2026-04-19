import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, Users, Bot, MessageSquare, DollarSign,
  AlertTriangle, Activity, Calendar, X, ChevronDown,
  Shield, RefreshCw, Trash2, Loader2
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { CustomDatePicker } from '../../components/ui/CustomDatePicker'

// ----------------------------------------------------------------
// UTILS
// ----------------------------------------------------------------
const toISO  = (d) => new Date(d).toISOString().split('T')[0]
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'

const PRESETS = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '60D', days: 60  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
]

const mkRange = (days) => ({
  days,
  start: toISO(Date.now() - days * 86400000),
  end:   toISO(Date.now()),
})

// ----------------------------------------------------------------
// TOOLTIP
// ----------------------------------------------------------------
const Tip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {prefix}{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// STAT CARD
// ----------------------------------------------------------------
const StatCard = ({ label, value, sub, icon: Icon, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    violet:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--text)]">
          {value ?? <span className="text-[var(--border)]">—</span>}
        </p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const PIE_COLORS  = ['#6b7280', '#7F77DD', '#8b5cf6', '#f59e0b']
const AXIS_STYLE  = { fill: 'var(--text-muted)', fontSize: 11 }
const Skeleton    = ({ height = 220 }) => <div className="bg-[var(--bg-hover)] rounded-xl animate-pulse" style={{ height }} />
const Empty       = ({ msg = 'No data for this period' }) => (
  <div className="flex items-center justify-center py-14">
    <p className="text-sm text-[var(--text-muted)]">{msg}</p>
  </div>
)

// ----------------------------------------------------------------
// DATE RANGE PICKER
// ----------------------------------------------------------------
const DateRangePicker = ({ range, onChange }) => {
  const [open, setOpen]         = useState(false)
  const [localStart, setStart]  = useState(range.start)
  const [localEnd,   setEnd]    = useState(range.end)

  const applyCustom = () => {
    if (!localStart || !localEnd) return
    const days = Math.ceil((new Date(localEnd) - new Date(localStart)) / 86400000)
    onChange({ days, start: localStart, end: localEnd })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary flex items-center gap-2 text-sm h-9"
      >
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
        <span>{fmtDate(range.start)} – {fmtDate(range.end)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-2 z-30 w-60 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[var(--text)]">Custom Range</p>
                <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-3">
                <CustomDatePicker
                  value={localStart}
                  onChange={setStart}
                  label="From"
                  max={localEnd || undefined}
                />
                <CustomDatePicker
                  value={localEnd}
                  onChange={setEnd}
                  label="To"
                  min={localStart || undefined}
                  max={toISO(Date.now())}
                />
              </div>

              <button onClick={applyCustom} disabled={!localStart || !localEnd}
                className="btn-primary w-full justify-center text-sm h-9 mb-3 disabled:opacity-50">
                Apply
              </button>

              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick Select</p>
                <div className="grid grid-cols-5 gap-1">
                  {PRESETS.map(({ label, days }) => (
                    <button key={label}
                      onClick={() => { onChange(mkRange(days)); setOpen(false) }}
                      className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
                        range.days === days
                          ? 'bg-primary-500 text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ----------------------------------------------------------------
// MAIN PAGE
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// CONFIRM MODAL
// ----------------------------------------------------------------
const ConfirmModal = ({ modal, onClose, loading }) => {
  if (!modal) return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6"
      >
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 ${
          modal.danger ? 'bg-red-500/10' : 'bg-amber-500/10'
        }`}>
          <Trash2 className={`w-5 h-5 ${modal.danger ? 'text-red-400' : 'text-amber-400'}`} />
        </div>

        <h3 className="text-base font-semibold text-[var(--text)] text-center mb-2">{modal.title}</h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-6">{modal.message}</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={() => { modal.onConfirm(); onClose() }}
            disabled={loading}
            className={`flex-1 justify-center ${modal.danger ? 'btn-danger' : 'bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {modal.danger ? 'Delete All' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

export default function AnalyticsPage() {
  const { admin } = useAuthStore()
  const isSuperAdmin = admin?.role === 'superadmin'
  const queryClient  = useQueryClient()

  const [range, setRange] = useState(mkRange(30))
  const [confirmModal, setConfirmModal] = useState(null) // { title, message, onConfirm }

  // ── Dashboard (always current, no date filter) ──
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['analytics-dash'],
    queryFn:  async () => { const r = await adminApi.get('/stats/dashboard'); return r.data.data },
    refetchInterval: 60000,
  })

  // ── Revenue (always current MRR, but daily chart is date-filtered) ──
  const { data: rev, isLoading: revLoading } = useQuery({
    queryKey: ['analytics-revenue', range.start, range.end],
    queryFn:  async () => {
      const r = await adminApi.get(`/stats/revenue?startDate=${range.start}&endDate=${range.end}`)
      return r.data.data
    },
  })

  // ── User Growth — DATE FILTERED via startDate/endDate ──
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['analytics-growth', range.start, range.end],
    queryFn:  async () => {
      const r = await adminApi.get(
        `/stats/user-growth?startDate=${range.start}&endDate=${range.end}`
      )
      return r.data.data
    },
  })

  // ── Activity Feed ──
  const { data: actData, isLoading: actLoading } = useQuery({
    queryKey: ['analytics-feed'],
    queryFn:  async () => { const r = await adminApi.get('/stats/activity-feed?limit=30'); return r.data.data },
    refetchInterval: 30000,
  })

  // ── Suspicious ──
  const { data: suspData, isLoading: suspLoading } = useQuery({
    queryKey: ['analytics-suspicious'],
    queryFn:  async () => { const r = await adminApi.get('/stats/suspicious'); return r.data.data },
    refetchInterval: 60000,
  })

  // ── Delete Activity Feed mutation ──
  const deleteFeedMut = useMutation({
    mutationFn: (olderThan) =>
      adminApi.delete(`/stats/activity-feed${olderThan ? `?olderThan=${olderThan}` : ''}`),
    onSuccess: (_, olderThan) => {
      toast.success(olderThan ? `Feed cleared (older than ${olderThan} days)!` : 'Feed fully cleared!')
      queryClient.invalidateQueries({ queryKey: ['analytics-feed'] })
    },
    onError: () => toast.error('Failed to clear feed'),
  })

  // ── Derived ──
  const plans = dash?.planBreakdown || dash?.users?.planBreakdown || {}
  const planPie = [
    { name: 'Free',     value: plans.free     || 0 },
    { name: 'Starter',  value: plans.starter  || 0 },
    { name: 'Pro',      value: plans.pro      || 0 },
    { name: 'Business', value: plans.business || 0 },
  ].filter(p => p.value > 0)

  // growth: [{date, count}] → [{date(short), users}]
  const growthChart = (growthData?.growth || []).map(g => ({
    date:  g.date.slice(5),
    users: g.count,
  }))

  // revenue daily chart
  const revChart = (rev?.daily || []).map(d => ({
    date:    d.date.slice(5),
    revenue: d.revenue,
  }))
  console.log("FEED DATA:", actData);

  const feed = actData?.feed || actData?.events || []
  const ipAbuse = suspData?.ipAbuse   || []
  const recentBans = suspData?.recentBans || []

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Analytics</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Showing data for <span className="text-primary-400 font-medium">{fmtDate(range.start)} – {fmtDate(range.end)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset pills */}
          <div className="flex gap-1">
            {PRESETS.map(({ label, days }) => (
              <button key={label} onClick={() => setRange(mkRange(days))}
                className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                  range.days === days
                    ? 'bg-primary-500 text-white'
                    : 'bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {/* Custom date picker */}
          <DateRangePicker range={range} onChange={setRange} />
        </div>
      </div>

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={dashLoading ? null : dash?.totalUsers?.toLocaleString() ?? dash?.users?.total?.toLocaleString()}
          sub={`+${dash?.newUsersToday ?? dash?.users?.today ?? 0} today`}
          icon={Users} color="primary"
        />
        <StatCard
          label="Total Bots"
          value={dashLoading ? null : dash?.totalBots?.toLocaleString() ?? dash?.bots?.total?.toLocaleString()}
          sub={`${dash?.liveBots ?? dash?.bots?.live ?? 0} live`}
          icon={Bot} color="violet"
        />
        <StatCard
          label="Total Chats"
          value={dashLoading ? null : dash?.totalChats?.toLocaleString() ?? dash?.chats?.total?.toLocaleString()}
          sub={`${dash?.chatsThisMonth ?? dash?.chats?.thisMonth ?? 0} this month`}
          icon={MessageSquare} color="blue"
        />
        <StatCard
          label="MRR"
          value={revLoading ? null : `₹${(rev?.mrr || 0).toLocaleString()}`}
          sub={`ARR: ₹${((rev?.mrr || 0) * 12).toLocaleString()}`}
          icon={DollarSign} color="emerald"
        />
      </div>

      {/* ── User Growth Area Chart (DATE FILTERED) ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[var(--text)]">User Growth</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              New signups — {fmtDate(range.start)} to {fmtDate(range.end)}
            </p>
          </div>
          {growthLoading && <RefreshCw className="w-4 h-4 text-[var(--text-muted)] animate-spin" />}
        </div>
        {growthLoading ? <Skeleton /> : growthChart.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthChart}>
              <defs>
                <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7F77DD" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7F77DD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="users" name="New Users"
                stroke="#7F77DD" strokeWidth={2} fill="url(#ugGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Revenue Chart (DATE FILTERED) + Plan Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue bar chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text)]">Revenue</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                New subscriptions — {fmtDate(range.start)} to {fmtDate(range.end)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">MRR</p>
              <p className="font-bold text-[var(--text)]">₹{(rev?.mrr || 0).toLocaleString()}</p>
            </div>
          </div>
          {revLoading ? <Skeleton height={200} /> : revChart.length === 0 || revChart.every(d => d.revenue === 0) ? (
            <Empty msg="No new subscriptions in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<Tip prefix="₹" />} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Per-plan breakdown */}
          {rev?.breakdown && Object.keys(rev.breakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
              {['business','pro','starter'].map(plan => {
                const d = rev.breakdown[plan]
                if (!d) return null
                const maxRev = Math.max(...Object.values(rev.breakdown).map(x => x.revenue || 0))
                const pct = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0
                const clr = { starter: 'bg-primary-500', pro: 'bg-violet-500', business: 'bg-amber-500' }
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-muted)] capitalize">{plan} ({d.users} users)</span>
                      <span className="font-semibold text-[var(--text)]">₹{d.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${clr[plan]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Plan Pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-[var(--text)] mb-4">Plan Breakdown</h2>
          {dashLoading ? <Skeleton height={200} /> : planPie.length === 0 ? <Empty msg="No users yet" /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={planPie} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                    paddingAngle={3} dataKey="value">
                    {planPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Users']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {planPie.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-[var(--text-muted)] capitalize">{p.name}</span>
                    </div>
                    <span className="font-semibold text-[var(--text)]">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Daily Signups Bar (DATE FILTERED) ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[var(--text)]">Daily Signups</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {fmtDate(range.start)} to {fmtDate(range.end)}
            </p>
          </div>
          {growthLoading && <RefreshCw className="w-4 h-4 text-[var(--text-muted)] animate-spin" />}
        </div>
        {growthLoading ? <Skeleton /> : growthChart.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={growthChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="users" name="Signups" fill="#7F77DD" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Activity Feed + Suspicious ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Activity Feed */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--text)]">Activity Feed</h2>
              <Activity className="w-4 h-4 text-[var(--text-muted)]" />
            </div>

            {/* Delete — SuperAdmin only */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfirmModal({
                    title: 'Clear Old Entries',
                    message: 'Delete all activity feed entries older than 7 days? This cannot be undone.',
                    onConfirm: () => deleteFeedMut.mutate(7),
                  })}
                  disabled={deleteFeedMut.isPending}
                  className="btn-secondary py-1 px-2.5 text-xs text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                  title="Clear older than 7 days"
                >
                  {deleteFeedMut.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  7d+
                </button>
                <button
                  onClick={() => setConfirmModal({
                    title: 'Clear All Activity',
                    message: 'Permanently delete the entire activity feed? This cannot be undone.',
                    danger: true,
                    onConfirm: () => deleteFeedMut.mutate(null),
                  })}
                  disabled={deleteFeedMut.isPending}
                  className="btn-danger py-1 px-2.5 text-xs"
                  title="Clear all feed"
                >
                  {deleteFeedMut.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  All
                </button>
              </div>
            )}
          </div>

          {actLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-hover)] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-[var(--bg-hover)] rounded w-4/5" />
                    <div className="h-3 bg-[var(--bg-hover)] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <Empty msg="No recent activity" />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {feed.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base shrink-0 mt-0.5 select-none">{e.icon || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] leading-snug">
                      {e.message || e.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(e.time || e.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short', timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspicious Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text)]">Suspicious Activity</h2>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>

          {suspLoading ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-[var(--bg-hover)] rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {suspData?.alerts?.length > 0 && (
                <div className="space-y-1.5">
                  {suspData.alerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {ipAbuse.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">IP Abuse</p>
                  <div className="space-y-1.5">
                    {ipAbuse.slice(0, 4).map((ip, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--bg-hover)] rounded-xl">
                        <p className="text-xs font-mono text-[var(--text)]">{ip._id}</p>
                        <span className="badge-danger text-xs">{ip.count} accounts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentBans.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent Bans</p>
                  <div className="space-y-1.5">
                    {recentBans.map((u, i) => (
                      <div key={i} className="p-2.5 bg-[var(--bg-hover)] rounded-xl">
                        <p className="text-xs font-medium text-[var(--text)]">{u.email}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{u.bannedReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!suspData?.alerts?.length && !ipAbuse.length && !recentBans.length && (
                <div className="py-8 text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                  <p className="text-sm text-[var(--text-muted)]">No suspicious activity</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={(dash?.totalLeads ?? dash?.leads?.total)?.toLocaleString()}
          sub={`${dash?.leadsThisMonth ?? dash?.leads?.thisMonth ?? 0} this month`}
          icon={TrendingUp} color="amber"
        />
        <StatCard
          label="Paid Users"
          value={((plans.starter||0)+(plans.pro||0)+(plans.business||0)).toLocaleString()}
          sub="Starter + Pro + Business"
          icon={DollarSign} color="emerald"
        />
        <StatCard
          label="Chats This Month"
          value={(dash?.chatsThisMonth ?? dash?.chats?.thisMonth)?.toLocaleString()}
          icon={MessageSquare} color="blue"
        />
        <StatCard
          label="Users This Week"
          value={(dash?.newUsersWeek ?? dash?.users?.thisWeek)?.toLocaleString()}
          icon={Users} color="violet"
        />
      </div>


      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal
            modal={confirmModal}
            onClose={() => setConfirmModal(null)}
            loading={deleteFeedMut.isPending}
          />
        )}
      </AnimatePresence>

    </div>
  )
}