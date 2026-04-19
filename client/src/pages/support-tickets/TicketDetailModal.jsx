import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Send, Loader, AlertCircle, Upload } from 'lucide-react'
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

export default function TicketDetailModal({ ticket, onClose, onReplyAdded }) {
  const queryClient = useQueryClient()
  const [replyMessage, setReplyMessage] = useState('')
  const [replyScreenshot, setReplyScreenshot] = useState(null)
  const [replyScreenshotPreview, setReplyScreenshotPreview] = useState(null)
  const [uploadingReplyScreenshot, setUploadingReplyScreenshot] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

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
      // Update cache
      queryClient.setQueryData(['user-ticket-detail', currentTicket._id], updatedTicket)
      // Invalidate list to update badge counts
      queryClient.invalidateQueries({ queryKey: ['user-support-tickets'] })
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.message || 'Failed to send reply'
      toast.error(errorMsg)
    },
  })

  const handleReplyScreenshotUpload = async (file) => {
    if (!file) return

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Screenshot size must be less than 2MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setReplyScreenshotPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    setUploadingReplyScreenshot(true)
    try {
      // Get signature
      const signRes = await clientApi.post('/settings/cloudinary-signature', {
        folder: 'lexio-tickets',  // ← Match what will be sent to Cloudinary
      })
      
      const { signature, timestamp, apiKey, cloudName } = signRes?.data || {}

      if (!signature || !timestamp || !apiKey || !cloudName) {
        throw new Error(`Missing config: sig=${!!signature} ts=${!!timestamp} key=${!!apiKey} cn=${!!cloudName}`)
      }

      // Upload file - match HelpCenter format exactly
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

  // Auto-scroll to bottom when new messages arrive
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

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] p-4">
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full md:max-w-2xl max-h-[95vh] flex flex-col border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] truncate">{currentTicket.subject}</h2>
            <p className="text-xs md:text-xs text-[var(--text-muted)] mt-1 truncate">
              Ticket ID: <code className="font-mono text-xs">{currentTicket._id}</code>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition ml-2"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Ticket Info */}
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-2 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-4">
              <div>
                <p className="text-2xs md:text-xs text-[var(--text-muted)] uppercase font-semibold mb-1">Status</p>
                <span className={`inline-block px-2 md:px-3 py-0.5 md:py-1 rounded-full text-2xs md:text-xs font-medium whitespace-nowrap ${getStatusColor(currentTicket.status)}`}>
                  {currentTicket.status?.charAt(0).toUpperCase() + currentTicket.status?.slice(1)}
                </span>
              </div>
              {currentTicket.assignedTo && (
                <div>
                  <p className="text-2xs md:text-xs text-[var(--text-muted)] uppercase font-semibold mb-1">Assigned To</p>
                  <p className="text-xs md:text-base text-[var(--text-primary)] font-medium truncate">{currentTicket.assignedTo.name}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-2xs md:text-xs text-[var(--text-muted)] uppercase font-semibold mb-2">Description</p>
            <p className="text-xs md:text-base text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed">{currentTicket.description}</p>

            {/* Screenshot */}
            {currentTicket.screenshotUrl && (
              <div className="mt-2 md:mt-4">
                <p className="text-2xs md:text-xs text-[var(--text-muted)] uppercase font-semibold mb-2">Attachment</p>
                <a
                  href={currentTicket.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src={currentTicket.screenshotUrl}
                    alt="Ticket attachment"
                    className="w-full max-w-xs md:max-w-sm max-h-32 md:max-h-64 rounded-lg border border-[var(--border)] hover:opacity-90 transition"
                  />
                </a>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[var(--border)]">
              <div>
                <p className="text-2xs md:text-xs text-[var(--text-muted)]">Created</p>
                <p className="text-2xs md:text-xs text-[var(--text-secondary)] font-medium">{formatDateTime(currentTicket.createdAt)}</p>
              </div>
              {currentTicket.lastReplyAt && (
                <div>
                  <p className="text-2xs md:text-xs text-[var(--text-muted)]">Last Reply</p>
                  <p className="text-2xs md:text-xs text-[var(--text-secondary)] font-medium">{formatDateTime(currentTicket.lastReplyAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-1.5 md:space-y-4">
            {currentTicket.replies && currentTicket.replies.length > 0 ? (
              currentTicket.replies.map((reply, index) => {
                const isUserReply = reply.senderType === 'user'
                return (
                  <div
                    key={index}
                    className={`flex ${isUserReply ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-2 md:px-4 py-1.5 md:py-3 rounded-lg ${
                        isUserReply
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-bl-none'
                      }`}
                    >
                      <p className="text-2xs md:text-xs font-semibold mb-0.5 md:mb-1 opacity-75 truncate">
                        {reply.senderName}
                        {!isUserReply && ' (Support Staff)'}
                      </p>
                      <p className="text-xs md:text-base whitespace-pre-wrap break-words leading-snug md:leading-normal">{reply.message}</p>
                      
                      {/* Screenshot in reply */}
                      {reply.screenshotUrl && (
                        <div className="mt-1 md:mt-2">
                          <a
                            href={reply.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={reply.screenshotUrl}
                              alt="Reply screenshot"
                              className="max-w-32 md:max-w-40 max-h-20 md:max-h-28 rounded border border-opacity-50 hover:opacity-80 transition"
                            />
                          </a>
                        </div>
                      )}
                      
                      <p className={`text-2xs md:text-xs mt-1 md:mt-2 ${isUserReply ? 'text-blue-100' : 'text-[var(--text-muted)]'}`}>
                        {formatDateTime(reply.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-[var(--text-muted)] text-xs md:text-sm py-6 md:py-8">
                No replies yet. Support staff will respond soon.
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Reply Form */}
        {currentTicket.status !== 'closed' ? (
          <div className="border-t border-[var(--border)] p-4 md:p-6 bg-[var(--bg-secondary)] space-y-3 flex-shrink-0">
            {/* Screenshot Preview */}
            {replyScreenshotPreview && (
              <div className="relative inline-block">
                <img
                  src={replyScreenshotPreview}
                  alt="Reply screenshot preview"
                  className="w-full max-w-sm max-h-32 rounded-lg border border-[var(--border)]"
                />
                <button
                  onClick={removeReplyScreenshot}
                  disabled={uploadingReplyScreenshot}
                  className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                disabled={isReplying || uploadingReplyScreenshot}
                className="flex-1 p-2 md:p-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base"
                rows={3}
              />
              <div className="flex gap-2 md:flex-col md:gap-2">
                <label
                  className="px-3 md:px-4 py-2 md:py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition border border-[var(--border)] flex items-center justify-center flex-1 md:flex-none"
                  title="Attach screenshot (Max 2MB)"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleReplyScreenshotUpload(e.target.files?.[0])}
                    disabled={uploadingReplyScreenshot}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleSendReply}
                  disabled={isReplying || uploadingReplyScreenshot || !replyMessage.trim()}
                  className="px-2 md:px-4 py-1.5 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 md:gap-2 font-medium flex-1 md:flex-none text-xs md:text-base"
                >
                  {isReplying || uploadingReplyScreenshot ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden md:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--border)] p-4 md:p-6 bg-[var(--bg-secondary)] flex items-center gap-2 text-[var(--text-muted)] flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">Ticket closed. No replies.</p>
          </div>
        )}
      </div>
    </div>
  )
}
