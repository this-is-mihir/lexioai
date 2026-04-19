import { cn } from '../../utils/cn'

export default function Card({ className, children, ...props }) {
  return <div className={cn('card p-5', className)} {...props}>{children}</div>
}
