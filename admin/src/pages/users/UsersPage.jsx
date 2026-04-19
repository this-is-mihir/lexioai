import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Download, RefreshCw, Eye,
  X, CheckCircle, UserX, AlertTriangle, Shield,
  ChevronLeft, ChevronRight, Loader2, Ban, Trash2,
  Mail, Crown, CreditCard, Check, ChevronDown, CalendarClock
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// ================================================================
// CUSTOM DROPDOWN COMPONENT FOR PLANS
// ================================================================
const PlanDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const planOptions = [
    { value: "", label: "All Plans" },
    { value: "free", label: "Free" },
    { value: "starter", label: "Starter" },
    { value: "pro", label: "Pro" },
    { value: "business", label: "Business" },
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

  const selectedOption = planOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Plans"}</span>
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
            {planOptions.map((option) => (
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
// CUSTOM DROPDOWN COMPONENT FOR STATUS
// ================================================================
const StatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "banned", label: "Banned" },
    { value: "unverified", label: "Unverified" },
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
// CUSTOM DROPDOWN COMPONENT FOR PLAN (Modal)
// ================================================================
const PlanSelectDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const planOptions = [
    { value: "free", label: "Free" },
    { value: "starter", label: "Starter" },
    { value: "pro", label: "Pro" },
    { value: "business", label: "Business" },
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

  const selectedOption = planOptions.find((opt) => opt.value === value);

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span className="capitalize">{selectedOption?.label || "Select Plan"}</span>
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
            {planOptions.map((option) => (
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

const BillingCycleDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const options = [
    { value: '', label: 'Select cycle' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || 'Select cycle'}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
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
            {options.map((option) => (
              <button
                type="button"
                key={option.value || 'empty'}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between ${
                  value === option.value
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-[var(--text)]'
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
  )
}

// ================================================================
// BADGES
// ================================================================
const PlanBadge = ({ plan }) => {
  const map = {
    free:     'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    starter:  'bg-primary-500/10 text-primary-400 border border-primary-500/20',
    pro:      'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    business: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[plan] || map.free}`}>
      {plan}
    </span>
  )
}

const StatusBadge = ({ user }) => {
  if (user.isBanned)
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><UserX className="w-3 h-3" />Banned</span>
  if (!user.isEmailVerified)
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3 h-3" />Unverified</span>
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3 h-3" />Active</span>
}

// ----------------------------------------------------------------
// USER MODAL
// ----------------------------------------------------------------
const UserModal = ({ user, onClose }) => {
  const queryClient = useQueryClient()
  const { admin } = useAuthStore()
  const [tab, setTab] = useState('details')
  const [newPlan, setNewPlan] = useState(user.plan)
  const [newBillingCycle, setNewBillingCycle] = useState('')
  const [credits, setCredits] = useState('')
  const [banReason, setBanReason] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  // Permission checks
  const canEdit = admin?.permissions?.users?.edit === true
  const canBan = admin?.permissions?.users?.ban === true
  const canDelete = admin?.permissions?.users?.delete === true

  const invalidate = () => queryClient.invalidateQueries(['admin-users'])

  const getExpiryPreview = () => {
    if (newPlan === 'free' || !newBillingCycle) return 'No expiry for free plan'
    const now = new Date()
    if (newBillingCycle === 'yearly') now.setFullYear(now.getFullYear() + 1)
    else now.setMonth(now.getMonth() + 1)
    return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const canSubmitPlan = newPlan === 'free' ? (newPlan !== user.plan) : Boolean(newBillingCycle)

  const planMut    = useMutation({
    mutationFn: () => adminApi.put(`/users/${user._id}/plan`, {
      plan: newPlan,
      ...(newPlan !== 'free' ? { billingCycle: newBillingCycle } : {}),
    }),
    onSuccess: () => {
      toast.success('Plan updated!')
      invalidate()
    },
  })
  const creditsMut = useMutation({ mutationFn: () => adminApi.post(`/users/${user._id}/credits`, { credits: parseInt(credits), reason: 'Admin manual' }), onSuccess: () => { toast.success(`${credits} credits added!`); setCredits(''); invalidate() } })
  const banMut     = useMutation({ mutationFn: () => adminApi.post(`/users/${user._id}/ban`, { reason: banReason }), onSuccess: () => { toast.success('User banned!'); invalidate(); onClose() } })
  const unbanMut   = useMutation({ mutationFn: () => adminApi.post(`/users/${user._id}/unban`), onSuccess: () => { toast.success('User unbanned!'); invalidate(); onClose() } })
  const verifyMut  = useMutation({ mutationFn: () => adminApi.post(`/users/${user._id}/verify-email`), onSuccess: () => { toast.success('Email verified!'); invalidate(); onClose() } })
  const emailMut   = useMutation({ mutationFn: () => adminApi.post(`/users/${user._id}/send-email`, { subject: emailSubject, message: emailBody }), onSuccess: () => { toast.success('Email sent!'); setEmailSubject(''); setEmailBody('') } })
  const deleteMut  = useMutation({ mutationFn: () => adminApi.delete(`/users/${user._id}`), onSuccess: () => { toast.success('User deleted!'); invalidate(); onClose() } })

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-500/10 border-2 border-primary-500/20 flex items-center justify-center shrink-0">
                {user.avatar
                  ? <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                  : <span className="font-bold text-primary-400">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[var(--text)] text-sm">{user.name || 'No Name'}</span>
                  <PlanBadge plan={user.plan} />
                  <StatusBadge user={user} />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 ml-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {['details', 'actions', 'email'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 min-h-0">

          {/* DETAILS */}
          {tab === 'details' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'User ID',         value: user._id?.slice(-12) || '—', mono: true },
                { label: 'Username',        value: user.username ? `@${user.username}` : '—' },
                { label: 'Plan',            value: <PlanBadge plan={user.plan} /> },
                { label: 'Credits',         value: user.chatCredits ?? 0 },
                { label: 'Email Verified',  value: user.isEmailVerified ? '✅ Yes' : '❌ No' },
                { label: '2FA Enabled',     value: user.twoFactorEnabled ? '✅ Yes' : '❌ No' },
                { label: 'Profile %',       value: `${user.profileCompletion || 0}%` },
                { label: 'Location',        value: user.location?.city ? `${user.location.city}, ${user.location.country}` : '—' },
                { label: 'Joined',          value: new Date(user.createdAt).toLocaleDateString('en-IN') },
                { label: 'Last Updated',    value: new Date(user.updatedAt || user.createdAt).toLocaleDateString('en-IN') },
                { label: 'Registration IP', value: user.registrationIP || '—', mono: true },
                { label: 'Referral Code',   value: user.referralCode || '—', mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} className="bg-[var(--bg-hover)] rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
                  <div className={`text-sm font-medium text-[var(--text)] ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
                </div>
              ))}
              {user.isBanned && (
                <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-400 mb-1">⛔ Ban Reason</p>
                  <p className="text-sm text-[var(--text)]">{user.bannedReason}</p>
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}
          {tab === 'actions' && (
            <div className="space-y-3">
              {!canEdit && !canBan && !canDelete && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">No Permissions</p>
                    <p className="text-xs text-red-400/70 mt-0.5">Superadmin hasn't allowed you to perform any actions on users.</p>
                  </div>
                </div>
              )}
              {/* Change Plan - needs edit permission */}
              {canEdit && (
                <div className="p-4 bg-[var(--bg-hover)] rounded-xl">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Change Plan</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <PlanSelectDropdown 
                        value={newPlan}
                        onChange={(value) => {
                          setNewPlan(value)
                          if (value === 'free') setNewBillingCycle('')
                        }}
                      />
                    </div>

                    {newPlan !== 'free' ? (
                      <>
                        <BillingCycleDropdown
                          value={newBillingCycle}
                          onChange={setNewBillingCycle}
                        />
                        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <CalendarClock className="w-3.5 h-3.5 text-primary-400" />
                          Auto expiry preview: {getExpiryPreview()}
                        </p>
                      </>
                    ) : null}

                    <button onClick={() => planMut.mutate()} disabled={planMut.isPending || !canSubmitPlan}
                      className="btn-primary text-sm h-fit py-2 w-full justify-center">
                      {planMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                      Update
                    </button>
                  </div>
                </div>
              )}

              {/* Add Credits - needs edit permission */}
              {canEdit && (
                <div className="p-4 bg-[var(--bg-hover)] rounded-xl">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Add Chat Credits</p>
                  <div className="flex gap-2">
                    <input type="number" value={credits} onChange={e => setCredits(e.target.value)}
                      placeholder="Enter amount" className="input text-sm h-fit py-2 flex-1 min-w-0" min="1" />
                    <button onClick={() => creditsMut.mutate()} disabled={creditsMut.isPending || !credits}
                      className="btn-primary text-sm h-fit py-2 shrink-0">
                      {creditsMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Verify / Unban */}
              {((!user.isEmailVerified && canEdit) || (user.isBanned && canBan)) && (
                <div className="grid grid-cols-2 gap-2">
                  {!user.isEmailVerified && canEdit && (
                    <button onClick={() => verifyMut.mutate()} disabled={verifyMut.isPending}
                      className="btn-secondary justify-center text-sm py-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Verify Email
                    </button>
                  )}
                  {user.isBanned && canBan && (
                    <button onClick={() => unbanMut.mutate()} disabled={unbanMut.isPending}
                      className="btn-secondary justify-center text-sm py-2">
                      <Shield className="w-4 h-4 text-emerald-400" /> Unban User
                    </button>
                  )}
                </div>
              )}

              {/* Ban - needs ban permission */}
              {!user.isBanned && canBan && (
                <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Ban User</p>
                  <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)}
                    placeholder="Reason for ban (required)" className="input text-sm h-fit py-2" />
                  <button onClick={() => banMut.mutate()} disabled={banMut.isPending || !banReason.trim()}
                    className="btn-danger w-full justify-center text-sm py-2">
                    {banMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Ban User
                  </button>
                </div>
              )}

              {/* Delete - needs delete permission */}
              {canDelete && (
                !showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger w-full justify-center text-sm py-2">
                    <Trash2 className="w-4 h-4" /> Delete User Permanently
                  </button>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                    <p className="text-sm font-medium text-red-400 text-center">Are you sure? This cannot be undone!</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 justify-center text-sm py-2">
                        Cancel
                      </button>
                      <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="btn-danger flex-1 justify-center text-sm py-2">
                        {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* EMAIL */}
          {tab === 'email' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Sending to <span className="text-primary-400 font-medium">{user.email}</span>
              </p>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Subject" className="input text-sm h-fit py-2" />
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                placeholder="Message..." className="input text-sm min-h-[120px] resize-none" />
              <button onClick={() => emailMut.mutate()} disabled={emailMut.isPending || !emailSubject || !emailBody}
                className="btn-primary w-full justify-center text-sm py-2">
                {emailMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Email
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  , document.body)
}

// ----------------------------------------------------------------
// MAIN PAGE
// ----------------------------------------------------------------
export default function UsersPage() {
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [plan, setPlan]               = useState('')
  const [status, setStatus]           = useState('')
  const [selected, setSelected]       = useState(null)
  const [refreshing, setRefreshing]   = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', page, search, plan, status],
    queryFn: async () => {
      const p = new URLSearchParams({
        page, limit: 15,
        ...(search && { search }),
        ...(plan   && { plan }),
        ...(status && { status }),
      })
      const res = await adminApi.get(`/users?${p}`)
      return res.data.data
    },
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
    toast.success('Users refreshed!')
  }

  const exportCSV = async () => {
    try {
      const res = await adminApi.get('/users/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      Object.assign(document.createElement('a'), { href: url, download: `users_${Date.now()}.csv` }).click()
      toast.success('CSV exported!')
    } catch { toast.error('Export failed') }
  }

  const clearFilters = () => { setSearch(''); setSearchDraft(''); setPlan(''); setStatus(''); setPage(1) }
  const hasFilters = search || plan || status
  const users      = data?.users      || []
  const total      = data?.total      || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Users</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={exportCSV} className="btn-primary">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {/* Desktop: single row | Mobile: stacked */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search — full width on mobile, flex-1 on desktop */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchDraft); setPage(1) }}
          className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input type="text" value={searchDraft} onChange={e => setSearchDraft(e.target.value)}
              placeholder="Search by name, email..."
              className="input pl-9 h-fit py-2 text-sm w-full" />
          </div>
          <button type="submit" className="btn-primary px-3 shrink-0">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Plan + Status + Clear on same row */}
        <div className="flex gap-2">
          <div className="w-32">
            <PlanDropdown 
              value={plan}
              onChange={(value) => {
                setPlan(value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-32">
            <StatusDropdown 
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary px-3 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--bg-hover)] rounded w-32" />
                  <div className="h-3 bg-[var(--bg-hover)] rounded w-48" />
                </div>
                <div className="h-5 w-14 bg-[var(--bg-hover)] rounded-full hidden sm:block" />
                <div className="h-5 w-14 bg-[var(--bg-hover)] rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No users found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-primary-400 text-sm hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Column headers — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)]">
              {['User', 'Plan', 'Status', 'Joined', 'Action'].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-[var(--border)]">
              {users.map(u => (
                <div key={u._id} onClick={() => setSelected(u)}
                  className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 sm:px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">

                  {/* User — always visible */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                      {u.avatar
                        ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                        : <span className="text-xs font-bold text-primary-400">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{u.name || 'No Name'}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                      {/* Mobile: show plan + status inline */}
                      <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                        <PlanBadge plan={u.plan} />
                        <StatusBadge user={u} />
                      </div>
                    </div>
                  </div>

                  {/* Plan — desktop only */}
                  <div className="hidden sm:flex"><PlanBadge plan={u.plan} /></div>

                  {/* Status — desktop only */}
                  <div className="hidden sm:flex"><StatusBadge user={u} /></div>

                  {/* Joined — desktop only */}
                  <p className="hidden sm:block text-sm text-[var(--text-muted)]">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </p>

                  {/* Action */}
                  <button onClick={e => { e.stopPropagation(); setSelected(u) }}
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
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  Page {page} of {totalPages} · {total} users
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-[var(--text)] px-2">{page}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                    className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && <UserModal user={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}