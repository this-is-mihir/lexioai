import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Search, Download, RefreshCw, X, Send, Loader2,
  ChevronDown, ChevronLeft, ChevronRight, Check,
  Circle, Clock, CheckCircle, XCircle, PauseCircle,
  AlertTriangle, UserCheck, Shield, MessageSquare,
  Inbox, Star, User, Calendar, Filter, Trash2,
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";

// ─── Constants ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:         { label: "Open",         color: "text-blue-400 bg-blue-400/10 border-blue-400/20",           icon: Circle,       dot: "bg-blue-400"    },
  in_progress:  { label: "In Progress",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",        icon: Clock,        dot: "bg-amber-400"   },
  waiting_user: { label: "Waiting User", color: "text-purple-400 bg-purple-400/10 border-purple-400/20",     icon: PauseCircle,  dot: "bg-purple-400"  },
  resolved:     { label: "Resolved",     color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",  icon: CheckCircle,  dot: "bg-emerald-400" },
  closed:       { label: "Closed",       color: "text-gray-400 bg-gray-400/10 border-gray-400/20",           icon: XCircle,      dot: "bg-gray-400"    },
};

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  medium: { label: "Medium", color: "text-blue-400 bg-blue-400/10 border-blue-400/20"         },
  high:   { label: "High",   color: "text-orange-400 bg-orange-400/10 border-orange-400/20"   },
  urgent: { label: "Urgent", color: "text-red-400 bg-red-400/10 border-red-400/20"            },
};

