import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import AuthSplitLayout from '../../components/auth/AuthSplitLayout'
import toast from 'react-hot-toast'

export default function GoogleSuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const token = searchParams.get('token')

    if (!token) {
      navigate('/login')
      return
    }

    const sync = async () => {
      try {
        const meRes = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const user = meRes?.data?.data?.user
        login({ user, token })
        toast.success('Google login successful')
        navigate('/', { replace: true })
      } catch {
        toast.error('Google login failed')
        navigate('/login', { replace: true })
      }
    }

    sync()
  }, [navigate, searchParams, login])

  return (
    <AuthSplitLayout
      title="Completing Google Sign In"
      subtitle="Please wait while we verify your account and prepare your dashboard."
      visualHeading="Secure social login, seamless access."
      visualSubtext="We are validating your Google session and syncing your account permissions."
    >
      <div className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-5 text-sm text-[var(--text-muted)]">
        Completing Google login...
      </div>
    </AuthSplitLayout>
  )
}
