import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Search, RefreshCw, Eye, X, Trash2, Loader2,
  Globe, MessageSquare, Users, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle,
  Clock, Zap, Download, ChevronDown, ChevronUp, Mail, Check
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR BOT STATUS
// ================================================================
const BotStatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "live", label: "Live" },
    { value: "offline", label: "Offline" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = statusOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Status"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {statusOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)]"
                }`}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR TRAINING STATUS
// ================================================================
const TrainingDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const trainingOptions = [
    { value: "", label: "All Training" },
    { value: "trained", label: "Trained" },
    { value: "training", label: "Training" },
    { value: "failed", label: "Failed" },
    { value: "untrained", label: "Untrained" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = trainingOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Training"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          >
            {trainingOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between capitalize ${
                  value === option.value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)]"
                }`}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// BADGES
// ================================================================
const LiveBadge = ({ isLive }) => isLive
  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
  : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Offline</span>

const TrainingBadge = ({ status }) => {
  const map = {
    trained:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    training:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed:    'bg-red-500/10 text-red-400 border-red-500/20',
    pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    untrained: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  const icons = { trained: '✓', training: '⟳', failed: '✗', pending: '…', untrained: '—' }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${map[status] || map.untrained}`}>
      {icons[status] || '—'} {status || 'Untrained'}
    </span>
  )
}

// ----------------------------------------------------------------
// CONFIRM MODAL
// ----------------------------------------------------------------
const ConfirmModal = ({ modal, onClose }) =>
  createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text)] text-center mb-2">{modal.title}</h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-6">{modal.message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={() => { modal.onConfirm(); onClose() }} className="btn-danger flex-1 justify-center">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )

// ----------------------------------------------------------------
// CONVERSATION ITEM — expandable
// ----------------------------------------------------------------
const ConvItem = ({ conv }) => {
  const [open, setOpen] = useState(false)
  const msgs = conv.messages || []
  const preview = msgs[0]?.content?.slice(0, 60) || 'No messages'

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left">
        <MessageSquare className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text)] truncate">{preview}...</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {msgs.length} messages · {new Date(conv.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            {conv.pageUrl && <span className="ml-2 opacity-60">· {conv.pageUrl}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {conv.leadCaptured && <span className="badge-success text-xs">Lead</span>}
          {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-[var(--border)]">
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto bg-[var(--bg-hover)]">
              {msgs.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No messages</p>
              ) : msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    m.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-none'
                      : 'bg-[var(--bg-card)] text-[var(--text)] rounded-bl-none border border-[var(--border)]'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ----------------------------------------------------------------
// BOT DETAIL MODAL
// ----------------------------------------------------------------
const BotModal = ({ bot: initialBot, onClose }) => {
  const queryClient = useQueryClient()
  const { hasPermission, isSuperAdmin } = useAuthStore()
  const [tab, setTab] = useState('info')
  const [convPage, setConvPage] = useState(1)
  const [leadPage, setLeadPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFullPrompt, setShowFullPrompt] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  
  // Permission checks
  const canEdit = isSuperAdmin() || hasPermission('bots', 'edit')
  const canDelete = isSuperAdmin() || hasPermission('bots', 'delete')

  // Fetch full bot details
  const { data: botData } = useQuery({
    queryKey: ['admin-bot-detail', initialBot._id],
    queryFn: async () => { const r = await adminApi.get(`/bots/${initialBot._id}`); return r.data.data },
  })
  const bot = botData?.bot || initialBot
  const stats = botData?.stats || {}

  // Conversations
  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['admin-bot-convs', bot._id, convPage],
    queryFn: async () => { const r = await adminApi.get(`/bots/${bot._id}/conversations?page=${convPage}&limit=10`); return r.data.data },
    enabled: tab === 'conversations',
  })

  // Leads
  const { data: leadData, isLoading: leadLoading } = useQuery({
    queryKey: ['admin-bot-leads', bot._id, leadPage],
    queryFn: async () => { const r = await adminApi.get(`/bots/${bot._id}/leads?page=${leadPage}&limit=10`); return r.data.data },
    enabled: tab === 'leads',
  })

  // Toggle live
  const toggleMut = useMutation({
    mutationFn: () => adminApi.put(`/bots/${bot._id}/toggle`),
    onSuccess: (res) => {
      toast.success(`Bot ${res.data.data.isLive ? 'enabled' : 'disabled'}!`)
      queryClient.invalidateQueries(['admin-bot-detail', bot._id])
      queryClient.invalidateQueries(['admin-bots'])
    }
  })

  // Delete
  const deleteMut = useMutation({
    mutationFn: () => adminApi.delete(`/bots/${bot._id}`),
    onSuccess: () => { toast.success('Bot deleted!'); queryClient.invalidateQueries(['admin-bots']); onClose() }
  })

  // Export leads CSV
  const exportLeads = async () => {
    try {
      const res = await adminApi.get(`/bots/${bot._id}/leads?limit=9999`)
      const leads = res.data.data?.leads || []
      if (!leads.length) { toast.error('No leads to export'); return }
      const headers = ['Name', 'Email', 'Phone', 'Message', 'Date']
      const rows = leads.map(l => [l.name||'', l.email||'', l.phone||'', (l.message||'').replace(/,/g,''), new Date(l.createdAt).toLocaleDateString('en-IN')])
      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([csv]))
      Object.assign(document.createElement('a'), { href: url, download: `leads_${bot.name}_${Date.now()}.csv` }).click()
      toast.success('Leads exported!')
    } catch { toast.error('Export failed') }
  }

  const TABS = ['info', 'conversations', 'leads']

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--text)] text-sm">{bot.name}</span>
                  <LiveBadge isLive={bot.isLive} />
                  <TrainingBadge status={bot.trainingStatus} />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{bot.websiteUrl}</p>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 ml-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {t}
                {t === 'conversations' && stats.totalConversations > 0 && (
                  <span className="ml-1.5 text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">{stats.totalConversations}</span>
                )}
                {t === 'leads' && stats.totalLeads > 0 && (
                  <span className="ml-1.5 text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-full">{stats.totalLeads}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 min-h-0">

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-hover)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--text)]">{stats.totalConversations ?? '—'}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Total Chats</p>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--text)]">{stats.totalLeads ?? '—'}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Total Leads</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Owner',          value: bot.userId?.name || '—' },
                  { label: 'Owner Email',    value: bot.userId?.email || '—' },
                  { label: 'Owner Plan',     value: bot.userId?.plan || '—' },
                  { label: 'Created',        value: new Date(bot.createdAt).toLocaleDateString('en-IN') },
                  { label: 'Embed Key',      value: bot.embedKey || '—', mono: true },
                  { label: 'Total Chars',    value: bot.totalCharacters?.toLocaleString() || '0' },
                  { label: 'Language',       value: bot.language || 'Auto' },
                  { label: 'Lead Capture',   value: bot.leadCapture?.enabled ? '✅ On' : '❌ Off' },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="bg-[var(--bg-hover)] rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                    <p className={`text-sm font-medium text-[var(--text)] break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* System prompt preview */}
              {bot.systemPrompt && (
                <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">System Prompt</p>
                    <button
                      onClick={() => setShowFullPrompt(v => !v)}
                      className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      {showFullPrompt ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                  <p className={`text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words ${showFullPrompt ? '' : 'line-clamp-4'}`}>
                    {bot.systemPrompt}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {/* Toggle Live - Only show if user has edit permission */}
                {canEdit && (
                  <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      bot.isLive
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}>
                    {toggleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" />
                      : bot.isLive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                    {bot.isLive ? 'Take Offline' : 'Go Live'}
                  </button>
                )}

                {/* Delete - Only show if user has delete permission */}
                {canDelete && (
                  !showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger w-full justify-center py-2.5">
                      <Trash2 className="w-4 h-4" /> Delete Bot
                    </button>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                      <p className="text-sm font-medium text-red-400 text-center">
                        Delete "{bot.name}"? All conversations & leads will be lost!
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="btn-danger flex-1 justify-center">
                          {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
                
                {/* No permissions warning */}
                {!canEdit && !canDelete && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                    <p className="text-xs text-amber-400 font-medium">You don't have permission to edit or delete bots</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONVERSATIONS TAB */}
          {tab === 'conversations' && (
            <div className="space-y-3">
              {convLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse" />)}
                </div>
              ) : !convData?.conversations?.length ? (
                <div className="py-12 text-center text-[var(--text-muted)]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[var(--text-muted)]">{convData.total} total conversations — click to expand chat</p>
                  {convData.conversations.map(conv => (
                    <ConvItem key={conv._id} conv={conv} />
                  ))}
                  {convData.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-[var(--text-muted)]">Page {convPage} of {convData.totalPages}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => setConvPage(p => p-1)} disabled={convPage === 1} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setConvPage(p => p+1)} disabled={convPage === convData.totalPages} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* LEADS TAB */}
          {tab === 'leads' && (
            <div className="space-y-3">
              {/* Export button */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">{stats.totalLeads || 0} total leads</p>
                <button onClick={exportLeads} className="btn-secondary text-xs py-1.5 px-3">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              {leadLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse" />)}
                </div>
              ) : !leadData?.leads?.length ? (
                <div className="py-12 text-center text-[var(--text-muted)]">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No leads captured yet</p>
                </div>
              ) : (
                <>
                  {leadData.leads.map((lead, i) => (
                    <div key={i} className="bg-[var(--bg-hover)] rounded-xl p-3.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text)]">{lead.name || 'Anonymous'}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lead.email && (
                              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                <Mail className="w-3 h-3" />{lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="text-xs text-[var(--text-muted)]">📞 {lead.phone}</span>
                            )}
                          </div>
                          {lead.message && (
                            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{lead.message}</p>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] shrink-0">
                          {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {leadData.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-[var(--text-muted)]">Page {leadPage} of {leadData.totalPages}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => setLeadPage(p => p-1)} disabled={leadPage === 1} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setLeadPage(p => p+1)} disabled={leadPage === leadData.totalPages} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ----------------------------------------------------------------
// MAIN PAGE
// ----------------------------------------------------------------
export default function BotsPage() {
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [trainingFilter, setTrainingFilter] = useState('')
  const [selected, setSelected]       = useState(null)
  const [refreshing, setRefreshing]   = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-bots', page, search, statusFilter, trainingFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ page, limit: 15,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(trainingFilter && { training: trainingFilter }),
      })
      const res = await adminApi.get(`/bots?${p}`)
      return res.data.data
    },
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
    toast.success('Bots refreshed!')
  }

  // Inline toggle from table
  const toggleMut = useMutation({
    mutationFn: (botId) => adminApi.put(`/bots/${botId}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries(['admin-bots']) }
  })

  const clearFilters = () => { setSearch(''); setSearchDraft(''); setStatusFilter(''); setTrainingFilter(''); setPage(1) }
  const hasFilters = search || statusFilter || trainingFilter
  const bots       = data?.bots       || []
  const total      = data?.total      || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Bots</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} total bots</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchDraft); setPage(1) }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input type="text" value={searchDraft} onChange={e => setSearchDraft(e.target.value)}
              placeholder="Search by name, URL..." className="input pl-9 h-fit py-2 text-sm w-full" />
          </div>
          <button type="submit" className="btn-primary px-3 shrink-0"><Search className="w-4 h-4" /></button>
        </form>

        <div className="flex gap-2">
          <div className="w-32">
            <BotStatusDropdown 
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-36">
            <TrainingDropdown 
              value={trainingFilter}
              onChange={(value) => {
                setTrainingFilter(value);
                setPage(1);
              }}
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary px-3 shrink-0"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-hover)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--bg-hover)] rounded w-32" />
                  <div className="h-3 bg-[var(--bg-hover)] rounded w-48" />
                </div>
                <div className="h-5 w-14 bg-[var(--bg-hover)] rounded-full hidden sm:block" />
                <div className="h-5 w-14 bg-[var(--bg-hover)] rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bots found</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-primary-400 text-sm hover:underline">Clear filters</button>}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)]">
              {['Bot', 'Owner', 'Status', 'Training', 'Chats', 'Action'].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-[var(--border)]">
              {bots.map(bot => (
                <div key={bot._id} onClick={() => setSelected(bot)}
                  className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 sm:px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">

                  {/* Bot */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{bot.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{bot.websiteUrl}</p>
                      {/* Mobile badges */}
                      <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                        <LiveBadge isLive={bot.isLive} />
                        <TrainingBadge status={bot.trainingStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="hidden sm:block min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{bot.userId?.name || '—'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{bot.userId?.email || ''}</p>
                  </div>

                  {/* Status toggle */}
                  <div className="hidden sm:flex">
                    <button
                      onClick={e => { e.stopPropagation(); toggleMut.mutate(bot._id) }}
                      disabled={toggleMut.isPending}
                      className="focus:outline-none"
                      title={bot.isLive ? 'Take offline' : 'Go live'}
                    >
                      <LiveBadge isLive={bot.isLive} />
                    </button>
                  </div>

                  {/* Training */}
                  <div className="hidden sm:flex"><TrainingBadge status={bot.trainingStatus} /></div>

                  {/* Chats */}
                  <div className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {bot.stats?.totalChats || 0}
                  </div>

                  {/* Action */}
                  <button onClick={e => { e.stopPropagation(); setSelected(bot) }}
                    className="btn-secondary py-1 px-2.5 text-xs shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[var(--border)]">
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">Page {page} of {totalPages} · {total} bots</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => p-1)} disabled={page === 1} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-medium text-[var(--text)] px-2">{page}</span>
                  <button onClick={() => setPage(p => p+1)} disabled={page === totalPages} className="btn-secondary p-1.5 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && <BotModal bot={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}