// ================================================================
// FILE: server/src/cron/scheduledAnnouncements.cron.js
// Import and call startAnnouncementCron() in app.js after DB connects
// ================================================================

const cron          = require("node-cron");
const Announcement  = require("./models/Announcement.model");
const EmailTemplate = require("./models/EmailTemplate.model");
const User          = require("./models/User.model");
const { sendEmail } = require("./utils/email.utils");

// ── Reuse render helper ──────────────────────────────────────────
function renderVars(str = '', vars = {}) {
  const defaults = {
    userName:     vars.userName     || 'User',
    planName:     vars.planName     || 'Free',
    message:      vars.message      || '',
    appName:      vars.appName      || 'Lexioai',
    supportEmail: vars.supportEmail || 'support@lexioai.com',
    loginUrl:     vars.loginUrl     || 'https://app.lexioai.com',
  }
  let out = str
  Object.entries(defaults).forEach(([k, v]) => {
    out = out.replace(new RegExp(`{{${k}}}`, 'g'), v)
  })
  return out
}

function buildUserFilter(targetAudience) {
  switch (targetAudience) {
    case 'all':      return {}
    case 'free':     return { plan: 'free' }
    case 'paid':     return { plan: { $in: ['starter', 'pro', 'business'] } }
    case 'starter':  return { plan: 'starter' }
    case 'pro':      return { plan: 'pro' }
    case 'business': return { plan: 'business' }
    default:         return {}
  }
}

async function processScheduledAnnouncements() {
  try {
    // Find all announcements that are scheduled and due
    const due = await Announcement.find({
      status:      'scheduled',
      scheduledAt: { $lte: new Date() },
    })

    if (due.length === 0) return

    console.log(`[Cron] Processing ${due.length} scheduled announcement(s)...`)

    for (const announcement of due) {
      // Mark as sending immediately to prevent duplicate processing
      announcement.status = 'sending'
      await announcement.save()

      const userFilter = buildUserFilter(announcement.targetAudience)
      const users      = await User.find({ ...userFilter, isActive: true, isBanned: false })
        .select('_id name firstName email plan')

      announcement.totalRecipients = users.length

      let template = null
      if (announcement.emailTemplateId) {
        template = await EmailTemplate.findById(announcement.emailTemplateId)
      }

      let sentCount   = 0
      let failedCount = 0
      const failedList = []

      for (const user of users) {
        const vars = {
          userName:     user.name || user.firstName || 'User',
          planName:     user.plan || 'free',
          message:      announcement.message,
          appName:      'Lexioai',
          supportEmail: 'support@lexioai.com',
          loginUrl:     process.env.CLIENT_URL || 'https://app.lexioai.com',
        }

        if (announcement.type === 'email' || announcement.type === 'both') {
          try {
            const subject = renderVars(announcement.emailSubject || announcement.title, vars)
            const html    = template
              ? EmailTemplate.renderTemplate(template.htmlBody, vars)
              : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
                   <h2 style="color:#6366f1">${renderVars(announcement.title, vars)}</h2>
                   <p style="color:#374151;line-height:1.6">${renderVars(announcement.message, vars)}</p>
                   <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                   <p style="color:#9ca3af;font-size:12px">— ${vars.appName} Team</p>
                 </div>`

            await sendEmail({ to: user.email, subject, html })
            sentCount++
          } catch (err) {
            failedCount++
            failedList.push({ userId: user._id, email: user.email, reason: err.message })
          }
        }

        if (announcement.type === 'inapp' || announcement.type === 'both') {
          sentCount++
        }
      }

      announcement.sentCount        = sentCount
      announcement.failedCount      = failedCount
      announcement.failedRecipients = failedList
      announcement.sentAt           = new Date()
      announcement.status           = failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'partial'

      await announcement.save()
      console.log(`[Cron] Announcement "${announcement.title}" → ${announcement.status} (sent: ${sentCount}, failed: ${failedCount})`)
    }
  } catch (err) {
    console.error('[Cron] Scheduled announcements error:', err.message)
  }
}

// ── Export ───────────────────────────────────────────────────────
function startAnnouncementCron() {
  // Runs every minute — checks for due scheduled announcements
  cron.schedule("* * * * *", processScheduledAnnouncements);
  console.log("[Cron] ✅ Scheduled announcements cron started (every 1 min)");
}

module.exports = { startAnnouncementCron };