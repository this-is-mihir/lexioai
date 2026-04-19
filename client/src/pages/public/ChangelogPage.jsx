import Card from '../../components/ui/Card'
import PublicNavbar from '../../components/layout/PublicNavbar'
import PublicFooter from '../../components/layout/PublicFooter'

const updates = [
  {
    version: 'v1.3',
    date: 'March 2026',
    items: ['Hindi/Hinglish behavior controls improved', 'Analytics charts performance boosted', 'Lead export flow updated for large data sets'],
  },
  {
    version: 'v1.2',
    date: 'February 2026',
    items: ['Yearly plan support added', 'Credit top-up purchase flow improved', 'Dashboard quick actions redesigned'],
  },
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNavbar />

      <main className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <h1 className="text-3xl font-extrabold">Changelog</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Latest product updates and improvements.</p>
        </Card>

        {updates.map((update) => (
          <Card key={update.version}>
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold">{update.version}</p>
              <p className="text-xs text-[var(--text-muted)]">{update.date}</p>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
              {update.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