const CATEGORY_LABELS = {
  billing: "Billing", technical: "Technical", account: "Account",
  bot_issue: "Bot Issue", training: "Training",
  feature_request: "Feature Request", other: "Other",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

const PRIORITY_OPTIONS_FILTER = [
  { value: "all", label: "All Priority" },
  ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

const COL_STYLE = {
  display: "grid",
  gridTemplateColumns: "minmax(180px,2fr) minmax(140px,1.2fr) 90px 145px minmax(120px,1fr) 90px 80px",
  alignItems: "center",
  gap: "12px",
};

// ─── Helpers ─────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Small Components ─────────────────────────────────────────────

const Badge = ({ className, children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return <Badge className={cfg.color}><Icon className="w-3 h-3" />{cfg.label}</Badge>;
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <Badge className={cfg.color}>
      {priority === "urgent" && <AlertTriangle className="w-3 h-3" />}
      {cfg.label}
    </Badge>
  );
};

// ─── Custom Select ────────────────────────────────────────────────

function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "", disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="input text-sm h-fit py-2 w-full flex items-center justify-between gap-2 text-left disabled:opacity-50"
      >
        <span className={selected ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
          {selected ? selected.label : placeholder}
        </span>
        {disabled
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)] shrink-0" />
          : <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[999] left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  opt.value === value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span className={opt.value === value ? "" : "ml-5"}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Quick Status Dropdown (inline table row) ─────────────────────

function QuickStatusDropdown({ ticketId, currentStatus, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = async (status) => {
    setLoading(true);
    setOpen(false);
    try {
      await adminApi.put(`/tickets/${ticketId}/status`, { status });
      onUpdate(ticketId, { status });
      toast.success("Status updated!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    }
    setLoading(false);
  };

  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.open;
  const Icon = cfg.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color} hover:opacity-80 transition-opacity`}
        title="Click to change status"
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Icon className="w-3 h-3" />
        }
        {cfg.label}
        <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
      </button>

      {open && createPortal(
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[9999] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl py-1 min-w-[165px]"
          style={{
            top: (ref.current?.getBoundingClientRect().bottom || 0) + 4,
            left: ref.current?.getBoundingClientRect().left || 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <button
              key={key}
              onClick={() => handleChange(key)}
              disabled={currentStatus === key}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors ${
                currentStatus === key ? "opacity-40 cursor-default" : ""
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
              <span className="text-[var(--text)]">{c.label}</span>
              {currentStatus === key && <Check className="w-3 h-3 text-primary-400 ml-auto" />}
            </button>
          ))}
        </motion.div>,
        document.body
      )}
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────

function StatsCards({ stats, loading }) {
  const cards = [
    { label: "Total Tickets", value: stats.total,       icon: Ticket,      color: "text-primary-400", bg: "bg-primary-400/10" },
    { label: "Open",          value: stats.open,        icon: Circle,      color: "text-blue-400",    bg: "bg-blue-400/10"    },
    { label: "In Progress",   value: stats.in_progress, icon: Clock,       color: "text-amber-400",   bg: "bg-amber-400/10"   },
    { label: "Resolved",      value: stats.resolved,    icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(s => (
        <div key={s.label} className="card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div className="min-w-0">
            {loading
              ? <div className="h-6 w-12 bg-[var(--bg-hover)] rounded animate-pulse mb-1" />
              : <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            }
            <p className="text-xs text-[var(--text-muted)] truncate">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ticket Drawer ────────────────────────────────────────────────

function TicketDrawer({ ticketId, onClose, onUpdate, admins, canReply, canAssign, canClose }) {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const r = await adminApi.get(`/tickets/${ticketId}`);
      return r.data.data.ticket;
    },
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (ticket?.replies?.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [ticket?.replies?.length]);

  const replyMut = useMutation({
    mutationFn: () => adminApi.post(`/tickets/${ticketId}/reply`, { message: replyText.trim() }),
    onSuccess: (res) => {
      const updated = res.data.data.ticket;
      queryClient.setQueryData(["admin-ticket", ticketId], updated);
      onUpdate(ticketId, { status: updated.status, lastReplyAt: new Date(), lastReplyBy: "admin", unreadByAdmin: 0 });
      setReplyText("");
      toast.success("Reply sent!");
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to send reply"),
  });

  const statusMut = useMutation({
    mutationFn: ({ status, note }) => adminApi.put(`/tickets/${ticketId}/status`, { status, resolutionNote: note }),
    onSuccess: (_, vars) => {
      queryClient.setQueryData(["admin-ticket", ticketId], prev =>
        prev ? { ...prev, status: vars.status, resolutionNote: vars.note } : prev
      );
      onUpdate(ticketId, { status: vars.status });
      setShowResolutionInput(false);
      setResolutionNote("");
      setPendingStatus(null);
      toast.success("Status updated!");
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to update status"),
  });

  const assignMut = useMutation({
    mutationFn: (adminId) => adminApi.post(`/tickets/${ticketId}/assign`, { adminId }),
    onSuccess: (_, adminId) => {
      const admin = admins.find(a => a._id === adminId);
      queryClient.setQueryData(["admin-ticket", ticketId], prev =>
        prev ? { ...prev, assignedTo: admin, assignedToName: admin?.name } : prev
      );
      onUpdate(ticketId, { assignedToName: admin?.name });
      toast.success(`Assigned to ${admin?.name}!`);
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to assign"),
  });

  const handleStatusChange = (status) => {
    if (status === "resolved" || status === "closed") {
      setPendingStatus(status);
      setShowResolutionInput(true);
    } else {
      statusMut.mutate({ status, note: null });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && replyText.trim()) {
      replyMut.mutate();
    }
  };

  const statusSelectOptions = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));
  const assignOptions = [
    { value: "", label: "Unassigned" },
    ...admins.map(a => ({ value: a._id, label: a.name })),
  ];
  const currentAssignedId = ticket?.assignedTo?._id || (typeof ticket?.assignedTo === "string" ? ticket.assignedTo : "") || "";

  return createPortal(
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 h-full z-[201] w-full max-w-2xl bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col shadow-2xl"
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : !ticket ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            Ticket not found
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-mono text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded border border-primary-400/20">
                      {ticket.ticketId}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                    {ticket.category && (
                      <Badge className="text-[var(--text-muted)] bg-[var(--bg-hover)] border-[var(--border)]">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-[var(--text)] font-semibold text-base leading-tight">
                    {ticket.subject}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <User className="w-3 h-3" /> {ticket.userName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{ticket.userEmail}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3 h-3" /> {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="shrink-0 px-5 py-3 border-b border-[var(--border)] flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] shrink-0">Status:</span>
                {canClose ? (
                  <div className="w-40">
                    <CustomSelect
                      value={ticket.status}
                      onChange={handleStatusChange}
                      options={statusSelectOptions}
                      disabled={statusMut.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[var(--text-muted)]">
                      {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                    </div>
                    <span className="text-[10px] text-red-400 opacity-75">
                      (Superadmin hasn't allowed)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] shrink-0">Assign:</span>
                {canAssign ? (
                  <div className="w-44">
                    <CustomSelect
                      value={currentAssignedId}
                      onChange={(v) => v !== currentAssignedId && assignMut.mutate(v)}
                      options={assignOptions}
                      disabled={assignMut.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[var(--text-muted)]">
                      {ticket.assignedToName || "Unassigned"}
                    </div>
                    <span className="text-[10px] text-red-400 opacity-75">
                      (Superadmin hasn't allowed)
                    </span>
                  </div>
                )}
              </div>

              {ticket.rating && (
                <div className="flex items-center gap-1 ml-auto">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= ticket.rating ? "text-amber-400 fill-amber-400" : "text-[var(--text-muted)]"}`} />
                  ))}
                  <span className="text-xs text-[var(--text-muted)] ml-1">User rating</span>
                </div>
              )}
            </div>

            {/* Resolution Input */}
            <AnimatePresence>
              {showResolutionInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-[var(--border)] bg-emerald-400/5">
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      Resolution note for <strong className="text-[var(--text)]">"{STATUS_CONFIG[pendingStatus]?.label}"</strong> (optional):
                    </p>
                    <textarea
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      className="input text-sm resize-none w-full"
                      rows={2}
                      placeholder="Describe how this was resolved..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => statusMut.mutate({ status: pendingStatus, note: resolutionNote || null })}
                        disabled={statusMut.isPending}
                        className="btn-primary text-xs px-3 py-1.5 gap-1"
                      >
                        {statusMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => { setShowResolutionInput(false); setPendingStatus(null); }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resolution Note Display */}
            {ticket.resolutionNote && !showResolutionInput && (
              <div className="shrink-0 mx-5 mt-3 px-4 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-xs text-emerald-400">
                <span className="font-semibold">Resolution: </span>{ticket.resolutionNote}
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

              {/* Original description */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-400/20 flex items-center justify-center shrink-0 text-primary-400 font-bold text-sm">
                  {ticket.userName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--text)]">{ticket.userName}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(ticket.createdAt)}</span>
                    <Badge className="text-primary-400 bg-primary-400/10 border-primary-400/20">Original</Badge>
                  </div>
                  <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
                  </div>
                  
                  {/* Screenshot attachment */}
                  {ticket.screenshotUrl && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Attachment:</p>
                      <a
                        href={ticket.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={ticket.screenshotUrl}
                          alt="Ticket screenshot"
                          className="max-w-xs h-auto rounded-lg border border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {ticket.replies?.map((reply, i) => {
                const isAdmin = reply.senderType === "admin";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      isAdmin ? "bg-primary-500 text-white" : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    }`}>
                      {reply.senderName?.charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex-1 max-w-[85%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-2 mb-1.5 flex-wrap ${isAdmin ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-semibold text-[var(--text)]">{reply.senderName}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(reply.createdAt)}</span>
                        {isAdmin && (
                          <Badge className="text-primary-400 bg-primary-400/10 border-primary-400/20">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </Badge>
                        )}
                      </div>
                      <div className={`px-4 py-3 text-sm leading-relaxed rounded-2xl whitespace-pre-wrap ${
                        isAdmin
                          ? "bg-primary-500 text-white rounded-tr-sm"
                          : "bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text)] rounded-tl-sm"
                      }`}>
                        {reply.message}
                      </div>
                      
                      {/* Screenshot in reply */}
                      {reply.screenshotUrl && (
                        <div className="mt-2">
                          <a
                            href={reply.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={reply.screenshotUrl}
                              alt="Reply screenshot"
                              className="max-w-32 md:max-w-40 max-h-20 md:max-h-28 rounded-lg border border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty thread */}
              {(!ticket.replies || ticket.replies.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No replies yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 opacity-70">Be the first to respond</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
              {ticket.status === "closed" ? (
                <p className="text-center text-xs text-[var(--text-muted)] py-2">
                  This ticket is closed. Change status to send a reply.
                </p>
              ) : !canReply ? (
                <p className="text-center text-xs text-red-400/70 py-2">
                  Superadmin hasn't allowed you to reply to tickets.
                </p>
              ) : (
                <>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply... (Ctrl+Enter to send)"
                    rows={3}
                    className="input text-sm resize-none w-full"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Ctrl+Enter to send · User gets email notification
                    </span>
                    <button
                      onClick={() => replyMut.mutate()}
                      disabled={!replyText.trim() || replyMut.isPending}
                      className="btn-primary text-sm px-4 py-2 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {replyMut.isPending ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </motion.div>
    </>,
    document.body
  );
}

// ─── Table ────────────────────────────────────────────────────────

function TicketTableHeader() {
  const th = "text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider";
  return (
    <div style={COL_STYLE} className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
      <span className={th}>Subject</span>
      <span className={th}>User</span>
      <span className={th}>Priority</span>
      <span className={th}>Status</span>
      <span className={th}>Assigned To</span>
      <span className={th}>Last Reply</span>
      <span className={`${th} text-right`}>Actions</span>
    </div>
  );
}

function TicketRow({ ticket, onView, onUpdate, onDelete }) {
  return (
    <div
      style={COL_STYLE}
      className="px-4 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group items-center"
      onClick={() => onView(ticket._id)}
    >
      {/* Subject */}
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {ticket.unreadByAdmin > 0 && (
          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="New reply from user" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text)] truncate">{ticket.subject}</p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">{ticket.ticketId}</p>
        </div>
      </div>

      {/* User */}
      <div className="min-w-0 pr-2">
        <p className="text-sm text-[var(--text)] truncate">{ticket.userName}</p>
        <p className="text-[11px] text-[var(--text-muted)] truncate">{ticket.userEmail}</p>
      </div>

      {/* Priority */}
      <div><PriorityBadge priority={ticket.priority} /></div>

      {/* Status — Quick change */}
      <div onClick={e => e.stopPropagation()}>
        <QuickStatusDropdown
          ticketId={ticket._id}
          currentStatus={ticket.status}
          onUpdate={onUpdate}
        />
      </div>

      {/* Assigned To */}
      <div className="truncate pr-2">
        {ticket.assignedToName ? (
          <span className="flex items-center gap-1.5 text-sm text-[var(--text)]">
            <UserCheck className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span className="truncate">{ticket.assignedToName}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
        )}
      </div>

      {/* Last Reply */}
      <div className="text-xs">
        {ticket.lastReplyAt ? (
          <span className={ticket.lastReplyBy === "user" && ticket.unreadByAdmin > 0
            ? "text-blue-400 font-medium"
            : "text-[var(--text-muted)]"
          }>
            {timeAgo(ticket.lastReplyAt)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)] opacity-50">No reply</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onView(ticket._id); }}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-colors font-medium"
        >
          View
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(ticket._id); }}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  const { admin } = useAuthStore();
  const canReply = admin?.permissions?.tickets?.reply === true;
  const canAssign = admin?.permissions?.tickets?.assign === true;
  const canClose = admin?.permissions?.tickets?.close === true;

  // Fetch admins for assign dropdown
  const { data: adminsData } = useQuery({
    queryKey: ["admin-admins-list"],
    queryFn: async () => {
      const r = await adminApi.get("/admins/for-assignment");
      return r.data.data?.admins || [];
    },
  });
  const admins = adminsData || [];

  // Fetch paginated tickets
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tickets", filterStatus, filterPriority, filterAssigned, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page, limit: 20 });
      if (filterStatus !== "all")  p.set("status",     filterStatus);
      if (filterPriority !== "all") p.set("priority",  filterPriority);
      if (filterAssigned === "unassigned") p.set("assignedTo", "null");
      else if (filterAssigned !== "all")  p.set("assignedTo", filterAssigned);
      const r = await adminApi.get(`/tickets?${p}`);
      return r.data.data;
    },
  });

  const allTickets = data?.tickets  || [];
  const total      = data?.total    || 0;
  const totalPages = data?.totalPages || 1;

  // Client-side search
  const tickets = search.trim()
    ? allTickets.filter(tk => {
        const q = search.toLowerCase();
        return tk.subject?.toLowerCase().includes(q) ||
               tk.userName?.toLowerCase().includes(q) ||
               tk.userEmail?.toLowerCase().includes(q) ||
               tk.ticketId?.toLowerCase().includes(q);
      })
    : allTickets;

  // Stats — one background fetch
  const { data: allForStats } = useQuery({
    queryKey: ["admin-tickets-stats"],
    queryFn: async () => {
      const r = await adminApi.get("/tickets?limit=1000");
      return r.data.data?.tickets || [];
    },
    staleTime: 30000,
  });

  const stats = {
    total,
    open:        (allForStats || []).filter(t => t.status === "open").length,
    in_progress: (allForStats || []).filter(t => t.status === "in_progress").length,
    resolved:    (allForStats || []).filter(t => t.status === "resolved").length,
  };

  // Update ticket in cache after quick actions
  const handleTicketUpdate = useCallback((ticketId, changes) => {
    queryClient.setQueryData(
      ["admin-tickets", filterStatus, filterPriority, filterAssigned, page],
      (old) => old
        ? { ...old, tickets: old.tickets.map(tk => tk._id === ticketId ? { ...tk, ...changes } : tk) }
        : old
    );
    queryClient.invalidateQueries(["admin-tickets-stats"]);
  }, [queryClient, filterStatus, filterPriority, filterAssigned, page]);

  // Delete ticket
  const handleTicketDelete = useCallback(async (ticketId) => {
    try {
      await adminApi.delete(`/tickets/${ticketId}`);
      toast.success("Ticket deleted successfully");
      setTicketToDelete(null);
      
      // Remove from cache
      queryClient.setQueryData(
        ["admin-tickets", filterStatus, filterPriority, filterAssigned, page],
        (old) => old
          ? { ...old, tickets: old.tickets.filter(tk => tk._id !== ticketId), total: old.total - 1 }
          : old
      );
      queryClient.invalidateQueries(["admin-tickets-stats"]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete ticket");
    }
  }, [queryClient, filterStatus, filterPriority, filterAssigned, page]);

  // Export CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const r = await adminApi.get("/tickets?limit=10000");
      const all = r.data.data?.tickets || [];
      const header = ["Ticket ID","Subject","User","Email","Category","Priority","Status","Assigned To","Last Reply","Created"];
      const rows = all.map(tk => [
        tk.ticketId,
        `"${(tk.subject || "").replace(/"/g, '""')}"`,
        tk.userName, tk.userEmail, tk.category,
        tk.priority, tk.status,
        tk.assignedToName || "Unassigned",
        tk.lastReplyAt ? new Date(tk.lastReplyAt).toLocaleString("en-IN") : "—",
        new Date(tk.createdAt).toLocaleString("en-IN"),
      ]);
      const csv = [header, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `tickets-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterStatus, filterPriority, filterAssigned, search]);

  const activeFilterCount = [filterStatus, filterPriority, filterAssigned].filter(v => v !== "all").length;
  const isFiltered = search || activeFilterCount > 0;

  const assignFilterOptions = [
    { value: "all",        label: "All Assigned" },
    { value: "unassigned", label: "Unassigned"   },
    ...admins.map(a => ({ value: a._id, label: a.name })),
  ];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Support Tickets</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage and respond to user support requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { refetch(); queryClient.invalidateQueries(["admin-tickets-stats"]); }}
            disabled={isLoading}
            className="btn-secondary gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} loading={isLoading} />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative" style={{ flex: "1 1 240px" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search subject, user, ticket ID..."
              className="input text-sm pl-9 h-fit py-2 w-full"
            />
          </div>

          <div className="w-36">
            <CustomSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} />
          </div>
          <div className="w-36">
            <CustomSelect value={filterPriority} onChange={setFilterPriority} options={PRIORITY_OPTIONS_FILTER} />
          </div>
          <div className="w-40">
            <CustomSelect value={filterAssigned} onChange={setFilterAssigned} options={assignFilterOptions} />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterAssigned("all"); }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-400/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear ({activeFilterCount})
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            {total} ticket{total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <TicketTableHeader />

          {/* Skeleton */}
          {isLoading && [...Array(5)].map((_, i) => (
            <div key={i} style={COL_STYLE} className="px-4 py-4 border-b border-[var(--border)] animate-pulse">
              <div className="space-y-1.5">
                <div className="h-3.5 w-40 bg-[var(--bg-hover)] rounded" />
                <div className="h-2.5 w-24 bg-[var(--bg-hover)] rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-[var(--bg-hover)] rounded" />
                <div className="h-2.5 w-36 bg-[var(--bg-hover)] rounded" />
              </div>
              <div className="h-5 w-16 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-5 w-24 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-4 w-24 bg-[var(--bg-hover)] rounded" />
              <div className="h-3 w-16 bg-[var(--bg-hover)] rounded" />
              <div className="h-7 w-12 bg-[var(--bg-hover)] rounded ml-auto" />
            </div>
          ))}

          {/* Empty state */}
          {!isLoading && tickets.length === 0 && (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-[var(--text)]">
                {isFiltered ? "No tickets match your filters" : "No tickets yet"}
              </p>
              <p className="text-xs mt-1">
                {isFiltered
                  ? "Try adjusting your search or filter criteria"
                  : "When users submit support requests, they'll appear here"
                }
              </p>
              {isFiltered && (
                <button
                  onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterAssigned("all"); setSearch(""); }}
                  className="mt-4 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mx-auto"
                >
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          {!isLoading && tickets.map(ticket => (
            <TicketRow
              key={ticket._id}
              ticket={ticket}
              onView={setSelectedTicketId}
              onUpdate={handleTicketUpdate}
              onDelete={setTicketToDelete}
            />
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-hover)]">
            <span className="text-xs text-[var(--text-muted)]">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--text)]" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      pg === page
                        ? "bg-primary-500 text-white"
                        : "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[var(--text)]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedTicketId && (
          <TicketDrawer
            key={selectedTicketId}
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
            onUpdate={handleTicketUpdate}
            admins={admins}
            canReply={canReply}
            canAssign={canAssign}
            canClose={canClose}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {ticketToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={() => setTicketToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[var(--text)]">Delete Ticket</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Are you sure? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-300">
                  <strong>Ticket ID:</strong> {ticketToDelete}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTicketToDelete(null)}
                  className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTicketDelete(ticketToDelete)}
                  className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}