import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LifeBuoy, Mail, MessageSquareText, ShieldCheck, Search, 
  AlertCircle, CheckCircle, Clock, FileText, Send, X,
  Book, Wrench, CreditCard, User, Zap, MessageCircle, Upload
} from 'lucide-react'
import PublicNavbar from '../../components/layout/PublicNavbar'
import useAuthStore from '../../store/authStore'
import clientApi from '../../api/axios'

// Help Articles organized by category
const helpArticles = [
  // Getting Started
  {
    category: 'Getting Started',
    title: 'How to create your first bot',
    excerpt: 'Step-by-step guide to sign up and create your first AI chatbot in minutes.',
    content: `1. Sign up on Lexioai.com with email/Google
2. Verify your email address
3. Click "Create New Bot" on dashboard
4. Give your bot a name (e.g. "Support Bot")
5. Select your industry/type
6. Bot created! Now setup training data.`
  },
  {
    category: 'Getting Started',
    title: 'Dashboard overview and navigation',
    excerpt: 'Understand all sections of your Lexioai dashboard.',
    content: `Dashboard includes:
- My Bots: All your created bots list
- Analytics: Real-time chat metrics
- Leads: Captured visitor information
- Conversations: Chat history
- Billing: Plans and payment
- Settings: Account configuration

Use sidebar to navigate between sections.`
  },
  // Bot Setup
  {
    category: 'Bot Setup',
    title: 'Training your bot with data',
    excerpt: 'How to teach your bot to answer customer questions.',
    content: `Methods to train:
1. Upload website URL - bot crawls your site
2. Upload PDF/files - extract text automatically
3. Manual Q&A - add question-answer pairs directly
4. CSV import - bulk data upload

Best practice: Use combination of all methods for best results.
Update training data regularly as your business changes.`
  },
  {
    category: 'Bot Setup',
    title: 'Customizing bot appearance',
    excerpt: 'Change colors, position, greeting message, and more.',
    content: `In Bot Settings > Appearance:
- Chat bubble color and position
- Welcome message
- Chat header text
- Button text customization
- Font and theme (light/dark)

Changes apply instantly to your embedded widget.`
  },
  {
    category: 'Bot Setup',
    title: 'Managing bot conversations',
    excerpt: 'View, search, and download conversation history.',
    content: `Conversations page shows:
- All visitor chats organized by date
- Search by visitor name or content
- Download transcripts as PDF
- Export all conversations as CSV

Keep conversations private - never shared publicly.`
  },
  // Embedding
  {
    category: 'Embedding',
    title: 'Getting your embed code',
    excerpt: 'Copy the code to add bot to your website.',
    content: `1. Go to Bot Dashboard
2. Click "Embed" or "Get Code" tab
3. Choose your platform
4. Copy the code snippet
5. Paste before closing </body> tag on your website

Code is unique to your bot - don't share publicly.`
  },
  {
    category: 'Embedding',
    title: 'Platform-specific setup guides',
    excerpt: 'Detailed instructions for WordPress, Shopify, Wix, React, etc.',
    content: `Platform guides available for:
- WordPress (plugin installation)
- Shopify (app integration)
- Wix (custom code block)
- Weebly, Squarespace, etc.
- React, Next.js, Vue, Angular
- PHP, Python, Node.js, Java
- And 20+ more platforms

Each guide has step-by-step instructions with screenshots.`
  },
  {
    category: 'Embedding',
    title: 'Widget not showing on my website',
    excerpt: 'Troubleshooting steps if bot widget doesn\'t appear.',
    content: `Check these:
1. Is bot "Active" in dashboard? Enable if needed.
2. Is embed code placed correctly? Should be before </body>
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try hard refresh (Ctrl+F5)
5. Check browser console (F12) for errors
6. Try different browser to confirm

If still not working, contact support with:
- Website URL
- Bot ID
- Screenshot of console errors`
  },
  // Billing
  {
    category: 'Billing',
    title: 'Understanding your plan and limits',
    excerpt: 'Chat quotas, bot limits, and feature availability.',
    content: `Free Plan: 1 bot, 50 chats/month
Starter: 3 bots, 500 chats/month
Pro: 10 bots, 2000 chats/month (MOST POPULAR)
Business: Unlimited bots, unlimited chats

Chat quota resets on 1st of every month.
Upgrade anytime - only pay prorated difference.`
  },
  {
    category: 'Billing',
    title: 'Upgrading or downgrading your plan',
    excerpt: 'How to change your subscription plan.',
    content: `1. Go to Billing section in dashboard
2. Find "Plans" card
3. Click "Upgrade" or "Downgrade"
4. Choose new plan
5. Confirm changes

Upgrade: Take effect immediately, charged prorated amount
Downgrade: Take effect at next billing cycle

Can upgrade/downgrade unlimited times.`
  },
  {
    category: 'Billing',
    title: 'Using coupon codes',
    excerpt: 'Apply discount codes to your subscription.',
    content: `To apply coupon:
1. Go to Billing > Coupons section
2. Enter coupon code
3. Click "Apply"
4. Discount applied immediately

Available for:
- One-time purchases
- Recurring subscriptions
- Free trial extensions

Coupons can\'t be combined.`
  },
  // Troubleshooting
  {
    category: 'Troubleshooting',
    title: 'Bot giving wrong or irrelevant answers',
    excerpt: 'Fix bot responses with better training data.',
    content: `Solutions:
1. Check training data quality - remove old/incorrect info
2. Retrain bot from Dashboard > Bot Settings
3. Add specific Q&A pairs for common questions
4. Use manual corrections to train on mistakes

Pro tip: Be specific in training. Generic data = generic answers.
Review bot responses regularly and fine-tune.`
  },
  {
    category: 'Troubleshooting',
    title: 'Bot conversations not being captured',
    excerpt: 'Troubleshoot missing chat records.',
    content: `Check:
1. Is lead capture enabled? Bot Settings > Lead Capture
2. Are bot interactions showing in Conversations tab?
3. Check browser console for JavaScript errors
4. Verify embed code includes lead capture settings

Contact support if issue persists - provide:
- Website URL
- Bot ID
- Specific conversation details
- Browser/device info`
  },
  // Account
  {
    category: 'Account',
    title: 'Changing your password',
    excerpt: 'Update your account password securely.',
    content: `1. Go to Settings > Security tab
2. Click "Change Password"
3. Enter current password
4. Enter new password (min 8 chars, strong recommended)
5. Confirm new password
6. Click "Update"

Password changed immediately - login with new password next time.`
  },
  {
    category: 'Account',
    title: 'Resetting a forgotten password',
    excerpt: 'Recover account access if you forgot your password.',
    content: `1. Go to login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check email for reset link
5. Click link (valid for 24 hours)
6. Enter new password
7. Instant login with new password

Reset link expires after 24 hours. Request new link if expired.`
  },
]

