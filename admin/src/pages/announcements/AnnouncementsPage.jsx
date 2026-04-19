import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  Check,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  Users,
  Mail,
  Bell,
  BellRing,
  ChevronDown,
  ChevronUp,
  Eye,
  Code2,
  FileText,
  Star,
  Copy,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import adminApi from "../../api/axios";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";

// ─── CONSTANTS ──────────────────────────────────────────────────

const TEMPLATE_VARIABLES = [
  { var: "{{userName}}", desc: "Recipient's name" },
  { var: "{{planName}}", desc: "Their current plan" },
  { var: "{{message}}", desc: "Announcement body text" },
  { var: "{{appName}}", desc: "Lexioai" },
  { var: "{{supportEmail}}", desc: "support@lexioai.com" },
  { var: "{{loginUrl}}", desc: "App login link" },
];

const TYPE_OPTIONS = [
  { value: "email", label: "Email only", icon: Mail },
  { value: "inapp", label: "In-App only", icon: Bell },
  { value: "both", label: "Email + In-App", icon: BellRing },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "free", label: "Free Plan" },
  { value: "paid", label: "Paid Users" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
];

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    value: "medium",
    label: "Medium",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  {
    value: "high",
    label: "High",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
  },
];

const STATUS_META = {
  draft: {
    label: "Draft",
    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  sending: {
    label: "Sending…",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  sent: {
    label: "Sent",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  failed: {
    label: "Failed",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  partial: {
    label: "Partial",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── CUSTOM SELECT ───────────────────────────────────────────────
// Replaces <select> with a styled dropdown — fully theme-aware

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-sm h-fit py-2 w-full flex items-center justify-between gap-2 text-left"
      >
        <span
          className={
            selected ? "text-[var(--text)]" : "text-[var(--text-muted)]"
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
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
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  opt.value === value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className={opt.value === value ? "" : "ml-5"}>
                  {opt.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CUSTOM DATETIME PICKER ──────────────────────────────────────
// Calendar + Time picker with 12-hour format (AM/PM) and instant year/month selection

function CustomDateTimePicker({ value, onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return minDate ? new Date(minDate) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    value ? new Date(value) : null,
  );
  const [hour, setHour] = useState(() =>
    value ? new Date(value).getHours() : new Date().getHours(),
  );
  const [minute, setMinute] = useState(() =>
    value ? new Date(value).getMinutes() : 0,
  );
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const firstDay = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0,
  ).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = minDate ? new Date(minDate) : null;
  if (minD) minD.setHours(0, 0, 0, 0);

  const isDisabled = (d) => {
    const day = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    if (minD && day < minD) return true;
    return false;
  };

  const isSelected = (d) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === d &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (d) => {
    const now = new Date();
    return (
      now.getDate() === d &&
      now.getMonth() === viewDate.getMonth() &&
      now.getFullYear() === viewDate.getFullYear()
    );
  };

  // Format as local datetime string (not UTC) for backend
  const formatLocalDateTime = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const selectDay = (d) => {
    const newDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      d,
      hour,
      minute,
    );
    setSelectedDate(newDate);
    onChange(formatLocalDateTime(newDate));
  };

  const applyTime = (h, m) => {
    setHour(h);
    setMinute(m);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(h, m);
      setSelectedDate(newDate);
      onChange(formatLocalDateTime(newDate));
    }
  };

  // Convert 24-hour to 12-hour with AM/PM
  const displayHour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";

  const displayValue = selectedDate
    ? `${selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${String(displayHour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`
    : "";

  const currentYear = viewDate.getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - 25 + i);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-sm h-fit py-2 w-full flex items-center gap-2 text-left"
      >
        <Calendar className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <span
          className={
            displayValue ? "text-[var(--text)]" : "text-[var(--text-muted)]"
          }
        >
          {displayValue || "Pick date & time"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[999] left-0 top-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row">
              {/* ─── CALENDAR LEFT ─── */}
              <div className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
                {/* Month & Year Selector - INLINE */}
                <div className="px-3 py-2 border-b border-[var(--border)] space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Month Buttons */}
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase px-1">
                        Month
                      </p>
                      <div className="grid grid-cols-3 gap-0.5">
                        {MONTHS.map((m, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setViewDate(
                                (d) => new Date(d.getFullYear(), i, 1),
                              )
                            }
                            className={`text-[10px] font-medium px-1.5 py-1 rounded transition-colors ${
                              viewDate.getMonth() === i
                                ? "bg-primary-500 text-white"
                                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
                            }`}
                          >
                            {m.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Year Dropdown */}
                    <div className="space-y-0.5 relative">
                      <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase px-1">
                        Year
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        className="input text-[10px] py-1.5 w-full flex items-center justify-between px-2"
                      >
                        <span>{currentYear}</span>
                        <ChevronDown
                          className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${showYearDropdown ? "rotate-180" : ""}`}
                        />
                      </button>

                      {showYearDropdown && (
                        <div className="absolute z-[9999] left-0 right-0  bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
                          <div className="max-h-[200px] overflow-y-auto">
                            {years.map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => {
                                  setViewDate(
                                    (d) => new Date(y, d.getMonth(), 1),
                                  );
                                  setShowYearDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                                  y === currentYear
                                    ? "bg-primary-500 text-white font-semibold"
                                    : "text-[var(--text)] hover:bg-[var(--bg-hover)]"
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 px-1.5 pt-1.5">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div
                      key={d}
                      className="text-center text-[8px] font-semibold text-[var(--text-muted)] py-0.5"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 px-1.5 pb-2 gap-y-0.5">
                  {Array(firstDay)
                    .fill(null)
                    .map((_, i) => (
                      <div key={`e-${i}`} />
                    ))}
                  {Array(daysInMonth)
                    .fill(null)
                    .map((_, i) => {
                      const d = i + 1;
                      const disabled = isDisabled(d);
                      const sel = isSelected(d);
                      const tod = isToday(d);
                      return (
                        <button
                          key={d}
                          disabled={disabled}
                          onClick={() => selectDay(d)}
                          className={`w-6 h-6 mx-auto rounded text-xs font-medium transition-colors flex items-center justify-center
                          ${disabled ? "opacity-30 cursor-not-allowed text-[var(--text-muted)]" : ""}
                          ${sel ? "bg-primary-500 text-white font-bold" : ""}
                          ${!sel && tod ? "border border-primary-400 text-primary-400" : ""}
                          ${!sel && !tod && !disabled ? "text-[var(--text)] hover:bg-[var(--bg-hover)]" : ""}
                        `}
                        >
                          {d}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* ─── TIME RIGHT ─── */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 lg:py-5 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Time
                </p>

                {/* Hour */}
                <div className="w-full space-y-1">
                  <label className="text-[8px] text-[var(--text-muted)] block text-center font-semibold">
                    Hour (1-12)
                  </label>
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => applyTime((hour - 1 + 24) % 24, minute)}
                      className="p-1 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/70 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={displayHour12}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 1;
                        if (val < 1) val = 1;
                        if (val > 12) val = 12;
                        let val24 =
                          val === 12
                            ? ampm === "AM"
                              ? 0
                              : 12
                            : ampm === "AM"
                              ? val
                              : val + 12;
                        applyTime(val24, minute);
                      }}
                      className="input text-sm text-center font-bold w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none]"
                    />
                    <button
                      type="button"
                      onClick={() => applyTime((hour + 1) % 24, minute)}
                      className="p-1 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/70 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <span className="text-lg font-light text-[var(--text-muted)]">
                  :
                </span>

                {/* Minute */}
                <div className="w-full space-y-1">
                  <label className="text-[8px] text-[var(--text-muted)] block text-center font-semibold">
                    Minute (0-59)
                  </label>
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => applyTime(hour, (minute - 5 + 60) % 60)}
                      className="p-1 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/70 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minute}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        if (val < 0) val = 0;
                        if (val > 59) val = 59;
                        applyTime(hour, val);
                      }}
                      className="input text-sm text-center font-bold w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none]"
                    />
                    <button
                      type="button"
                      onClick={() => applyTime(hour, (minute + 5) % 60)}
                      className="p-1 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/70 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* AM/PM Toggle */}
                <div className="flex gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (ampm === "PM") applyTime(hour - 12, minute);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                      ampm === "AM"
                        ? "bg-primary-500 text-white"
                        : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (ampm === "AM") applyTime(hour + 12, minute);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                      ampm === "PM"
                        ? "bg-primary-500 text-white"
                        : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    PM
                  </button>
                </div>

                {/* Done button */}
                <button
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full justify-center text-xs py-2 mt-1"
                  disabled={!selectedDate}
                >
                  <Check className="w-3 h-3" /> Confirm
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SMALL HELPERS ───────────────────────────────────────────────

const Badge = ({ className, children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
  >
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <Badge className={m.color}>{m.label}</Badge>;
};
const PriorityBadge = ({ priority }) => {
  const m =
    PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];
  return <Badge className={m.color}>{m.label}</Badge>;
};

// ─── STATS CARDS ────────────────────────────────────────────────

function StatsCards({ stats, loading }) {
  const cards = [
    {
      label: "Total Sent",
      value: stats?.totalSent ?? stats?.total ?? 0,
      icon: Megaphone,
      color: "text-primary-400",
      bg: "bg-primary-400/10",
    },
    {
      label: "Total Recipients",
      value: stats?.totalRecipients ?? 0,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Failed / Partial",
      value: stats?.failed ?? 0,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      label: "Scheduled",
      value: stats?.scheduled ?? 0,
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
  ];
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((s) => (
        <div key={s.label} className="card p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}
          >
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-12 bg-[var(--bg-hover)] rounded animate-pulse mb-1" />
            ) : (
              <p className="text-xl font-bold text-[var(--text)]">
                {s.value.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-[var(--text-muted)] truncate">
              {s.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DELETE MODAL ───────────────────────────────────────────────

function DeleteModal({ title, onClose, onConfirm, loading }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text)] text-center mb-2">
          Delete Announcement?
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          "<span className="text-[var(--text)]">{title}</span>" will be
          permanently deleted.
          <br />
          This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1 justify-center"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}{" "}
            Delete
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ─── CREATE ANNOUNCEMENT MODAL ───────────────────────────────────

function CreateAnnouncementModal({ onClose }) {
  const queryClient = useQueryClient();

  const { data: templatesData } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const r = await adminApi.get("/email-templates");
      return r.data.data?.templates ?? r.data.data ?? [];
    },
  });

  const [tab, setTab] = useState("content");
  const [form, setForm] = useState({
    title: "",
    emailSubject: "",
    message: "",
    emailTemplateId: "",
    type: "both",
    targetAudience: "all",
    priority: "medium",
    sendNow: true,
    scheduledAt: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.post("/announcements", {
        ...form,
        emailTemplateId: form.emailTemplateId || null,
        scheduledAt:
          !form.sendNow && form.scheduledAt ? form.scheduledAt : null,
      }),
    onSuccess: () => {
      toast.success(
        form.sendNow
          ? "Announcement is being sent!"
          : "Announcement scheduled!",
      );
      queryClient.invalidateQueries(["admin-announcements"]);
      queryClient.invalidateQueries(["admin-announcement-stats"]);
      onClose();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || "Failed to create"),
  });

  const canSave =
    form.title.trim() &&
    form.message.trim() &&
    (form.sendNow || form.scheduledAt);
  const showEmailSubject = form.type === "email" || form.type === "both";
  const activeTemplates = (templatesData || []).filter((t) => t.isActive);

  // Build template options for CustomSelect
  const templateOptions = [
    { value: "", label: "Default plain template" },
    ...activeTemplates.map((t) => ({
      value: t._id,
      label: t.name + (t.isDefault ? " ⭐" : ""),
    })),
  ];

  // Build filter options for status/type selects
  const statusOptions = [
    { value: "all", label: "All Status" },
    ...Object.entries(STATUS_META).map(([k, v]) => ({
      value: k,
      label: v.label,
    })),
  ];
  const typeFilterOptions = [
    { value: "all", label: "All Types" },
    ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text)]">
                Create Announcement
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Send or schedule a message to users
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex border-b border-[var(--border)]">
            {[
              { id: "content", label: "Content" },
              { id: "settings", label: "Settings" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? "border-primary-500 text-primary-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">
          {/* CONTENT TAB */}
          {tab === "content" && (
            <>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="input text-sm h-fit py-2 w-full"
                  placeholder="e.g. New Feature Alert 🚀"
                  maxLength={200}
                />
              </div>

              {showEmailSubject && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                    Email Subject{" "}
                    <span className="normal-case font-normal opacity-70">
                      (blank = use title)
                    </span>
                  </label>
                  <input
                    value={form.emailSubject}
                    onChange={(e) => set("emailSubject", e.target.value)}
                    className="input text-sm h-fit py-2 w-full"
                    placeholder="e.g. Exciting news from {{appName}}!"
                    maxLength={300}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                  Message *{" "}
                  <span className="normal-case font-normal opacity-70">
                    (markdown supported)
                  </span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  className="input text-sm resize-none w-full"
                  rows={5}
                  placeholder="Write your announcement here. Use {{userName}}, {{planName}}, etc."
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {form.message.length}/10000
                </p>
              </div>

              {showEmailSubject && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                    Email Template{" "}
                    <span className="normal-case font-normal opacity-70">
                      (optional)
                    </span>
                  </label>
                  <CustomSelect
                    value={form.emailTemplateId}
                    onChange={(v) => set("emailTemplateId", v)}
                    options={templateOptions}
                    placeholder="Default plain template"
                  />
                </div>
              )}
            </>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <>
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Delivery Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = form.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => set("type", opt.value)}
                        className={`p-3 rounded-xl border text-center transition-colors ${
                          active
                            ? "border-primary-500/50 bg-primary-500/10"
                            : "border-[var(--border)] bg-[var(--bg-hover)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mx-auto mb-1 ${active ? "text-primary-400" : "text-[var(--text-muted)]"}`}
                        />
                        <p
                          className={`text-xs font-medium ${active ? "text-primary-400" : "text-[var(--text-muted)]"}`}
                        >
                          {opt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Target Audience *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const active = form.targetAudience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => set("targetAudience", opt.value)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors text-center ${
                          active
                            ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                            : "border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-muted)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {form.targetAudience === "paid" && (
                  <p className="text-xs text-emerald-400 mt-1.5">
                    Includes Starter + Pro + Business users
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Priority
                </label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set("priority", opt.value)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors capitalize ${
                        form.priority === opt.value
                          ? opt.color
                          : "border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-muted)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Timing
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => set("sendNow", true)}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                      form.sendNow
                        ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> Send Now
                  </button>
                  <button
                    onClick={() => set("sendNow", false)}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                      !form.sendNow
                        ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Schedule
                  </button>
                </div>

                {!form.sendNow && (
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1.5">
                      Schedule Date & Time *
                    </label>
                    <CustomDateTimePicker
                      value={form.scheduledAt}
                      onChange={(v) => set("scheduledAt", v)}
                      minDate={(() => {
                        const d = new Date(Date.now() + 60000);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const h = String(d.getHours()).padStart(2, '0');
                        const min = String(d.getMinutes()).padStart(2, '0');
                        return `${y}-${m}-${day}T${h}:${min}`;
                      })()}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !canSave}
            className="btn-primary flex-1 justify-center"
          >
            {createMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : form.sendNow ? (
              <Send className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {form.sendNow ? "Send Now" : "Schedule"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ─── TABLE CONFIG ────────────────────────────────────────────────

const COL_STYLE = {
  display: "grid",
  gridTemplateColumns: "minmax(200px,1fr) 90px 100px 80px 140px 120px 100px",
  alignItems: "center",
  gap: "12px",
};

function AnnouncementTableHeader() {
  const th =
    "text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider";
  return (
    <div
      style={COL_STYLE}
      className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]"
    >
      <span className={th}>Announcement</span>
      <span className={th}>Type</span>
      <span className={th}>Target</span>
      <span className={th}>Priority</span>
      <span className={th}>Stats</span>
      <span className={th}>Status</span>
      <span className={`${th} text-right`}>Actions</span>
    </div>
  );
}

function AnnouncementRow({ ann, onDelete, onResend, resending, canDelete }) {
  const typeLabel =
    TYPE_OPTIONS.find((t) => t.value === ann.type)?.label || ann.type;
  const audienceLabel =
    AUDIENCE_OPTIONS.find((a) => a.value === ann.targetAudience)?.label ||
    ann.targetAudience;
  const canResend = ["failed", "partial"].includes(ann.status);

  return (
    <div
      style={COL_STYLE}
      className="px-4 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {ann.title}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {ann.message?.slice(0, 80)}
          {ann.message?.length > 80 ? "…" : ""}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {ann.createdBy?.name || "Admin"} ·{" "}
          {new Date(ann.createdAt).toLocaleDateString("en-IN")}
          {ann.scheduledAt && ann.status === "scheduled" && (
            <span className="ml-1 text-blue-400">
              · Scheduled{" "}
              {new Date(ann.scheduledAt).toLocaleString("en-IN", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </p>
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)] capitalize">
          {typeLabel}
        </span>
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)] capitalize">
          {audienceLabel}
        </span>
      </div>
      <div>
        <PriorityBadge priority={ann.priority} />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">
          <span className="text-emerald-400 font-medium">
            {ann.sentCount || 0}
          </span>
          {" / "}
          <span className="text-[var(--text)]">{ann.totalRecipients || 0}</span>
          {ann.failedCount > 0 && (
            <span className="text-red-400 ml-1">
              ({ann.failedCount} failed)
            </span>
          )}
        </p>
        {ann.totalRecipients > 0 && (
          <div className="mt-1.5 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden w-24">
            <div
              className={`h-full rounded-full ${ann.failedCount > 0 && ann.sentCount === 0 ? "bg-red-400" : "bg-emerald-400"}`}
              style={{
                width: `${Math.min(100, ((ann.sentCount || 0) / ann.totalRecipients) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>
      <div>
        <StatusBadge status={ann.status} />
      </div>
      <div className="flex items-center justify-end gap-0.5">
        {canResend && (
          <button
            onClick={() => onResend(ann._id)}
            disabled={resending === ann._id}
            title="Resend to failed"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-400/5 transition-colors"
          >
            {resending === ann._id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(ann)}
            title="Delete"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── EMAIL TEMPLATE EDITOR MODAL ─────────────────────────────────

function TemplateEditorModal({ template, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!template?._id;
  const textareaRef = useRef(null);
  const [tab, setTab] = useState("editor");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState({
    name: template?.name || "",
    description: template?.description || "",
    subject: template?.subject || "",
    htmlBody: template?.htmlBody || getDefaultHtmlBody(),
    isDefault: template?.isDefault || false,
    isActive: template?.isActive !== false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function getDefaultHtmlBody() {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
    <h1 style="color:#ffffff;margin:0;font-size:24px">{{appName}}</h1>
  </div>
  <h2 style="color:#1f2937;font-size:20px;margin-bottom:8px">Hi {{userName}},</h2>
  <p style="color:#374151;line-height:1.7;margin-bottom:24px">{{message}}</p>
  <div style="text-align:center;margin-bottom:32px">
    <a href="{{loginUrl}}" style="background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Open App</a>
  </div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px"/>
  <p style="color:#9ca3af;font-size:12px;text-align:center">
    You're on the <strong>{{planName}}</strong> plan · 
    <a href="mailto:{{supportEmail}}" style="color:#6366f1">{{supportEmail}}</a> · {{appName}}
  </p>
</div>`;
  }

  const insertVar = (varStr) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    set(
      "htmlBody",
      form.htmlBody.slice(0, start) + varStr + form.htmlBody.slice(end),
    );
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + varStr.length;
      el.focus();
    }, 0);
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await adminApi.post("/email-templates/preview-raw", {
        htmlBody: form.htmlBody,
        subject: form.subject,
      });
      setPreviewHtml(res.data.data?.html || form.htmlBody);
    } catch {
      setPreviewHtml(form.htmlBody);
    }
    setPreviewLoading(false);
  };

  const saveMut = useMutation({
    mutationFn: () =>
      isEdit
        ? adminApi.put(`/email-templates/${template._id}`, form)
        : adminApi.post("/email-templates", form),
    onSuccess: () => {
      toast.success(isEdit ? "Template updated!" : "Template created!");
      queryClient.invalidateQueries(["admin-email-templates"]);
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Save failed"),
  });

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text)]">
                {isEdit ? `Edit — ${template.name}` : "Create Email Template"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                HTML email template with variable support
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                Template Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="input text-sm h-fit py-2 w-full"
                placeholder="e.g. Welcome Email"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                Subject *
              </label>
              <input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                className="input text-sm h-fit py-2 w-full"
                placeholder="e.g. Hello {{userName}} 👋"
              />
            </div>
          </div>
          <div className="flex border-b border-[var(--border)] gap-1">
            {[
              { id: "editor", label: "HTML Editor", icon: Code2 },
              { id: "preview", label: "Preview", icon: Eye },
              { id: "vars", label: "Variables", icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (t.id === "preview") fetchPreview();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    tab === t.id
                      ? "border-primary-500 text-primary-400"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-3 pb-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => set("isDefault", e.target.checked)}
                  className="accent-primary-500"
                />{" "}
                Default
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="accent-primary-500"
                />{" "}
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "editor" && (
            <textarea
              ref={textareaRef}
              value={form.htmlBody}
              onChange={(e) => set("htmlBody", e.target.value)}
              className="w-full h-full min-h-[340px] p-4 font-mono text-xs bg-[var(--bg)] text-[var(--text)] resize-none outline-none border-none"
              spellCheck={false}
              placeholder="Write your HTML email here..."
            />
          )}
          {tab === "preview" && (
            <div className="p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Rendering
                  preview...
                </div>
              ) : previewHtml ? (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="bg-[var(--bg-hover)] px-3 py-2 flex items-center gap-2 border-b border-[var(--border)]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Email Preview (dummy data)
                    </span>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full bg-white"
                    style={{ height: "400px", border: "none" }}
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                  <button
                    onClick={fetchPreview}
                    className="btn-secondary gap-2"
                  >
                    <Eye className="w-4 h-4" /> Load Preview
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === "vars" && (
            <div className="p-4 space-y-2">
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Click any variable to insert it at cursor position in the
                editor.
              </p>
              {TEMPLATE_VARIABLES.map((v) => (
                <div
                  key={v.var}
                  className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded-xl border border-[var(--border)] hover:border-primary-500/30 transition-colors"
                >
                  <div>
                    <code className="text-sm font-mono text-primary-400">
                      {v.var}
                    </code>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {v.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      insertVar(v.var);
                      setTab("editor");
                      toast.success(`Inserted ${v.var}`);
                    }}
                    className="btn-secondary text-xs px-2.5 py-1 shrink-0 gap-1"
                  >
                    <Copy className="w-3 h-3" /> Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={
              saveMut.isPending ||
              !form.name.trim() ||
              !form.subject.trim() ||
              !form.htmlBody.trim()
            }
            className="btn-primary flex-1 justify-center"
          >
            {saveMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isEdit ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ─── EMAIL TEMPLATES SECTION ──────────────────────────────────────

function EmailTemplatesSection({ canDelete }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const r = await adminApi.get("/email-templates");
      return r.data.data?.templates ?? r.data.data ?? [];
    },
  });
  const templates = data || [];

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.delete(`/email-templates/${id}`),
    onSuccess: () => {
      toast.success("Template deleted!");
      queryClient.invalidateQueries(["admin-email-templates"]);
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Delete failed"),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id) => adminApi.patch(`/email-templates/${id}/set-default`),
    onSuccess: () => {
      toast.success("Default template updated!");
      queryClient.invalidateQueries(["admin-email-templates"]);
    },
    onError: () => toast.error("Failed to set default"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">
            Email Templates
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Custom HTML templates for announcement emails
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="btn-primary text-sm py-2"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 w-40 bg-[var(--bg-hover)] rounded mb-2" />
              <div className="h-3 w-60 bg-[var(--bg-hover)] rounded" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card py-12 text-center text-[var(--text-muted)]">
          <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No email templates yet</p>
          <p className="text-xs mt-1">
            Announcements will use the default plain template
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t._id} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary-400/10 flex items-center justify-center shrink-0">
                <LayoutTemplate className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {t.name}
                  </p>
                  {t.isDefault && (
                    <Badge className="text-amber-400 bg-amber-400/10 border-amber-400/20">
                      <Star className="w-3 h-3" />
                      Default
                    </Badge>
                  )}
                  {!t.isActive && (
                    <Badge className="text-gray-400 bg-gray-400/10 border-gray-400/20">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {t.subject}
                </p>
                {t.usedVariables?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {t.usedVariables.slice(0, 4).map((v) => (
                      <code
                        key={v}
                        className="text-[10px] bg-primary-400/10 text-primary-400 px-1.5 py-0.5 rounded"
                      >
                        {v}
                      </code>
                    ))}
                    {t.usedVariables.length > 4 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        +{t.usedVariables.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!t.isDefault && (
                  <button
                    onClick={() => setDefaultMut.mutate(t._id)}
                    disabled={setDefaultMut.isPending}
                    title="Set as default"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-400/5 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setEditing(t)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(t)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <TemplateEditorModal
            template={Object.keys(editing).length > 0 ? editing : null}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            title={deleteTarget.name}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteMut.mutate(deleteTarget._id)}
            loading={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { admin } = useAuthStore()
  const queryClient = useQueryClient();
  
  // Permission checks
  const canCreate = admin?.permissions?.announcements?.create === true
  const canDelete = admin?.permissions?.announcements?.delete === true

  const [mainTab, setMainTab] = useState("announcements");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resending, setResending] = useState(null);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-announcement-stats"],
    queryFn: async () => {
      const r = await adminApi.get("/announcements/stats");
      return r.data.data || {};
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements", filterStatus, filterType],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filterStatus !== "all") p.set("status", filterStatus);
      if (filterType !== "all") p.set("type", filterType);
      const r = await adminApi.get(`/announcements?${p}`);
      return r.data.data?.announcements ?? r.data.data ?? [];
    },
  });

  const announcements = data || [];
  const filtered = announcements.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) || a.message?.toLowerCase().includes(q)
    );
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.delete(`/announcements/${id}`),
    onSuccess: () => {
      toast.success("Announcement deleted!");
      queryClient.invalidateQueries(["admin-announcements"]);
      queryClient.invalidateQueries(["admin-announcement-stats"]);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Delete failed"),
  });

  const handleResend = async (id) => {
    setResending(id);
    try {
      await adminApi.post(`/announcements/${id}/resend`);
      toast.success("Resending to failed recipients...");
      queryClient.invalidateQueries(["admin-announcements"]);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Resend failed");
    }
    setResending(null);
  };

  // CustomSelect options for filters
  const statusFilterOptions = [
    { value: "all", label: "All Status" },
    ...Object.entries(STATUS_META).map(([k, v]) => ({
      value: k,
      label: v.label,
    })),
  ];
  const typeFilterOptions = [
    { value: "all", label: "All Types" },
    ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Announcements
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Broadcast messages to your users
          </p>
        </div>
        {mainTab === "announcements" && (
          canCreate ? (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          ) : (
            <div className="text-xs text-red-400/70" title="Superadmin hasn't allowed you">
              ⊘ Can't create
            </div>
          )
        )}
      </div>

      {/* Stats */}
      <StatsCards stats={statsData} loading={statsLoading} />

      {/* Main Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {[
          { id: "announcements", label: "Announcements", icon: Megaphone },
          { id: "templates", label: "Email Templates", icon: LayoutTemplate },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                mainTab === t.id
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ANNOUNCEMENTS TAB */}
      {mainTab === "announcements" && (
        <>
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative" style={{ flex: "1 1 240px" }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input text-sm pl-9 h-fit py-2 w-full"
                  placeholder="Search announcements..."
                />
              </div>
              <button
                onClick={() => setShowFilters((f) => !f)}
                className={`btn-secondary gap-2 shrink-0 ${showFilters ? "text-primary-400 border-primary-500/30" : ""}`}
              >
                <Search className="w-4 h-4" /> Filters
                {showFilters ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "visible" }}
                  className="relative z-40"
                >
                  <div className="grid grid-cols-2 gap-3 pt-3 pb-3 border-t border-[var(--border)]">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">
                        Status
                      </label>
                      <CustomSelect
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={statusFilterOptions}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">
                        Type
                      </label>
                      <CustomSelect
                        value={filterType}
                        onChange={setFilterType}
                        options={typeFilterOptions}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <AnnouncementTableHeader />
              {isLoading &&
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    style={COL_STYLE}
                    className="px-4 py-4 border-b border-[var(--border)] animate-pulse"
                  >
                    <div className="space-y-2">
                      <div className="h-3.5 w-48 bg-[var(--bg-hover)] rounded" />
                      <div className="h-2.5 w-64 bg-[var(--bg-hover)] rounded" />
                    </div>
                    {[...Array(5)].map((_, j) => (
                      <div
                        key={j}
                        className="h-5 w-16 bg-[var(--bg-hover)] rounded-full"
                      />
                    ))}
                    <div className="h-4 w-16 bg-[var(--bg-hover)] rounded ml-auto" />
                  </div>
                ))}
              {!isLoading && filtered.length === 0 && (
                <div className="py-16 text-center text-[var(--text-muted)]">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {search || filterStatus !== "all" || filterType !== "all"
                      ? "No announcements match your filters"
                      : "No announcements yet — create your first!"}
                  </p>
                </div>
              )}
              {!isLoading &&
                filtered.map((ann) => (
                  <AnnouncementRow
                    key={ann._id}
                    ann={ann}
                    onDelete={setDeleteTarget}
                    onResend={handleResend}
                    resending={resending}
                    canDelete={canDelete}
                  />
                ))}
            </div>
            {!isLoading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  {filtered.length} announcement
                  {filtered.length !== 1 ? "s" : ""}
                  {(search || filterStatus !== "all" || filterType !== "all") &&
                    " (filtered)"}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TEMPLATES TAB */}
      {mainTab === "templates" && <EmailTemplatesSection canDelete={canDelete} />}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateAnnouncementModal onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            title={deleteTarget.title}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteMut.mutate(deleteTarget._id)}
            loading={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
