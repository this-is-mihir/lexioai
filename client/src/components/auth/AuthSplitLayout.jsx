import { Bot, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import brandLogo from '../../assets/favicon/web-app-manifest-512x512.png'
import usePlatformSettings from '../../hooks/usePlatformSettings'
import useTheme from '../../hooks/useTheme'
import ThemeToggle from '../ui/ThemeToggle'

const highlights = [
  'Fast onboarding with clean setup flow',
  'Secure auth with OTP and session controls',
  'Actionable analytics and lead visibility',
]

export default function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
  visualHeading = 'A smart support companion that adapts to your business.',
  visualSubtext = 'Lexio helps your team answer faster, capture better leads, and improve support confidence.',
}) {
  const { settings } = usePlatformSettings()
  const { theme, toggleTheme } = useTheme()
  const platformName = settings?.branding?.platformName || 'Lexio AI'
  const logoSrc = settings?.branding?.logoUrl || brandLogo

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-5 sm:py-7">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="relative grid w-full max-w-[1120px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] lg:grid-cols-[1fr_1.04fr]">
        <aside className="relative hidden min-h-[600px] overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(21,102,255,0.20),transparent_42%),linear-gradient(180deg,#0c2a74_0%,#0b1f4f_58%,#09183c_100%)] p-7 text-white lg:flex lg:flex-col lg:justify-between dark:bg-[radial-gradient(circle_at_50%_20%,rgba(21,102,255,0.32),transparent_44%),linear-gradient(180deg,#02060d_0%,#06122a_55%,#04080f_100%)]">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
            <img src={logoSrc} alt={platformName} className="h-5 w-5 rounded-md object-cover" />
            {platformName} Workspace
          </div>

          <div>
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_20px_60px_-25px_rgba(37,99,235,0.9)]">
              <Bot size={58} className="text-blue-300" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold leading-tight">{visualHeading}</h2>
            <p className="mt-3 max-w-md text-sm text-blue-100/90 dark:text-blue-100/85">{visualSubtext}</p>
          </div>

          <div className="space-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <ShieldCheck size={14} className="text-blue-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="p-5 sm:p-7 lg:p-8">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="mb-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-500">
                <Sparkles size={13} />
                Secure Account Access
              </p>
              <h1 className="mt-4 text-[30px] font-extrabold leading-[1.15] text-[var(--text)]">{title}</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
            </div>

            {children}

            {footer ? <div className="mt-4">{footer}</div> : null}

            <div className="mt-6 inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Zap size={13} className="text-primary-500" />
              By continuing you agree to platform security and compliance policies.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
