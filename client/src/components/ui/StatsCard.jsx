import Card from './Card'

export default function StatsCard({ title, value, subtitle }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--text)]">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
    </Card>
  )
}
