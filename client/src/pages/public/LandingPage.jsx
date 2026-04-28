import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Bot,
  Brain,
  ChartNoAxesCombined,
  Check,
  Globe,
  Handshake,
  Mail,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Stars,
  TimerReset,
} from 'lucide-react'
import { authApi } from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import useAuthStore from '../../store/authStore'
import PublicNavbar from '../../components/layout/PublicNavbar'
import HowItWorks from '../../components/HowItWorks'
import brandLogo from '../../assets/favicon/favicon-96x96.png'
import usePlatformSettings from '../../hooks/usePlatformSettings'


async function getLandingData() {
  const [statsRes, plansRes] = await Promise.all([
    authApi.get('/public/stats'),
    authApi.get('/widget/plans').catch(() => ({ data: { data: { plans: [] } } })),
  ])

  return {
    stats: statsRes?.data?.stats || statsRes?.data?.data?.stats || {
      activeUsers: '10K+',
      totalChats: '5M+',
      chatsHandled: '5M+',
      uptime: '99.9%',
      botsDeployed: '1000+',
    },
    plans: plansRes?.data?.data?.plans || [],
  }
}

const sections = [
  {
    title: 'Purpose-built for AI support agents',
    icon: Brain,
    text: 'Customer queries, product questions, and support replies all handled with one AI flow.',
    details: 'Powered by advanced language models with reasoning capabilities for complex support scenarios.',
  },
  {
    title: 'Designed for simplicity',
    icon: Sparkles,
    text: 'Create bot, train with URL/files, copy two lines, and go live in minutes.',
    details: 'Non-technical teams can deploy and manage agents without coding skills or technical setup.',
  },
  {
    title: 'Engineered for reliability',
    icon: ShieldCheck,
    text: 'Rate limits, secure auth, 2FA support, and high uptime for business websites.',
    details: 'Enterprise-grade security with 99.9% uptime SLA and comprehensive data protection measures.',
  },
  {
    title: 'Lead Capture & Management',
    icon: Mail,
    text: 'Automatically capture, qualify, and route high-intent leads from conversations.',
    details: 'Convert inquiries into actionable leads with intelligent and advanced lead qualification system.',
  },
]

const faqs = [
  {
    q: 'How long does it take to launch the chatbot?',
    a: 'Most teams go live in 10-15 minutes. Create a bot, train it on your site, and paste the embed code.',
  },
  {
    q: 'Is multi-language support available?',
    a: 'Yes, multilingual support is available with plan-based controls and auto-detect behavior.',
  },
  {
    q: 'Do I get real-time analytics?',
    a: 'Yes. You can track chat trends, leads, unanswered questions, peak hours, and usage by bot.',
  },
  {
    q: 'Is it suitable for small businesses?',
    a: 'Absolutely. Start with a free tier and scale with Starter, Pro, or Business plans.',
  },
  {
    q: 'Can I train the bot with my own content?',
    a: 'Yes! Upload your website URL, documents, PDFs, or paste text content. Our AI learns from your data and provides accurate responses.',
  },
  {
    q: 'What happens to user conversations?',
    a: 'Your conversations are encrypted and stored securely. You can export data anytime, and we comply with GDPR and data protection regulations.',
  },
]

const useCases = [
  {
    title: 'SaaS onboarding support',
    text: 'Answer setup questions instantly and reduce first-week churn with contextual help.',
    icon: Rocket,
  },
  {
    title: 'D2C product assistance',
    text: 'Guide users on shipping, returns, and product fit while capturing high-intent leads.',
    icon: Building2,
  },
  {
    title: 'Sales handoff optimization',
    text: 'Auto-qualify conversations and route warm prospects directly to your team.',
    icon: Handshake,
  },
]

