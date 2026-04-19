import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import AuthSplitLayout from '../../components/auth/AuthSplitLayout'

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const { pendingVerification, login, clearPendingVerification } = useAuthStore()
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pendingVerification?.userId) {
      navigate('/register')
    }
  }, [pendingVerification, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((v) => v - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const maskedEmail = useMemo(() => {
    const email = pendingVerification?.email || ''
    const [name, domain] = email.split('@')
    if (!name || !domain) return email
    return `${name.slice(0, 2)}***@${domain}`
  }, [pendingVerification?.email])

  const verify = async () => {
    if (otp.length !== 6) {
      toast.error('Enter 6 digit OTP')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.post('/auth/verify-otp', {
        userId: pendingVerification.userId,
        otp,
      })
      const payload = res?.data?.data
      login({ user: payload?.user, token: payload?.accessToken })
      clearPendingVerification()
      toast.success('Email verified')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!pendingVerification?.userId) return
    await authApi.post('/auth/resend-otp', { userId: pendingVerification.userId })
    toast.success('OTP resent')
    setCountdown(60)
  }

  return (
    <AuthSplitLayout
      title="Verify Your Email"
      subtitle={`We sent a 6-digit OTP to ${maskedEmail || 'your email address'}`}
      visualHeading="One quick check before secure access."
      visualSubtext="Email verification unlocks protected dashboard access and keeps your account safe."
    >
      <input
        className="input text-center text-2xl tracking-[0.5em]"
        value={otp}
        maxLength={6}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
      />

      <Button className="mt-4 w-full justify-center" onClick={verify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </Button>

      <button
        className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-50"
        onClick={resend}
        disabled={countdown > 0}
      >
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
      </button>
    </AuthSplitLayout>
  )
}
