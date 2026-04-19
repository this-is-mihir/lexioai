import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag, Plus, Search, Filter, Download, Copy, Trash2,
  Edit, ToggleLeft, ToggleRight, X, Loader2, Check,
  RefreshCw, AlertTriangle, ChevronUp, ChevronDown,
  Ticket, TrendingUp, DollarSign, Zap
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { CustomDatePicker } from '../../components/ui/CustomDatePicker'

// ----------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------
const APPLICABLE_PLANS = ['starter', 'pro', 'business', 'all']

const BILLING_OPTIONS = [
  { value: 'both',    label: 'Monthly + Yearly' },
  { value: 'monthly', label: 'Monthly only'      },
  { value: 'yearly',  label: 'Yearly only'       },
]

const TYPE_META = {
  percentage: { label: '% Off',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  fixed:      { label: 'Flat Off', color: 'text-primary-400 bg-primary-400/10 border-primary-400/20' },
}

function formatValue(c) {
  if (c.discountType === 'percentage') return `${c.discountValue}% off`
  if (c.discountType === 'fixed')      return `₹${c.discountValue} off`
  return '—'
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ================================================================
// CUSTOM DROPDOWN COMPONENTS FOR FILTERS
// ================================================================
const StatusFilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
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
    <div className="relative w-full" ref={dropdownRef}>
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
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-[200]"
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

const TypeFilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "percentage", label: "% Off" },
    { value: "fixed", label: "Flat Off" },
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

  const selectedOption = typeOptions.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:border-primary-500/50 transition-colors"
      >
        <span>{selectedOption?.label || "All Types"}</span>
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
            className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-[200]"
          >
            {typeOptions.map((option) => (
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

// ----------------------------------------------------------------
// STATS CARDS
// ----------------------------------------------------------------
function StatsCards({ coupons }) {
  const total         = coupons.length
  const redemptions   = coupons.reduce((a, c) => a + (c.usedCount || 0), 0)
  const discountGiven = coupons.reduce((a, c) =>
    c.discountType === 'fixed' ? a + c.discountValue * (c.usedCount || 0) : a, 0)
  const active = coupons.filter(c => c.isActive).length

  const stats = [
    { label: 'Total Coupons',     value: total,                                icon: Ticket,     color: 'text-primary-400', bg: 'bg-primary-400/10' },
    { label: 'Total Redemptions', value: redemptions,                          icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Discount Given',    value: `₹${discountGiven.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
    { label: 'Active Coupons',    value: active,                               icon: Zap,        color: 'text-violet-400',  bg: 'bg-violet-400/10'  },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// TOGGLE ROW
// ----------------------------------------------------------------
const ToggleRow = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
    <div>
      <p className="text-sm text-[var(--text)]">{label}</p>
      {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ml-4 ${value ? 'bg-primary-500' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </div>
)

// ----------------------------------------------------------------
// CREATE / EDIT MODAL
// ----------------------------------------------------------------
const CouponModal = ({ coupon, onClose }) => {
  const { admin } = useAuthStore()
  const queryClient = useQueryClient()
  const isEdit = !!coupon?._id
  const canEdit = admin?.permissions?.coupons?.edit === true
  const canCreate = admin?.permissions?.coupons?.create === true
  const canProceed = isEdit ? canEdit : canCreate
  const [tab, setTab] = useState('basic')

  const [form, setForm] = useState({
    code:              coupon?.code              || '',
    description:       coupon?.description       || '',
    isActive:          coupon?.isActive          !== false,
    discountType:      coupon?.discountType      || 'percentage',
    discountValue:     coupon?.discountValue     || '',
    maxDiscountAmount: coupon?.maxDiscountAmount || '',
    applicablePlans:   coupon?.applicablePlans   || ['all'],
    applicableBilling: coupon?.applicableBilling || 'both',
    maxUses:           coupon?.maxUses           || '',
    maxUsesPerUser:    coupon?.maxUsesPerUser     ?? 1,
    validUntil:        coupon?.validUntil
                         ? new Date(coupon.validUntil).toISOString().split('T')[0]
                         : '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const togglePlan = (plan) => {
    if (plan === 'all') { set('applicablePlans', ['all']); return }
    const current = form.applicablePlans.filter(p => p !== 'all')
    const updated = current.includes(plan) ? current.filter(p => p !== plan) : [...current, plan]
    set('applicablePlans', updated.length ? updated : ['all'])
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const body = {
        code:              form.code.trim().toUpperCase(),
        description:       form.description || null,
        isActive:          form.isActive,
        discountType:      form.discountType,
        discountValue:     Number(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        applicablePlans:   form.applicablePlans,
        applicableBilling: form.applicableBilling,
        maxUses:           form.maxUses ? Number(form.maxUses) : null,
        maxUsesPerUser:    Number(form.maxUsesPerUser),
        validUntil:        form.validUntil || null,
      }
      return isEdit
        ? adminApi.put(`/coupons/${coupon._id}`, body)
        : adminApi.post('/coupons', body)
    },
    onSuccess: (res) => {
      const savedCoupon = res?.data?.data?.coupon
      if (savedCoupon?._id) {
        queryClient.setQueryData(['admin-coupons'], (prev = []) => {
          if (isEdit) {
            return prev.map((item) => (item._id === savedCoupon._id ? savedCoupon : item))
          }
          return [savedCoupon, ...prev]
        })
      }

      toast.success(isEdit ? 'Coupon updated!' : 'Coupon created!')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Save failed'),
  })

  const canSave = form.code.trim().length >= 4 && form.discountValue

  const TABS = [
    { id: 'basic',    label: 'Basic'    },
    { id: 'discount', label: 'Discount' },
    { id: 'limits',   label: 'Limits'   },
    { id: 'validity', label: 'Validity' },
    ...(isEdit ? [{ id: 'usage', label: 'Usage' }] : []),
  ]

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
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text)]">{isEdit ? `Edit — ${coupon.code}` : 'Create Coupon'}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{isEdit ? 'Update coupon settings' : 'New discount code'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex border-b border-[var(--border)] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === t.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

          {tab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Coupon Code * (min 4 chars)</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                    className="input text-sm h-fit py-2 flex-1 font-mono tracking-widest" placeholder="e.g. SAVE20" maxLength={20} />
                  <button onClick={() => set('code', generateCode())} className="btn-secondary px-3 shrink-0 gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /><span className="text-xs">Auto</span>
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{form.code.length}/20 characters</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  className="input text-sm resize-none w-full" rows={2} placeholder="Internal note about this coupon..." />
              </div>
              <div className="bg-[var(--bg-hover)] rounded-xl p-4">
                <ToggleRow label="Active" description="Users can apply this coupon at checkout" value={form.isActive} onChange={v => set('isActive', v)} />
              </div>
            </div>
          )}

          {tab === 'discount' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_META).map(([k, { label }]) => (
                    <button key={k} onClick={() => set('discountType', k)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        form.discountType === k
                          ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                          : 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                      }`}>
                      <p className="text-xs font-medium">{label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                  {form.discountType === 'percentage' ? 'Discount %' : 'Flat Amount (₹)'} *
                </label>
                <input type="number" value={form.discountValue} onChange={e => set('discountValue', e.target.value)}
                  className="input text-sm h-fit py-2 w-full"
                  placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                  min="1" max={form.discountType === 'percentage' ? 100 : undefined} />
              </div>
              {form.discountType === 'percentage' && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                    Max Discount Cap (₹) <span className="normal-case font-normal">— optional</span>
                  </label>
                  <input type="number" value={form.maxDiscountAmount} onChange={e => set('maxDiscountAmount', e.target.value)}
                    className="input text-sm h-fit py-2 w-full" placeholder="e.g. 500 (leave blank for no cap)" min="1" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Applicable Plans *</label>
                <div className="flex flex-wrap gap-2">
                  {APPLICABLE_PLANS.map(p => (
                    <button key={p} onClick={() => togglePlan(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                        form.applicablePlans.includes(p)
                          ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                      }`}>
                      {p === 'all' ? 'All Plans' : p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Applicable Billing</label>
                <div className="space-y-2">
                  {BILLING_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => set('applicableBilling', opt.value)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors ${
                        form.applicableBilling === opt.value
                          ? 'border-primary-500/50 bg-primary-500/10'
                          : 'border-[var(--border)] bg-[var(--bg-hover)] hover:border-[var(--border-hover)]'
                      }`}>
                      <p className={`text-sm font-medium ${form.applicableBilling === opt.value ? 'text-primary-400' : 'text-[var(--text)]'}`}>{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'limits' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Usage Limits</p>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Max Total Uses <span className="opacity-60">(blank = unlimited)</span></label>
                  <input type="number" value={form.maxUses} onChange={e => set('maxUses', e.target.value)}
                    className="input text-sm h-fit py-2 w-full" placeholder="e.g. 100" min="1" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Max Uses Per User</label>
                  <select value={form.maxUsesPerUser} onChange={e => set('maxUsesPerUser', Number(e.target.value))} className="input text-sm h-fit py-2 w-full">
                    <option value={1}>1 time per user</option>
                    <option value={2}>2 times per user</option>
                    <option value={3}>3 times per user</option>
                    <option value={5}>5 times per user</option>
                    <option value={0}>Unlimited per user</option>
                  </select>
                </div>
              </div>
              {form.maxUses && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-xs text-amber-400">Coupon will auto-deactivate after {form.maxUses} total uses.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'validity' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Expiry Date</p>
                <CustomDatePicker
                  value={form.validUntil}
                  onChange={e => set('validUntil', e)}
                  label="Valid Until"
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="text-xs text-[var(--text-muted)] italic">(leave blank = never expires)</div>
                {form.validUntil ? (
                  <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-3">
                    <p className="text-xs text-primary-400">
                      Expires on {new Date(form.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-xs text-emerald-400">No expiry set — this coupon will never expire automatically.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'usage' && isEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--text)]">{coupon.usedCount || 0}</p>
                  <p className="text-xs text-[var(--text-muted)]">Total Uses</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--text)]">{coupon.maxUses ? coupon.maxUses - (coupon.usedCount || 0) : '∞'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Remaining</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Redemption History</p>
              {!coupon.usedBy?.length ? (
                <div className="card py-8 text-center text-[var(--text-muted)]">
                  <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No usage yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {coupon.usedBy.map((h, i) => (
                    <div key={i} className="card p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text)]">{h.userId?.email || h.userId}</p>
                        <p className="text-xs text-[var(--text-muted)] capitalize">{h.planName} · {new Date(h.usedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-400">₹{h.discountAmount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          {canProceed && (
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSave} className="btn-primary flex-1 justify-center">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Save Changes' : 'Create Coupon'}
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ----------------------------------------------------------------
// DELETE MODAL
// ----------------------------------------------------------------
function DeleteModal({ coupon, count, onClose, onConfirm, loading }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text)] text-center mb-2">
          {count > 1 ? `Delete ${count} Coupons?` : 'Delete Coupon?'}
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          {count > 1 ? `${count} selected coupons will be permanently deleted.` : `"${coupon?.code}" will be permanently deleted.`}
          <br />This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
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
// TABLE LAYOUT — shared column widths used by BOTH header and rows
// This ensures perfect alignment at all screen sizes
// ----------------------------------------------------------------
// Layout (all screens):   [checkbox] [coupon-info] [type] [plans] [usage] [toggle] [actions]
// col widths:               32px       1fr(min200)  100px  160px   120px   48px     100px
const COL_STYLE = {
  display: 'grid',
  gridTemplateColumns: '32px minmax(200px, 1fr) 100px 160px 120px 48px 100px',
  alignItems: 'center',
  gap: '12px',
}

// ----------------------------------------------------------------
// TABLE HEADER
// ----------------------------------------------------------------
function TableHeader({ allSelected, onToggleAll }) {
  const th = "text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
  return (
    <div style={COL_STYLE} className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
      <input type="checkbox" checked={allSelected} onChange={onToggleAll}
        className="w-4 h-4 rounded accent-primary-500 cursor-pointer" />
      <span className={th}>Coupon</span>
      <span className={th}>Type</span>
      <span className={th}>Plans</span>
      <span className={th}>Usage</span>
      <span className={th}>On/Off</span>
      <span className={`${th} text-right`}>Actions</span>
    </div>
  )
}

// ----------------------------------------------------------------
// COUPON ROW
// ----------------------------------------------------------------
function CouponRow({ coupon, selected, onSelect, onEdit, onDelete, onToggle, onDuplicate, toggling, canEdit, canDelete }) {
  const [copied, setCopied] = useState(false)
  const meta        = TYPE_META[coupon.discountType] || TYPE_META.percentage
  const usedPct     = coupon.maxUses ? Math.min(100, ((coupon.usedCount || 0) / coupon.maxUses) * 100) : 0
  const isExpired   = coupon.validUntil && new Date(coupon.validUntil) < new Date()
  const isExhausted = coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses

  const copyCode = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    toast.success(`Copied: ${coupon.code}`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={COL_STYLE}
      className={`px-4 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors ${selected ? 'bg-primary-500/5' : ''}`}
    >
      {/* Col 1 — Checkbox */}
      <input type="checkbox" checked={selected} onChange={onSelect}
        className="w-4 h-4 rounded accent-primary-500 cursor-pointer" />

      {/* Col 2 — Coupon info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-bold text-[var(--text)] tracking-wider truncate">{coupon.code}</code>
          <button onClick={copyCode} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {(isExpired || isExhausted) && (
            <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
              <AlertTriangle className="w-3 h-3" />{isExpired ? 'Expired' : 'Exhausted'}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{coupon.description || '—'}</p>
        <p className="text-xs font-medium text-emerald-400 mt-0.5">{formatValue(coupon)}</p>
      </div>

      {/* Col 3 — Type badge */}
      <div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {/* Col 4 — Plans */}
      <div className="flex items-center gap-1 flex-wrap">
        {coupon.applicablePlans?.includes('all') ? (
          <span className="px-2 py-0.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded text-xs text-[var(--text-muted)]">All plans</span>
        ) : (
          <>
            {coupon.applicablePlans?.slice(0, 2).map(p => (
              <span key={p} className="px-2 py-0.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded text-xs text-[var(--text-muted)] capitalize">{p}</span>
            ))}
            {(coupon.applicablePlans?.length || 0) > 2 && (
              <span className="text-xs text-[var(--text-muted)]">+{coupon.applicablePlans.length - 2}</span>
            )}
          </>
        )}
      </div>

      {/* Col 5 — Usage bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[var(--text-muted)]">{coupon.usedCount || 0}</span>
          <span className="text-xs text-[var(--text-muted)]">{coupon.maxUses ? `/ ${coupon.maxUses}` : '∞'}</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usedPct >= 90 ? 'bg-red-400' : usedPct >= 60 ? 'bg-amber-400' : 'bg-primary-500'}`}
            style={{ width: `${coupon.maxUses ? usedPct : 0}%` }}
          />
        </div>
      </div>

      {/* Col 6 — Toggle */}
      <div className="flex justify-center">
        <button onClick={() => onToggle(coupon._id)} disabled={toggling === coupon._id}
          title={coupon.isActive ? 'Disable' : 'Enable'}>
          {toggling === coupon._id
            ? <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
            : coupon.isActive
              ? <ToggleRight className="w-7 h-7 text-primary-400" />
              : <ToggleLeft className="w-7 h-7 text-[var(--text-muted)]" />}
        </button>
      </div>

      {/* Col 7 — Actions */}
      <div className="flex items-center justify-end gap-0.5">
        {canEdit && (
          <button onClick={() => onEdit(coupon)} title="Edit"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
        {canEdit && (
          <button onClick={() => onDuplicate(coupon)} title="Duplicate"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        {canDelete && (
          <button onClick={() => onDelete(coupon)} title="Delete"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// MAIN PAGE
// ----------------------------------------------------------------
export default function CouponsPage() {
  const { admin }    = useAuthStore()
  const queryClient  = useQueryClient()

  // Permission checks
  const canEdit = admin?.permissions?.coupons?.edit === true
  const canCreate = admin?.permissions?.coupons?.create === true
  const canDelete = admin?.permissions?.coupons?.delete === true

  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [filterType,    setFilterType]    = useState('all')
  const [showFilters,   setShowFilters]   = useState(false)
  const [selectedIds,   setSelectedIds]   = useState([])
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [toggling,      setToggling]      = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn:  async () => {
      const r = await adminApi.get('/coupons')
      return r.data.data?.coupons || []
    },
  })
  const coupons = data || []

  const filtered = coupons.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.code?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? c.isActive : !c.isActive)
    const matchType   = filterType   === 'all' || c.discountType === filterType
    return matchSearch && matchStatus && matchType
  })

  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.includes(c._id))
  const toggleAll   = () => setSelectedIds(allSelected ? [] : filtered.map(c => c._id))
  const toggleOne   = (id) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])

  const handleToggle = async (id) => {
    setToggling(id)
    try {
      const res   = await adminApi.patch(`/coupons/${id}/toggle`)
      const isNow = res.data.data?.isActive
      toast.success(isNow ? 'Coupon enabled!' : 'Coupon disabled!')
      queryClient.invalidateQueries(['admin-coupons'])
    } catch { toast.error('Toggle failed') }
    setToggling(null)
  }

  const handleDuplicate = (coupon) => {
    setEditingCoupon({ ...coupon, _id: undefined, code: coupon.code + '_2', isActive: false, usedCount: 0, usedBy: [] })
    toast('Editing duplicate — save to create new coupon', { icon: '📋' })
  }

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.delete(`/coupons/${id}`),
    onSuccess:  () => { toast.success('Coupon deleted!'); queryClient.invalidateQueries(['admin-coupons']); setDeleteTarget(null) },
    onError:    () => toast.error('Delete failed'),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: () => adminApi.post('/coupons/bulk-delete', { ids: selectedIds }),
    onSuccess:  () => {
      toast.success(`${selectedIds.length} coupons deleted!`)
      setSelectedIds([])
      queryClient.invalidateQueries(['admin-coupons'])
      setDeleteTarget(null)
    },
    onError: () => toast.error('Bulk delete failed'),
  })

  const exportCSV = () => {
    const rows = [
      ['Code', 'Type', 'Value', 'Max Cap', 'Used', 'Max Uses', 'Per User', 'Plans', 'Billing', 'Status', 'Valid Until', 'Created'],
      ...coupons.map(c => [
        c.code, c.discountType, c.discountValue, c.maxDiscountAmount || '—',
        c.usedCount || 0, c.maxUses || '∞', c.maxUsesPerUser || 1,
        c.applicablePlans?.join('+') || 'all', c.applicableBilling,
        c.isActive ? 'Active' : 'Inactive',
        c.validUntil ? new Date(c.validUntil).toLocaleDateString('en-IN') : 'No expiry',
        c.createdAt  ? new Date(c.createdAt).toLocaleDateString('en-IN')  : '—',
      ])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'coupons.csv'; a.click()
    toast.success('CSV exported!')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Coupons</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage discount codes and promotions</p>
        </div>
        {canCreate ? (
          <button onClick={() => setEditingCoupon({})} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        ) : (
          <div className="text-xs text-red-400/70" title="Superadmin hasn't allowed you">
            ⊘ Can't create
          </div>
        )}
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-[var(--bg-hover)]" />)}
        </div>
      ) : (
        <StatsCards coupons={coupons} />
      )}

      {/* Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative" style={{ flex: '1 1 240px' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input text-sm pl-9 h-fit py-2 w-full" placeholder="Search code or description..." />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`btn-secondary gap-2 shrink-0 ${showFilters ? 'text-primary-400 border-primary-500/30' : ''}`}>
            <Filter className="w-4 h-4" /> Filters
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={exportCSV} className="btn-secondary gap-2 shrink-0">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {canDelete && selectedIds.length > 0 && (
            <button onClick={() => setDeleteTarget({ bulk: true })} className="btn-danger gap-2 shrink-0">
              <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
            </button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'visible' }}
              className="relative z-40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 pb-3 border-t border-[var(--border)]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Status</label>
                  <StatusFilterDropdown
                    value={filterStatus}
                    onChange={setFilterStatus}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Type</label>
                  <TypeFilterDropdown
                    value={filterType}
                    onChange={setFilterType}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table — overflow-x-auto for small screens */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">

          <TableHeader allSelected={allSelected} onToggleAll={toggleAll} />

          {/* Skeleton */}
          {isLoading && [...Array(4)].map((_, i) => (
            <div key={i} style={COL_STYLE} className="px-4 py-4 border-b border-[var(--border)] animate-pulse">
              <div className="w-4 h-4 rounded bg-[var(--bg-hover)]" />
              <div className="space-y-2">
                <div className="h-3 w-28 bg-[var(--bg-hover)] rounded" />
                <div className="h-2 w-44 bg-[var(--bg-hover)] rounded" />
              </div>
              <div className="h-6 w-16 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-4 w-20 bg-[var(--bg-hover)] rounded" />
              <div className="h-3 w-full bg-[var(--bg-hover)] rounded" />
              <div className="h-6 w-8 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-4 w-16 bg-[var(--bg-hover)] rounded ml-auto" />
            </div>
          ))}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search || filterStatus !== 'all' || filterType !== 'all'
                  ? 'No coupons match your filters'
                  : 'No coupons yet — create your first one!'}
              </p>
            </div>
          )}

          {/* Rows */}
          {!isLoading && filtered.map(coupon => (
            <CouponRow
              key={coupon._id}
              coupon={coupon}
              selected={selectedIds.includes(coupon._id)}
              onSelect={() => toggleOne(coupon._id)}
              onEdit={setEditingCoupon}
              onDelete={c => setDeleteTarget({ coupon: c })}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
              toggling={toggling}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              {filtered.length} coupon{filtered.length !== 1 ? 's' : ''}
              {(search || filterStatus !== 'all' || filterType !== 'all') && ' (filtered)'}
            </p>
            {selectedIds.length > 0 && <p className="text-xs text-primary-400">{selectedIds.length} selected</p>}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingCoupon !== null && (
          <CouponModal
            coupon={editingCoupon && Object.keys(editingCoupon).length > 0 ? editingCoupon : null}
            onClose={() => setEditingCoupon(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            coupon={deleteTarget.coupon}
            count={deleteTarget.bulk ? selectedIds.length : 1}
            onClose={() => setDeleteTarget(null)}
            loading={deleteMut.isPending || bulkDeleteMut.isPending}
            onConfirm={() => deleteTarget.bulk ? bulkDeleteMut.mutate() : deleteMut.mutate(deleteTarget.coupon._id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}