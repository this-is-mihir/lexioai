import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, Leaf, Rocket, Sparkles, Star } from 'lucide-react'
import clientApi, { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import PublicNavbar from '../../components/layout/PublicNavbar'
import PublicFooter from '../../components/layout/PublicFooter'

const fallbackPlans = [
  { name: 'free', displayName: 'Free', isPopular: false, pricing: { INR: { monthly: 0 }, USD: { monthly: 0 } }, limits: { bots: 1, chatsPerMonth: 50 }, features: ['1 bot', '50 chats/month', 'Watermark enabled'] },
  { name: 'starter', displayName: 'Starter', isPopular: false, pricing: { INR: { monthly: 399 }, USD: { monthly: 5 } }, limits: { bots: 3, chatsPerMonth: 100 }, features: ['10 file uploads', 'Lead capture', 'Basic analytics', 'Powered by Lexioai badge'] },
  { name: 'pro', displayName: 'Pro', isPopular: true, pricing: { INR: { monthly: 899 }, USD: { monthly: 11 } }, limits: { bots: 10, chatsPerMonth: 300 }, features: ['15 file uploads', 'HINDI', 'Advanced analytics', 'Lead export', 'No Lexioai badge'] },
  { name: 'business', displayName: 'Business', isPopular: false, pricing: { INR: { monthly: 2999 }, USD: { monthly: 36 } }, limits: { bots: 20, chatsPerMonth: 2000 }, features: ['25 file uploads', 'White label', 'Webhooks & API access', 'Dedicated support'] },
]

const CURRENCIES = ['INR', 'USD']
const PREFERRED_CURRENCY_KEY = 'lexioai_preferred_currency'

const getStoredCurrency = () => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(PREFERRED_CURRENCY_KEY)
  return CURRENCIES.includes(stored) ? stored : null
}

const persistCurrency = (currency) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFERRED_CURRENCY_KEY, currency)
}

const detectDefaultCurrency = () => {
  const storedCurrency = getStoredCurrency()
  if (storedCurrency) return storedCurrency
  if (typeof navigator === 'undefined') return 'INR'
  const locale = (navigator.language || '').toLowerCase()
  return locale.includes('-in') ? 'INR' : 'USD'
}

const formatAmount = (currency, amount) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0))

const planUi = {
  free: {
    icon: Leaf,
    badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    border: 'border-slate-500/25',
  },
  starter: {
    icon: Rocket,
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
  },
  pro: {
    icon: Sparkles,
    badge: 'bg-primary-500/15 text-primary-300 border-primary-500/35',
    border: 'border-primary-500/35',
  },
  business: {
    icon: Star,
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/30',
  },
}

async function getPlans() {
  const res = await authApi.get('/widget/plans')
  return res?.data?.data?.plans || fallbackPlans
}

