import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Edit, ToggleLeft, ToggleRight, Plus,
  X, Loader2, Check, Star, Trash2, RefreshCw,
  Zap, ChevronUp, ChevronDown, Package
} from 'lucide-react'
import adminApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// ----------------------------------------------------------------
// PLAN COLOR BADGE
// ----------------------------------------------------------------
const PlanCard = ({ plan, onEdit, onToggle, toggling, canEdit }) => {
  const colors = {
    free:     { bg: 'bg-gray-500/10',   border: 'border-gray-500/20',   text: 'text-gray-400'    },
    starter:  { bg: 'bg-primary-500/10', border: 'border-primary-500/20', text: 'text-primary-400' },
    pro:      { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400'  },
    business: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'   },
  }
  const c = colors[plan.name] || colors.free

  return (
    <div className={`card p-5 relative flex flex-col gap-4 border-2 ${plan.isActive ? c.border : 'border-[var(--border)] opacity-60'}`}>
      {/* Popular badge */}
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500 text-white shadow">
            <Star className="w-3 h-3" /> Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${c.bg} ${c.text} mb-2`}>
            {plan.displayName}
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{plan.description || 'No description'}</p>
        </div>
        <div className={`w-3 h-3 rounded-full mt-1 ${plan.isActive ? 'bg-emerald-400' : 'bg-gray-400'}`} title={plan.isActive ? 'Active' : 'Inactive'} />
      </div>

      {/* Pricing */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[var(--text)]">
            ₹{plan.pricing?.INR?.monthly?.toLocaleString() || 0}
          </span>
          <span className="text-xs text-[var(--text-muted)]">/month</span>
        </div>
        {plan.pricing?.INR?.yearly > 0 && (
          <p className="text-xs text-emerald-400">
            ₹{plan.pricing?.INR?.yearly?.toLocaleString()}/year
            {plan.yearlyDiscountPercent > 0 && ` · ${plan.yearlyDiscountPercent}% off`}
          </p>
        )}
      </div>

      {/* Key limits */}
      <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
        <div className="flex justify-between">
          <span>Bots</span>
          <span className={c.text + ' font-medium'}>{plan.limits?.bots === -1 ? 'Unlimited' : plan.limits?.bots}</span>
        </div>
        <div className="flex justify-between">
          <span>Chats/month</span>
          <span className={c.text + ' font-medium'}>{plan.limits?.chatsPerMonth === -1 ? 'Unlimited' : plan.limits?.chatsPerMonth?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Training URLs</span>
          <span className={c.text + ' font-medium'}>{plan.limits?.trainingUrlPages}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border)]">
        {canEdit && (
          <button onClick={() => onEdit(plan)} className="btn-secondary flex-1 justify-center text-xs py-2">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        <button
          onClick={() => onToggle(plan._id)}
          disabled={toggling === plan._id}
          className={`${canEdit ? 'flex-1' : 'w-full'} justify-center text-xs py-2 flex items-center gap-1.5 rounded-xl font-medium transition-colors border ${
            plan.isActive
              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          {toggling === plan._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
            plan.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
          {plan.isActive ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// PLAN EDIT MODAL
// ----------------------------------------------------------------
const PlanEditModal = ({ plan, onClose }) => {
  const { admin } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('basic')
  const canEdit = admin?.permissions?.plans?.edit === true
  const [form, setForm] = useState({
    displayName:          plan.displayName || '',
    description:          plan.description || '',
    color:                plan.color || '#7F77DD',
    isPopular:            plan.isPopular || false,
    isActive:             plan.isActive !== false,
    // Pricing
    inrMonthly:           plan.pricing?.INR?.monthly || 0,
    inrYearly:            plan.pricing?.INR?.yearly || 0,
    usdMonthly:           plan.pricing?.USD?.monthly || 0,
    usdYearly:            plan.pricing?.USD?.yearly || 0,
    yearlyDiscountPercent: plan.yearlyDiscountPercent || 0,
    // Limits
    bots:                 plan.limits?.bots || 1,
    chatsPerMonth:        plan.limits?.chatsPerMonth || 50,
    trainingUrlPages:     plan.limits?.trainingUrlPages || 1,
    trainingFiles:        plan.limits?.trainingFiles || 0,
    leadCapture:          plan.limits?.leadCapture || false,
    analytics:            plan.limits?.analytics || false,
    advancedAnalytics:    plan.limits?.advancedAnalytics || false,
    customBranding:       plan.limits?.customBranding || false,
    webhooks:             plan.limits?.webhooks || false,
    apiAccess:            plan.limits?.apiAccess || false,
    prioritySupport:      plan.limits?.prioritySupport || false,
    whiteLabel:           plan.limits?.whiteLabel || false,
    // Features list
    features:             [...(plan.features || [])],
    newFeature:           '',
    // Razorpay
    rzpMonthly:           plan.razorpay?.monthlyPlanId || '',
    rzpYearly:            plan.razorpay?.yearlyPlanId || '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const updateMut = useMutation({
    mutationFn: () => adminApi.put(`/plans/${plan._id}`, {
      displayName:  form.displayName,
      description:  form.description,
      color:        form.color,
      isPopular:    form.isPopular,
      isActive:     form.isActive,
      yearlyDiscountPercent: form.yearlyDiscountPercent,
      pricing: {
        INR: {
          monthly:        Number(form.inrMonthly),
          yearly:         Number(form.inrYearly),
          yearlyPerMonth: form.inrYearly > 0 ? Math.round(form.inrYearly / 12) : 0,
        },
        USD: {
          monthly:        Number(form.usdMonthly),
          yearly:         Number(form.usdYearly),
          yearlyPerMonth: form.usdYearly > 0 ? Math.round(form.usdYearly / 12) : 0,
        },
      },
      limits: {
        bots:              Number(form.bots),
        chatsPerMonth:     Number(form.chatsPerMonth),
        trainingUrlPages:  Number(form.trainingUrlPages),
        trainingFiles:     Number(form.trainingFiles),
        leadCapture:       form.leadCapture,
        analytics:         form.analytics,
        advancedAnalytics: form.advancedAnalytics,
        customBranding:    form.customBranding,
        webhooks:          form.webhooks,
        apiAccess:         form.apiAccess,
        prioritySupport:   form.prioritySupport,
        whiteLabel:        form.whiteLabel,
      },
      features: form.features,
      razorpay: {
        monthlyPlanId: form.rzpMonthly || null,
        yearlyPlanId:  form.rzpYearly  || null,
      },
    }),
    onSuccess: () => {
      toast.success('Plan updated!')
      queryClient.invalidateQueries(['admin-plans'])
      onClose()
    },
    onError: () => toast.error('Update failed'),
  })

  const TABS = ['basic', 'pricing', 'limits', 'features', 'razorpay']

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--text)]">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-primary-500' : 'bg-[var(--border)]'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5.5 left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[var(--text)]">Edit {plan.displayName} Plan</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{plan.name} plan</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Tabs - scrollable on mobile */}
          <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-xs font-medium capitalize whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-primary-500 text-primary-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

          {/* BASIC TAB */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Display Name</label>
                <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
                  className="input text-sm h-fit py-2 w-full" placeholder="e.g. Starter" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  className="input text-sm resize-none w-full" rows={3} placeholder="Plan description..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Plan Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent p-0.5" />
                  <input value={form.color} onChange={e => set('color', e.target.value)}
                    className="input text-sm h-fit py-2 flex-1 font-mono" placeholder="#7F77DD" />
                </div>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-0">
                <Toggle label="Most Popular badge" value={form.isPopular} onChange={v => set('isPopular', v)} />
                <Toggle label="Plan Active (visible to users)" value={form.isActive} onChange={v => set('isActive', v)} />
              </div>
            </div>
          )}

          {/* PRICING TAB */}
          {tab === 'pricing' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">INR Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Monthly (₹)</label>
                    <input type="number" value={form.inrMonthly} onChange={e => set('inrMonthly', e.target.value)}
                      className="input text-sm h-fit py-2 w-full" min="0" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Yearly (₹)</label>
                    <input type="number" value={form.inrYearly} onChange={e => set('inrYearly', e.target.value)}
                      className="input text-sm h-fit py-2 w-full" min="0" />
                  </div>
                </div>
                {form.inrYearly > 0 && (
                  <p className="text-xs text-emerald-400">
                    Per month (yearly): ₹{Math.round(form.inrYearly / 12).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">USD Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Monthly ($)</label>
                    <input type="number" value={form.usdMonthly} onChange={e => set('usdMonthly', e.target.value)}
                      className="input text-sm h-fit py-2 w-full" min="0" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">Yearly ($)</label>
                    <input type="number" value={form.usdYearly} onChange={e => set('usdYearly', e.target.value)}
                      className="input text-sm h-fit py-2 w-full" min="0" />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-hover)] rounded-xl p-4">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Yearly Discount % (manual)
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" value={form.yearlyDiscountPercent}
                    onChange={e => set('yearlyDiscountPercent', e.target.value)}
                    className="input text-sm h-fit py-2 w-24" min="0" max="100" />
                  <span className="text-sm text-[var(--text-muted)]">% off on yearly plan</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  Ye sirf display ke liye hai — tu manually set karta hai
                </p>
              </div>
            </div>
          )}

          {/* LIMITS TAB */}
          {tab === 'limits' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Numeric Limits</p>
                <p className="text-xs text-[var(--text-muted)]">-1 = Unlimited</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Bots',           key: 'bots' },
                    { label: 'Chats/Month',    key: 'chatsPerMonth' },
                    { label: 'Training URLs',  key: 'trainingUrlPages' },
                    { label: 'Training Files', key: 'trainingFiles' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-[var(--text-muted)] block mb-1">{label}</label>
                      <input type="number" value={form[key]} onChange={e => set(key, e.target.value)}
                        className="input text-sm h-fit py-2 w-full" min="-1" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-hover)] rounded-xl p-4 space-y-0">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Feature Toggles</p>
                {[
                  { label: 'Lead Capture',        key: 'leadCapture' },
                  { label: 'Analytics',            key: 'analytics' },
                  { label: 'Advanced Analytics',   key: 'advancedAnalytics' },
                  { label: 'Custom Branding',      key: 'customBranding' },
                  { label: 'Webhooks',             key: 'webhooks' },
                  { label: 'API Access',           key: 'apiAccess' },
                  { label: 'Priority Support',     key: 'prioritySupport' },
                  { label: 'White Label',          key: 'whiteLabel' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-sm text-[var(--text)]">{label}</span>
                    <button onClick={() => set(key, !form[key])}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form[key] ? 'bg-primary-500' : 'bg-[var(--border)]'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form[key] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FEATURES TAB */}
          {tab === 'features' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Landing page pe dikhne wali feature list</p>

              {/* Add feature */}
              <div className="flex gap-2">
                <input value={form.newFeature} onChange={e => set('newFeature', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && form.newFeature.trim()) {
                      set('features', [...form.features, form.newFeature.trim()])
                      set('newFeature', '')
                    }
                  }}
                  placeholder="Feature add karo (Enter press karo)"
                  className="input text-sm h-fit py-2 flex-1" />
                <button
                  onClick={() => {
                    if (form.newFeature.trim()) {
                      set('features', [...form.features, form.newFeature.trim()])
                      set('newFeature', '')
                    }
                  }}
                  className="btn-primary px-3 shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Features list */}
              <div className="space-y-2">
                {form.features.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">No features added yet</p>
                ) : form.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-[var(--bg-hover)] rounded-xl">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-sm text-[var(--text)] flex-1">{f}</span>
                    <div className="flex gap-1">
                      {i > 0 && (
                        <button onClick={() => {
                          const arr = [...form.features]
                          ;[arr[i-1], arr[i]] = [arr[i], arr[i-1]]
                          set('features', arr)
                        }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {i < form.features.length - 1 && (
                        <button onClick={() => {
                          const arr = [...form.features]
                          ;[arr[i], arr[i+1]] = [arr[i+1], arr[i]]
                          set('features', arr)
                        }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => set('features', form.features.filter((_, j) => j !== i))}
                        className="p-1 text-[var(--text-muted)] hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RAZORPAY TAB */}
          {tab === 'razorpay' && (
            <div className="space-y-4">
              {plan.name === 'free' ? (
                <div className="py-8 text-center text-[var(--text-muted)]">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Free plan has no Razorpay integration</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                    Razorpay Dashboard → Subscriptions → Plans se IDs copy karo
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                        Monthly Plan ID
                      </label>
                      <input value={form.rzpMonthly} onChange={e => set('rzpMonthly', e.target.value)}
                        className="input text-sm h-fit py-2 w-full font-mono"
                        placeholder="plan_XXXXXXXXXX" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                        Yearly Plan ID
                      </label>
                      <input value={form.rzpYearly} onChange={e => set('rzpYearly', e.target.value)}
                        className="input text-sm h-fit py-2 w-full font-mono"
                        placeholder="plan_XXXXXXXXXX" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          {canEdit && (
            <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
              className="btn-primary flex-1 justify-center">
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// ----------------------------------------------------------------
// CREDIT PACKAGE CARD
// ----------------------------------------------------------------
const CreditCard_ = ({ pkg, onEdit, onToggle, onDelete, toggling, canEdit, canDelete }) => (
  <div className={`card p-4 flex items-center gap-4 ${!pkg.isActive ? 'opacity-60' : ''}`}>
    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
      <Zap className="w-5 h-5 text-primary-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">{pkg.name}</p>
        {!pkg.isActive && <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">Inactive</span>}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {pkg.credits} credits · ₹{pkg.pricing?.INR}
        {pkg.pricing?.USD > 0 && ` · $${pkg.pricing.USD}`}
      </p>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {canEdit && (
        <button onClick={() => onEdit(pkg)} className="btn-secondary p-1.5"><Edit className="w-3.5 h-3.5" /></button>
      )}
      <button onClick={() => onToggle(pkg._id)} disabled={toggling === pkg._id}
        title={pkg.isActive ? 'Disable package' : 'Enable package'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${pkg.isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
        {toggling === pkg._id
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : pkg.isActive
            ? <><ToggleLeft className="w-3.5 h-3.5" /> Disable</>
            : <><ToggleRight className="w-3.5 h-3.5" /> Enable</>
        }
      </button>
      {canDelete && (
        <button onClick={() => onDelete(pkg)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
      )}
    </div>
  </div>
)

// ----------------------------------------------------------------
// CREDIT PACKAGE FORM MODAL
// ----------------------------------------------------------------
const CreditModal = ({ pkg, onClose }) => {
  const { admin } = useAuthStore()
  const queryClient = useQueryClient()
  const canEdit = admin?.permissions?.plans?.edit === true
  const canCreate = admin?.permissions?.plans?.create === true
  const isEdit = !!pkg?._id
  const canProceed = isEdit ? canEdit : canCreate
  const [form, setForm] = useState({
    name:        pkg?.name        || '',
    description: pkg?.description || '',
    credits:     pkg?.credits     || '',
    inrPrice:    pkg?.pricing?.INR || '',
    usdPrice:    pkg?.pricing?.USD || '',
    sortOrder:   pkg?.sortOrder   || 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveMut = useMutation({
    mutationFn: () => {
      const body = {
        name:        form.name,
        description: form.description,
        credits:     Number(form.credits),
        pricing: { INR: Number(form.inrPrice), USD: Number(form.usdPrice) },
        sortOrder:   Number(form.sortOrder),
      }
      return isEdit
        ? adminApi.put(`/credit-packages/${pkg._id}`, body)
        : adminApi.post('/credit-packages', body)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Package updated!' : 'Package created!')
      queryClient.invalidateQueries(['admin-credit-packages'])
      onClose()
    },
    onError: () => toast.error('Save failed'),
  })

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">{isEdit ? 'Edit Package' : 'New Credit Package'}</h3>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Package Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="input text-sm h-fit py-2 w-full" placeholder="e.g. Starter Pack" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Credits</label>
            <input type="number" value={form.credits} onChange={e => set('credits', e.target.value)}
              className="input text-sm h-fit py-2 w-full" placeholder="e.g. 100" min="1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">INR Price (₹)</label>
              <input type="number" value={form.inrPrice} onChange={e => set('inrPrice', e.target.value)}
                className="input text-sm h-fit py-2 w-full" placeholder="99" min="0" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">USD Price ($)</label>
              <input type="number" value={form.usdPrice} onChange={e => set('usdPrice', e.target.value)}
                className="input text-sm h-fit py-2 w-full" placeholder="2" min="0" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)}
              className="input text-sm h-fit py-2 w-full" min="0" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          {canProceed && (
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name || !form.credits || !form.inrPrice}
              className="btn-primary flex-1 justify-center">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Update' : 'Create'}
            </button>
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
export default function PlansPage() {
  const { admin } = useAuthStore()
  const isSuperAdmin = admin?.role === 'superadmin'
  const queryClient  = useQueryClient()

  // Permission checks
  const canEdit = admin?.permissions?.plans?.edit === true
  const canCreate = admin?.permissions?.plans?.create === true
  const canDelete = admin?.permissions?.plans?.delete === true

  const [editingPlan, setEditingPlan]     = useState(null)
  const [editingPkg, setEditingPkg]       = useState(null)
  const [togglingPlan, setTogglingPlan]   = useState(null)
  const [togglingPkg, setTogglingPkg]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => { const r = await adminApi.get('/plans'); return r.data.data?.plans || [] },
  })

  // Fetch credit packages
  const { data: pkgsData, isLoading: pkgsLoading } = useQuery({
    queryKey: ['admin-credit-packages'],
    queryFn: async () => { const r = await adminApi.get('/credit-packages'); return r.data.data?.packages || [] },
  })

  // Toggle plan active
  const togglePlan = async (planId) => {
    setTogglingPlan(planId)
    try {
      const plan = plansData.find(p => p._id === planId)
      await adminApi.put(`/plans/${planId}`, { isActive: !plan.isActive })
      toast.success('Plan updated!')
      queryClient.invalidateQueries(['admin-plans'])
    } catch { toast.error('Failed') }
    setTogglingPlan(null)
  }

  // Toggle credit package
  const togglePkg = async (pkgId) => {
    setTogglingPkg(pkgId)
    try {
      const res = await adminApi.patch(`/credit-packages/${pkgId}/toggle`)
      const isNowActive = res.data.data?.isActive
      toast.success(isNowActive ? 'Package enabled!' : 'Package disabled!')
      queryClient.invalidateQueries(['admin-credit-packages'])
    } catch { toast.error('Failed') }
    setTogglingPkg(null)
  }

  // Delete credit package
  const deletePkgMut = useMutation({
    mutationFn: (id) => adminApi.delete(`/credit-packages/${id}`),
    onSuccess: () => { toast.success('Package deleted!'); queryClient.invalidateQueries(['admin-credit-packages']); setConfirmDelete(null) },
    onError: () => toast.error('Delete failed'),
  })

  // Seed credit packages
  const seedPkgMut = useMutation({
    mutationFn: () => adminApi.post('/credit-packages/seed'),
    onSuccess: () => { toast.success('Default packages seeded!'); queryClient.invalidateQueries(['admin-credit-packages']) },
    onError: (e) => toast.error(e?.response?.data?.message || 'Seed failed'),
  })

  // Seed plans
  const seedPlanMut = useMutation({
    mutationFn: () => adminApi.post('/plans/seed'),
    onSuccess: () => { toast.success('Default plans seeded!'); queryClient.invalidateQueries(['admin-plans']) },
    onError: (e) => toast.error(e?.response?.data?.message || 'Seed failed'),
  })

  const plans = plansData || []
  const pkgs  = pkgsData  || []

  return (
    <div className="space-y-8">

      {/* ── PLANS SECTION ── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Plans</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage subscription plans</p>
          </div>
          {isSuperAdmin && (
            <button onClick={() => seedPlanMut.mutate()} disabled={seedPlanMut.isPending} className="btn-secondary">
              {seedPlanMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Seed Default Plans
            </button>
          )}
        </div>

        {plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-[var(--bg-hover)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => (
              <PlanCard
                key={plan._id}
                plan={plan}
                onEdit={setEditingPlan}
                onToggle={togglePlan}
                toggling={togglingPlan}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CREDIT PACKAGES SECTION ── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Credit Packages</h2>
            <p className="text-sm text-[var(--text-muted)]">One-time credit purchases for users</p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && pkgs.length === 0 && (
              <button onClick={() => seedPkgMut.mutate()} disabled={seedPkgMut.isPending} className="btn-secondary">
                {seedPkgMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Seed Defaults
              </button>
            )}
            {canCreate && (
              <button onClick={() => setEditingPkg({})} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Package
              </button>
            )}
            {!canCreate && (
              <div className="text-xs text-red-400/70" title="Superadmin hasn't allowed you">
                ⊘ Can't create
              </div>
            )}
          </div>
        </div>

        {pkgsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 card animate-pulse bg-[var(--bg-hover)]" />
            ))}
          </div>
        ) : pkgs.length === 0 ? (
          <div className="card py-12 text-center text-[var(--text-muted)]">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm mb-3">No credit packages yet</p>
            {isSuperAdmin && (
              <button onClick={() => seedPkgMut.mutate()} className="btn-primary mx-auto">
                <RefreshCw className="w-4 h-4" /> Seed Default Packages
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {pkgs.map(pkg => (
              <CreditCard_
                key={pkg._id}
                pkg={pkg}
                onEdit={setEditingPkg}
                onToggle={togglePkg}
                onDelete={setConfirmDelete}
                toggling={togglingPkg}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Plan Edit Modal */}
      <AnimatePresence>
        {editingPlan && (
          <PlanEditModal plan={editingPlan} onClose={() => setEditingPlan(null)} />
        )}
      </AnimatePresence>

      {/* Credit Package Modal */}
      <AnimatePresence>
        {editingPkg !== null && (
          <CreditModal pkg={editingPkg} onClose={() => setEditingPkg(null)} />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text)] text-center mb-2">Delete Package?</h3>
            <p className="text-sm text-[var(--text-muted)] text-center mb-5">
              "{confirmDelete.name}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => deletePkgMut.mutate(confirmDelete._id)} disabled={deletePkgMut.isPending}
                className="btn-danger flex-1 justify-center">
                {deletePkgMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}