const whyChooseLexio = [
  {
    title: 'Unmatched User Experience',
    icon: Stars,
    points: [
      'Intuitive interface with clean, user-friendly design and light gradients.',
      'Comprehensive chatbot features from knowledge base management to conversation analytics.',
      'Flexible pricing with free trial and plans that suit your needs.',
      'Superior Support: Dedicated customer care for continuous assistance.'
    ],
  },
  {
    title: 'Seamless Integration Capabilities',
    icon: Handshake,
    points: [
      'Advanced Integrations: Connect with your website, apps, and communication tools.',
      'Multi-channel Support: Manage conversations across web, chat, and messaging platforms.',
      'Always Syncing: Keep everything updated across all connected channels.',
      'Custom Configuration: Set up alerts and notifications for important events.'
    ],
  },
  {
    title: 'Powerful Analytics and Insights',
    icon: ChartNoAxesCombined,
    points: [
      'Real-Time Analytics: Gain actionable insights with our comprehensive dashboard.',
      'Conversation Tracking: Monitor chat volume, resolution rates, and user satisfaction.',
      'Advanced Filtering: Quickly filter conversations by date, tag, or performance metrics.',
      'Lead Capture: Track and analyze high-intent customer interactions automatically.'
    ],
  },
]

const footerLinks = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact us', href: 'mailto:support@lexioai.com' },
  { label: 'Changelog', to: '/changelog' },
  { label: 'Privacy policy', to: '/privacy' },
  { label: 'Terms of service', to: '/terms' },
  { label: 'Blog', to: '/blog' },
]

const footerSocials = [
  { label: 'LinkedIn', type: 'linkedin', href: 'https://www.linkedin.com' },
  { label: 'Instagram', type: 'instagram', href: 'https://www.instagram.com' },
  { label: 'X', type: 'x', href: 'https://x.com' },
  { label: 'YouTube', type: 'youtube', href: 'https://www.youtube.com' },
]

function SocialBrandIcon({ type }) {
  if (type === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
        <path d="M6.94 8.5V21H3V8.5h3.94ZM5 3a2.28 2.28 0 1 1 0 4.56A2.28 2.28 0 0 1 5 3ZM21 13.83V21h-3.92v-6.61c0-1.66-.6-2.8-2.08-2.8-1.13 0-1.81.77-2.1 1.52-.1.26-.14.61-.14.97V21H8.84s.05-10.53 0-11.62h3.92v1.64l-.03.04h.03v-.04c.52-.8 1.45-1.95 3.54-1.95 2.58 0 4.7 1.7 4.7 5.36Z" />
      </svg>
    )
  }

  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (type === 'x') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
        <path d="M18.62 3H21l-5.2 5.95L22 21h-4.86l-3.81-4.98L8.97 21H6.58l5.56-6.36L2 3h4.92l3.44 4.5L14.25 3h4.37Zm-1.7 16.32h1.34L6.2 4.6H4.77l12.15 14.72Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M23 7.2a3 3 0 0 0-2.1-2.12C19.02 4.5 12 4.5 12 4.5s-7.02 0-8.9.58A3 3 0 0 0 1 7.2 31.4 31.4 0 0 0 .5 12c0 1.63.17 3.23.5 4.8a3 3 0 0 0 2.1 2.12c1.88.58 8.9.58 8.9.58s7.02 0 8.9-.58A3 3 0 0 0 23 16.8c.33-1.57.5-3.17.5-4.8 0-1.63-.17-3.23-.5-4.8ZM9.75 15.45V8.55L15.5 12l-5.75 3.45Z" />
    </svg>
  )
}

