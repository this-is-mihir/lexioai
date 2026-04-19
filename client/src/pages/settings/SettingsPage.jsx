import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import clientApi, { authApi } from '../../api/axios'
import { Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs } from '@mui/material'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SelectMenu from '../../components/ui/SelectMenu'
import Loader from '../../components/ui/Loader'
import useAuthStore from '../../store/authStore'

const tabs = ['Preferences', 'Security', 'Notifications']

const defaultPreferences = {
  language: 'en',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  emailDigest: 'weekly',
  notificationSound: true,
  viewMode: 'comfortable',
  defaultBotLanguage: 'auto',
}

const defaultNotifications = {
  email: {
    payment: true,
    planExpiry: true,
    botLimit: true,
    newLogin: true,
    newsletter: false,
    weeklyReport: true,
  },
  inApp: {
    payment: true,
    planExpiry: true,
    botLimit: true,
    newLogin: true,
    announcements: true,
    tips: true,
  },
}

const formatKeyLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())

const mergeNotificationPrefs = (incoming = {}) => ({
  email: { ...defaultNotifications.email, ...(incoming.email || {}) },
  inApp: { ...defaultNotifications.inApp, ...(incoming.inApp || {}) },
})

function CustomCheckbox({ checked, onChange, label }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 transition hover:border-primary-500/40">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition ${
          checked
            ? 'border-primary-500 bg-primary-500 text-white shadow-[0_0_0_2px_rgba(99,102,241,0.2)]'
            : 'border-[var(--border)] bg-[var(--bg-card)] text-transparent group-hover:border-primary-500/60'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)]">{label}</span>
    </label>
  )
}