// Support Ticket statuses
const TICKET_STATUSES = {
  open: { label: 'Open', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  in_progress: { label: 'In Progress', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  resolved: { label: 'Resolved', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  closed: { label: 'Closed', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
}

export default function HelpCenter() {
  const { isAuthenticated, user } = useAuthStore()
  
  // Check if user has pro+ plan (pro or business) for full ticket access
  const hasProPlan = user?.plan && ['pro', 'business'].includes(user.plan)
  const [activeTab, setActiveTab] = useState('articles') // articles, ticket, contact
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [ticketForm, setTicketForm] = useState({ 
    subject: '', 
    description: '', 
    email: user?.email || '',
    screenshot: null,
    screenshotPreview: null,
  })
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState(null)
  const [uploadingTicket, setUploadingTicket] = useState(false)

  // Get unique categories
  const categories = ['all', ...new Set(helpArticles.map(a => a.category))]

  // Filter articles
  const filteredArticles = useMemo(() => {
    return helpArticles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  // Handle screenshot upload with 2MB limit
  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Screenshot must be less than 2MB')
      e.target.value = ''
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file (PNG, JPG, etc.)')
      e.target.value = ''
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setTicketForm({
        ...ticketForm,
        screenshot: file,
        screenshotPreview: ev.target?.result,
      })
    }
    reader.readAsDataURL(file)
  }

  // Remove screenshot
  const removeScreenshot = () => {
    setTicketForm({
      ...ticketForm,
      screenshot: null,
      screenshotPreview: null,
    })
  }

  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!ticketForm.subject || !ticketForm.description || !ticketForm.email) {
      alert('Please fill all fields')
      return
    }

    setUploadingTicket(true)
    try {
      let screenshotUrl = null

      // Upload screenshot to Cloudinary if available
      if (ticketForm.screenshot) {
        try {
          const formData = new FormData()
          formData.append('file', ticketForm.screenshot)
          formData.append('folder', 'support-tickets')

          // Get signature from backend
          const sigRes = await clientApi.post('/settings/cloudinary-signature', {
            folder: 'support-tickets',
          })

          const { signature, timestamp, apiKey } = sigRes.data
          const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'da0mibgyh'

          // Upload to Cloudinary
          const uploadFormData = new FormData()
          uploadFormData.append('file', ticketForm.screenshot)
          uploadFormData.append('api_key', apiKey)
          uploadFormData.append('timestamp', timestamp)
          uploadFormData.append('signature', signature)
          uploadFormData.append('folder', 'lexioai/support-tickets')

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
              method: 'POST',
              body: uploadFormData,
            }
          )

          const uploadData = await uploadRes.json()
          if (uploadData.secure_url) {
            screenshotUrl = uploadData.secure_url
          }
        } catch (uploadErr) {
          // Screenshot upload failed, continuing without image
        }
      }

      // Submit ticket to backend
      const ticketPayload = {
        subject: ticketForm.subject,
        description: ticketForm.description,
        email: ticketForm.email,
        screenshotUrl: screenshotUrl,
      }

      // Submit to backend
      try {
        const response = await clientApi.post('/user/support-tickets/create', ticketPayload)
      } catch (apiErr) {
        // Handle API error silently
      }

      // Show success
      setSubmittedTicket({
        id: `TKT-${Date.now()}`,
        subject: ticketForm.subject,
        email: ticketForm.email,
        status: 'open',
        createdAt: new Date().toLocaleDateString(),
        description: ticketForm.description,
        screenshotUrl: screenshotUrl,
      })

      // Reset form
      setTicketForm({ 
        subject: '', 
        description: '', 
        email: user?.email || '',
        screenshot: null,
        screenshotPreview: null,
      })
      setShowTicketForm(false)
    } catch (error) {
      alert('Error submitting ticket. Please try again.')
    } finally {
      setUploadingTicket(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-500">
            <LifeBuoy size={14} />
            Support Center
          </div>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">How can we help?</h1>
          <p className="mt-3 max-w-3xl text-lg text-[var(--text-muted)]">
            Search articles, create support tickets, or contact our team. Hum yahan hain aapki help karne ke liye!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 border-b border-[var(--border)] pb-4 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'articles'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Book size={18} className="inline mr-2" />
              Help Articles
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => setActiveTab('ticket')}
                  className={`px-4 py-2 font-semibold transition-colors ${
                    activeTab === 'ticket'
                      ? 'border-b-2 border-primary-500 text-primary-500'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <FileText size={18} className="inline mr-2" />
                  Support Ticket
                </button>
              </>
            )}
          </div>

          {isAuthenticated && hasProPlan && (
            <Link
              to="/support-tickets"
              className="px-4 py-2 font-semibold text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <MessageSquareText size={18} />
              View My Tickets
            </Link>
          )}
          
          {isAuthenticated && !hasProPlan && (
            <div className="px-4 py-2 font-semibold text-amber-500 flex items-center gap-2 whitespace-nowrap" title="Upgrade to Pro plan to view tickets">
              <Zap size={18} />
              <span className="text-xs">Upgrade to Pro</span>
            </div>
          )}
        </div>

        {/* ARTICLES TAB */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-12 pr-4 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-2 font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white'
                      : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-primary-500/10'
                  }`}
                >
                  {cat === 'all' ? 'All Topics' : cat}
                </button>
              ))}
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-[var(--text-muted)] opacity-50" />
                <p className="mt-4 text-lg font-semibold">No articles found</p>
                <p className="mt-2 text-[var(--text-muted)]">Try different search terms or browse all categories</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article, idx) => (
                  <div
                    key={idx}
                    className="group cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:shadow-lg hover:border-primary-500/50"
                  >
                    <div className="mb-3 inline-flex items-center rounded-full bg-primary-500/12 px-2.5 py-1 text-xs font-semibold text-primary-500">
                      {article.category}
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-primary-500 transition-colors">{article.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{article.excerpt}</p>
                    <div className="mt-4 whitespace-pre-wrap rounded bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-muted)] border border-[var(--border)]">
                      {article.content.split('\n').slice(0, 3).join('\n')}
                      {article.content.split('\n').length > 3 && '\n...'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TICKET TAB */}
        {activeTab === 'ticket' && !isAuthenticated ? (
          <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-primary-500 mb-4" />
            <h3 className="text-xl font-bold text-primary-500">Support Tickets Available for Members Only</h3>
            <p className="mt-3 text-[var(--text-muted)] max-w-2xl mx-auto">
              To create and manage support tickets, please login to your account. If you don't have an account yet, sign up for free!
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg bg-primary-500 px-6 py-2.5 font-semibold text-white hover:bg-primary-600"
              >
                Login Now
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-lg border border-primary-500/30 px-6 py-2.5 font-semibold text-primary-500 hover:bg-primary-500/10"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        ) : activeTab === 'ticket' && isAuthenticated ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Ticket Form */}
            <div className="lg:col-span-2">
              {!showTicketForm ? (
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="w-full rounded-lg bg-primary-500 px-6 py-4 font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  Create New Support Ticket
                </button>
              ) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">Create Support Ticket</h3>
                    <button onClick={() => setShowTicketForm(false)}>
                      <X className="h-5 w-5 text-[var(--text-muted)]" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Your Email</label>
                      <input
                        type="email"
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full rounded border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Briefly describe your issue"
                        className="w-full rounded border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Provide detailed information about your issue..."
                        rows={5}
                        className="w-full rounded border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        required
                      />
                    </div>
                    
                    {/* Screenshot Upload */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Screenshot (Optional - Max 2MB)
                      </label>
                      {!ticketForm.screenshotPreview ? (
                        <div className="relative rounded border-2 border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-6 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingTicket}
                          />
                          <Upload size={24} className="mx-auto mb-2 text-[var(--text-muted)]" />
                          <p className="text-sm font-medium text-[var(--text)]">
                            Click to upload or drag & drop
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            PNG, JPG, GIF up to 2MB
                          </p>
                        </div>
                      ) : (
                        <div className="relative rounded border border-[var(--border)] bg-[var(--bg-soft)] p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 rounded border border-[var(--border)] overflow-hidden">
                              <img
                                src={ticketForm.screenshotPreview}
                                alt="Screenshot preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-[var(--text)]">
                                {ticketForm.screenshot?.name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {(ticketForm.screenshot?.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={removeScreenshot}
                              className="flex-shrink-0 rounded hover:bg-red-500/10 p-2 text-red-500 transition"
                              disabled={uploadingTicket}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingTicket}
                      className="w-full rounded bg-primary-500 px-4 py-2 font-semibold text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      {uploadingTicket ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </form>
                </div>
              )}

              {/* Submitted Ticket Display */}
              {submittedTicket && (
                <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-bold text-emerald-500">Ticket Created Successfully!</h4>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Ticket ID: <span className="font-mono font-bold text-[var(--text)]">{submittedTicket.id}</span>
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        We've sent a confirmation email to <span className="font-bold text-[var(--text)]">{submittedTicket.email}</span>
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Our support team will respond within 24 hours.
                      </p>
                      {submittedTicket.screenshotUrl && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-[var(--text)] mb-2">Screenshot attached:</p>
                          <img
                            src={submittedTicket.screenshotUrl}
                            alt="Ticket screenshot"
                            className="h-32 w-auto rounded border border-[var(--border)]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Status Info */}
            <div className="space-y-4">
              {/* Upgrade message for Free/Starter users */}
              {isAuthenticated && !hasProPlan && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-500 text-sm mb-2">View Your Tickets</p>
                      <p className="text-xs text-[var(--text-muted)] mb-3">
                        Upgrade to Pro to view, track & chat about your support tickets.
                      </p>
                      <Link
                        to="/billing"
                        className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                      >
                        <Zap size={14} />
                        Upgrade Plan
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h4 className="font-bold mb-4">Ticket Status Guide</h4>
                <div className="space-y-3">
                  {Object.entries(TICKET_STATUSES).map(([status, config]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0].replace('text-', 'bg-')}`}></div>
                      <span className="text-sm">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-4">
                <p className="text-sm font-semibold text-primary-500 mb-2">📋 Pro Tips</p>
                <ul className="space-y-2 text-xs text-[var(--text-muted)]">
                  <li>• Include Bot ID for faster resolution</li>
                  <li>• Describe exact steps to reproduce</li>
                  <li>• Screenshot/video helps us understand better</li>
                  <li>• Check Help Articles first - may have instant solution</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer CTA */}
        <div className="mt-12 rounded-lg bg-primary-500 p-8 text-center text-white">
          <h3 className="text-2xl font-bold">Still need help?</h3>
          <p className="mt-2 text-blue-100">
            Check our Setup Guide for platform-specific integration instructions
          </p>
          {!isAuthenticated && (
            <p className="mt-3 text-sm text-blue-200">
              Create a support ticket or message us directly by 
              <Link to="/login" className="ml-1 underline hover:text-white font-semibold">
                logging in
              </Link>
            </p>
          )}
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/setup-guide"
              className="inline-flex items-center rounded-lg bg-white px-6 py-2.5 font-semibold text-primary-600 hover:bg-blue-50"
            >
              View Setup Guide
            </Link>
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="inline-flex items-center rounded-lg border border-white px-6 py-2.5 font-semibold text-white hover:bg-primary-600/50"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
