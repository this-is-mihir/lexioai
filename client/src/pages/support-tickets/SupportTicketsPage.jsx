import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MessageCircle, Clock, AlertCircle, CheckCircle, Loader, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import clientApi from '../../api/axios'
import Card from '../../components/ui/Card'
import TicketDetailModal from './TicketDetailModal'
import useAuthStore from '../../store/authStore'

async function getUserTickets(page = 1) {
  const res = await clientApi.get(`/user/support-tickets?page=${page}&limit=10`)
  return res?.data?.data || {}
}

export default function SupportTicketsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, ticketId: null, isAll: false })
  const [isDeleting, setIsDeleting] = useState(false)

  // Plan-based access control
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to view your tickets')
      navigate('/auth/login')
      return
    }

    const hasProPlan = user?.plan && ['pro', 'business'].includes(user.plan)
    if (!hasProPlan) {
      toast.error('Upgrade to Pro or Business plan to view tickets')
      navigate('/help-center', { state: { showUpgradePrompt: true } })
    }
  }, [isAuthenticated, user, navigate])

  const { data = {}, isLoading, error } = useQuery({
    queryKey: ['user-support-tickets', page],
    queryFn: () => getUserTickets(page),
  })

  const { tickets = [], total = 0, totalPages = 0 } = data

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-600 border border-blue-200'
      case 'in-progress':
        return 'bg-yellow-500/10 text-yellow-600 border border-yellow-200'
      case 'closed':
        return 'bg-green-500/10 text-green-600 border border-green-200'
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
      default:
        return 'bg-gray-500/10 text-gray-600 border border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'closed':
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />
      case 'open':
        return <AlertCircle className="w-4 h-4" />
      case 'in-progress':
        return <Clock className="w-4 h-4" />
      default:
        return <MessageCircle className="w-4 h-4" />
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDeleteTicket = async (ticketId) => {
    setIsDeleting(true)
    try {
      await clientApi.delete(`/user/support-tickets/${ticketId}`)
      toast.success('Ticket deleted successfully')
      setDeleteConfirm({ show: false, ticketId: null, isAll: false })
      queryClient.invalidateQueries({ queryKey: ['user-support-tickets'] })
    } catch (error) {
      toast.error('Failed to delete ticket')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAllTickets = async () => {
    setIsDeleting(true)
    try {
      await clientApi.delete('/user/support-tickets/delete-all')
      toast.success('All tickets deleted successfully')
      setDeleteConfirm({ show: false, ticketId: null, isAll: false })
      queryClient.invalidateQueries({ queryKey: ['user-support-tickets'] })
    } catch (error) {
      toast.error('Failed to delete tickets')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/help-center')}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition"
              title="Go back"
            >
              <ChevronLeft className="w-7 h-7 text-[var(--text-secondary)]" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Support Tickets</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {total} {total === 1 ? 'ticket' : 'tickets'} in total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tickets.length > 0 && (
              <button
                onClick={() => setDeleteConfirm({ show: true, ticketId: null, isAll: true })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-red-700">Failed to load tickets. Please try again.</p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && tickets.length === 0 && (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
            <p className="text-[var(--text-secondary)] mb-4">No support tickets yet</p>
            <button
              onClick={() => navigate('/help-center')}
              className="text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Create your first ticket →
            </button>
          </Card>
        )}

        {/* Tickets List */}
        {!isLoading && tickets.length > 0 && (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card
                key={ticket._id}
                className="p-4 hover:shadow-lg transition border border-[var(--border)] group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setSelectedTicket(ticket)
                    }}
                  >
                    {/* Title and ID */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">
                        {ticket.subject}
                      </h3>
                      <code className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-2 py-1 rounded font-mono flex-shrink-0">
                        #{ticket._id.slice(-6)}
                      </code>
                    </div>

                    {/* Description preview */}
                    <p className="text-sm text-[var(--text-secondary)] truncate mb-3">
                      {ticket.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>

                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ticket.createdAt)}
                      </span>

                      {ticket.lastReplyAt && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Last reply: {formatTime(ticket.lastReplyAt)}
                        </span>
                      )}

                      {ticket.assignedTo && (
                        <span className="text-xs text-[var(--text-muted)]">
                          Assigned to: <span className="font-medium">{ticket.assignedTo.name}</span>
                        </span>
                      )}

                      {ticket.unreadByUser > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                          {ticket.unreadByUser}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Screenshot indicator */}
                    {ticket.screenshotUrl && (
                      <img
                        src={ticket.screenshotUrl}
                        alt="Ticket screenshot"
                        className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
                      />
                    )}
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm({ show: true, ticketId: ticket._id, isAll: false })
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <span className="text-sm text-[var(--text-secondary)]">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onReplyAdded={() => {
            setSelectedTicket(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                {deleteConfirm.isAll ? 'Delete All Tickets?' : 'Delete Ticket?'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {deleteConfirm.isAll
                  ? 'This action cannot be undone. All your support tickets will be permanently deleted.'
                  : 'This action cannot be undone. The ticket will be permanently deleted.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, ticketId: null, isAll: false })}
                  className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition font-medium disabled:opacity-50"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.isAll) {
                      handleDeleteAllTickets()
                    } else {
                      handleDeleteTicket(deleteConfirm.ticketId)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader className="w-4 h-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
