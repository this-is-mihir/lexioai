import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, FileDown, Filter, MessageSquare, Trash2, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import SelectMenu from '../../components/ui/SelectMenu'

async function getBots() {
  const res = await clientApi.get('/bots')
  return res?.data?.data?.bots || []
}

export default function ConversationsPage() {
  const queryClient = useQueryClient()
  const [botId, setBotId] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deletingConversationId, setDeletingConversationId] = useState(null)
  const [deletingAllConversations, setDeletingAllConversations] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, conversationId: null })

  const { data: bots = [], isLoading: botsLoading } = useQuery({ queryKey: ['conversation-bots'], queryFn: getBots })

  const activeBotId = botId || bots[0]?._id

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['conversations-list', activeBotId],
    enabled: Boolean(activeBotId),
    queryFn: async () => {
      const res = await clientApi.get(`/chat/${activeBotId}/conversations?limit=30&page=1`)
      return res?.data?.data?.conversations || []
    },
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['conversation-detail', activeBotId, selectedConversation],
    enabled: Boolean(activeBotId && selectedConversation),
    queryFn: async () => {
      const res = await clientApi.get(`/chat/${activeBotId}/conversations/${selectedConversation}`)
      return res?.data?.data?.conversation
    },
  })

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((conversation) => {
      const visitor = (conversation.visitorName || '').toLowerCase()
      const email = (conversation.visitorEmail || '').toLowerCase()
      return visitor.includes(term) || email.includes(term)
    })
  }, [conversations, search])

  const totalMessages = useMemo(
    () => conversations.reduce((acc, item) => acc + (item.totalMessages || 0), 0),
    [conversations],
  )

  const selectedThread = useMemo(
    () => conversations.find((item) => item._id === selectedConversation) || null,
    [conversations, selectedConversation],
  )

  const getMessageTime = (message) => {
    const stamp = message?.createdAt || detail?.createdAt || selectedThread?.createdAt
    return stamp ? new Date(stamp).toLocaleString() : ''
  }

  const escapeHtml = (value) => String(value || '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const refreshConversationList = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations-list', activeBotId] })
  }

  const removeConversation = async (conversationId) => {
    if (!activeBotId) return
    setDeletingConversationId(conversationId)
    try {
      await clientApi.delete(`/chat/${activeBotId}/conversations/${conversationId}`)
      if (selectedConversation === conversationId) {
        setSelectedConversation(null)
      }
      toast.success('Conversation deleted')
      refreshConversationList()
    } catch {
      toast.error('Failed to delete conversation')
    } finally {
      setDeletingConversationId(null)
    }
  }

  const removeAllConversations = async () => {
    if (!activeBotId || !conversations.length) return
    setDeletingAllConversations(true)
    try {
      const res = await clientApi.delete(`/chat/${activeBotId}/conversations`)
      const deletedCount = res?.data?.data?.deletedCount || 0
      setSelectedConversation(null)
      toast.success(`${deletedCount} conversation(s) deleted`)
      refreshConversationList()
    } catch {
      toast.error('Failed to delete all conversations')
    } finally {
      setDeletingAllConversations(false)
    }
  }

  const openSingleDeleteConfirm = (conversationId) => {
    setConfirmDialog({ open: true, type: 'single', conversationId })
  }

  const openDeleteAllConfirm = () => {
    setConfirmDialog({ open: true, type: 'all', conversationId: null })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null, conversationId: null })
  }

  const handleConfirmDelete = async () => {
    if (confirmDialog.type === 'single' && confirmDialog.conversationId) {
      await removeConversation(confirmDialog.conversationId)
    }

    if (confirmDialog.type === 'all') {
      await removeAllConversations()
    }

    closeConfirmDialog()
  }

  const exportConversationPdf = async () => {
    const messages = detail?.messages || []
    if (!messages.length) {
      toast.error('No messages available for export')
      return
    }

    try {
      setExporting(true)
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const html2canvas = html2canvasModule.default

      const transcriptHtml = `
        <div style="font-family: 'Nirmala UI', 'Mangal', 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif; color: #171a2e; font-size: 12px; line-height: 1.5; padding: 12px;">
          <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">Conversation Transcript</h1>
          <p style="margin: 0 0 4px 0; color: #5b6485;"><strong>Bot:</strong> ${escapeHtml(bots.find((b) => b._id === activeBotId)?.name || 'Unknown bot')}</p>
          <p style="margin: 0 0 4px 0; color: #5b6485;"><strong>Visitor:</strong> ${escapeHtml(selectedThread?.visitorName || detail?.visitorName || 'Anonymous Visitor')}</p>
          <p style="margin: 0 0 14px 0; color: #5b6485;"><strong>Exported:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
          ${messages.map((message, index) => {
            const roleLabel = message?.role === 'user' ? 'Visitor' : 'Bot'
            return `
              <div style="margin-bottom: 14px; border-bottom: 1px solid #eef1f8; padding-bottom: 10px;">
                <p style="margin: 0 0 6px 0; color: #5b6485; font-size: 11px;">
                  <strong>${index + 1}. ${roleLabel}</strong> | ${escapeHtml(getMessageTime(message) || 'No timestamp')}
                </p>
                <p style="margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; color: #171a2e;">${escapeHtml(message?.content || '-')}</p>
              </div>
            `
          }).join('')}
        </div>
      `

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '0'
      container.style.top = '0'
      container.style.width = '780px'
      container.style.background = '#ffffff'
      container.style.padding = '10px'
      container.style.zIndex = '-1'
      container.innerHTML = transcriptHtml
      document.body.appendChild(container)

      await new Promise((resolve) => setTimeout(resolve, 60))

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      })

      container.remove()

      if (!canvas.width || !canvas.height) {
        throw new Error('Failed to render transcript canvas')
      }

      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const printableWidth = pageWidth - margin * 2
      const printableHeight = pageHeight - margin * 2
      const imgHeight = (canvas.height * printableWidth) / canvas.width

      let heightLeft = imgHeight
      let position = margin

      doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight, undefined, 'FAST')
      heightLeft -= printableHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin
        doc.addPage()
        doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight, undefined, 'FAST')
        heightLeft -= printableHeight
      }

      const fileSuffix = selectedConversation ? selectedConversation.slice(-6) : 'thread'
      doc.save(`conversation-${fileSuffix}.pdf`)
      toast.success('Conversation exported as PDF')
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  if (botsLoading || convLoading) {
    return <Loader label="Loading conversations" variant="conversations" />
  }

  return (
    <div className="space-y-5">
      <Card className="hero-grid border-primary-500/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">Conversations</p>
            <h1 className="mt-2 text-2xl font-extrabold">Conversation Review Desk</h1>
            <p className="text-sm text-[var(--text-muted)]">Inspect user journeys and bot responses thread by thread.</p>
          </div>
          <SelectMenu
            className="w-64"
            value={botId}
            onChange={setBotId}
            options={[{ label: 'Select bot', value: '' }, ...bots.map((bot) => ({ label: bot.name, value: bot._id }))]}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Threads</p>
            <p className="mt-1 text-xl font-bold">{conversations.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Messages</p>
            <p className="mt-1 text-xl font-bold">{totalMessages}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Selected Thread</p>
            <p className="mt-1 truncate text-xl font-bold">{selectedConversation ? 'Active' : 'None'}</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Thread list</h2>
          <p className="text-sm text-[var(--text-muted)]">Filter visitor conversations and open any thread.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm sm:w-80">
            <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search visitor name or email" />
          </div>
          <Button
            variant="danger"
            className="w-full justify-center sm:w-auto"
            disabled={!conversations.length || deletingAllConversations}
            onClick={openDeleteAllConfirm}
          >
            <Trash2 size={14} />
            {deletingAllConversations ? 'Deleting...' : 'Delete All'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 p-0">
          <div className="max-h-[72vh] overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-muted)]">No conversations found.</p>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={`w-full border-b border-[var(--border)] p-4 ${selectedConversation === conversation._id ? 'bg-primary-500/10' : 'hover:bg-[var(--bg-soft)]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedConversation(conversation._id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/10 text-xs font-semibold text-primary-500">
                          {(conversation.visitorName || 'A').slice(0, 1).toUpperCase()}
                        </span>
                        <p className="truncate text-sm font-semibold">{conversation.visitorName || 'Anonymous Visitor'}</p>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><MessageSquare size={12} /> Messages: {conversation.totalMessages || 0}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><Clock3 size={12} /> {new Date(conversation.createdAt).toLocaleString()}</p>
                    </button>
                    <Button
                      variant="danger"
                      className="px-2 py-1"
                      disabled={deletingConversationId === conversation._id || deletingAllConversations}
                      onClick={() => openSingleDeleteConfirm(conversation._id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {!selectedConversation ? (
            <p className="text-sm text-[var(--text-muted)]">Select any conversation to view full messages.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{selectedThread?.visitorName || detail?.visitorName || 'Anonymous Visitor'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{selectedThread?.visitorEmail || detail?.visitorEmail || 'No email captured'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><UserRound size={13} /> Messages: {detail?.messages?.length || 0}</p>
                    <Button
                      variant="danger"
                      onClick={() => selectedConversation && openSingleDeleteConfirm(selectedConversation)}
                      disabled={!selectedConversation || deletingConversationId === selectedConversation || deletingAllConversations}
                    >
                      <Trash2 size={14} />
                      {deletingConversationId === selectedConversation ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button variant="secondary" onClick={exportConversationPdf} disabled={exporting || detailLoading || !(detail?.messages?.length)}>
                      <FileDown size={14} />
                      {exporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="max-h-[62vh] space-y-2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)]/35 p-3 sm:p-4">
                {detailLoading ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading messages...</p>
                ) : !(detail?.messages || []).length ? (
                  <p className="text-sm text-[var(--text-muted)]">No messages found for this thread.</p>
                ) : (detail?.messages || []).map((message, idx) => {
                  const isUser = message.role === 'user'
                  return (
                    <div key={`${message._id || 'm'}-${idx}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`w-fit max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                          isUser
                            ? 'rounded-br-md bg-primary-500 text-white'
                            : 'rounded-bl-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content || '-'}</p>
                        <p className={`mt-1 text-[11px] ${isUser ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                          {isUser ? 'Visitor' : 'Bot'}{getMessageTime(message) ? ` • ${getMessageTime(message)}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {confirmDialog.open ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirmDialog} />
          <Card className="relative z-10 w-full max-w-md p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">
              {confirmDialog.type === 'all' ? 'Delete all conversations?' : 'Delete this conversation?'}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {confirmDialog.type === 'all'
                ? 'This will permanently remove all conversation threads for the selected bot.'
                : 'This selected conversation will be permanently removed.'}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeConfirmDialog}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deletingAllConversations || deletingConversationId === confirmDialog.conversationId}
              >
                <Trash2 size={14} /> Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
