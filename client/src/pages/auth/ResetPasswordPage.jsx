import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/axios'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import AuthSplitLayout from '../../components/auth/AuthSplitLayout'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = location.state?.email || ''

  const [form, setForm] = useState({
    email: initialEmail,
    otp: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()

    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await authApi.post('/auth/reset-password', {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })
      toast.success('Password reset done')
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      title="Set a New Password"
      subtitle="Use the OTP received on email to securely update your password."
      visualHeading="Keep your account protected without slowing down your team."
      visualSubtext="Recovery flow is verified with OTP and password confirmation before access is restored."
      footer={<Link to="/login" className="block text-center text-sm font-semibold text-primary-500">Back to login</Link>}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <Input label="OTP" required value={form.otp} onChange={(e) => setForm((p) => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))} maxLength={6} />
        <Input label="New Password" type="password" required value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} />
        <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
        <Button className="w-full justify-center" type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </AuthSplitLayout>
  )
}
