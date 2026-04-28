import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import brandLogo from '../../assets/favicon/favicon-96x96.png'
import usePlatformSettings from '../../hooks/usePlatformSettings'

const footerLinks = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact us', href: 'mailto:support@lexioai.com' },
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

export default function PublicFooter() {
  const { settings } = usePlatformSettings()
  const platformName = settings?.branding?.platformName || 'Lexio AI'
  const logoSrc = settings?.branding?.logoUrl || brandLogo
  const supportEmail = settings?.general?.supportEmail || 'support@lexioai.com'

  return (
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
                {link.href ? (
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
  )
}