export default function LandingPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { settings: platformSettings } = usePlatformSettings()
  const { data, isLoading } = useQuery({ queryKey: ['landing-data'], queryFn: getLandingData })

  const platformName = platformSettings?.branding?.platformName || 'Lexio AI'
  const logoSrc = platformSettings?.branding?.logoUrl || brandLogo
  const supportEmail = platformSettings?.general?.supportEmail || 'support@lexioai.com'

  const topPlan = useMemo(() => {
    if (!data?.plans?.length) {
      return { name: 'Pro', pricing: { INR: { monthly: 899 } } }
    }
    return data.plans.find((p) => p.isPopular) || data.plans[0]
  }, [data])

  const publicPlans = useMemo(() => (data?.plans?.length ? data.plans : [topPlan]), [data?.plans, topPlan])

  useEffect(() => {
    if (!location.hash) return

    const scrollToSection = () => {
      const section = document.querySelector(location.hash)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const timer = window.setTimeout(scrollToSection, 80)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  if (isLoading) {
    return <Loader label="Loading landing" variant="landing" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNavbar />

      <section className="hero-grid relative overflow-hidden border-b border-[var(--border)] px-4 pb-14 pt-10 md:pb-20 md:pt-14">
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-500">
              <Sparkles size={14} /> AI agents for magical customer experiences
            </p>
            <h1 className="mt-4 max-w-2xl text-[clamp(2.1rem,4.8vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              AI agents for
              <span className="block text-primary-500">modern customer support</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--text-muted)] lg:text-[17px]">
              Chatbase-style premium experience with stronger trust visuals, fast setup, and clear enterprise-ready behavior from day one.
            </p>
            {!isAuthenticated ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary !h-9 !px-4">
                  Build my agent for free <ArrowRight size={16} />
                </Link>
                <Link to="/pricing" className="btn-secondary !h-9 !px-4">See pricing</Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/dashboard" className="btn-primary !h-9 !px-4">
                  Open dashboard <ArrowRight size={16} />
                </Link>
                <Link to="/profile" className="btn-secondary !h-9 !px-4">Open profile</Link>
              </div>
            )}

            <div className="mt-12 grid gap-4 sm:grid-cols-3 text-center">
              <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 p-6">
                <p className="text-xl sm:text-2xl font-semibold text-primary-500">4.9/5</p>
                <p className="mt-2 text-xs font-normal text-[var(--text-muted)] uppercase tracking-wide">Support rating</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 p-6">
                <p className="text-xl sm:text-2xl font-semibold text-primary-500">24/7</p>
                <p className="mt-2 text-xs font-normal text-[var(--text-muted)] uppercase tracking-wide">Always online</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 p-6">
                <p className="text-xl sm:text-2xl font-semibold text-primary-500">10 min</p>
                <p className="mt-2 text-xs font-normal text-[var(--text-muted)] uppercase tracking-wide">Average setup</p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-primary-500/20 p-0">
            <div className="bg-[linear-gradient(120deg,#fff_0%,#f0ecff_45%,#fff6ec_100%)] p-5 dark:bg-[linear-gradient(120deg,#141b29_0%,#1a2237_42%,#261f31_100%)] sm:p-8">
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#171f2e]">
                <div className="flex items-center justify-between">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-500/10 text-primary-500">
                      <Bot size={14} />
                    </span>
                    Lexio AI Assistant
                  </p>
                  <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-500">Live</span>
                </div>
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-2 text-[11px] text-[var(--text-muted)]">
                  Avg reply time: 1.8s | Resolution assist: 68% | Lead capture: On
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="rounded-xl bg-[var(--bg-soft)] p-3">Hi! I can help with plans, onboarding and setup.</div>
                  <div className="ml-auto max-w-[84%] rounded-xl bg-primary-500 p-3 text-white">How do I deploy on my site?</div>
                  <div className="rounded-xl bg-[var(--bg-soft)] p-3">Copy the embed code from dashboard and paste before body end tag.</div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  <button className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300/80 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary-400/55 hover:text-primary-600 dark:border-white/15 dark:bg-[#121827] dark:text-slate-200 dark:hover:border-primary-400/60 dark:hover:text-primary-300">
                    <Sparkles size={12} />
                    Create your assistant
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </section>

      <section className="mx-auto w-full max-w-7xl grid grid-cols-2 gap-3 px-4 py-10 text-center sm:grid-cols-4">
        <Card className="p-4 hover:shadow-lg transition duration-300" data-stagger><p className="text-2xl font-bold text-primary-500">{data?.stats?.activeUsers || '10K+'}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Active Users</p></Card>
        <Card className="p-4 hover:shadow-lg transition duration-300" data-stagger><p className="text-2xl font-bold text-primary-500">{data?.stats?.totalChats || data?.stats?.chatsHandled || '5M+'}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Total Chats</p></Card>
        <Card className="p-4 hover:shadow-lg transition duration-300" data-stagger><p className="text-2xl font-bold text-amber-500">{data?.stats?.uptime || '99.9%'}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Uptime</p></Card>
        <Card className="p-4 hover:shadow-lg transition duration-300" data-stagger><p className="text-2xl font-bold text-green-500">{data?.stats?.botsDeployed || '1000+'}</p><p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Bots Deployed</p></Card>
      </section>

      <section className="scroll-mt-24 px-4 py-20" id="trust">
        <div className="mx-auto w-full max-w-7xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Why Choose <span className="text-primary-500">Lexio AI?</span></h2>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">Discover the ultimate AI chatbot platform with powerful features and integrations designed to elevate your customer support.</p>
          </div>

          <div className="space-y-12">
            {whyChooseLexio.map((item, idx) => (
              <div key={item.title} className="relative p-8 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 overflow-hidden group">
                {/* Left border accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-primary-500/30" />
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-500/20">
                      <item.icon className="h-6 w-6 text-primary-500" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold">{item.title}</h3>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {item.points.map((point, pidx) => (
                    <li key={pidx} className="flex items-start gap-3">
                      <Check size={18} className="flex-shrink-0 text-primary-500 mt-0.5" />
                      <span className="text-sm text-[var(--text-muted)]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">Highlights</p>
          <h2 className="mt-2 text-4xl sm:text-5xl font-bold mb-6">Highlight <span className="text-primary-500">Lexio AI</span></h2>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">Discover what makes Lexio AI the ultimate platform for building powerful AI-driven customer support agents.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {sections.map((item, idx) => (
            <div key={item.title} className="flex flex-col">
              <div className="group relative flex-1 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 overflow-hidden p-6 flex flex-col transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:from-primary-500/5">
                
                {/* Top visual showcase */}
                <div className="relative mb-6 h-20 -mx-6 -mt-6 rounded-b-2xl bg-gradient-to-b from-primary-500/20 to-transparent flex items-center justify-center overflow-hidden group-hover:from-primary-500/30 transition-colors">
                  {idx === 0 && (
                    <div className="text-center flex flex-col items-center gap-1">
                      <Brain className="h-10 w-10 text-primary-500 opacity-40" />
                      <p className="text-[10px] text-primary-500 font-semibold">AI Models</p>
                    </div>
                  )}
                  {idx === 1 && (
                    <div className="text-center flex flex-col items-center gap-1">
                      <div className="inline-block bg-black dark:bg-white rounded px-2 py-1">
                        <p className="text-white dark:text-black text-[10px] font-bold">Create</p>
                      </div>
                      <p className="text-[10px] text-primary-500 font-semibold">Simple Setup</p>
                    </div>
                  )}
                  {idx === 2 && (
                    <div className="text-center flex flex-col items-center gap-1">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-pink-500">
                        <ShieldCheck className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-[10px] text-primary-500 font-semibold">Enterprise</p>
                    </div>
                  )}
                  {idx === 3 && (
                    <div className="text-center flex flex-col items-center gap-1">
                      <Mail className="h-10 w-10 text-primary-500 opacity-40" />
                      <p className="text-[10px] text-primary-500 font-semibold">Lead Capture</p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-500/20 flex-shrink-0">
                      <item.icon size={16} className="text-primary-500" />
                    </div>
                    <h3 className="text-sm font-bold leading-tight">{item.title}</h3>
                  </div>
                  
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">{item.text}</p>
                  
                  <div className="mt-auto pt-3 border-t border-[var(--border)]">
                    <p className="text-[11px] text-[var(--text-muted)]/80 leading-relaxed">{item.details}</p>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500/0 via-primary-500 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="scroll-mt-24  px-4 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2">
          <Card className="p-6 min-[1700px]:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Product walkthrough</p>
            <h3 className="mt-2 text-2xl font-bold">Traditional support vs AI customer support</h3>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <p className="font-semibold">Manual process</p>
                <ol className="mt-2 space-y-1 text-[var(--text-muted)]">
                  <li>1. Team replies manually</li>
                  <li>2. Slow response windows</li>
                  <li>3. Higher support overhead</li>
                  <li>4. No instant lead routing</li>
                </ol>
              </div>
              <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-3">
                <p className="font-semibold text-primary-600 dark:text-primary-400">Lexio process</p>
                <ol className="mt-2 space-y-1 text-[var(--text-muted)]">
                  <li>1. AI resolves instantly</li>
                  <li>2. 24/7 conversations</li>
                  <li>3. Lower support cost</li>
                  <li>4. Lead capture + analytics</li>
                </ol>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[var(--text-muted)]">
              {['Conversation-level tracking', 'Agent quality controls', 'Built-in escalation flow', 'Custom embed behavior'].map((point) => (
                <div key={point} className="flex items-center gap-2">
                  <Check size={14} className="text-primary-500" />
                  {point}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 min-[1700px]:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Insights</p>
            <h3 className="mt-2 text-2xl font-bold">Everything you need to know about your AI support</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                <MessagesSquare className="text-primary-500" size={18} />
                <p className="mt-2 text-sm font-semibold">Conversation depth</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Track conversation quality and duration.</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                <ChartNoAxesCombined className="text-primary-500" size={18} />
                <p className="mt-2 text-sm font-semibold">Smart analytics</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Measure performance and peak traffic windows.</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                <Globe className="text-primary-500" size={18} />
                <p className="mt-2 text-sm font-semibold">Global rollout</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Deploy same bot across multiple properties.</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                <ShieldCheck className="text-primary-500" size={18} />
                <p className="mt-2 text-sm font-semibold">Enterprise trust</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Safer workflows and controlled access patterns.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <HowItWorks />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="grid gap-4 lg:grid-cols-2 min-[1700px]:gap-6">
          <Card className="p-6 min-[1700px]:p-8 hover:shadow-lg transition duration-300 border border-[var(--border)] hover:border-primary-500/40">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">Testimonials</p>
            <h3 className="mt-2 text-2xl font-bold">What support teams say</h3>
            <div className="mt-5 space-y-3">
              {[
                'We cut first-response time by 70% in two weeks.',
                'Lead quality increased because bot asks right qualifying questions.',
                'Deployment was clean across landing pages and docs.',
                'Our support costs dropped 60% while customer satisfaction increased to 95%.',
                'Setup was so easy our non-technical team did it without any help.',
              ].map((line, idx) => (
                <div key={line} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm hover:border-primary-500/40 hover:bg-[var(--bg-soft)]/80 transition duration-300" style={{ transitionDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Stars size={14} className="text-primary-500" />
                    {line}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 min-[1700px]:p-8 hover:shadow-lg transition duration-300 border border-[var(--border)] hover:border-primary-500/40">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">FAQ</p>
            <h3 className="mt-2 text-2xl font-bold">Everything you need to know</h3>
            <div className="mt-4 space-y-2">
              {faqs.map((item) => (
                <details key={item.q} className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 hover:border-primary-500/40 hover:bg-[var(--bg-soft)]/80 transition duration-300 cursor-pointer group">
                  <summary className="text-sm font-semibold group-hover:text-primary-500 transition"> {item.q}</summary>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{item.a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <Card className="hero-grid border-primary-500/20 p-8 text-center min-[1700px]:p-12">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-500">Launch your support AI now</p>
          <h3 className="mt-2 text-3xl font-bold">Build a high-trust customer support experience</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Non-technical teams can deploy quickly with fast onboarding, clear controls, and rich analytics included.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/pricing" className="btn-primary !h-9 !px-4">See all plans</Link>
            <Link to="/register" className="btn-secondary !h-9 !px-4">Create free account</Link>
          </div>
        </Card>
      </section>

      <footer className="relative overflow-hidden border-t border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-card)_0%,var(--bg)_100%)] px-4 pb-8 pt-14 text-[var(--text)] dark:border-white/10 dark:bg-[#060913] dark:text-slate-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/65 to-transparent" />
        <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary-500/12 blur-3xl dark:bg-primary-500/18" />
        <div className="pointer-events-none absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-amber-400/8 blur-3xl dark:bg-cyan-400/12" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)] lg:gap-14">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <img src={logoSrc} alt={platformName} className="h-9 w-9 rounded-lg object-cover" />
                <p className="text-2xl font-semibold leading-none tracking-[-0.02em] sm:text-3xl">{platformName}</p>
              </div>
              <p className="mt-4 text-lg font-medium leading-none tracking-[-0.02em] text-[var(--text-muted)] dark:text-slate-300/95 sm:text-2xl">&copy; 2026 {platformName}, All rights reserved.</p>

              <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-6 text-base font-medium text-[var(--text)] transition hover:-translate-y-0.5 hover:border-primary-400/60 hover:bg-primary-500/10 hover:text-primary-500 hover:shadow-[0_20px_30px_-24px_rgba(127,119,221,0.65)] dark:border-white/20 dark:bg-white dark:text-slate-900 dark:hover:shadow-[0_20px_30px_-24px_rgba(255,255,255,0.8)]"
                >
                  <Mail size={18} /> Contact
                </a>
                {footerSocials.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] transition hover:-translate-y-0.5 hover:border-primary-400/60 hover:bg-primary-500/12 hover:text-primary-500 dark:border-white/15 dark:bg-white/0 dark:text-slate-100 dark:hover:text-primary-200 sm:h-12 sm:w-12"
                  >
                    <SocialBrandIcon type={item.type} />
                  </a>
                ))}
              </div>
            </div>

            <div className="w-full max-w-[560px] justify-self-start grid grid-cols-2 gap-x-8 gap-y-3 text-sm leading-tight text-[var(--text-muted)] dark:text-slate-300/95 sm:gap-x-12 sm:gap-y-4 sm:text-[15px]">
              {footerLinks.map((link) => (
                <div key={link.label} className="min-w-0">
                  {link.comingSoon ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[var(--text-muted)] dark:text-slate-300/95">
                      {link.label}
                      <span className="rounded-full border border-primary-500/35 bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-500">
                        Coming soon
                      </span>
                    </span>
                  ) : link.href ? (
                    <a
                      href={link.label === 'Contact us' ? `mailto:${supportEmail}` : link.href}
                      className="block whitespace-nowrap transition hover:text-primary-500"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="block whitespace-nowrap transition hover:text-primary-500">{link.label}</Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border-t border-[var(--border)] pt-6 dark:border-white/10">
            <div className="flex flex-col items-start gap-3 text-sm text-[var(--text-muted)] dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>Built for modern customer conversations with reliable AI behavior.</p>
              
            </div>
          </div>

          <p className="pointer-events-none mt-8 select-none text-[clamp(2.8rem,18vw,13rem)] font-black uppercase leading-none tracking-[-0.04em] text-[var(--text)]/8 dark:text-transparent dark:[-webkit-text-stroke:1px_rgba(226,232,240,0.14)]">
            {platformName}
          </p>
        </div>
      </footer>
    </div>
  )
}
