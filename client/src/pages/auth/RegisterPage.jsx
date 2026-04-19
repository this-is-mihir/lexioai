import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import AuthSplitLayout from '../../components/auth/AuthSplitLayout'
import GoogleIcon from '../../components/ui/GoogleIcon'
import toast from 'react-hot-toast'
import usePlatformSettings from '../../hooks/usePlatformSettings'

const schema = z
  .object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().optional(),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setPendingVerification } = useAuthStore()
  const { settings } = usePlatformSettings()

  const registrationsOpen = settings?.general?.allowNewRegistrations !== false

  const getFingerprint = () => {
    const parts = [
      navigator.userAgent,
      navigator.language,
      `${window.screen.width}x${window.screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ]
    return btoa(parts.join('|')).slice(0, 120)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values) => {
    if (!registrationsOpen) {
      toast.error('New registrations are currently disabled by the platform administrator.')
      return
    }

    try {
      const name = `${values.firstName} ${values.lastName || ''}`.trim()
      const res = await authApi.post('/auth/register', {
        name,
        email: values.email,
        password: values.password,
        fingerprint: getFingerprint(),
      })

      setPendingVerification({
        userId: res?.data?.data?.userId,
        email: res?.data?.data?.email || values.email,
      })

      toast.success('OTP sent to your email')
      navigate('/verify-otp')
    } catch (error) {
      const data = error?.response?.data
      if (data?.data?.requiresVerification && data?.data?.userId) {
        setPendingVerification({ userId: data.data.userId, email: values.email })
        navigate('/verify-otp')
        return
      }

      toast.error(data?.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <AuthSplitLayout
      title="Create Your Lexio Account"
      subtitle="Get started in minutes and launch a premium AI support experience."
      visualHeading="Turn visitors into high-quality conversations."
      visualSubtext="Set up your assistant, train it on your content, and start collecting meaningful leads from day one."
      footer={
        <div className="text-center text-sm text-[var(--text-muted)]">
          Already have account? <Link to="/login" className="font-semibold text-primary-500">Sign in</Link>
        </div>
      }
    >
      <button
        className="btn-secondary w-full justify-center"
        disabled={!registrationsOpen}
        onClick={() => {
          if (!registrationsOpen) return
          const base = import.meta.env.VITE_API_URL || '/api/v1'
          window.location.href = `${base}/auth/google`
        }}
      >
        <GoogleIcon /> Continue with Google
      </button>

      {!registrationsOpen ? (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          New signups are temporarily disabled. Please contact support for access.
        </p>
      ) : null}

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or sign up with email
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
        <div className="sm:col-span-2">
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <Input label="Confirm Password" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

        <p className="sm:col-span-2 text-xs text-[var(--text-muted)]">
          By signing up, you agree to Lexio terms, privacy policy, and security usage guidelines.
        </p>

        <div className="sm:col-span-2">
          <Button className="w-full justify-center" type="submit" disabled={isSubmitting || !registrationsOpen}>
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
