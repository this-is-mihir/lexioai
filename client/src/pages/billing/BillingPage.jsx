import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, Check, CreditCard, Leaf, Rocket, ShieldCheck, Sparkles, Star, Wallet } from 'lucide-react'
import clientApi from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Loader from '../../components/ui/Loader'

const fallbackPlans = [
  { name: 'free', displayName: 'Free', pricing: { INR: { monthly: 0, yearly: 0 }, USD: { monthly: 0, yearly: 0 } }, features: ['1 bot', '50 chats/month'], isPopular: false },
  { name: 'starter', displayName: 'Starter', pricing: { INR: { monthly: 399, yearly: 3990 }, USD: { monthly: 5, yearly: 48 } }, features: ['3 bots', '100 chats/month'], isPopular: false },
  { name: 'pro', displayName: 'Pro', pricing: { INR: { monthly: 899, yearly: 8990 }, USD: { monthly: 11, yearly: 108 } }, features: ['10 bots', '300 chats/month'], isPopular: true },
  { name: 'business', displayName: 'Business', pricing: { INR: { monthly: 2999, yearly: 29990 }, USD: { monthly: 36, yearly: 360 } }, features: ['20 bots', '2,000 chats/month'], isPopular: false },
]

const planThemes = {
  free: {
    label: 'Free',
    icon: Leaf,
    badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    card: 'border-slate-500/25',
  },
  starter: {
    label: 'Starter',
    icon: Rocket,
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    card: 'border-emerald-500/30',
  },
  pro: {
    label: 'Pro',
    icon: Sparkles,
    badge: 'bg-primary-500/15 text-primary-300 border-primary-500/40',
    card: 'border-primary-500/35',
  },
  business: {
    label: 'Business',
    icon: Star,
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    card: 'border-amber-500/30',
  },
}

const formatDate = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const daysLeftFrom = (expiry) => {
  if (!expiry) return null
  const exp = new Date(expiry)
  if (Number.isNaN(exp.getTime())) return null
  const diff = exp.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const CURRENCIES = ['INR', 'USD']
const BILLING_CYCLES = ['monthly', 'yearly']
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

  if (typeof window !== 'undefined') {
    const searchCurrency = new URLSearchParams(window.location.search).get('currency')
    const normalizedSearchCurrency = String(searchCurrency || '').toUpperCase()
    if (CURRENCIES.includes(normalizedSearchCurrency)) return normalizedSearchCurrency
  }

  if (typeof navigator === 'undefined') return 'INR'
  const locale = (navigator.language || '').toLowerCase()
  return locale.includes('-in') ? 'INR' : 'USD'
}

const detectDefaultCycle = () => {
  if (typeof window === 'undefined') return 'monthly'
  const queryCycle = String(new URLSearchParams(window.location.search).get('cycle') || '').toLowerCase()
  return BILLING_CYCLES.includes(queryCycle) ? queryCycle : 'monthly'
}

const formatMoney = (currency, amount) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0))

const CREDIT_ELIGIBLE_PLANS = ['pro', 'business']

