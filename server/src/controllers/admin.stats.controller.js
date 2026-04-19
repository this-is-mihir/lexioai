const mongoose = require("mongoose");
const User = require("../models/User.model");
const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const Lead = require("../models/Lead.model");
const AuditLog = require("../models/AuditLog.model");
const { successResponse, errorResponse } = require("../utils/response.utils");

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/stats/dashboard
// ----------------------------------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday    = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek     = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
      totalUsers, newUsersToday, newUsersWeek, newUsersMonth,
      totalBots, liveBots,
      totalChats, chatsThisMonth, chatsToday,
      totalLeads, leadsThisMonth,
      planBreakdown,
      lastMonthUsers,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Bot.countDocuments({ isActive: true }),
      Bot.countDocuments({ isLive: true }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Conversation.countDocuments({ createdAt: { $gte: startOfToday } }),
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    ]);

    const plans = { free: 0, starter: 0, pro: 0, business: 0 };
    planBreakdown.forEach((p) => { if (p._id) plans[p._id] = p.count; });

    // Growth % vs last month
    const userGrowthPct = lastMonthUsers > 0
      ? Math.round(((newUsersMonth - lastMonthUsers) / lastMonthUsers) * 100)
      : newUsersMonth > 0 ? 100 : 0;

    const paidUsers = (plans.starter || 0) + (plans.pro || 0) + (plans.business || 0);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email plan avatar createdAt");

    const activeBots = await Bot.find({ isLive: true })
      .sort({ "stats.totalChats": -1 })
      .limit(5)
      .select("name websiteUrl stats.totalChats isLive")
      .populate("userId", "name email");

    return successResponse(res, {
      data: {
        // Flat keys for easy frontend access
        totalUsers,
        totalBots,
        liveBots,
        totalChats,
        chatsToday,
        chatsThisMonth,
        totalLeads,
        leadsThisMonth,
        newUsersToday,
        newUsersWeek: newUsersWeek,
        newUsersMonth,
        paidUsers,
        userGrowthPct,
        // Nested (keep for backward compat)
        users: {
          total:        totalUsers,
          today:        newUsersToday,
          thisWeek:     newUsersWeek,
          thisMonth:    newUsersMonth,
          planBreakdown: plans,
        },
        bots:  { total: totalBots, live: liveBots },
        chats: { total: totalChats, thisMonth: chatsThisMonth, today: chatsToday },
        leads: { total: totalLeads, thisMonth: leadsThisMonth },
        planBreakdown: plans,
        recentUsers,
        activeBots,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return errorResponse(res, { message: "Failed to fetch dashboard stats." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/stats/revenue
// ----------------------------------------------------------------
const getRevenueStats = async (req, res) => {
  try {
    const planPrices = { starter: 399, pro: 899, business: 2999 };

    // Current MRR from active paid users
    const paidUsers = await User.aggregate([
      { $match: { plan: { $in: ["starter", "pro", "business"] } } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    let mrr = 0;
    const breakdown = {};
    paidUsers.forEach((p) => {
      const revenue = p.count * (planPrices[p._id] || 0);
      mrr += revenue;
      breakdown[p._id] = { users: p.count, revenue };
    });

    // Daily revenue chart — based on users who joined each day (their plan price)
    const days = parseInt(req.query.days) || 30;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - days * 86400000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const dailyRevenue = await User.aggregate([
      {
        $match: {
          plan: { $in: ["starter", "pro", "business"] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ["$plan", "starter"]  }, then: 399  },
                  { case: { $eq: ["$plan", "pro"]      }, then: 899  },
                  { case: { $eq: ["$plan", "business"] }, then: 2999 },
                ],
                default: 0,
              },
            },
          },
          users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days
    const daily = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const found   = dailyRevenue.find((d) => d._id === dateStr);
      daily.push({ date: dateStr, revenue: found?.revenue || 0, users: found?.users || 0 });
      current.setDate(current.getDate() + 1);
    }

    return successResponse(res, {
      data: { mrr, arr: mrr * 12, breakdown, currency: "INR", daily },
    });
  } catch (error) {
    console.error("Get revenue stats error:", error);
    return errorResponse(res, { message: "Failed to fetch revenue stats." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/stats/user-growth
// ----------------------------------------------------------------
const getUserGrowth = async (req, res) => {
  try {
    // Support both: ?days=30  OR  ?startDate=...&endDate=...
    let startDate, endDate, days;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate   = new Date(req.query.endDate);
      days      = Math.ceil((endDate - startDate) / 86400000);
    } else {
      days      = parseInt(req.query.days) || 30;
      endDate   = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days
    const filled  = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const found   = growth.find((g) => g._id === dateStr);
      filled.push({ date: dateStr, count: found?.count || 0 });
      current.setDate(current.getDate() + 1);
    }

    return successResponse(res, { data: { growth: filled, days } });
  } catch (error) {
    console.error("Get user growth error:", error);
    return errorResponse(res, { message: "Failed to fetch user growth." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/stats/activity-feed
// ----------------------------------------------------------------
const getActivityFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const [recentUsers, recentBots, recentConversations, recentAuditLogs] =
      await Promise.all([
        User.find().sort({ createdAt: -1 }).limit(5).select("name email plan createdAt"),
        Bot.find().sort({ createdAt: -1 }).limit(5).select("name websiteUrl createdAt").populate("userId", "name"),
        Conversation.find().sort({ createdAt: -1 }).limit(5).select("createdAt pageUrl").populate("botId", "name"),
        AuditLog.find().sort({ createdAt: -1 }).limit(10).select("adminName action description createdAt"),
      ]);

    const feed = [];

    recentUsers.forEach((u) => {
      feed.push({
        type:        "new_user",
        action:      "USER_REGISTERED",
        message:     `${u.name || u.email} signed up (${u.plan} plan)`,
        description: `${u.name || u.email} signed up (${u.plan} plan)`,
        time:        u.createdAt,
        createdAt:   u.createdAt,
        icon:        "👤",
      });
    });

    recentBots.forEach((b) => {
      feed.push({
        type:        "new_bot",
        action:      "BOT_CREATED",
        message:     `${b.userId?.name || "Someone"} created bot "${b.name}"`,
        description: `${b.userId?.name || "Someone"} created bot "${b.name}"`,
        time:        b.createdAt,
        createdAt:   b.createdAt,
        icon:        "🤖",
      });
    });

    recentConversations.forEach((c) => {
      feed.push({
        type:        "new_chat",
        action:      "NEW_CHAT",
        message:     `New chat on "${c.botId?.name || "a bot"}"`,
        description: `New chat on "${c.botId?.name || "a bot"}"`,
        time:        c.createdAt,
        createdAt:   c.createdAt,
        icon:        "💬",
      });
    });

    recentAuditLogs.forEach((a) => {
      feed.push({
        type:        "admin_action",
        action:      a.action,
        message:     `${a.adminName}: ${a.description}`,
        description: a.description,
        adminName:   a.adminName,
        time:        a.createdAt,
        createdAt:   a.createdAt,
        icon:        "🔧",
      });
    });

    feed.sort((a, b) => new Date(b.time) - new Date(a.time));
    const sliced = feed.slice(0, limit);

    return successResponse(res, {
      data: {
        feed:   sliced,   // new key
        events: sliced,   // backward compat
      },
    });
  } catch (error) {
    console.error("Get activity feed error:", error);
    return errorResponse(res, { message: "Failed to fetch activity feed." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/stats/suspicious
// ----------------------------------------------------------------
const getSuspiciousActivity = async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [ipAbuse, recentBans, unverifiedUsers, pendingDeletions] =
      await Promise.all([
        User.aggregate([
          { $match: { registrationIP: { $ne: null } } },
          {
            $group: {
              _id:   "$registrationIP",
              count: { $sum: 1 },
              users: { $push: { email: "$email", plan: "$plan", createdAt: "$createdAt" } },
            },
          },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        User.find({ isBanned: true })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("name email bannedReason updatedAt"),
        User.countDocuments({ isEmailVerified: false, createdAt: { $lt: oneDayAgo } }),
        User.countDocuments({ deletionRequestedAt: { $ne: null } }),
      ]);

    const alerts = [
      ipAbuse.length > 0        && `${ipAbuse.length} IPs with multiple accounts`,
      unverifiedUsers > 0        && `${unverifiedUsers} unverified accounts (>24h old)`,
      pendingDeletions > 0       && `${pendingDeletions} account deletion requests pending`,
    ].filter(Boolean);

    return successResponse(res, {
      data: { ipAbuse, recentBans, unverifiedUsers, pendingDeletions, alerts },
    });
  } catch (error) {
    console.error("Get suspicious activity error:", error);
    return errorResponse(res, { message: "Failed to fetch suspicious activity." });
  }
};


// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/stats/activity-feed
// @desc    Clear activity feed — SuperAdmin only
// ----------------------------------------------------------------
const deleteActivityFeed = async (req, res) => {
  try {
    const { olderThan } = req.query; // optional: ?olderThan=7 (days)

    let filter = {};
    if (olderThan) {
      const cutoff = new Date(Date.now() - parseInt(olderThan) * 86400000);
      filter = { createdAt: { $lt: cutoff } };
    }

    // AuditLog is the source of admin actions in feed
    const deleted = await AuditLog.deleteMany(filter);

    await AuditLog.create({
      adminId:   req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP:   req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown",
      action:    "ACTIVITY_FEED_CLEARED",
      module:    "stats",
      description: olderThan
        ? `Activity feed cleared (entries older than ${olderThan} days) — ${deleted.deletedCount} records deleted`
        : `Activity feed fully cleared — ${deleted.deletedCount} records deleted`,
    });

    return successResponse(res, {
      message: `Activity feed cleared — ${deleted.deletedCount} records deleted.`,
      data: { deletedCount: deleted.deletedCount },
    });
  } catch (error) {
    console.error("Delete activity feed error:", error);
    return errorResponse(res, { message: "Failed to clear activity feed." });
  }
};

// Delete single activity log
const deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, { message: "Invalid activity log ID" }, 400);
    }

    const deletedLog = await AuditLog.findByIdAndDelete(id);

    if (!deletedLog) {
      return errorResponse(res, { message: "Activity log not found" }, 404);
    }

    // Log this deletion action
    await AuditLog.create({
      adminId:   req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP:   req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown",
      action:    "ACTIVITY_LOG_DELETED",
      module:    "stats",
      description: `Deleted activity log: ${deletedLog.action}`,
    });

    return successResponse(res, {
      message: "Activity log deleted successfully",
      data: { deletedId: id },
    });
  } catch (error) {
    console.error("Delete activity log error:", error);
    return errorResponse(res, { message: "Failed to delete activity log" });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueStats,
  getUserGrowth,
  getActivityFeed,
  deleteActivityFeed,
  getSuspiciousActivity,
  deleteActivityLog,
};