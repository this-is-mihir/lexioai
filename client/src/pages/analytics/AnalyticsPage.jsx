import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ChartNoAxesCombined, Clock3, MessageCircleQuestion, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clientApi from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import SelectMenu from '../../components/ui/SelectMenu'
import useAuthStore from '../../store/authStore'

async function getBots() {
  const res = await clientApi.get('/bots')
  return res?.data?.data?.bots || []
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [botId, setBotId] = useState('')
  const { user } = useAuthStore()

  const { data: bots = [], isLoading: botsLoading } = useQuery({ queryKey: ['analytics-bots-list'], queryFn: getBots })

  const activeBotId = botId || bots[0]?._id

  // Check which features are available based on plan
  const canAccessDetailedAnalytics = user?.plan !== 'free'
  const canAccessProAnalytics = ['pro', 'business'].includes(user?.plan)

  const [{ data: overview }, { data: graphData = [] }, { data: topQuestions = [] }, { data: peakHours = [] }] = useQueries({
    queries: [
      {
        queryKey: ['analytics-overview', activeBotId, period],
        enabled: Boolean(activeBotId),
        queryFn: async () => {
          const res = await clientApi.get(`/analytics/${activeBotId}/overview?period=${period}`)
          return res?.data?.data || {}
        },
      },
      {
        queryKey: ['analytics-graph', activeBotId, period],
        enabled: Boolean(activeBotId) && canAccessDetailedAnalytics,
        queryFn: async () => {
          const res = await clientApi.get(`/analytics/${activeBotId}/chats-graph?period=${period}`)
          return res?.data?.data?.graphData || []
        },
      },
      {
        queryKey: ['analytics-top-questions', activeBotId, period],
        // Only enable for Pro/Business plans
        enabled: Boolean(activeBotId) && canAccessProAnalytics,
        queryFn: async () => {
          const res = await clientApi.get(`/analytics/${activeBotId}/top-questions?period=${period}`)
          return res?.data?.data?.topQuestions || []
        },
      },
      {
        queryKey: ['analytics-peak-hours', activeBotId, period],
        // Only enable for Pro/Business plans
        enabled: Boolean(activeBotId) && canAccessProAnalytics,
        queryFn: async () => {
          const res = await clientApi.get(`/analytics/${activeBotId}/peak-hours?period=${period}`)
          return res?.data?.data?.heatmap || []
        },
      },
    ],
  })

  const pieData = useMemo(
    () => [
      { name: 'Answered', value: Number(overview?.overview?.totalChats || 0) - Number(overview?.overview?.unansweredChats || 0) },
      { name: 'Unanswered', value: Number(overview?.overview?.unansweredChats || 0) },
    ],
    [overview],
  )

  const peakTop = useMemo(() => {
    const map = {}
    peakHours.forEach((row) => {
      map[row.hour] = (map[row.hour] || 0) + row.count
    })
    return Object.entries(map)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [peakHours])

  const avgChatsPerDay = useMemo(() => {
    if (!graphData.length) return 0
    const total = graphData.reduce((acc, row) => acc + (Number(row.chats) || 0), 0)
    return Math.round(total / graphData.length)
  }, [graphData])

  if (botsLoading) {
    return <Loader label="Loading analytics" variant="analytics" />
  }

  return (
    <div className="space-y-5">
      <Card className="hero-grid border-primary-500/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">Analytics</p>
            <h1 className="mt-2 text-2xl font-extrabold">Conversation Intelligence</h1>
            <p className="text-sm text-[var(--text-muted)]">Deep metrics for bot conversations and performance.</p>
          </div>

          <div className="flex gap-2">
            <SelectMenu
              className="w-44"
              value={botId}
              onChange={setBotId}
              options={[{ label: 'All default bot', value: '' }, ...bots.map((bot) => ({ label: bot.name, value: bot._id }))]}
            />

            <SelectMenu
              className="w-36"
              value={period}
              onChange={setPeriod}
              options={[
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
                { label: 'Last 90 days', value: '90d' },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm">
            <p className="text-xs text-[var(--text-muted)]">Average chats/day</p>
            <p className="mt-1 font-bold">{avgChatsPerDay}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm">
            <p className="text-xs text-[var(--text-muted)]">Most active hour</p>
            <p className="mt-1 font-bold">{peakTop[0]?.hour || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm">
            <p className="text-xs text-[var(--text-muted)]">Question depth</p>
            <p className="mt-1 font-bold">{topQuestions.length || 0} tracked questions</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><div className="inline-flex rounded-lg bg-primary-500/10 p-2 text-primary-500"><ChartNoAxesCombined size={16} /></div><p className="mt-2 text-xs text-[var(--text-muted)]">Total Chats</p><p className="mt-1 text-2xl font-bold">{overview?.overview?.totalChats || 0}</p></Card>
        <Card className="p-4"><div className="inline-flex rounded-lg bg-primary-500/10 p-2 text-primary-500"><TrendingUp size={16} /></div><p className="mt-2 text-xs text-[var(--text-muted)]">Total Leads</p><p className="mt-1 text-2xl font-bold">{overview?.overview?.totalLeads || 0}</p></Card>
        <Card className="p-4"><div className="inline-flex rounded-lg bg-primary-500/10 p-2 text-primary-500"><MessageCircleQuestion size={16} /></div><p className="mt-2 text-xs text-[var(--text-muted)]">Unanswered</p><p className="mt-1 text-2xl font-bold">{overview?.overview?.unansweredChats || 0}</p></Card>
        <Card className="p-4"><div className="inline-flex rounded-lg bg-primary-500/10 p-2 text-primary-500"><Clock3 size={16} /></div><p className="mt-2 text-xs text-[var(--text-muted)]">Lead Conversion</p><p className="mt-1 text-2xl font-bold">{overview?.overview?.leadConversionRate || 0}%</p></Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Performance timeline</h2>
          <p className="text-sm text-[var(--text-muted)]">Daily behavior trend and response quality distribution.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <p className="text-sm font-semibold">Chats over time</p>
          <div className="mt-4 h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3b" />
                <XAxis dataKey="date" tick={{ fill: '#9b9bb6', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9b9bb6', fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="chats" stroke="#7F77DD" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-w-0">
          <p className="text-sm font-semibold">Answered vs unanswered</p>
          <div className="mt-4 h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} fill="#7F77DD" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold">Top questions</p>
          <div className="mt-3 space-y-2">
            {!canAccessProAnalytics ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">🔒 Pro & Business feature</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">Upgrade your plan to see top questions asked by users.</p>
              </div>
            ) : topQuestions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Top questions available with more conversation data.</p>
            ) : (
              topQuestions.slice(0, 10).map((q, i) => (
                <div key={q.question} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm">
                  <p className="font-semibold">{i + 1}. {q.question}</p>
                  <p className="text-xs text-[var(--text-muted)]">Asked {q.count} times</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <p className="text-sm font-semibold">Peak hours</p>
          {!canAccessProAnalytics ? (
            <div className="mt-4 flex h-72 items-center justify-center">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">🔒 Pro & Business feature</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">Upgrade your plan to see peak activity hours heatmap.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={peakTop}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3b" />
                  <XAxis dataKey="hour" tick={{ fill: '#9b9bb6', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9b9bb6', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7F77DD" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
