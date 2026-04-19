import { cn } from '../../utils/cn'

export default function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'danger' && 'btn-danger',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