const getSavingsLabel = (discountInfo, currency = 'INR') => {
  if (!discountInfo) return ''
  if (discountInfo.discountType === 'percentage') {
    return `Save ${discountInfo.discountValue}% (${formatMoney(currency, discountInfo.discountAmount)})`
  }
  return `Save ${formatMoney(currency, discountInfo.discountAmount)}`
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

export default function BillingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, updateUser, setCredits } = useAuthStore()
  const [couponCode, setCouponCode] = useState('')
  const [couponInfo, setCouponInfo] = useState(null)
  const [cycle, setCycle] = useState(detectDefaultCycle)
  const [currency, setCurrency] = useState(detectDefaultCurrency)
  const [processing, setProcessing] = useState(false)
  const autoCheckoutHandledRef = useRef(false)

  const { data: plans = fallbackPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const res = await clientApi.get('/widget/plans')
      return res?.data?.data?.plans || fallbackPlans
    },
  })

  const { data: packages = [], isLoading: packsLoading } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: async () => {
      const res = await clientApi.get('/payments/credit-packages')
      return res?.data?.data?.packages || []
    },
  })

  const currentPlanName = (user?.plan || 'free').toLowerCase()
  const currentPlanTheme = planThemes[currentPlanName] || planThemes.free
  const CurrentPlanIcon = currentPlanTheme.icon
  const planStartDate = user?.planStartedAt || null
  const planExpiryDate = user?.planExpiry || null
  const daysLeft = daysLeftFrom(planExpiryDate)
  const isProOrBusinessPlan = CREDIT_ELIGIBLE_PLANS.includes(currentPlanName)
  const parsedPlanExpiry = planExpiryDate ? new Date(planExpiryDate) : null
  const hasValidPlanExpiry = Boolean(parsedPlanExpiry && !Number.isNaN(parsedPlanExpiry.getTime()) && parsedPlanExpiry > new Date())
  const canBuyCredits = isProOrBusinessPlan && hasValidPlanExpiry
  const creditBlockedReason = !isProOrBusinessPlan
    ? 'Credits top-up is available only on Pro and Business plans.'
    : (!hasValidPlanExpiry
      ? 'Active paid plan is required. Renew your plan before buying credits.'
      : '')

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0)),
    [plans],
  )

  const paidPlans = useMemo(
    () => orderedPlans.filter((plan) => plan?.name !== 'free'),
    [orderedPlans],
  )

  const activePlan = useMemo(
    () => orderedPlans.find((p) => p.name?.toLowerCase() === currentPlanName),
    [orderedPlans, currentPlanName],
  )

  const handleCurrencyChange = (nextCurrency) => {
    setCurrency(nextCurrency)
    persistCurrency(nextCurrency)
    setCouponInfo(null)
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter coupon code first')
      return
    }

    try {
      const code = couponCode.trim()

      const planNames = paidPlans
        .map((p) => p?.name)
        .filter((name) => Boolean(name))

      if (!planNames.length) {
        toast.error('No paid plans available for coupon check')
        return
      }

      const results = await Promise.allSettled(
        planNames.map(async (name) => {
          const res = await clientApi.post('/payments/coupon/validate', {
            code,
            planName: name,
            billingCycle: cycle,
            currency,
          })

          return {
            planName: name,
            data: res?.data?.data || null,
          }
        }),
      )

      const appliedPlanDiscounts = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.data) {
          appliedPlanDiscounts[result.value.planName] = result.value.data
        }
      })

      const matchedCount = Object.keys(appliedPlanDiscounts).length
      if (!matchedCount) {
        setCouponInfo(null)
        toast.error('Coupon is not valid for available plans')
        return
      }

      setCouponInfo({
        targetType: 'plan',
        billingCycle: cycle,
        planDiscountMap: appliedPlanDiscounts,
      })

      if (matchedCount === planNames.length) {
        toast.success('Coupon applied on all paid plans')
      } else {
        toast.success(`Coupon applied on ${matchedCount} plan(s)`)
      }
    } catch {
      setCouponInfo(null)
    }
  }

  const handleSubscription = useCallback(async (plan) => {
    if (!plan || plan.name === 'free') return

    setProcessing(true)
    try {
      const ok = await loadRazorpay()
      if (!ok) {
        toast.error('Razorpay SDK failed to load')
        return
      }

      const payload = {
        planName: plan.name,
        billingCycle: cycle,
        currency,
      }

      if (couponCode.trim()) {
        payload.couponCode = couponCode.trim()
      }

      const createRes = await clientApi.post('/payments/subscription/create', payload)
      const payment = createRes?.data?.data

      const options = {
        key: payment.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        name: 'Lexioai',
        description: `${plan.name} ${cycle}`,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#7F77DD' },
        handler: async (response) => {
          const verifyRes = await clientApi.post('/payments/subscription/verify', {
            ...response,
            planName: payment.planName || plan.name,
            billingCycle: payment.billingCycle || cycle,
            currency: payment.currency || currency,
            couponCode: payment.couponCode || couponCode || undefined,
            discountAmount: payment.discountAmount || 0,
          })

          const verifiedData = verifyRes?.data?.data || {}
          updateUser({
            plan: verifiedData.plan || payment.planName || plan.name,
            planStartedAt: verifiedData.planStartedAt || new Date().toISOString(),
            planExpiry: verifiedData.planExpiry || null,
          })

          toast.success('Plan upgraded successfully')
        },
      }

      if (payment.paymentType === 'subscription') {
        options.subscription_id = payment.subscriptionId
      } else {
        options.order_id = payment.orderId
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch {
      toast.error('Unable to start plan checkout. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [couponCode, currency, cycle, updateUser, user?.email, user?.name])

  useEffect(() => {
    if (plansLoading || autoCheckoutHandledRef.current) return

    const searchParams = new URLSearchParams(location.search)
    const shouldAutoCheckout = searchParams.get('autocheckout') === '1'
    if (!shouldAutoCheckout) return

    const queryCycle = String(searchParams.get('cycle') || '').toLowerCase()
    if (BILLING_CYCLES.includes(queryCycle) && queryCycle !== cycle) {
      setCycle(queryCycle)
      return
    }

    const requestedPlanName = String(searchParams.get('plan') || '').toLowerCase()
    autoCheckoutHandledRef.current = true
    navigate('/billing', { replace: true })

    if (!requestedPlanName || requestedPlanName === 'free') {
      return
    }

    const targetPlan = orderedPlans.find((plan) => plan?.name?.toLowerCase() === requestedPlanName)
    if (!targetPlan) {
      toast.error('Selected plan is not available right now.')
      return
    }

    if (currentPlanName === requestedPlanName) {
      toast.success('You are already on this plan.')
      return
    }

    void handleSubscription(targetPlan)
  }, [cycle, currentPlanName, handleSubscription, location.search, navigate, orderedPlans, plansLoading])

  const handleCredits = async (pkg) => {
    if (!canBuyCredits) {
      toast.error(creditBlockedReason || 'Credits purchase is currently unavailable')
      return
    }

    setProcessing(true)
    try {
      const ok = await loadRazorpay()
      if (!ok) {
        toast.error('Razorpay SDK failed to load')
        return
      }

      const createRes = await clientApi.post('/payments/credits/create', {
        packageId: pkg._id,
        currency,
      })

      const payment = createRes?.data?.data

      const razorpay = new window.Razorpay({
        key: payment.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: payment.orderId,
        name: 'Lexioai',
        description: `${pkg.name} credits`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#7F77DD' },
        handler: async (response) => {
          const verifyRes = await clientApi.post('/payments/credits/verify', {
            ...response,
            packageId: pkg._id,
          })

          const newBalance = verifyRes?.data?.data?.totalCredits
          if (typeof newBalance === 'number') {
            setCredits(newBalance)
          }

          toast.success('Credits added successfully')
        },
      })

      razorpay.open()
    } catch {
      toast.error('Unable to start credits checkout. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const cancelSubscription = async () => {
    try {
      await clientApi.post('/payments/subscription/cancel')
      toast.success('Subscription will end at current cycle')
    } catch {
      toast.error('Failed to cancel subscription')
    }
  }

  if (plansLoading || packsLoading) {
    return <Loader label="Loading billing" variant="billing" />
  }

  return (
    <div className="space-y-5">
      <Card className="hero-grid border-primary-500/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">Billing</p>
            <h1 className="mt-2 text-2xl font-extrabold">Subscription & Credits Control</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage plans, payment cycles, coupons, and top-ups from one place.</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 text-right text-sm ${currentPlanTheme.badge}`}>
            <p className="text-xs">Current plan</p>
            <p className="inline-flex items-center gap-2 text-base font-bold">
              <CurrentPlanIcon size={16} />
              {activePlan?.displayName || currentPlanTheme.label}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-xl border p-3 ${currentPlanTheme.card} bg-[var(--bg-soft)]`}>
            <p className="text-xs text-[var(--text-muted)]">Current Plan</p>
            <p className="mt-1 text-xl font-bold">{activePlan?.displayName || currentPlanTheme.label}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Plan Taken On</p>
            <p className="mt-1 text-base font-bold">{formatDate(planStartDate)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Plan Expiry</p>
            <p className="mt-1 text-base font-bold">{formatDate(planExpiryDate)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Credits Balance</p>
            <p className="mt-1 text-xl font-bold">{user?.chatCredits || 0}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-2">
            <CalendarClock size={14} className="text-primary-500" />
            {planExpiryDate
              ? (daysLeft === 0
                ? 'Your current plan is expiring today.'
                : `${daysLeft} day(s) left in current cycle.`)
              : (currentPlanName === 'free'
                ? 'You are on free plan with no paid-cycle expiry.'
                : 'Paid plan detected but expiry not synced yet. Ask admin to re-save plan with billing cycle.')} 
          </p>
          {activePlan?.description ? <p className="mt-1">{activePlan.description}</p> : null}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Coupons & Billing Cycle</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-1">
              <button
                className={`rounded-lg px-3 py-1 text-xs ${cycle === 'monthly' ? 'bg-primary-500 text-white' : ''}`}
                onClick={() => {
                  setCycle('monthly')
                  setCouponInfo(null)
                }}
              >
                Monthly
              </button>
              <button
                className={`rounded-lg px-3 py-1 text-xs ${cycle === 'yearly' ? 'bg-primary-500 text-white' : ''}`}
                onClick={() => {
                  setCycle('yearly')
                  setCouponInfo(null)
                }}
              >
                Yearly
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-1">
              {CURRENCIES.map((code) => (
                <button
                  key={code}
                  className={`rounded-lg px-3 py-1 text-xs ${currency === code ? 'bg-primary-500 text-white' : ''}`}
                  onClick={() => handleCurrencyChange(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="Coupon code"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value)
              setCouponInfo(null)
            }}
          />
          <Button variant="secondary" onClick={applyCoupon}>Validate coupon</Button>
        </div>

        {couponInfo ? (
          <div className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-sm text-primary-300">
            {`Coupon applied on ${Object.keys(couponInfo.planDiscountMap || {}).length} plan(s). Prices updated below.`}
          </div>
        ) : null}

        {user?.plan !== 'free' ? (
          <div className="mt-4">
            <Button variant="danger" onClick={cancelSubscription}>Cancel Subscription</Button>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">Plan Options</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {orderedPlans.map((plan) => {
              const inrPrice = cycle === 'yearly' ? plan?.pricing?.INR?.yearly : plan?.pricing?.INR?.monthly
              const usdPrice = cycle === 'yearly' ? plan?.pricing?.USD?.yearly : plan?.pricing?.USD?.monthly
              const selectedPrice = cycle === 'yearly' ? plan?.pricing?.[currency]?.yearly : plan?.pricing?.[currency]?.monthly
              const fallbackCurrency = currency === 'INR' ? 'USD' : 'INR'
              const fallbackPrice = cycle === 'yearly' ? plan?.pricing?.[fallbackCurrency]?.yearly : plan?.pricing?.[fallbackCurrency]?.monthly
              const finalCurrency = selectedPrice !== undefined && selectedPrice !== null ? currency : fallbackCurrency
              const finalPrice = selectedPrice !== undefined && selectedPrice !== null ? selectedPrice : (fallbackPrice ?? 0)
              const isCurrent = currentPlanName === plan.name
              const isFreePlan = plan.name === 'free'
              const theme = planThemes[plan.name] || planThemes.free
              const PlanIcon = theme.icon
              const planCoupon = couponInfo?.planDiscountMap?.[plan.name] || null
              const hasPlanCoupon = Boolean(
                couponInfo
                && couponInfo.targetType === 'plan'
                && couponInfo.billingCycle === cycle
                && planCoupon
              )
              const discountedPlanPrice = hasPlanCoupon ? planCoupon?.finalAmount : finalPrice
              const showPlanDiscount = hasPlanCoupon && Number(planCoupon?.discountAmount) > 0

              return (
                <Card key={plan.name} className={`group relative overflow-hidden p-5 ${theme.card}`}>
                  <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary-500/10 blur-2xl transition group-hover:bg-primary-500/20" />
                  {plan?.isPopular ? (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary-500/40 bg-primary-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
                      <Star size={11} />
                      Most Popular
                    </span>
                  ) : null}

                  <div className="inline-flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-wider ${theme.badge}`}>
                      <PlanIcon size={12} />
                      {plan.displayName || plan.name}
                    </span>
                  </div>

                  {showPlanDiscount ? (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-[var(--text-muted)] line-through">{formatMoney(finalCurrency, finalPrice)}</p>
                      <p className="text-3xl font-extrabold text-primary-300">{formatMoney(finalCurrency, discountedPlanPrice)}</p>
                      <p className="text-xs font-semibold text-emerald-300">{getSavingsLabel(planCoupon, finalCurrency)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-3xl font-extrabold">{formatMoney(finalCurrency, finalPrice)}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">{isFreePlan ? '/forever' : `/${cycle}`}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {inrPrice !== undefined ? formatMoney('INR', inrPrice) : 'INR -'}
                    {'  |  '}
                    {usdPrice !== undefined ? formatMoney('USD', usdPrice) : 'USD -'}
                  </p>
                  {plan?.description ? <p className="mt-2 text-xs text-[var(--text-muted)]">{plan.description}</p> : null}

                  <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                    {(plan.features || []).slice(0, 5).map((feature) => (
                      <li key={feature} className="inline-flex items-start gap-2">
                        <Check size={14} className="mt-0.5 text-primary-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-5 w-full justify-center"
                    disabled={processing || isCurrent || isFreePlan}
                    onClick={() => handleSubscription(plan)}
                  >
                    {isCurrent ? 'Current Plan' : (isFreePlan ? 'Included' : `Choose ${plan.displayName || plan.name}`)}
                  </Button>
                </Card>
              )
            })}
        </div>
      </Card>

      <Card>
        <p className="inline-flex items-center gap-2 text-sm font-semibold"><Wallet size={16} className="text-primary-500" /> Top Up Credits</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Credits are used after monthly limits are exhausted.</p>
        {!canBuyCredits ? (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{creditBlockedReason}</p>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {packages.map((pkg) => {
            const inrPackagePrice = pkg?.pricing?.INR
            const usdPackagePrice = pkg?.pricing?.USD
            const selectedPackagePrice = pkg?.pricing?.[currency]
            const fallbackCurrency = currency === 'INR' ? 'USD' : 'INR'
            const fallbackPackagePrice = pkg?.pricing?.[fallbackCurrency]
            const finalCurrency = selectedPackagePrice !== undefined && selectedPackagePrice !== null ? currency : fallbackCurrency
            const packagePrice = selectedPackagePrice !== undefined && selectedPackagePrice !== null ? selectedPackagePrice : (fallbackPackagePrice ?? 0)

            return (
              <Card key={pkg._id || pkg.name} className="p-5">
                <p className="text-sm font-semibold">{pkg.name || `${pkg.chats} chats`}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{pkg.chats || pkg.credits} extra chats</p>
                <p className="mt-3 text-2xl font-extrabold">{formatMoney(finalCurrency, packagePrice)}</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {inrPackagePrice !== undefined ? formatMoney('INR', inrPackagePrice) : 'INR -'}
                  {'  |  '}
                  {usdPackagePrice !== undefined ? formatMoney('USD', usdPackagePrice) : 'USD -'}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => handleCredits(pkg)} disabled={processing || !canBuyCredits}>Buy</Button>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 text-sm text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-2 font-semibold text-[var(--text)]"><CreditCard size={15} className="text-primary-500" /> Payment trust</p>
          <p className="mt-2">All checkout flows are handled via Razorpay with server-side verification before credits or plan updates.</p>
        </Card>
        <Card className="p-4 text-sm text-[var(--text-muted)]">
          <p className="inline-flex items-center gap-2 font-semibold text-[var(--text)]"><ShieldCheck size={15} className="text-primary-500" /> Renewal control</p>
          <p className="mt-2">You can cancel paid plans any time and keep access until the current billing cycle ends.</p>
        </Card>
      </div>
    </div>
  )
}
