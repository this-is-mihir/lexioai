import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import PublicNavbar from '../../components/layout/PublicNavbar'
import usePlatformSettings from '../../hooks/usePlatformSettings'

const sanitizeHtml = (html) => {
  if (!html) return ''
  return String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

export default function TermsPage() {
  const { settings } = usePlatformSettings()
  const termsHtml = sanitizeHtml(settings?.legal?.termsOfService)
  const lastUpdated = settings?.legal?.lastUpdated
    ? new Date(settings.legal.lastUpdated).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'April 2026'

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNavbar />

      <main className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <h1 className="text-3xl font-extrabold">Terms of Service</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
          {termsHtml ? (
            <div
              className="prose prose-sm mt-6 max-w-none text-[var(--text-muted)] dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: termsHtml }}
            />
          ) : (
            <div className="mt-6 space-y-4 text-sm text-[var(--text-muted)]">
              <p>By using Lexioai, you agree to platform policies, fair usage, anti-spam rules, and applicable subscription terms.</p>
              <p>Free and paid plans have different limits. Misuse can result in temporary or permanent account suspension.</p>
              <p>Refund rules depend on billing cycle and policy approved in your account agreement.</p>
            </div>
          )}
        </Card>
        <Link to="/" className="btn-secondary">Back to home</Link>
        </div>
      </main>
    </div>
  )
}