async function loadRazorpay() {
  if (window.Razorpay) return true

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PricingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, updateUser } = useAuthStore()
  const { data: plans = fallbackPlans } = useQuery({ queryKey: ['public-plans'], queryFn: getPlans })
  const [currency, setCurrency] = useState(detectDefaultCurrency)
  const [processingPlanName, setProcessingPlanName] = useState('')
  const orderedPlans = [...plans].sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0))
  const currentPlanName = String(user?.plan || 'free').toLowerCase()

  const isCurrentPlanActive = (planName) => {
    if (!isAuthenticated) return false

    const normalizedPlanName = String(planName || '').toLowerCase()
    if (!normalizedPlanName || normalizedPlanName !== currentPlanName) return false

    if (normalizedPlanName === 'free') return true

    if (!user?.planExpiry) return true

    const expiryDate = new Date(user.planExpiry)
    if (Number.isNaN(expiryDate.getTime())) return true

    return expiryDate.getTime() > Date.now()
  }

  const handleCurrencyChange = (nextCurrency) => {
    setCurrency(nextCurrency)
    persistCurrency(nextCurrency)
  }

  const handleStartNow = async (plan) => {
    const normalizedPlan = String(plan?.name || '').toLowerCase()
    persistCurrency(currency)

    if (!isAuthenticated) {
      navigate(`/register?currency=${currency}`)
      return
    }

    if (isCurrentPlanActive(normalizedPlan)) {
      toast.error('Plan already active. Choose another plan.')
      return
    }

    if (!normalizedPlan || normalizedPlan === 'free') {
      navigate('/dashboard')
      return
    }

    setProcessingPlanName(normalizedPlan)
    try {
      const sdkLoaded = await loadRazorpay()
      if (!sdkLoaded) {
        toast.error('Razorpay SDK failed to load')
        return
      }

      const createRes = await clientApi.post('/payments/subscription/create', {
        planName: normalizedPlan,
        billingCycle: 'monthly',
        currency,
      })

      const payment = createRes?.data?.data

      const options = {
        key: payment?.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        name: 'Lexioai',
        description: `${normalizedPlan} monthly`,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#7F77DD' },
        handler: async (response) => {
          const verifyRes = await clientApi.post('/payments/subscription/verify', {
            ...response,
            planName: payment?.planName || normalizedPlan,
            billingCycle: payment?.billingCycle || 'monthly',
            currency: payment?.currency || currency,
            couponCode: payment?.couponCode || undefined,
            discountAmount: payment?.discountAmount || 0,
          })

          const verifiedData = verifyRes?.data?.data || {}
          updateUser({
            plan: verifiedData.plan || payment?.planName || normalizedPlan,
            planStartedAt: verifiedData.planStartedAt || new Date().toISOString(),
            planExpiry: verifiedData.planExpiry || null,
          })

          toast.success('Plan upgraded successfully')
        },
      }

      if (payment?.paymentType === 'subscription') {
        options.subscription_id = payment.subscriptionId
      } else {
        options.order_id = payment?.orderId
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch {
      toast.error('Unable to start plan checkout. Please try again.')
    } finally {
      setProcessingPlanName('')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNavbar />

      <main className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">Pricing</p>
          <h1 className="mt-2 text-4xl font-extrabold">Simple plans for every stage</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Plans, pricing, features and Most Popular badge are managed by superadmin.</p>
          <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-1">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencyChange(code)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${currency === code ? 'bg-primary-500 text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {orderedPlans.map((plan) => {
            const config = planUi[plan?.name] || planUi.free
            const Icon = config.icon
            const bots = plan?.limits?.bots ?? plan?.limits?.botLimit
            const chats = plan?.limits?.chatsPerMonth ?? plan?.limits?.chatLimit
            const monthlyInr = plan?.pricing?.INR?.monthly
            const monthlyUsd = plan?.pricing?.USD?.monthly
            const selectedMonthly = plan?.pricing?.[currency]?.monthly
            const fallbackCurrency = currency === 'INR' ? 'USD' : 'INR'
            const fallbackMonthly = plan?.pricing?.[fallbackCurrency]?.monthly
            const finalCurrency = selectedMonthly !== undefined && selectedMonthly !== null ? currency : fallbackCurrency
            const finalMonthly = selectedMonthly !== undefined && selectedMonthly !== null ? selectedMonthly : (fallbackMonthly ?? 0)
            const isAlreadyActive = isCurrentPlanActive(plan?.name)

            return (
              <Card key={plan.name} className={`relative flex flex-col justify-between p-6 ${config.border}`}>
                {plan?.isPopular ? (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary-500/40 bg-primary-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
                    <Star size={11} />
                    Most Popular
                  </span>
                ) : null}

                <div>
                  <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ${config.badge}`}>
                    <Icon size={13} />
                    {plan?.displayName || plan?.name}
                  </span>

                  <p className="mt-3 text-3xl font-extrabold">{formatAmount(finalCurrency, finalMonthly)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{plan?.name === 'free' ? 'forever' : 'per month'}</p>
                  {(monthlyInr !== undefined || monthlyUsd !== undefined) ? (
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {monthlyInr !== undefined ? formatAmount('INR', monthlyInr) : 'INR -'}
                      {'  |  '}
                      {monthlyUsd !== undefined ? formatAmount('USD', monthlyUsd) : 'USD -'}
                    </p>
                  ) : null}

                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-muted)]">
                    <p>Bots: {bots === -1 ? 'Unlimited' : bots ?? '-'}</p>
                    <p>Chats: {chats === -1 ? 'Unlimited' : (chats ?? '-')}</p>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                    {(plan.features || []).map((feature) => {
                      const featureLabel =
                        plan?.name === 'pro' && /hindi|hinglish|english/i.test(feature)
                          ? 'HINDI'
                          : feature

                      return (
                      <li key={feature} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 text-emerald-500" />
                        <span>{featureLabel}</span>
                      </li>
                      )
                    })}
                  </ul>

                  {isAlreadyActive ? (
                    <p className="mt-3 text-xs font-semibold text-amber-400">Already active. Choose another plan.</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleStartNow(plan)}
                  disabled={Boolean(processingPlanName)}
                  className="btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingPlanName === String(plan?.name || '').toLowerCase()
                    ? 'Processing...'
                    : (isAlreadyActive ? 'Already Active' : 'Start now')}
                </button>
              </Card>
            )
          })}
        </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
