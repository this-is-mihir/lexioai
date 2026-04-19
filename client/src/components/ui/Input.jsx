import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function Input({ label, error, className, type = 'text', ...props }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block">
      {label ? <span className="label">{label}</span> : null}

      <div className="relative">
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn('input', isPassword && 'pr-11', error && 'border-red-500/50', className)}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </label>
  )
}
