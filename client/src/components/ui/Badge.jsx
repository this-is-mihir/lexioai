import { cn } from '../../utils/cn'

const map = {
  success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  warning: 'border border-amber-500/20 bg-amber-500/10 text-amber-400',
  danger: 'border border-red-500/20 bg-red-500/10 text-red-400',
  info: 'border border-blue-500/20 bg-blue-500/10 text-blue-400',
  muted: 'border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-muted)]',
}

export default function Badge({ variant = 'muted', className, children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', map[variant], className)}>
      {children}
    </span>
  )
}
