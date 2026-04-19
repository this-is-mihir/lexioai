import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Download, Eye, Filter, PencilLine, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Menu, MenuItem } from '@mui/material'
import clientApi from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import SelectMenu from '../../components/ui/SelectMenu'

async function getBots() {
  const res = await clientApi.get('/bots')
  return res?.data?.data?.bots || []
}

export default function LeadsPage() {
  const [botId, setBotId] = useState('')
  const [search, setSearch] = useState('')
  const [actionAnchorEl, setActionAnchorEl] = useState(null)
  const [actionLead, setActionLead] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [detailLead, setDetailLead] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: bots = [], isLoading: botsLoading } = useQuery({ queryKey: ['lead-bots'], queryFn: getBots })

  const selectedBotId = botId || bots[0]?._id

  const { data: leadResponse, isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ['leads-list', selectedBotId, search],
    enabled: Boolean(selectedBotId),
    queryFn: async () => {
      const res = await clientApi.get(`/leads/${selectedBotId}?limit=50&page=1&search=${encodeURIComponent(search)}`)
      return res?.data?.data || { leads: [] }
    },
  })

  const leads = useMemo(() => leadResponse?.leads || [], [leadResponse])
  const botOptions = useMemo(
    () => [{ label: 'Select bot', value: '' }, ...bots.map((bot) => ({ label: bot.name, value: bot._id }))],
    [bots],
  )

  const leadStatusOptions = useMemo(
    () => [
      { label: 'new', value: 'new' },
      { label: 'contacted', value: 'contacted' },
      { label: 'qualified', value: 'qualified' },
      { label: 'converted', value: 'converted' },
      { label: 'lost', value: 'lost' },
    ],
    [],
  )
  const pipeline = useMemo(
    () => ({
      new: leads.filter((l) => (l.status || 'new') === 'new').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      converted: leads.filter((l) => l.status === 'converted').length,
      lost: leads.filter((l) => l.status === 'lost').length,
    }),
    [leads],
  )

  const closeActionMenu = () => {
    setActionAnchorEl(null)
    setActionLead(null)
  }

  const openActionMenu = (event, lead) => {
    setActionAnchorEl(event.currentTarget)
    setActionLead(lead)
  }

  const updateStatus = async (leadId, status) => {
    if (!selectedBotId || !leadId) return

    try {
      setActionLoading(true)
      await clientApi.put(`/leads/${selectedBotId}/${leadId}`, { status })
      toast.success(`Lead marked as ${status}`)
      await refetch()
      if (detailLead?._id === leadId) {
        setDetailLead((prev) => (prev ? { ...prev, status } : prev))
      }
    } catch {
      toast.error('Failed to update lead status')
    } finally {
      setActionLoading(false)
    }
  }

  const viewLeadDetails = async (lead) => {
    if (!selectedBotId || !lead?._id) return

    try {
      setDetailsLoading(true)
      setDetailLead(lead)
      const res = await clientApi.get(`/leads/${selectedBotId}/${lead._id}`)
      setDetailLead(res?.data?.data?.lead || lead)
    } catch {
      toast.error('Could not load full lead details')
      setDetailLead(lead)
    } finally {
      setDetailsLoading(false)
    }
  }

  const requestDeleteLead = (lead) => {
    if (!lead?._id) return
    setDeleteCandidate(lead)
  }

  const deleteLead = async () => {
    if (!selectedBotId || !deleteCandidate?._id) return

    try {
      setActionLoading(true)
      await clientApi.delete(`/leads/${selectedBotId}/${deleteCandidate._id}`)
      toast.success('Lead deleted successfully')
      if (detailLead?._id === deleteCandidate._id) {
        setDetailLead(null)
      }
      setDeleteCandidate(null)
      await refetch()
    } catch {
      toast.error('Failed to delete lead')
    } finally {
      setActionLoading(false)
    }
  }

  const exportCsv = async () => {
    const res = await clientApi.get(`/leads/${selectedBotId}/export`, {
      responseType: 'blob',
    })

    const blob = new Blob([res.data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (botsLoading || leadsLoading) {
    return <Loader label="Loading leads" variant="leads" />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Leads</h1>
          <p className="text-sm text-[var(--text-muted)]">Capture, qualify, and convert chatbot leads.</p>
        </div>
        <Button onClick={exportCsv}><Download size={15} /> Export CSV</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Total Leads</p><p className="mt-2 text-2xl font-bold">{leads.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">New</p><p className="mt-2 text-2xl font-bold">{pipeline.new}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Qualified</p><p className="mt-2 text-2xl font-bold">{pipeline.qualified}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Converted</p><p className="mt-2 text-2xl font-bold">{pipeline.converted}</p></Card>
      </div>

      <Card>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary-500">
          <Filter size={14} /> Filter & Search
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectMenu value={botId} onChange={setBotId} options={botOptions} />
          <input className="input sm:col-span-2" placeholder="Search by name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-soft)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">View</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={5}>No leads found</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead._id} className="border-b border-[var(--border)] hover:bg-[var(--bg-soft)]/50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/10 text-xs font-semibold text-primary-500">
                        {(lead.name || 'U').slice(0, 1).toUpperCase()}
                      </span>
                      {lead.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{lead.email || lead.phone || '-'}</td>
                  <td className="px-4 py-3"><Badge variant="info">{lead.status || 'new'}</Badge></td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(lead.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="btn-secondary h-9 px-3"
                      onClick={(event) => openActionMenu(event, lead)}
                    >
                      <PencilLine size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl && actionLead)}
        onClose={closeActionMenu}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            borderRadius: '12px',
            bgcolor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          },
        }}
      >
        <MenuItem
          onClick={async () => {
            const selected = actionLead
            closeActionMenu()
            await viewLeadDetails(selected)
          }}
          disabled={actionLoading}
        >
          <div className="inline-flex items-center gap-2 text-sm">
            <Eye size={15} />
            Details
          </div>
        </MenuItem>

        <Divider />

        {leadStatusOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={async () => {
              const selectedLeadId = actionLead?._id
              closeActionMenu()
              await updateStatus(selectedLeadId, option.value)
            }}
            disabled={actionLoading}
          >
            <div className="inline-flex w-full items-center justify-between gap-2 text-sm">
              <span className="capitalize">Set {option.label}</span>
              {actionLead?.status === option.value ? <Check size={14} /> : null}
            </div>
          </MenuItem>
        ))}

        <Divider />

        <MenuItem
          onClick={() => {
            const selected = actionLead
            closeActionMenu()
            requestDeleteLead(selected)
          }}
          disabled={actionLoading}
          sx={{ color: '#ef4444' }}
        >
          <div className="inline-flex items-center gap-2 text-sm">
            <Trash2 size={15} />
            Delete lead
          </div>
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(deleteCandidate)}
        onClose={() => !actionLoading && setDeleteCandidate(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Lead</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to delete
            {' '}
            <span className="font-semibold text-[var(--text)]">
              {deleteCandidate?.name || deleteCandidate?.email || 'this lead'}
            </span>
            ?
            <br />
            This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="secondary" onClick={() => setDeleteCandidate(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteLead} disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(detailLead)}
        onClose={() => setDetailLead(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Lead Details</DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <div className="py-4 text-sm text-[var(--text-muted)]">Loading details...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Name</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.name || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Email</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.email || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Mobile</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.phone || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Company</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.company || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Message</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold">{detailLead?.message || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Page URL</p>
                <p className="mt-1 break-all text-sm font-semibold">{detailLead?.pageUrl || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Device</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.visitorDevice || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">IP</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.visitorIP || '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Status</p>
                <p className="mt-1 text-sm font-semibold capitalize">{detailLead?.status || 'new'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Submitted</p>
                <p className="mt-1 text-sm font-semibold">{detailLead?.createdAt ? new Date(detailLead.createdAt).toLocaleString() : '-'}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold">{detailLead?.notes || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="secondary" onClick={() => setDetailLead(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Card className="flex items-center gap-3 p-4 text-sm text-[var(--text-muted)]">
        <Users size={16} className="text-primary-500" />
        Tip: quickly qualify high-intent leads first and push low-intent ones to nurture campaigns.
      </Card>
    </div>
  )
}
