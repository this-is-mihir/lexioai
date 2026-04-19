import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowRight, Bot, ChartNoAxesCombined, CircleDollarSign, MessagesSquare } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import clientApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import StatsCard from '../../components/ui/StatsCard'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

async function getBots() {
  const res = await clientApi.get('/bots')
  return res?.data?.data?.bots || []
}

async function getDashboardStats() {
  const res = await clientApi.get('/analytics/dashboard')
  return res?.data?.data || {}
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  
  // Check if current plan has access to detailed analytics
  const canAccessDetailedAnalytics = user?.plan !== 'free'
  
  const { data: bots = [], isLoading: botsLoading } = useQuery({ queryKey: ['dashboard-bots'], queryFn: getBots })
  const { data: dashboardStats = {}, isLoading: statsLoading } = useQuery({ queryKey: ['analytics-dashboard'], queryFn: getDashboardStats })

  const recentBot = bots[0]

  const [{ data: graphData = [] }, { data: leadsData = [] }] = useQueries({
    queries: [
      {
        queryKey: ['bot-graph', recentBot?._id],
        enabled: Boolean(recentBot?._id) && canAccessDetailedAnalytics,
        queryFn: async () => {
          const res = await clientApi.get(`/analytics/${recentBot._id}/chats-graph?period=30d`)
          return res?.data?.data?.graphData || []
        },
      },
      {
        queryKey: ['recent-leads', recentBot?._id],
        enabled: Boolean(recentBot?._id),
        queryFn: async () => {
          const res = await clientApi.get(`/leads/${recentBot._id}?limit=5&page=1`)
          return res?.data?.data?.leads || []
        },
      },
    ],
  })

  const chartData = useMemo(
    () =>
      graphData.slice(-7).map((row) => {
        const date = new Date(row.date)
        return {
          day: `${monthNames[date.getMonth()]} ${date.getDate()}`,
          chats: row.chats,
        }
      }),
    [graphData],
  )

  if (botsLoading || statsLoading) {
    return <Loader label="Loading dashboard" variant="dashboard" />
  }

  const totalChats = dashboardStats?.summary?.totalChats || 0
  const totalLeads = dashboardStats?.summary?.totalLeads || 0
  const activeBots = bots.filter((b) => b.isLive).length
  const unreadRatio = totalChats ? Math.round(((dashboardStats?.summary?.unansweredChats || 0) / totalChats) * 100) : 0

  return (
    <div className="space-y-5">
      <Card className="hero-grid border-primary-500/25 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">Overview</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Dashboard Command Center</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Track bots, conversations, leads, and quality signals in one place.</p>
          </div>
          <Link to="/bots/new" className="btn-primary">Create New Bot</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Unanswered Ratio</p>
            <p className="mt-1 text-xl font-bold">{unreadRatio}%</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Live Bots</p>
            <p className="mt-1 text-xl font-bold">{activeBots}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Monthly Leads</p>
            <p className="mt-1 text-xl font-bold">{totalLeads}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total Bots" value={bots.length} subtitle="all bots" />
        <StatsCard title="Active Bots" value={activeBots} subtitle="live now" />
        <StatsCard title="Chats This Month" value={totalChats} subtitle="30 day overview" />
        <StatsCard title="Leads Captured" value={totalLeads} subtitle="across bots" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <p className="text-sm font-semibold">Chat volume (last 7 days)</p>
          {!canAccessDetailedAnalytics ? (
            <div className="mt-4 flex h-72 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
              <div className="text-center">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">🔒 Starter plan feature</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">Upgrade your plan to see detailed analytics.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3b" />
                    <XAxis dataKey="day" tick={{ fill: '#9b9bb6', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9b9bb6', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="chats" fill="#7F77DD" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs">
                  <p className="text-[var(--text-muted)]">Best Performing Day</p>
                  <p className="mt-1 font-semibold">{chartData.reduce((acc, row) => (row.chats > (acc?.chats || 0) ? row : acc), chartData[0])?.day || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs">
                  <p className="text-[var(--text-muted)]">Weekly Chat Total</p>
                  <p className="mt-1 font-semibold">{chartData.reduce((acc, row) => acc + (row.chats || 0), 0)}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs">
                  <p className="text-[var(--text-muted)]">Growth Signal</p>
                  <p className="mt-1 font-semibold">{chartData.length > 1 && chartData[chartData.length - 1].chats >= chartData[0].chats ? 'Trending up' : 'Needs tuning'}</p>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Recent leads</p>
            <Link to="/leads" className="text-xs text-primary-500">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {leadsData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No leads yet.</p>
            ) : (
              leadsData.map((lead) => (
                <div key={lead._id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                  <p className="text-sm font-semibold">{lead.name || 'Anonymous lead'}</p>
                  <p className="text-xs text-[var(--text-muted)]">{lead.email || lead.phone || 'No contact'}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-xl border border-primary-500/20 bg-primary-500/10 p-3">
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">Quick actions</p>
            <div className="mt-2 grid gap-2 text-xs">
              <Link to="/bots" className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-white/50 px-3 py-2 dark:bg-black/20">
                <span className="inline-flex items-center gap-2"><Bot size={14} /> Manage Bots</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/analytics" className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-white/50 px-3 py-2 dark:bg-black/20">
                <span className="inline-flex items-center gap-2"><ChartNoAxesCombined size={14} /> Open Analytics</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/billing" className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-white/50 px-3 py-2 dark:bg-black/20">
                <span className="inline-flex items-center gap-2"><CircleDollarSign size={14} /> Billing Overview</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/conversations" className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-white/50 px-3 py-2 dark:bg-black/20">
                <span className="inline-flex items-center gap-2"><MessagesSquare size={14} /> Live Conversations</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
