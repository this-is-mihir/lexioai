import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Download, RefreshCw, Eye,
  X, ChevronLeft, ChevronRight, Loader2, Trash2,
  Globe, User, Bot, Calendar, Filter, AlertTriangle,
  CheckCircle, Clock, Phone, Mail, Check, ChevronDown
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { CustomDatePicker } from '../../components/ui/CustomDatePicker'

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR BOTS
// ================================================================
const BotFilterDropdown = ({ value, onChange, bots }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const selectedBot = bots?.find((b) => b._id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedBot?.name || "All Bots"}</span>
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
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                value === "" ? "bg-primary-500/10 text-primary-400" : "text-[var(--text)]"
              }`}
            >
              All Bots
              {value === "" && <Check className="w-4 h-4" />}
            </button>
            {(bots || []).map((bot) => (
              <button
                type="button"
                key={bot._id}
                onClick={() => {
                  onChange(bot._id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === bot._id
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)]"
                }`}
              >
                {bot.name}
                {value === bot._id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR STATUS
// ================================================================
const StatusFilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "ended", label: "Ended" },
    { value: "abandoned", label: "Abandoned" },
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
// CUSTOM DROPDOWN COMPONENT FOR LEADS
// ================================================================
const LeadsFilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const leadOptions = [
    { value: "", label: "All Leads" },
    { value: "true", label: "Lead Captured" },
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

  const selectedOption = leadOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Leads"}</span>
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
            {leadOptions.map((option) => (
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
// CUSTOM DROPDOWN COMPONENT FOR MESSAGES
// ================================================================
const MessagesFilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const messageOptions = [
    { value: "", label: "All Messages" },
    { value: "true", label: "Has Unanswered" },
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

  const selectedOption = messageOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Messages"}</span>
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
            {messageOptions.map((option) => (
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
// BADGES
// ================================================================
const StatusBadge = ({ status }) => {
  const map = {
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    ended:     'bg-gray-500/10 text-gray-400 border-gray-500/20',
    abandoned: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${map[status] || map.ended}`}>
      {status || 'ended'}
    </span>
  )
}

// ================================================================
// TABLE COLUMN LAYOUT
// ================================================================
const TABLE_COL_STYLE = {
  display: 'grid',
  gridTemplateColumns: '30px minmax(180px, 1fr) minmax(140px, 0.9fr) 70px minmax(100px, 0.8fr) 100px 70px',
  alignItems: 'center',
  gap: '12px',
}

// ----------------------------------------------------------------
// DELETE CONFIRM MODAL
// ----------------------------------------------------------------
const DeleteModal = ({ onClose, onConfirm, loading }) => {
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text)] text-center mb-1">Delete Conversations</h3>
        <p className="text-xs text-[var(--text-muted)] text-center mb-4">Select date range to delete conversations</p>
        <div className="space-y-3 mb-4">
          <CustomDatePicker
            value={from}
            onChange={setFrom}
            label="From"
            max={to || undefined}
          />
          <CustomDatePicker
            value={to}
            onChange={setTo}
            label="To"
            min={from || undefined}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={() => onConfirm(from, to)}
            disabled={loading || !from || !to}
            className="btn-danger flex-1 justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ----------------------------------------------------------------
// CONVERSATION DETAIL MODAL
// ----------------------------------------------------------------
const ConvModal = ({ convId, onClose }) => {
  const [tab, setTab] = useState('chat')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-conv-detail', convId],
    queryFn: async () => {
      const r = await adminApi.get(`/conversations/${convId}`)
      return r.data.data.conversation
    },
  })

  const conv = data

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">
                  {conv?.botId?.name || 'Conversation'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">{conv?.pageUrl || '—'}</p>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 ml-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {['chat', 'info'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {t === 'chat' ? `Chat ${conv?.messages?.length ? `(${conv.messages.length})` : ''}` : 'Info'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 min-h-0">

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="h-10 w-48 bg-[var(--bg-hover)] rounded-2xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : !conv ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Conversation not found</p>
            </div>
          ) : (
            <>
              {/* CHAT TAB */}
              {tab === 'chat' && (
                <div className="space-y-3">
                  {conv.messages?.length === 0 ? (
                    <div className="py-12 text-center text-[var(--text-muted)]">
                      <p className="text-sm">No messages</p>
                    </div>
                  ) : (
                    conv.messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary-500 text-white rounded-br-sm'
                            : `bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border)] rounded-bl-sm ${
                                msg.isAnswered === false ? 'border-red-500/30 bg-red-500/5' : ''
                              }`
                        }`}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {msg.role === 'user' ? '👤' : '🤖'} {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.role === 'bot' && msg.isAnswered === false && (
                            <span className="text-[10px] text-red-400">• Unanswered</span>
                          )}
                          {msg.role === 'bot' && msg.aiModel && (
                            <span className="text-[10px] text-[var(--text-muted)] opacity-60">{msg.aiModel}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* INFO TAB */}
              {tab === 'info' && (
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Messages',   value: conv.totalMessages || conv.messages?.length || 0 },
                      { label: 'Unanswered', value: conv.unansweredCount || 0 },
                      { label: 'Status',     value: <StatusBadge status={conv.status} /> },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[var(--bg-hover)] rounded-xl p-3 text-center">
                        <div className="text-sm font-bold text-[var(--text)] mb-0.5">{value}</div>
                        <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Bot',         value: conv.botId?.name || '—' },
                      { label: 'Owner',        value: conv.ownerId?.email || '—' },
                      { label: 'Page URL',     value: conv.pageUrl || '—' },
                      { label: 'Language',     value: conv.language || 'Auto' },
                      { label: 'Visitor IP',   value: conv.visitorIP || '—', mono: true },
                      { label: 'Device',       value: conv.visitorDevice || '—' },
                      { label: 'Location',     value: conv.visitorLocation?.city ? `${conv.visitorLocation.city}, ${conv.visitorLocation.country}` : '—' },
                      { label: 'Date',         value: new Date(conv.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="bg-[var(--bg-hover)] rounded-xl p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                        <p className={`text-sm font-medium text-[var(--text)] break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Lead Info */}
                  {conv.leadCaptured && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-400">Lead Captured</p>
                      </div>
                      <div className="space-y-1.5">
                        {conv.visitorName && (
                          <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {conv.visitorName}
                          </div>
                        )}
                        {conv.visitorEmail && (
                          <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {conv.visitorEmail}
                          </div>
                        )}
                        {conv.visitorPhone && (
                          <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {conv.visitorPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
export default function ConversationsPage() {
  const { admin } = useAuthStore()
  const isSuperAdmin = admin?.role === 'superadmin'
  const queryClient  = useQueryClient()

  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [botFilter, setBotFilter] = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [leadFilter, setLeadFilter]       = useState('')
  const [unansweredFilter, setUnansweredFilter] = useState('')
  const [fromDate, setFromDate]   = useState('')
  const [toDate, setToDate]       = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-conversations', page, search, botFilter, statusFilter, leadFilter, unansweredFilter, fromDate, toDate],
    queryFn: async () => {
      const p = new URLSearchParams({ page, limit: 15,
        ...(search && { search }),
        ...(botFilter && { botId: botFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(leadFilter && { leadCaptured: leadFilter }),
        ...(unansweredFilter && { unanswered: unansweredFilter }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      })
      const res = await adminApi.get(`/conversations?${p}`)
      return res.data.data
    },
  })

  // Bots list for filter dropdown
  const { data: botsData } = useQuery({
    queryKey: ['admin-bots-list'],
    queryFn: async () => {
      const r = await adminApi.get('/bots?limit=100')
      return r.data.data?.bots || []
    },
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
    toast.success('Conversations refreshed!')
  }

  const deleteMut = useMutation({
    mutationFn: ({ from, to }) => adminApi.delete('/conversations', { data: { from, to } }),
    onSuccess: (res) => {
      toast.success(`${res.data.data?.deletedCount || 0} conversations deleted!`)
      setShowDeleteModal(false)
      queryClient.invalidateQueries(['admin-conversations'])
    },
    onError: () => toast.error('Delete failed'),
  })

  const exportCSV = async () => {
    try {
      const p = new URLSearchParams({
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      })
      const res = await adminApi.get(`/conversations/export?${p}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      Object.assign(document.createElement('a'), { href: url, download: `conversations_${Date.now()}.csv` }).click()
      toast.success('Exported!')
    } catch { toast.error('Export failed') }
  }

  const clearFilters = () => {
    setSearch(''); setSearchDraft(''); setBotFilter(''); setStatusFilter('')
    setLeadFilter(''); setUnansweredFilter('')
    setFromDate(''); setToDate(''); setPage(1)
  }
  const hasFilters = search || botFilter || statusFilter || leadFilter || unansweredFilter || fromDate || toDate

  const convs      = data?.conversations || []
  const total      = data?.total         || 0
  const totalPages = data?.totalPages    || 1

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Conversations</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} total conversations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFilters(f => !f)}
            className={`btn-secondary ${showFilters ? 'bg-primary-500/10 text-primary-400 border-primary-500/30' : ''}`}>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {isSuperAdmin && (
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Range</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setSearch(searchDraft); setPage(1) }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" value={searchDraft} onChange={e => setSearchDraft(e.target.value)}
            placeholder="Search by page URL..."
            className="input pl-9 h-fit py-2 text-sm w-full" />
        </div>
        <button type="submit" className="btn-primary px-3 shrink-0"><Search className="w-4 h-4" /></button>
      </form>

   {/* ── Filter Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-y-auto max-h-[70vh]">
            <div className="card p-2 sm:p-4 space-y-1.5 sm:space-y-2">
              {/* Row 1: Bot + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                <BotFilterDropdown
                  value={botFilter}
                  onChange={(value) => {
                    setBotFilter(value);
                    setPage(1);
                  }}
                  bots={botsData}
                />
                <StatusFilterDropdown
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                />
              </div>
              {/* Row 2: Lead + Unanswered */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                <LeadsFilterDropdown
                  value={leadFilter}
                  onChange={(value) => {
                    setLeadFilter(value);
                    setPage(1);
                  }}
                />
                <MessagesFilterDropdown
                  value={unansweredFilter}
                  onChange={(value) => {
                    setUnansweredFilter(value);
                    setPage(1);
                  }}
                />
              </div>
              {/* Row 3: From + To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                <CustomDatePicker
                  value={fromDate}
                  onChange={(date) => { setFromDate(date); setPage(1) }}
                  label="From"
                  max={toDate || undefined}
                />
                <CustomDatePicker
                  value={toDate}
                  onChange={(date) => { setToDate(date); setPage(1) }}
                  label="To"
                  min={fromDate || undefined}
                />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary w-full justify-center py-2 text-sm">
                  <X className="w-4 h-4" /> Clear All
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-hover)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--bg-hover)] rounded w-40" />
                  <div className="h-3 bg-[var(--bg-hover)] rounded w-56" />
                </div>
                <div className="h-5 w-14 bg-[var(--bg-hover)] rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No conversations found</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-primary-400 text-sm hover:underline">Clear filters</button>}
          </div>
        ) : (
          <>
            {/* Table with horizontal scroll */}
            <div className="overflow-x-auto">
              {/* Table Header */}
              <div style={TABLE_COL_STYLE} className="px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Conversation</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Bot</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Messages</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Action</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-[var(--border)]">
                {convs.map(conv => {
                  return (
                    <div 
                      key={conv._id}
                      style={TABLE_COL_STYLE}
                      className="px-4 sm:px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)]"
                    >
                      {/* Checkbox */}
                      <div className="flex items-center justify-center">
                        <input type="checkbox" className="w-4 h-4 rounded accent-primary-500 cursor-pointer" onChange={e => e.stopPropagation()} />
                      </div>

                      {/* Conversation */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-3 h-3 text-primary-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-[var(--text)] truncate">
                              {conv.visitorName || 'Anonymous Visitor'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {conv.pageUrl || 'No page URL'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bot */}
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[var(--text)] truncate">{conv.botId?.name || '—'}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate hidden lg:block">{conv.botId?.websiteUrl || ''}</p>
                      </div>

                      {/* Messages */}
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                        <MessageSquare className="w-3 h-3" />
                        <span>{conv.totalMessages || 0}</span>
                        {conv.unansweredCount > 0 && (
                          <span className="text-red-400 text-xs">({conv.unansweredCount})</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1 min-w-0">
                        <StatusBadge status={conv.status} />
                        {conv.leadCaptured && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            Lead
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(conv.createdAt).toLocaleDateString('en-IN')}
                      </p>

                      {/* Action */}
                      <button 
                        onClick={e => { e.stopPropagation(); setSelectedId(conv._id) }}
                        className="btn-secondary py-1 px-2 sm:px-2.5 text-xs shrink-0 flex items-center gap-1 justify-end w-full"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[var(--border)] gap-2 flex-wrap">
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  Page {page} of {totalPages} · {total}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => p-1)} disabled={page === 1} className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-[var(--text)] px-2">{page}</span>
                  <button onClick={() => setPage(p => p+1)} disabled={page === totalPages} className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conversation Detail Modal */}
      <AnimatePresence>
        {selectedId && <ConvModal convId={selectedId} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteModal
            onClose={() => setShowDeleteModal(false)}
            onConfirm={(from, to) => deleteMut.mutate({ from, to })}
            loading={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}