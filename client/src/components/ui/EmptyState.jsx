export default function EmptyState({ title, description, action }) {
  return (
    <div className="card p-10 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