export default function SettingsPage() {
  const { updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('Preferences')
  const [pageLoading, setPageLoading] = useState(true)

  const [prefs, setPrefs] = useState(defaultPreferences)
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [notifications, setNotifications] = useState(defaultNotifications)
  const [savingNotifications, setSavingNotifications] = useState(false)

  const [currentEmail, setCurrentEmail] = useState('')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordTab, setPasswordTab] = useState('old-password')
  const [passwordOtpForm, setPasswordOtpForm] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordOtpLoading, setPasswordOtpLoading] = useState(false)
  const [emailForm, setEmailForm] = useState({ newEmail: '', otp: '' })
  const [securityLoading, setSecurityLoading] = useState(false)

  const [twoFA, setTwoFA] = useState({
    enabled: false,
    qrCode: null,
    verifyToken: '',
    disableToken: '',
    backupCodes: [],
  })

  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [deletion, setDeletion] = useState({ password: '', requestedAt: null })
  const [accountLoading, setAccountLoading] = useState(false)

  const loadProfile = async () => {
    try {
      setPageLoading(true)
      const res = await clientApi.get('/user/profile')
      const user = res?.data?.data?.user || {}

      updateUser(user)

      setCurrentEmail(user.email || '')
      setPasswordOtpForm((prev) => ({ ...prev, email: user.email || prev.email }))
      setPrefs({ ...defaultPreferences, ...(user.preferences || {}) })
      setTimezone(user.timezone || 'Asia/Kolkata')
      setNotifications(mergeNotificationPrefs(user.notificationPrefs))
      setTwoFA((prev) => ({
        ...prev,
        enabled: Boolean(user.twoFactorEnabled),
        qrCode: null,
      }))
      setDeletion((prev) => ({
        ...prev,
        requestedAt: user.deletionRequestedAt || null,
      }))
    } catch {
      toast.error('Failed to load settings data')
    } finally {
      setPageLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      setSessionsLoading(true)
      const res = await clientApi.get('/user/sessions')
      setSessions(res?.data?.data?.sessions || [])
    } catch {
      toast.error('Failed to load active sessions')
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'Security') {
      loadSessions()
    }
  }, [activeTab])

  const tabButtons = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-primary-500 text-white' : 'border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)]'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    ),
    [activeTab],
  )

  const savePreferences = async () => {
    try {
      setSavingPrefs(true)
      const res = await clientApi.put('/user/profile', {
        timezone,
        preferences: prefs,
      })
      const updatedUser = res?.data?.data?.user
      if (updatedUser) {
        updateUser(updatedUser)
      }
      toast.success('Preferences updated')
    } catch {
      toast.error('Failed to update preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  const saveNotifications = async () => {
    try {
      setSavingNotifications(true)
      await clientApi.put('/user/notifications', notifications)
      toast.success('Notification preferences updated')
      await loadProfile()
    } catch {
      toast.error('Failed to update notifications')
    } finally {
      setSavingNotifications(false)
    }
  }

  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }

    try {
      setPasswordUpdating(true)
      await clientApi.put('/user/password', passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordDialogOpen(false)
      toast.success('Password updated')
    } catch {
      toast.error('Failed to update password')
    } finally {
      setPasswordUpdating(false)
    }
  }

  const sendPasswordResetOtp = async () => {
    if (!passwordOtpForm.email.trim()) {
      toast.error('Please enter your email')
      return
    }

    try {
      setPasswordOtpLoading(true)
      await authApi.post('/auth/forgot-password', { email: passwordOtpForm.email.trim() })
      toast.success('Password reset OTP sent to email')
    } catch {
      // toast handled in interceptor
    } finally {
      setPasswordOtpLoading(false)
    }
  }

  const resetPasswordWithEmail = async () => {
    if (!passwordOtpForm.email.trim() || !passwordOtpForm.otp.trim() || !passwordOtpForm.newPassword || !passwordOtpForm.confirmPassword) {
      toast.error('Please fill all fields for email password reset')
      return
    }

    if (passwordOtpForm.newPassword !== passwordOtpForm.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }

    try {
      setPasswordOtpLoading(true)
      await authApi.post('/auth/reset-password', {
        email: passwordOtpForm.email.trim(),
        otp: passwordOtpForm.otp.trim(),
        newPassword: passwordOtpForm.newPassword,
        confirmPassword: passwordOtpForm.confirmPassword,
      })
      setPasswordDialogOpen(false)
      setPasswordTab('old-password')
      setPasswordOtpForm((prev) => ({
        ...prev,
        otp: '',
        newPassword: '',
        confirmPassword: '',
      }))
      toast.success('Password reset successful')
    } catch {
      // toast handled in interceptor
    } finally {
      setPasswordOtpLoading(false)
    }
  }

  const requestEmailChange = async () => {
    if (!emailForm.newEmail.trim()) {
      toast.error('Please enter new email')
      return
    }

    try {
      setSecurityLoading(true)
      await clientApi.post('/user/change-email/request', { newEmail: emailForm.newEmail.trim() })
      toast.success('OTP sent to your current and new email')
    } catch {
      toast.error('Failed to send email OTP')
    } finally {
      setSecurityLoading(false)
    }
  }

  const verifyEmailChange = async () => {
    if (!emailForm.newEmail.trim() || !emailForm.otp.trim()) {
      toast.error('New email and OTP are required')
      return
    }

    try {
      setSecurityLoading(true)
      await clientApi.post('/user/change-email/verify', {
        newEmail: emailForm.newEmail.trim(),
        otp: emailForm.otp.trim(),
      })
      setEmailForm({ newEmail: '', otp: '' })
      toast.success('Email changed successfully')
      await loadProfile()
    } catch {
      toast.error('Failed to verify email change')
    } finally {
      setSecurityLoading(false)
    }
  }

  const setup2FA = async () => {
    try {
      setSecurityLoading(true)
      const res = await clientApi.post('/user/2fa/setup')
      setTwoFA((prev) => ({
        ...prev,
        enabled: false,
        qrCode: res?.data?.data?.qrCode || null,
        verifyToken: '',
        backupCodes: [],
      }))
      toast.success('Scan QR and verify authenticator code')
    } catch {
      toast.error('Failed to setup 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  const verify2FA = async () => {
    if (!twoFA.verifyToken.trim()) {
      toast.error('Enter authenticator code')
      return
    }

    try {
      setSecurityLoading(true)
      const res = await clientApi.post('/user/2fa/verify', { token: twoFA.verifyToken.trim() })
      setTwoFA((prev) => ({
        ...prev,
        enabled: true,
        qrCode: null,
        verifyToken: '',
        backupCodes: res?.data?.data?.backupCodes || [],
      }))
      toast.success('2FA enabled successfully')
      await loadProfile()
    } catch {
      toast.error('Failed to verify 2FA code')
    } finally {
      setSecurityLoading(false)
    }
  }

  const disable2FA = async () => {
    const token = twoFA.disableToken.trim()

    if (!token) {
      toast.error('Enter authenticator code or backup code to disable 2FA')
      return
    }

    try {
      setSecurityLoading(true)
      await clientApi.delete('/user/2fa', { data: { token } })
      setTwoFA({
        enabled: false,
        qrCode: null,
        verifyToken: '',
        disableToken: '',
        backupCodes: [],
      })
      toast.success('2FA disabled')
      await loadProfile()
    } catch {
      toast.error('Failed to disable 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  const logoutAllDevices = async () => {
    try {
      setSecurityLoading(true)
      await clientApi.delete('/user/sessions/all')
      toast.success('Logged out from all devices')
      setSessions([])
    } catch {
      toast.error('Failed to logout all devices')
    } finally {
      setSecurityLoading(false)
    }
  }

  const requestAccountDeletion = async () => {
    if (!deletion.password.trim()) {
      toast.error('Please enter password to request account deletion')
      return
    }

    try {
      setAccountLoading(true)
      const res = await clientApi.post('/user/delete-account', { password: deletion.password.trim() })
      setDeletion((prev) => ({
        ...prev,
        password: '',
        requestedAt: res?.data?.data?.deletionDate || new Date().toISOString(),
      }))
      toast.success('Account deletion requested')
    } catch {
      toast.error('Failed to request account deletion')
    } finally {
      setAccountLoading(false)
    }
  }

  const cancelAccountDeletion = async () => {
    try {
      setAccountLoading(true)
      await clientApi.post('/user/cancel-deletion')
      setDeletion((prev) => ({ ...prev, requestedAt: null }))
      toast.success('Account deletion cancelled')
    } catch {
      toast.error('Failed to cancel account deletion')
    } finally {
      setAccountLoading(false)
    }
  }

  if (pageLoading) {
    return <Loader label="Loading settings" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage preferences, security controls, and notification behavior.</p>
      </div>

      <Card>{tabButtons}</Card>

      {activeTab === 'Preferences' ? (
        <Card className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Language</span>
            <SelectMenu
              value={prefs.language}
              onChange={(value) => setPrefs((prev) => ({ ...prev, language: value }))}
              options={[
                { label: 'English', value: 'en' },
                { label: 'Hindi', value: 'hi' },
              ]}
            />
          </label>

          <label>
            <span className="label">Default Bot Language</span>
            <SelectMenu
              value={prefs.defaultBotLanguage}
              onChange={(value) => setPrefs((prev) => ({ ...prev, defaultBotLanguage: value }))}
              options={[
                { label: 'Auto', value: 'auto' },
                { label: 'English', value: 'en' },
                { label: 'Hindi', value: 'hi' },
                { label: 'Hinglish', value: 'hinglish' },
              ]}
            />
          </label>

          <label>
            <span className="label">Currency</span>
            <SelectMenu
              value={prefs.currency}
              onChange={(value) => setPrefs((prev) => ({ ...prev, currency: value }))}
              options={[
                { label: 'INR', value: 'INR' },
                { label: 'USD', value: 'USD' },
              ]}
            />
          </label>

          <label>
            <span className="label">Timezone</span>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" />
          </label>

          <label>
            <span className="label">Date Format</span>
            <SelectMenu
              value={prefs.dateFormat}
              onChange={(value) => setPrefs((prev) => ({ ...prev, dateFormat: value }))}
              options={[
                { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
              ]}
            />
          </label>

          <label>
            <span className="label">Time Format</span>
            <SelectMenu
              value={prefs.timeFormat}
              onChange={(value) => setPrefs((prev) => ({ ...prev, timeFormat: value }))}
              options={[
                { label: '12 hours', value: '12h' },
                { label: '24 hours', value: '24h' },
              ]}
            />
          </label>

          <label>
            <span className="label">Email Digest</span>
            <SelectMenu
              value={prefs.emailDigest}
              onChange={(value) => setPrefs((prev) => ({ ...prev, emailDigest: value }))}
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Never', value: 'never' },
              ]}
            />
          </label>

          <label>
            <span className="label">View Mode</span>
            <SelectMenu
              value={prefs.viewMode}
              onChange={(value) => setPrefs((prev) => ({ ...prev, viewMode: value }))}
              options={[
                { label: 'Comfortable', value: 'comfortable' },
                { label: 'Compact', value: 'compact' },
              ]}
            />
          </label>

          <div className="sm:col-span-2">
            <CustomCheckbox
              checked={Boolean(prefs.notificationSound)}
              onChange={(checked) => setPrefs((prev) => ({ ...prev, notificationSound: checked }))}
              label="Enable notification sound"
            />
          </div>

          <div className="sm:col-span-2">
            <Button onClick={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? 'Saving...' : 'Save preferences'}
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === 'Security' ? (
        <Card className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
            <p className="text-sm font-semibold">Current Email</p>
            <p className="text-sm text-[var(--text-muted)]">{currentEmail || '-'}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Change Password</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Open password change popup. You can update via old password method or email OTP method.
                </p>
                <div className="pt-1">
                  <Button onClick={() => setPasswordDialogOpen(true)}>Change password</Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Change Email</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input label="New Email" value={emailForm.newEmail} onChange={(e) => setEmailForm((prev) => ({ ...prev, newEmail: e.target.value }))} />
                  <div className="self-end"><Button variant="secondary" onClick={requestEmailChange} disabled={securityLoading}>Send OTP</Button></div>
                  <Input label="OTP" value={emailForm.otp} onChange={(e) => setEmailForm((prev) => ({ ...prev, otp: e.target.value }))} />
                  <div className="self-end"><Button onClick={verifyEmailChange} disabled={securityLoading}>Verify & change email</Button></div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 xl:col-span-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Two-Factor Authentication</p>
                  <p className="text-xs text-[var(--text-muted)]">Status: {twoFA.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>

                {!twoFA.enabled ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={setup2FA} disabled={securityLoading}>Setup 2FA</Button>
                    </div>
                    {twoFA.qrCode ? (
                      <div className="grid gap-3 lg:grid-cols-[auto_1fr] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                        <img src={twoFA.qrCode} alt="2fa qr" className="w-44 rounded-xl border border-[var(--border)] bg-white p-2" />
                        <div className="space-y-3">
                          <Input label="Authenticator Code" value={twoFA.verifyToken} onChange={(e) => setTwoFA((prev) => ({ ...prev, verifyToken: e.target.value }))} placeholder="Enter 6-digit code" />
                          <Button onClick={verify2FA} disabled={securityLoading}>Verify & Enable 2FA</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                    <Input label="Authenticator / Backup Code" value={twoFA.disableToken} onChange={(e) => setTwoFA((prev) => ({ ...prev, disableToken: e.target.value }))} placeholder="Enter code to disable" />
                    <Button variant="danger" onClick={disable2FA} disabled={securityLoading}>Disable 2FA</Button>
                  </div>
                )}

                {twoFA.backupCodes.length ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Backup Codes</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      {twoFA.backupCodes.map((code) => (
                        <span key={code} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1 font-mono">{code}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4 xl:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Active Sessions</p>
                  <Button variant="secondary" onClick={loadSessions} disabled={sessionsLoading}>Refresh</Button>
                </div>
                {sessionsLoading ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading sessions...</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {sessions.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">No active sessions found.</p>
                    ) : sessions.map((session) => (
                      <div key={session.sessionId} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
                        <p className="font-semibold text-[var(--text)]">Session #{session.sessionId + 1} {session.isCurrent ? '(Current device)' : ''}</p>
                        <p className="mt-1">Token: {session.token}</p>
                        <p>Expires: {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'Unknown'}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="danger" onClick={logoutAllDevices} disabled={securityLoading}>Logout all devices</Button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 xl:col-span-2">
              <p className="text-sm font-semibold text-red-400">Danger Zone</p>
              <p className="text-xs text-[var(--text-muted)]">
                {deletion.requestedAt
                  ? `Deletion scheduled: ${new Date(deletion.requestedAt).toLocaleString()}`
                  : 'Request account deletion with your password. You can cancel within grace period.'}
              </p>
              {!deletion.requestedAt ? (
                <>
                  <Input label="Password" type="password" value={deletion.password} onChange={(e) => setDeletion((prev) => ({ ...prev, password: e.target.value }))} />
                  <Button variant="danger" onClick={requestAccountDeletion} disabled={accountLoading}>Request account deletion</Button>
                </>
              ) : (
                <Button variant="secondary" onClick={cancelAccountDeletion} disabled={accountLoading}>Cancel deletion request</Button>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === 'Notifications' ? (
        <Card className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
              <p className="text-sm font-semibold">Email Notifications</p>
              <div className="mt-3 space-y-2">
                {Object.keys(notifications.email || {}).map((key) => (
                  <CustomCheckbox
                    key={key}
                    checked={Boolean(notifications.email?.[key])}
                    onChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        email: { ...prev.email, [key]: checked },
                      }))
                    }
                    label={formatKeyLabel(key)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
              <p className="text-sm font-semibold">In-App Notifications</p>
              <div className="mt-3 space-y-2">
                {Object.keys(notifications.inApp || {}).map((key) => (
                  <CustomCheckbox
                    key={key}
                    checked={Boolean(notifications.inApp?.[key])}
                    onChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        inApp: { ...prev.inApp, [key]: checked },
                      }))
                    }
                    label={formatKeyLabel(key)}
                  />
                ))}
              </div>
            </div>

          </div>

          <div className="flex justify-start sm:justify-end">
            <Button onClick={saveNotifications} disabled={savingNotifications}>
              {savingNotifications ? 'Saving...' : 'Save notification settings'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          if (passwordUpdating || passwordOtpLoading) return
          setPasswordDialogOpen(false)
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
        <DialogContent>
          <Tabs
            value={passwordTab}
            onChange={(_, value) => setPasswordTab(value)}
            sx={{
              mb: 2,
              '& .MuiTabs-indicator': { backgroundColor: 'var(--primary, #6366f1)' },
              '& .MuiTab-root': {
                color: 'var(--text-muted)',
                textTransform: 'none',
                fontWeight: 700,
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'var(--text)',
              },
            }}
          >
            <Tab value="old-password" label="Old Password Method" />
            <Tab value="email-otp" label="Email OTP Method" />
          </Tabs>

          {passwordTab === 'old-password' ? (
            <div className="space-y-3">
              <Input label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              <Input label="New Password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
              <Input label="Confirm Password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-3">
              <Input label="Email" type="email" value={passwordOtpForm.email} onChange={(e) => setPasswordOtpForm((prev) => ({ ...prev, email: e.target.value }))} />
              <div>
                <Button variant="secondary" onClick={sendPasswordResetOtp} disabled={passwordOtpLoading}>Send OTP</Button>
              </div>
              <Input label="OTP" value={passwordOtpForm.otp} onChange={(e) => setPasswordOtpForm((prev) => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))} maxLength={6} />
              <Input label="New Password" type="password" value={passwordOtpForm.newPassword} onChange={(e) => setPasswordOtpForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
              <Input label="Confirm Password" type="password" value={passwordOtpForm.confirmPassword} onChange={(e) => setPasswordOtpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="secondary"
            onClick={() => setPasswordDialogOpen(false)}
            disabled={passwordUpdating || passwordOtpLoading}
          >
            Cancel
          </Button>
          {passwordTab === 'old-password' ? (
            <Button onClick={changePassword} disabled={passwordUpdating || passwordOtpLoading}>
              {passwordUpdating ? 'Updating...' : 'Update password'}
            </Button>
          ) : (
            <Button onClick={resetPasswordWithEmail} disabled={passwordUpdating || passwordOtpLoading}>
              {passwordOtpLoading ? 'Updating...' : 'Verify OTP & update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}
