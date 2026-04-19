import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Tab, Tabs } from '@mui/material'
import { Copy, Globe, Link2, Pencil, Save, Trash2, Upload, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Loader from '../../components/ui/Loader'
import BotAppearanceSettings from '../../components/bot/BotAppearanceSettings'
import BotLivePreview from '../../components/bot/BotLivePreview'

async function fetchBot(botId) {
  const res = await clientApi.get(`/bots/${botId}`)
  return res?.data?.data?.bot
}

export default function BotDetailPage() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const userPlan = user?.plan || 'free'
  const [tab, setTab] = useState(0)
  const [basicForm, setBasicForm] = useState({ name: '', websiteUrl: '', description: '' })
  const [trainingUrl, setTrainingUrl] = useState('')
  const [trainingText, setTrainingText] = useState('')
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaAnswer, setQaAnswer] = useState('')
  const [editingQaId, setEditingQaId] = useState(null)
  const [editingQaQuestion, setEditingQaQuestion] = useState('')
  const [editingQaAnswer, setEditingQaAnswer] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, targetId: null })
  const [deletingConversationId, setDeletingConversationId] = useState(null)
  const [deletingAllConversations, setDeletingAllConversations] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState(null)
  const [deletingAllLeads, setDeletingAllLeads] = useState(false)
  const [checking, setChecking] = useState(false)
  const fileInputRef = useRef(null)

  const refreshTrainingSources = () => {
    queryClient.invalidateQueries({ queryKey: ['bot-training', botId] })
  }

  const refreshConversations = () => {
    queryClient.invalidateQueries({ queryKey: ['bot-conversations', botId] })
    queryClient.invalidateQueries({ queryKey: ['bot-stats', botId] })
  }

  const refreshLeads = () => {
    queryClient.invalidateQueries({ queryKey: ['bot-leads', botId] })
    queryClient.invalidateQueries({ queryKey: ['bot-stats', botId] })
  }

  // Plan limits
  const PLAN_LIMITS = {
    free: { urlTraining: false, fileUpload: false, textCharLimit: 5000, qaLimit: 10 },
    starter: { urlTraining: true, fileUpload: true, textCharLimit: 50000, qaLimit: 50 },
    pro: { urlTraining: true, fileUpload: true, textCharLimit: 200000, qaLimit: 200 },
    business: { urlTraining: true, fileUpload: true, textCharLimit: 500000, qaLimit: 500 },
  }

  const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free

  const isUrlTrainingAvailable = planLimits.urlTraining
  const isFileUploadAvailable = planLimits.fileUpload
  const textCharLimit = planLimits.textCharLimit
  const qaLimit = planLimits.qaLimit

  const getCharLimitWarning = (currentLength) => {
    const percent = Math.round((currentLength / textCharLimit) * 100)
    return `${currentLength} / ${textCharLimit} characters (${percent}%)`
  }

  const getQALimitWarning = (qaCount) => {
    return `${qaCount} / ${qaLimit} Q&A pairs`
  }

  const {
    data: bot,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['bot-detail', botId],
    queryFn: async () => {
      const currentBot = await fetchBot(botId)
      setBasicForm({
        name: currentBot?.name || '',
        websiteUrl: currentBot?.websiteUrl || '',
        description: currentBot?.description || '',
      })
      return currentBot
    },
  })

  const [{ data: trainingData = [] }, { data: conversations = [] }, { data: leads = [] }, { data: stats = {} }] = useQueries({
    queries: [
      {
        queryKey: ['bot-training', botId],
        queryFn: async () => {
          const res = await clientApi.get(`/bots/${botId}/training`)
          return res?.data?.data?.trainingSources || []
        },
      },
      {
        queryKey: ['bot-conversations', botId],
        queryFn: async () => {
          const res = await clientApi.get(`/chat/${botId}/conversations?limit=10&page=1`)
          return res?.data?.data?.conversations || []
        },
      },
      {
        queryKey: ['bot-leads', botId],
        queryFn: async () => {
          const res = await clientApi.get(`/leads/${botId}?limit=10&page=1`)
          return res?.data?.data?.leads || []
        },
      },
      {
        queryKey: ['bot-stats', botId],
        queryFn: async () => {
          const res = await clientApi.get(`/bots/${botId}/stats`)
          return res?.data?.data || {}
        },
      },
    ],
  })

  const statusBadge = useMemo(() => {
    if (!bot) return { label: 'Loading', variant: 'muted' }
    if (bot.trainingStatus === 'trained') return { label: 'Trained', variant: 'success' }
    if (bot.trainingStatus === 'training') return { label: 'Training', variant: 'warning' }
    if (bot.trainingStatus === 'failed') return { label: 'Failed', variant: 'danger' }
    return { label: 'Untrained', variant: 'muted' }
  }, [bot])

  const toggleLive = async () => {
    await clientApi.put(`/bots/${botId}/toggle`)
    refetch()
    toast.success('Bot status updated')
  }

  const saveBasic = async (e) => {
    e.preventDefault()
    await clientApi.put(`/bots/${botId}/basic`, basicForm)
    toast.success('Bot info updated')
    refetch()
  }

  const trainURL = async () => {
    if (!trainingUrl) return
    await clientApi.post(`/bots/${botId}/training/url`, { url: trainingUrl })
    setTrainingUrl('')
    toast.success('URL training started')
    refreshTrainingSources()
  }

  const trainText = async () => {
    if (!trainingText.trim()) return
    await clientApi.post(`/bots/${botId}/training/text`, {
      title: 'Manual Text',
      text: trainingText,
    })
    setTrainingText('')
    toast.success('Text training added')
    refreshTrainingSources()
  }

  const trainQA = async () => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) return
    await clientApi.post(`/bots/${botId}/training/qa`, { question: qaQuestion, answer: qaAnswer })
    setQaQuestion('')
    setQaAnswer('')
    toast.success('Q&A training added')
    refreshTrainingSources()
  }

  const uploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    const formData = new FormData()
    formData.append('file', file)
    await clientApi.post(`/bots/${botId}/training/file`, formData)
    toast.success('File uploaded for training')
    refreshTrainingSources()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getEmbedCode = async () => {
    const res = await clientApi.get(`/bots/${botId}/embed`)
    const code = res?.data?.data?.code || `<script src="https://lexioai.com/widget.js?key=${bot?.embedKey}"></script>`
    await navigator.clipboard.writeText(code)
    toast.success('Embed code copied')
  }

  const verifyInstallation = async () => {
    setChecking(true)
    try {
      await clientApi.post(`/bots/${botId}/verify`, { url: basicForm.websiteUrl })
      toast.success('Installation verified')
    } finally {
      setChecking(false)
    }
  }

  const removeSource = async (sourceId) => {
    await clientApi.delete(`/bots/${botId}/training/${sourceId}`)
    toast.success('Training source removed')
    refreshTrainingSources()
  }

  const deleteSingleConversation = async (conversationId) => {
    setDeletingConversationId(conversationId)
    try {
      await clientApi.delete(`/chat/${botId}/conversations/${conversationId}`)
      toast.success('Conversation deleted')
      refreshConversations()
    } catch {
      toast.error('Failed to delete conversation')
    } finally {
      setDeletingConversationId(null)
    }
  }

  const deleteAllBotConversations = async () => {
    if (!conversations.length) return

    setDeletingAllConversations(true)
    try {
      const res = await clientApi.delete(`/chat/${botId}/conversations`)
      const deletedCount = res?.data?.data?.deletedCount || 0
      toast.success(`${deletedCount} conversation(s) deleted`)
      refreshConversations()
    } catch {
      toast.error('Failed to delete all conversations')
    } finally {
      setDeletingAllConversations(false)
    }
  }

  const deleteSingleLead = async (leadId) => {
    setDeletingLeadId(leadId)
    try {
      await clientApi.delete(`/leads/${botId}/${leadId}`)
      toast.success('Lead deleted')
      refreshLeads()
    } catch {
      toast.error('Failed to delete lead')
    } finally {
      setDeletingLeadId(null)
    }
  }

  const deleteAllBotLeads = async () => {
    if (!leads.length) return

    setDeletingAllLeads(true)
    try {
      const res = await clientApi.delete(`/leads/${botId}`)
      const deletedCount = res?.data?.data?.deletedCount || 0
      toast.success(`${deletedCount} lead(s) deleted`)
      refreshLeads()
    } catch {
      toast.error('Failed to delete all leads')
    } finally {
      setDeletingAllLeads(false)
    }
  }

  const openDeleteConversationConfirm = (conversationId) => {
    setConfirmDialog({ open: true, type: 'conversation-single', targetId: conversationId })
  }

  const openDeleteAllConfirm = () => {
    setConfirmDialog({ open: true, type: 'conversation-all', targetId: null })
  }

  const openDeleteLeadConfirm = (leadId) => {
    setConfirmDialog({ open: true, type: 'lead-single', targetId: leadId })
  }

  const openDeleteAllLeadsConfirm = () => {
    setConfirmDialog({ open: true, type: 'lead-all', targetId: null })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null, targetId: null })
  }

  const handleConfirmAction = async () => {
    if (confirmDialog.type === 'conversation-single' && confirmDialog.targetId) {
      await deleteSingleConversation(confirmDialog.targetId)
    }

    if (confirmDialog.type === 'conversation-all') {
      await deleteAllBotConversations()
    }

    if (confirmDialog.type === 'lead-single' && confirmDialog.targetId) {
      await deleteSingleLead(confirmDialog.targetId)
    }

    if (confirmDialog.type === 'lead-all') {
      await deleteAllBotLeads()
    }

    closeConfirmDialog()
  }

  const startEditQa = (source) => {
    setEditingQaId(source._id)
    setEditingQaQuestion(source.question || '')
    setEditingQaAnswer(source.answer || '')
  }

  const cancelEditQa = () => {
    setEditingQaId(null)
    setEditingQaQuestion('')
    setEditingQaAnswer('')
  }

  const saveEditQa = async () => {
    if (!editingQaId) return
    if (!editingQaQuestion.trim() || !editingQaAnswer.trim()) {
      toast.error('Question and answer are required')
      return
    }

    await clientApi.put(`/bots/${botId}/training/qa/${editingQaId}`, {
      question: editingQaQuestion,
      answer: editingQaAnswer,
    })

    toast.success('Q&A updated')
    cancelEditQa()
    refreshTrainingSources()
  }

  const deleteBot = async () => {
    const ok = window.confirm('Are you sure you want to delete this bot?')
    if (!ok) return
    await clientApi.delete(`/bots/${botId}`)
    toast.success('Bot deleted')
    navigate('/bots')
  }

  if (isLoading || !bot) {
    return <Loader label="Loading bot details" variant="botDetail" />
  }

  const qaSources = trainingData
    .filter((source) => source.type === 'qa')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{bot.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={bot.isLive ? 'success' : 'muted'}>{bot.isLive ? 'Live' : 'Offline'}</Badge>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={toggleLive}>{bot.isLive ? 'Pause Bot' : 'Go Live'}</Button>
          <Button variant="danger" onClick={deleteBot}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>

      <Card className="p-0">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--primary-500)',
              },
              '& .MuiTab-root': {
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'none',
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'var(--text)',
              },
              '& .MuiTabs-scrollButtons': {
                color: 'var(--text-muted)',
              },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Training" />
            <Tab label="Settings" />
            <Tab label="Embed" />
            <Tab label="Conversations" />
            <Tab label="Leads" />
          </Tabs>
        </Box>

        <div className="p-4 sm:p-5">
          {tab === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Total Chats</p><p className="mt-2 text-2xl font-bold">{stats?.stats?.totalChats || bot?.stats?.totalChats || 0}</p></Card>
              <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Total Leads</p><p className="mt-2 text-2xl font-bold">{stats?.stats?.totalLeads || bot?.stats?.totalLeads || 0}</p></Card>
              <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Training Sources</p><p className="mt-2 text-2xl font-bold">{trainingData.length}</p></Card>
              <Card className="p-4"><p className="text-xs text-[var(--text-muted)]">Monthly Chats</p><p className="mt-2 text-2xl font-bold">{bot?.currentMonthUsage?.chatsUsed || 0}</p></Card>
            </div>
          ) : null}

          {tab === 1 ? (
            <div className="space-y-4">
              {/* URL Training */}
              <Card className={isUrlTrainingAvailable ? '' : 'opacity-60'}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Train with URL</p>
                  {!isUrlTrainingAvailable && <Lock size={14} className="text-[var(--text-muted)]" />}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="input w-full"
                    placeholder="https://yourwebsite.com"
                    value={trainingUrl}
                    onChange={(e) => setTrainingUrl(e.target.value)}
                    disabled={!isUrlTrainingAvailable}
                  />
                  <Button
                    className="w-full justify-center sm:w-auto"
                    onClick={trainURL}
                    disabled={!isUrlTrainingAvailable}
                  >
                    <Globe size={16} />
                    Train
                  </Button>
                </div>
                {!isUrlTrainingAvailable && (
                  <p className="mt-2 text-xs text-[#ff6b6b] font-medium">🔒 Available on Starter plan and above</p>
                )}
              </Card>

              {/* Text Training */}
              <Card>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Train with Text</p>
                  <span className="text-xs text-[var(--text-muted)]">{getCharLimitWarning(trainingText.length)}</span>
                </div>
                <textarea
                  className="input mt-3 min-h-24"
                  value={trainingText}
                  onChange={(e) => {
                    if (e.target.value.length <= textCharLimit) {
                      setTrainingText(e.target.value)
                    } else {
                      toast.error(`Character limit is ${textCharLimit}`)
                    }
                  }}
                  placeholder="Enter your training text here..."
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Max: {textCharLimit} characters</p>
                <Button
                  className="mt-3 w-full justify-center sm:w-auto"
                  onClick={trainText}
                  disabled={!trainingText.trim() || trainingText.length > textCharLimit}
                >
                  Save text training
                </Button>
              </Card>

              {/* Q&A Training */}
              <Card>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Train with Q&A</p>
                  <span className="text-xs text-[var(--text-muted)]">{getQALimitWarning(qaSources.length)}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Question"
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    disabled={qaSources.length >= qaLimit}
                  />
                  <Input
                    label="Answer"
                    value={qaAnswer}
                    onChange={(e) => setQaAnswer(e.target.value)}
                    disabled={qaSources.length >= qaLimit}
                  />
                </div>
                <Button
                  className="mt-3 w-full justify-center sm:w-auto"
                  onClick={trainQA}
                  disabled={qaSources.length >= qaLimit || !qaQuestion.trim() || !qaAnswer.trim()}
                >
                  Add Q&A
                </Button>
                {qaSources.length >= qaLimit && (
                  <p className="mt-2 text-xs text-[#ff6b6b] font-medium">
                    🔒 You've reached the Q&A limit ({qaLimit}) for your {userPlan} plan
                  </p>
                )}

                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Added Q&A</p>
                  {qaSources.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No Q&A added yet.</p>
                  ) : (
                    qaSources.map((source) => {
                      const isEditing = editingQaId === source._id

                      return (
                        <div key={source._id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              <Input label="Question" value={editingQaQuestion} onChange={(e) => setEditingQaQuestion(e.target.value)} />
                              <Input label="Answer" value={editingQaAnswer} onChange={(e) => setEditingQaAnswer(e.target.value)} />
                              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                <Button className="w-full justify-center px-3 py-1.5 sm:w-auto" onClick={saveEditQa}><Save size={14} /> Save</Button>
                                <Button variant="secondary" className="w-full justify-center px-3 py-1.5 sm:w-auto" onClick={cancelEditQa}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Question</p>
                                <p className="mt-1 text-sm font-medium text-[var(--text)] break-words">{source.question}</p>
                                <p className="mt-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">Answer</p>
                                <p className="mt-1 text-sm text-[var(--text)] break-words">{source.answer}</p>
                              </div>
                              <div className="flex items-center gap-2 sm:shrink-0 sm:gap-1">
                                <Button variant="secondary" className="flex-1 justify-center px-2 py-1 sm:flex-none" onClick={() => startEditQa(source)}>
                                  <Pencil size={13} />
                                </Button>
                                <Button variant="danger" className="flex-1 justify-center px-2 py-1 sm:flex-none" onClick={() => removeSource(source._id)}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>

              <Card className={isFileUploadAvailable ? '' : 'opacity-60'}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Train with File</p>
                  {!isFileUploadAvailable && <Lock size={14} className="text-[var(--text-muted)]" />}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={uploadFile}
                  disabled={!isFileUploadAvailable}
                />
                <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {selectedFileName || 'No file selected'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Supported: PDF, DOCX, TXT</p>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full justify-center sm:w-auto"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!isFileUploadAvailable}
                    >
                      <Upload size={15} /> Choose File
                    </Button>
                  </div>
                </div>
                {!isFileUploadAvailable && (
                  <p className="mt-2 text-xs text-[#ff6b6b] font-medium">🔒 Available on Starter plan and above</p>
                )}
              </Card>

              <Card>
                <p className="text-sm font-semibold">Training Sources</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">(If status doesn't update, refresh after 30 seconds)</p>
                <div className="mt-3 space-y-2">
                  {trainingData.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No training sources yet.</p>
                  ) : (
                    trainingData.map((source) => (
                      <div key={source._id} className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{source.url || source.fileName || source.question || source.textTitle || source.type}</p>
                          <p className="text-xs text-[var(--text-muted)]">{source.status}</p>
                        </div>
                        <Button variant="danger" className="w-full justify-center px-2 py-1 sm:w-auto" onClick={() => removeSource(source._id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 2 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings Form */}
              <div className="lg:col-span-2">
                <BotAppearanceSettings
                  botId={botId}
                  initialData={bot}
                  onUpdate={() => refetch()}
                />
              </div>

              {/* Live Preview */}
              <div className="lg:col-span-1">
                <BotLivePreview
                  appearance={bot?.appearance}
                  behavior={bot?.behavior}
                />
              </div>
            </div>
          ) : null}

          {tab === 3 ? (
            <div className="space-y-4">
              <Card>
                <p className="text-sm font-semibold">Embed Key</p>
                <p className="mt-2 font-mono text-xs">{bot.embedKey || 'Not generated'}</p>
              </Card>
              <Card>
                <p className="text-sm font-semibold">Embed Code</p>
                <code className="mt-2 block overflow-x-auto rounded-lg bg-[var(--bg-soft)] p-3 font-mono text-xs">
                  {`<script src="https://lexioai.com/widget.js?key=${bot.embedKey || 'YOUR_KEY'}"></script>`}
                </code>
                <div className="mt-3 flex gap-2">
                  <Button onClick={getEmbedCode}><Copy size={16} />Copy Code</Button>
                  <Button variant="secondary" onClick={verifyInstallation} disabled={checking}><Link2 size={16} />{checking ? 'Verifying...' : 'Verify Live'}</Button>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 4 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Conversation Threads</p>
                <Button
                  variant="danger"
                  className="px-3 py-1.5"
                  disabled={deletingAllConversations || !conversations.length}
                  onClick={openDeleteAllConfirm}
                >
                  <Trash2 size={13} />
                  {deletingAllConversations ? 'Deleting...' : 'Delete All'}
                </Button>
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No conversations found.</p>
              ) : (
                conversations.map((conversation) => (
                  <Card key={conversation._id} className="p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{conversation.visitorName || 'Anonymous visitor'}</p>
                        <p className="text-[var(--text-muted)]">{new Date(conversation.createdAt).toLocaleString()}</p>
                      </div>
                      <Button
                        variant="danger"
                        className="px-2 py-1"
                        disabled={deletingConversationId === conversation._id || deletingAllConversations}
                        onClick={() => openDeleteConversationConfirm(conversation._id)}
                      >
                        <Trash2 size={12} />
                        {deletingConversationId === conversation._id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Messages: {conversation.totalMessages}</p>
                  </Card>
                ))
              )}
            </div>
          ) : null}

          {tab === 5 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Captured Leads</p>
                <Button
                  variant="danger"
                  className="px-3 py-1.5"
                  disabled={deletingAllLeads || !leads.length}
                  onClick={openDeleteAllLeadsConfirm}
                >
                  <Trash2 size={13} />
                  {deletingAllLeads ? 'Deleting...' : 'Delete All'}
                </Button>
              </div>
              {leads.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No leads found.</p>
              ) : (
                leads.map((lead) => (
                  <Card key={lead._id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{lead.name || 'Unnamed lead'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{lead.email || lead.phone || 'No contact details'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{lead.status || 'new'}</Badge>
                        <Button
                          variant="danger"
                          className="px-2 py-1"
                          disabled={deletingLeadId === lead._id || deletingAllLeads}
                          onClick={() => openDeleteLeadConfirm(lead._id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : null}
        </div>
      </Card>

      {confirmDialog.open ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirmDialog} />
          <Card className="relative z-10 w-full max-w-md p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">
              {confirmDialog.type === 'conversation-all' && 'Delete all conversations?'}
              {confirmDialog.type === 'conversation-single' && 'Delete this conversation?'}
              {confirmDialog.type === 'lead-all' && 'Delete all leads?'}
              {confirmDialog.type === 'lead-single' && 'Delete this lead?'}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {confirmDialog.type === 'conversation-all' && 'This will permanently remove all conversation threads for this bot.'}
              {confirmDialog.type === 'conversation-single' && 'This conversation will be permanently removed.'}
              {confirmDialog.type === 'lead-all' && 'This will permanently remove all captured leads for this bot.'}
              {confirmDialog.type === 'lead-single' && 'This lead will be permanently removed.'}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeConfirmDialog}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleConfirmAction}
                disabled={
                  deletingAllConversations
                  || deletingAllLeads
                  || deletingConversationId === confirmDialog.targetId
                  || deletingLeadId === confirmDialog.targetId
                }
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
