import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Send, Loader, AlertCircle, Paperclip, MessageCircle, CheckCircle2, ArrowLeft, Clock, Headphones } from 'lucide-react'
import clientApi from '../../api/axios'
import { toast } from 'react-hot-toast'

async function getTicketDetail(ticketId) {
  const res = await clientApi.get(`/user/support-tickets/${ticketId}`)
  return res?.data?.data?.ticket || {}
}

async function submitReply(ticketId, message, screenshotUrl = null) {
  const res = await clientApi.post(`/user/support-tickets/${ticketId}/reply`, { message, screenshotUrl })
  return res?.data?.data?.ticket || {}
}

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  },
  'in-progress': {
    label: 'In Progress',
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/20',
    dot: 'bg-gray-400',
  },
}

/* ─── Image Lightbox ─── */
function ImageLightbox({ src, alt, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

/* ─── Clickable Image Thumbnail ─── */
function ImageThumbnail({ src, alt, className }) {
  const [showLightbox, setShowLightbox] = useState(false)
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in hover:opacity-90 transition ${className}`}
        onClick={() => setShowLightbox(true)}
      />
      {showLightbox && <ImageLightbox src={src} alt={alt} onClose={() => setShowLightbox(false)} />}
    </>
  )
}

export default function TicketDetailModal({ ticket, onClose, onReplyAdded }) {
  const queryClient = useQueryClient()
  const [replyMessage, setReplyMessage] = useState('')
  const [replyScreenshot, setReplyScreenshot] = useState(null)
  const [replyScreenshotPreview, setReplyScreenshotPreview] = useState(null)
  const [uploadingReplyScreenshot, setUploadingReplyScreenshot] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Fetch fresh ticket data to get all replies
  const { data: currentTicket = ticket, isLoading } = useQuery({
    queryKey: ['user-ticket-detail', ticket._id],
    queryFn: () => getTicketDetail(ticket._id),
  })

  // Mutation for posting reply
  const { mutate: postReply, isPending: isReplying } = useMutation({
    mutationFn: (message) => submitReply(currentTicket._id, message, replyScreenshot),
    onSuccess: (updatedTicket) => {
      setReplyMessage('')
      setReplyScreenshot(null)
      setReplyScreenshotPreview(null)
      toast.success('Reply sent!')
      queryClient.setQueryData(['user-ticket-detail', currentTicket._id], updatedTicket)
      queryClient.invalidateQueries({ queryKey: ['user-support-tickets'] })
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.message || 'Failed to send reply'
      toast.error(errorMsg)
    },
  })

  const handleReplyScreenshotUpload = async (file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Screenshot size must be less than 2MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setReplyScreenshotPreview(reader.result)
    reader.readAsDataURL(file)

    setUploadingReplyScreenshot(true)
    try {
      const signRes = await clientApi.post('/settings/cloudinary-signature', { folder: 'lexio-tickets' })
      const { signature, timestamp, apiKey, cloudName } = signRes?.data || {}
      if (!signature || !timestamp || !apiKey || !cloudName) {
        throw new Error(`Missing config: sig=${!!signature} ts=${!!timestamp} key=${!!apiKey} cn=${!!cloudName}`)
      }
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('api_key', apiKey)
      uploadFormData.append('timestamp', timestamp)
      uploadFormData.append('signature', signature)
      uploadFormData.append('folder', 'lexio-tickets')
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: uploadFormData,
      })
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`)
      }
      const uploadData = await uploadRes.json()
      setReplyScreenshot(uploadData.secure_url)
      toast.success('Screenshot uploaded successfully')
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`)
      setReplyScreenshotPreview(null)
    } finally {
      setUploadingReplyScreenshot(false)
    }
  }

  const removeReplyScreenshot = () => {
    setReplyScreenshot(null)
    setReplyScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentTicket?.replies])

  const handleSendReply = () => {
    if (!replyMessage.trim()) {
      toast.error('Message cannot be empty')
      return
    }
    if (currentTicket.status === 'closed') {
      toast.error('Cannot reply to a closed ticket')
      return
    }
    postReply(replyMessage.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : 'S')

  const statusConfig = STATUS_CONFIG[currentTicket.status] || STATUS_CONFIG.open

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl overflow-hidden">

        {/* ─── Header ─── */}
        <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-soft)] transition text-[var(--text-muted)]">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">{currentTicket.subject}</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                Ticket ID: {currentTicket._id}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-soft)] transition text-[var(--text-muted)]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5" style={{ minHeight: 0 }}>

          {/* ─── Ticket Info Card ─── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Assigned To</p>
                <p className="text-xs font-medium truncate">
                  {currentTicket.assignedTo?.name || <span className="text-[var(--text-muted)] italic">Unassigned</span>}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Description</p>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{currentTicket.description}</p>
            </div>

            {/* Ticket screenshot */}
            {currentTicket.screenshotUrl && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Attachment</p>
                <ImageThumbnail
                  src={currentTicket.screenshotUrl}
                  alt="Ticket attachment"
                  className="max-w-xs max-h-40 rounded-lg border border-[var(--border)]"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-3 border-t border-[var(--border)]">
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Created</p>
                <p className="text-[10px] sm:text-xs font-medium">{formatDateTime(currentTicket.createdAt)}</p>
              </div>
              {currentTicket.lastReplyAt && (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Last Reply</p>
                  <p className="text-[10px] sm:text-xs font-medium">{formatDateTime(currentTicket.lastReplyAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Replies ─── */}
          <div className="space-y-3">
            {currentTicket.replies && currentTicket.replies.length > 0 ? (
              currentTicket.replies.map((reply, index) => {
                const isUser = reply.senderType === 'user'
                return (
                  <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] sm:max-w-[75%] ${isUser ? '' : 'flex gap-2.5'}`}>
                      {/* Support avatar — first letter of name */}
                      {!isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mt-5 shadow-sm">
                          <span className="text-white text-xs font-bold">{getInitial(reply.senderName)}</span>
                        </div>
                      )}
                      <div>
                        {/* Sender name for support */}
                        {!isUser && (
                          <p className="text-[10px] font-semibold text-emerald-500 mb-1 px-1">
                            {reply.senderName} · Support
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-sm ${
                            isUser
                              ? 'bg-primary-500 text-white rounded-br-md shadow-primary-500/10'
                              : 'bg-[var(--bg-card)] border border-[var(--border)] rounded-bl-md'
                          }`}
                        >
                          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? '' : 'text-[var(--text)]'}`}>
                            {reply.message}
                          </p>
                          {reply.screenshotUrl && (
                            <div className="mt-2">
                              <ImageThumbnail
                                src={reply.screenshotUrl}
                                alt="Reply screenshot"
                                className={`max-w-full max-h-36 rounded-lg border ${
                                  isUser ? 'border-white/20' : 'border-[var(--border)]'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] text-[var(--text-muted)] mt-1 px-1 ${isUser ? 'text-right' : ''}`}>
                          {formatTime(reply.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-soft)] flex items-center justify-center mb-3">
                  <MessageCircle size={20} className="text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-muted)]">No replies yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Support staff will respond soon</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Reply Form ─── */}
        {currentTicket.status !== 'closed' ? (
          <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:px-6 sm:py-4">
            {/* Screenshot Preview */}
            {replyScreenshotPreview && (
              <div className="relative inline-block mb-3">
                <img
                  src={replyScreenshotPreview}
                  alt="Preview"
                  className="h-16 sm:h-20 rounded-lg border border-[var(--border)] object-cover"
                />
                <button
                  onClick={removeReplyScreenshot}
                  disabled={uploadingReplyScreenshot}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition disabled:opacity-50 shadow-sm"
                >
                  <X size={10} />
                </button>
                {uploadingReplyScreenshot && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <Loader size={16} className="text-white animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2">
              <label
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--bg-soft)] hover:bg-[var(--bg-soft)]/80 cursor-pointer transition text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] flex items-center justify-center"
                title="Attach screenshot (Max 2MB)"
              >
                <Paperclip size={16} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleReplyScreenshotUpload(e.target.files?.[0])}
                  disabled={uploadingReplyScreenshot}
                  className="hidden"
                />
              </label>

              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply..."
                  disabled={isReplying || uploadingReplyScreenshot}
                  className="w-full h-10 px-4 py-2.5 bg-[var(--bg-soft)] text-[var(--text)] placeholder-[var(--text-muted)] rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 resize-none text-sm transition leading-5"
                  rows={1}
                  style={{ maxHeight: '120px' }}
                />
              </div>

              <button
                onClick={handleSendReply}
                disabled={isReplying || uploadingReplyScreenshot || !replyMessage.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary-500/20 flex items-center justify-center"
              >
                {isReplying ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] mt-2 hidden sm:block">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        ) : (
          <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 sm:px-6">
            <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
              <CheckCircle2 size={15} />
              <p className="text-xs font-medium">This ticket has been closed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
