const cron = require("node-cron");
const User = require("./models/User.model");
const Bot = require("./models/Bot.model");
const Conversation = require("./models/Conversation.model");
const { sendEmail, sendPlanExpiryEmail } = require("./utils/email.utils");
const { dispatchEventNotification } = require("./utils/eventNotifications.utils");

const CRON_TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Kolkata";

const getDateToken = () => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getMonthToken = () => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const getWeekToken = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((now - start) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const getDaysLeft = (expiryDate) => {
  const now = new Date();
  const diffMs = new Date(expiryDate).getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
};

const processPlanExpiryNotifications = async () => {
  const targets = [7, 3, 1, 0];

  try {
    const users = await User.find({
      isActive: true,
      isBanned: false,
      plan: { $in: ["starter", "pro", "business"] },
      planExpiry: { $ne: null },
    }).select("_id name email plan planExpiry notificationPrefs");

    for (const user of users) {
      const daysLeft = getDaysLeft(user.planExpiry);
      if (!targets.includes(daysLeft)) continue;

      const title = daysLeft > 0
        ? `Your ${user.plan} plan expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`
        : `Your ${user.plan} plan expires today`;

      const message = daysLeft > 0
        ? `Your current ${user.plan} plan will expire in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Renew to avoid interruptions.`
        : `Your current ${user.plan} plan expires today. Renew now to avoid interruptions.`;

      const dateToken = getDateToken();
      await dispatchEventNotification({
        user,
        type: "planExpiry",
        title,
        message,
        priority: daysLeft <= 1 ? "high" : "medium",
        dedupeKey: `plan-expiry-${dateToken}-${daysLeft}`,
        metadata: {
          daysLeft,
          plan: user.plan,
          expiryDate: user.planExpiry,
        },
        emailPrefKey: "planExpiry",
        inAppPrefKey: "planExpiry",
        fallbackEmailEnabled: true,
        fallbackInAppEnabled: true,
        sendEmail: () => sendPlanExpiryEmail(user, Math.max(daysLeft, 0)),
      });
    }
  } catch (error) {
    console.error("[Cron] Plan expiry notifications failed:", error.message);
  }
};

const processWeeklyReports = async () => {
  try {
    const users = await User.find({
      isActive: true,
      isBanned: false,
    }).select("_id name email plan notificationPrefs");

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekToken = getWeekToken();

    for (const user of users) {
      const [botsCount, conversationsCount] = await Promise.all([
        Bot.countDocuments({ userId: user._id }),
        Conversation.countDocuments({ ownerId: user._id, createdAt: { $gte: since } }),
      ]);

      const title = "Your weekly Lexioai report is ready";
      const message = `This week: ${conversationsCount} conversations and ${botsCount} total bots.`;

      await dispatchEventNotification({
        user,
        type: "weeklyReport",
        title,
        message,
        dedupeKey: `weekly-report-${weekToken}`,
        priority: "low",
        metadata: {
          botsCount,
          conversationsCount,
          weekToken,
        },
        emailPrefKey: "weeklyReport",
        fallbackEmailEnabled: true,
        sendEmail: () =>
          sendEmail({
            to: user.email,
            subject: "Your Weekly Lexioai Report",
            html:
              `<div style="font-family:Arial,sans-serif;line-height:1.6">` +
              `<h2>Your Weekly Report</h2>` +
              `<p>Hi ${user.name || "there"},</p>` +
              `<p>Here is your usage summary for this week:</p>` +
              `<ul>` +
              `<li>Total bots: <strong>${botsCount}</strong></li>` +
              `<li>Conversations in last 7 days: <strong>${conversationsCount}</strong></li>` +
              `</ul>` +
              `<p>Keep building. You're doing great.</p>` +
              `</div>`,
          }),
      });
    }
  } catch (error) {
    console.error("[Cron] Weekly reports failed:", error.message);
  }
};

const processMonthlyNewsletter = async () => {
  try {
    const users = await User.find({
      isActive: true,
      isBanned: false,
    }).select("_id name email notificationPrefs");

    const monthToken = getMonthToken();

    for (const user of users) {
      await dispatchEventNotification({
        user,
        type: "newsletter",
        title: "Lexioai monthly newsletter",
        message: "Product updates, growth tips, and useful workflows from Lexioai.",
        dedupeKey: `newsletter-${monthToken}`,
        priority: "low",
        metadata: { monthToken },
        emailPrefKey: "newsletter",
        fallbackEmailEnabled: false,
        sendEmail: () =>
          sendEmail({
            to: user.email,
            subject: "Lexioai Monthly Newsletter",
            html:
              `<div style="font-family:Arial,sans-serif;line-height:1.6">` +
              `<h2>Lexioai Monthly Newsletter</h2>` +
              `<p>Hi ${user.name || "there"},</p>` +
              `<p>Here are this month's highlights:</p>` +
              `<ul>` +
              `<li>Better dashboard speed and reliability improvements</li>` +
              `<li>Smarter notification controls across your workspace</li>` +
              `<li>New best-practice templates for lead capture and conversations</li>` +
              `</ul>` +
              `<p>Thanks for building with Lexioai.</p>` +
              `</div>`,
          }),
      });
    }
  } catch (error) {
    console.error("[Cron] Monthly newsletter failed:", error.message);
  }
};

const processWeeklyTips = async () => {
  const tips = [
    "Use conversation starters on every bot to increase first-message rate.",
    "Add 3-5 FAQ examples to your bot training to reduce fallback answers.",
    "Review unanswered conversations weekly and update training data from them.",
    "Connect lead capture with clear CTA questions to improve conversion.",
  ];

  try {
    const users = await User.find({
      isActive: true,
      isBanned: false,
    }).select("_id notificationPrefs");

    const weekToken = getWeekToken();
    const tipIndex = Number(weekToken.split("W")[1] || 1) % tips.length;
    const tipText = tips[tipIndex];

    for (const user of users) {
      await dispatchEventNotification({
        user,
        type: "tips",
        title: "Weekly growth tip",
        message: tipText,
        priority: "low",
        dedupeKey: `tip-${weekToken}`,
        metadata: { weekToken, tipIndex },
        inAppPrefKey: "tips",
        fallbackInAppEnabled: true,
      });
    }
  } catch (error) {
    console.error("[Cron] Weekly tips failed:", error.message);
  }
};

function startUserNotificationsCron() {
  cron.schedule("15 9 * * *", processPlanExpiryNotifications, { timezone: CRON_TIMEZONE });
  cron.schedule("30 9 * * 1", processWeeklyReports, { timezone: CRON_TIMEZONE });
  cron.schedule("0 10 1 * *", processMonthlyNewsletter, { timezone: CRON_TIMEZONE });
  cron.schedule("45 9 * * 1", processWeeklyTips, { timezone: CRON_TIMEZONE });

  console.log("[Cron] User notifications cron started (plan expiry, report, newsletter, tips)");
}

module.exports = { startUserNotificationsCron };
