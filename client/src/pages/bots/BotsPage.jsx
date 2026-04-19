import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Globe, Plus, Sparkles } from 'lucide-react'
import clientApi from '../../api/axios'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import SelectMenu from '../../components/ui/SelectMenu'

async function getBots() {
  const res = await clientApi.get('/bots')
  return res?.data?.data || { bots: [], canCreateMore: true }
}

export default function BotsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['bots-list'], queryFn: getBots })
  const botsData = data || { bots: [], canCreateMore: true }
  const bots = botsData.bots

  const filteredBots = useMemo(() => {
    const term = search.trim().toLowerCase()
    return bots.filter((bot) => {
      const matchTerm = !term || bot.name?.toLowerCase().includes(term) || bot.websiteUrl?.toLowerCase().includes(term)
      const matchStatus =
        status === 'all' ||
        (status === 'live' && bot.isLive) ||
        (status === 'offline' && !bot.isLive)
      return matchTerm && matchStatus
    })
  }, [bots, search, status])

  const liveCount = bots.filter((bot) => bot.isLive).length
  const trainedCount = bots.filter((bot) => bot.trainingStatus === 'trained').length

  if (isLoading) return <Loader label="Loading bots" variant="bots" />

  const toggleBot = async (botId) => {
    await clientApi.put(`/bots/${botId}/toggle`)
    refetch()
  }

  if (!bots.length) {
    return (
      <EmptyState
        title="No bots created yet"
        description="Create your first bot and start collecting conversations."
        action={<Link to="/bots/new" className="btn-primary">Create Bot</Link>}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">My Bots</h1>
          <p className="text-sm text-[var(--text-muted)]">{bots.length} total bots with live controls and training health</p>
        </div>
        <Link to="/bots/new" className="btn-primary">
          <Plus size={16} />
          Create Bot
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Total Bots</p><p className="mt-2 text-2xl font-bold">{bots.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Live Bots</p><p className="mt-2 text-2xl font-bold">{liveCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Trained Bots</p><p className="mt-2 text-2xl font-bold">{trainedCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Capacity</p><p className="mt-2 text-2xl font-bold">{botsData.canCreateMore ? 'Open' : 'Full'}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bot name or website" />
          <SelectMenu
            value={status}
            onChange={setStatus}
            options={[
              { label: 'All status', value: 'all' },
              { label: 'Live only', value: 'live' },
              { label: 'Offline only', value: 'offline' },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredBots.map((bot) => (
          <Card key={bot._id} className="group relative overflow-hidden p-5">
            <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary-500/10 blur-2xl transition group-hover:bg-primary-500/20" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="truncate text-lg font-bold">{bot.name}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">{bot.websiteUrl || 'No website URL'}</p>
              </div>
              <Badge variant={bot.isLive ? 'success' : 'muted'}>{bot.isLive ? 'Live' : 'Offline'}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-2">
                <p className="text-[var(--text-muted)]">Training</p>
                <p className="mt-1 font-semibold capitalize">{bot.trainingStatus || 'untrained'}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-2">
                <p className="text-[var(--text-muted)]">Chats</p>
                <p className="mt-1 font-semibold">{bot?.stats?.totalChats || 0}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Sparkles size={14} className="text-primary-500" />
              Embed ready with analytics and lead capture
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Globe size={14} className="text-primary-500" />
              {bot.websiteUrl ? 'Website connected' : 'Website URL pending'}
            </div>

            <div className="mt-4 flex gap-2">
              <Link to={`/bots/${bot._id}`} className="btn-secondary flex-1 justify-center">Open</Link>
              <button className="btn-primary flex-1 justify-center" onClick={() => toggleBot(bot._id)}>
                {bot.isLive ? 'Pause' : 'Go Live'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredBots.length === 0 ? <Card className="p-6 text-center text-sm text-[var(--text-muted)]">No bots match this filter.</Card> : null}
    </div>
  )
}
