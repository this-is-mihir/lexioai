import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/axios'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import AuthSplitLayout from '../../components/auth/AuthSplitLayout'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.post('/auth/forgot-password', { email })
      toast.success('Reset OTP sent')
      navigate('/reset-password', { state: { email } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      title="Reset Your Password"
      subtitle="Enter your account email and we will send a secure OTP to continue."
      visualHeading="Security first, recovery in seconds."
      visualSubtext="Your account recovery flow is protected with OTP verification and controlled reset logic."
      footer={<Link to="/login" className="block text-center text-sm font-semibold text-primary-500">Back to login</Link>}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button className="w-full justify-center" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send OTP'}
        </Button>
      </form>
    </AuthSplitLayout>
  )
}
