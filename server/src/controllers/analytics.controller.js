  const Bot = require("../models/Bot.model");
  const Conversation = require("../models/Conversation.model");
  const Lead = require("../models/Lead.model");
  const {
    successResponse,
    errorResponse,
    forbiddenResponse,
    notFoundResponse,
  } = require("../utils/response.utils");

  // ----------------------------------------------------------------
  // HELPER — Bot owner verify
  // ----------------------------------------------------------------
  const getBotAndVerify = async (botId, userId) => {
    const bot = await Bot.findById(botId);
    if (!bot) return { error: "notFound" };
    if (bot.userId.toString() !== userId.toString())
      return { error: "forbidden" };
    return { bot };
  };

  // ----------------------------------------------------------------
  // HELPER — Date range calculate karo
  // ----------------------------------------------------------------
  const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case "7d":
        start.setDate(now.getDate() - 7);
        break;
      case "30d":
        start.setDate(now.getDate() - 30);
        break;
      case "90d":
        start.setDate(now.getDate() - 90);
        break;
      case "1y":
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/:botId/overview
  // @desc    Bot ka overview stats
  // @access  Private
  // ----------------------------------------------------------------
  const getOverview = async (req, res) => {
    try {
      const { bot, error } = await getBotAndVerify(
        req.params.botId,
        req.user._id
      );

      if (error === "notFound") return notFoundResponse(res, "Bot not found");
      if (error === "forbidden")
        return forbiddenResponse(res, "You do not have access to this bot");

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      // Current period stats
      const [
        totalChats,
        totalLeads,
        unansweredChats,
        activeConversations,
      ] = await Promise.all([
        Conversation.countDocuments({
          botId: bot._id,
          createdAt: { $gte: start, $lte: end },
        }),
        Lead.countDocuments({
          botId: bot._id,
          createdAt: { $gte: start, $lte: end },
        }),
        Conversation.countDocuments({
          botId: bot._id,
          unansweredCount: { $gt: 0 },
          createdAt: { $gte: start, $lte: end },
        }),
        Conversation.countDocuments({
          botId: bot._id,
          status: "active",
        }),
      ]);

      // Previous period ke liye comparison
      const prevStart = new Date(start);
      const prevEnd = new Date(start);
      const diff = end - start;
      prevStart.setTime(prevStart.getTime() - diff);

      const [prevChats, prevLeads] = await Promise.all([
        Conversation.countDocuments({
          botId: bot._id,
          createdAt: { $gte: prevStart, $lte: prevEnd },
        }),
        Lead.countDocuments({
          botId: bot._id,
          createdAt: { $gte: prevStart, $lte: prevEnd },
        }),
      ]);

      // Change percentage calculate karo
      const chatsChange =
        prevChats > 0
          ? (((totalChats - prevChats) / prevChats) * 100).toFixed(1)
          : totalChats > 0
          ? 100
          : 0;

      const leadsChange =
        prevLeads > 0
          ? (((totalLeads - prevLeads) / prevLeads) * 100).toFixed(1)
          : totalLeads > 0
          ? 100
          : 0;

      // Current month usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyChats =
        bot.currentMonthUsage?.month === currentMonth
          ? bot.currentMonthUsage.chatsUsed
          : 0;

      // Chat limit
      const CHAT_LIMITS = {
        free: 50,
        starter: 500,
        pro: 2000,
        business: 10000,
      };
      const chatLimit = CHAT_LIMITS[req.user.plan] || 50;

      return successResponse(res, {
        data: {
          period,
          overview: {
            totalChats,
            totalLeads,
            unansweredChats,
            activeConversations,
            unansweredRate:
              totalChats > 0
                ? ((unansweredChats / totalChats) * 100).toFixed(1)
                : 0,
            leadConversionRate:
              totalChats > 0
                ? ((totalLeads / totalChats) * 100).toFixed(1)
                : 0,
          },
          changes: {
            chats: parseFloat(chatsChange),
            leads: parseFloat(leadsChange),
          },
          monthlyUsage: {
            used: monthlyChats,
            limit: chatLimit,
            percentage:
              chatLimit > 0
                ? ((monthlyChats / chatLimit) * 100).toFixed(1)
                : 0,
          },
          botStats: bot.stats,
        },
      });
    } catch (error) {
      console.error("Get overview error:", error);
      return errorResponse(res, { message: "Failed to fetch analytics overview." });
    }
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/:botId/chats-graph
  // @desc    Chat volume graph data
  // @access  Private
  // ----------------------------------------------------------------
  const getChatsGraph = async (req, res) => {
    try {
      const { bot, error } = await getBotAndVerify(
        req.params.botId,
        req.user._id
      );

      if (error === "notFound") return notFoundResponse(res, "Bot not found");
      if (error === "forbidden")
        return forbiddenResponse(res, "You do not have access to this bot");

      // Pro+ ke liye only
      if (req.user.plan === "free") {
        return forbiddenResponse(
          res,
          "Detailed analytics is available on Starter and above plans."
        );
      }

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      // Group by day
      const chatsData = await Conversation.aggregate([
        {
          $match: {
            botId: bot._id,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            chats: { $sum: 1 },
            leads: {
              $sum: { $cond: [{ $eq: ["$leadCaptured", true] }, 1, 0] },
            },
            unanswered: {
              $sum: { $cond: [{ $gt: ["$unansweredCount", 0] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Fill missing days with 0
      const filledData = [];
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        const found = chatsData.find((d) => d._id === dateStr);
        filledData.push({
          date: dateStr,
          chats: found?.chats || 0,
          leads: found?.leads || 0,
          unanswered: found?.unanswered || 0,
        });
        current.setDate(current.getDate() + 1);
      }

      return successResponse(res, {
        data: {
          period,
          graphData: filledData,
          totals: {
            chats: filledData.reduce((sum, d) => sum + d.chats, 0),
            leads: filledData.reduce((sum, d) => sum + d.leads, 0),
            unanswered: filledData.reduce((sum, d) => sum + d.unanswered, 0),
          },
        },
      });
    } catch (error) {
      console.error("Get chats graph error:", error);
      return errorResponse(res, { message: "Failed to fetch chat graph data." });
    }
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/:botId/top-questions
  // @desc    Top questions jo visitors ne puche
  // @access  Private (Pro+)
  // ----------------------------------------------------------------
  const getTopQuestions = async (req, res) => {
    try {
      const { bot, error } = await getBotAndVerify(
        req.params.botId,
        req.user._id
      );

      if (error === "notFound") return notFoundResponse(res, "Bot not found");
      if (error === "forbidden")
        return forbiddenResponse(res, "You do not have access to this bot");

      if (!["pro", "business"].includes(req.user.plan)) {
        return forbiddenResponse(
          res,
          "Top questions analytics is available on Pro and Business plans."
        );
      }

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      // Saari conversations fetch karo
      const conversations = await Conversation.find({
        botId: bot._id,
        createdAt: { $gte: start, $lte: end },
      }).select("messages");

      // User messages extract karo
      const questionMap = {};
      conversations.forEach((conv) => {
        conv.messages.forEach((msg) => {
          if (msg.role === "user") {
            const question = msg.content.toLowerCase().trim();
            if (question.length > 3 && question.length < 200) {
              questionMap[question] = (questionMap[question] || 0) + 1;
            }
          }
        });
      });

      // Sort by frequency
      const topQuestions = Object.entries(questionMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([question, count]) => ({ question, count }));

      return successResponse(res, {
        data: {
          period,
          topQuestions,
          total: Object.keys(questionMap).length,
        },
      });
    } catch (error) {
      console.error("Get top questions error:", error);
      return errorResponse(res, { message: "Failed to fetch top questions." });
    }
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/:botId/peak-hours
  // @desc    Peak hours heatmap data
  // @access  Private (Pro+)
  // ----------------------------------------------------------------
  const getPeakHours = async (req, res) => {
    try {
      const { bot, error } = await getBotAndVerify(
        req.params.botId,
        req.user._id
      );

      if (error === "notFound") return notFoundResponse(res, "Bot not found");
      if (error === "forbidden")
        return forbiddenResponse(res, "You do not have access to this bot");

      if (!["pro", "business"].includes(req.user.plan)) {
        return forbiddenResponse(
          res,
          "Peak hours analytics is available on Pro and Business plans."
        );
      }

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      // Group by hour
      const hourlyData = await Conversation.aggregate([
        {
          $match: {
            botId: bot._id,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              hour: { $hour: "$createdAt" },
              dayOfWeek: { $dayOfWeek: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
      ]);

      // Format for heatmap
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const heatmap = [];

      for (let day = 1; day <= 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const found = hourlyData.find(
            (d) => d._id.dayOfWeek === day && d._id.hour === hour
          );
          heatmap.push({
            day: days[day - 1],
            hour,
            count: found?.count || 0,
          });
        }
      }

      // Peak hour find karo
      const maxCount = Math.max(...heatmap.map((h) => h.count));
      const peakSlot = heatmap.find((h) => h.count === maxCount);

      return successResponse(res, {
        data: {
          period,
          heatmap,
          peakHour: peakSlot
            ? `${peakSlot.day} at ${peakSlot.hour}:00`
            : "Not enough data",
          maxCount,
        },
      });
    } catch (error) {
      console.error("Get peak hours error:", error);
      return errorResponse(res, { message: "Failed to fetch peak hours data." });
    }
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/:botId/languages
  // @desc    Language distribution
  // @access  Private
  // ----------------------------------------------------------------
  const getLanguageStats = async (req, res) => {
    try {
      const { bot, error } = await getBotAndVerify(
        req.params.botId,
        req.user._id
      );

      if (error === "notFound") return notFoundResponse(res, "Bot not found");
      if (error === "forbidden")
        return forbiddenResponse(res, "You do not have access to this bot");

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      const langData = await Conversation.aggregate([
        {
          $match: {
            botId: bot._id,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$language",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const total = langData.reduce((sum, l) => sum + l.count, 0);

      const languages = langData.map((l) => ({
        language: l._id || "unknown",
        count: l.count,
        percentage: total > 0 ? ((l.count / total) * 100).toFixed(1) : 0,
      }));

      return successResponse(res, {
        data: { period, languages, total },
      });
    } catch (error) {
      console.error("Get language stats error:", error);
      return errorResponse(res, { message: "Failed to fetch language stats." });
    }
  };

  // ----------------------------------------------------------------
  // @route   GET /api/v1/analytics/dashboard
  // @desc    User ka poora dashboard stats (saare bots)
  // @access  Private
  // ----------------------------------------------------------------
  const getDashboardStats = async (req, res) => {
    try {
      const userId = req.user._id;

      // User ke saare active bots
      const bots = await Bot.find({ userId, isActive: true });
      const botIds = bots.map((b) => b._id);

      const period = req.query.period || "30d";
      const { start, end } = getDateRange(period);

      const [totalChats, totalLeads, totalBots] = await Promise.all([
        Conversation.countDocuments({
          ownerId: userId,
          createdAt: { $gte: start, $lte: end },
        }),
        Lead.countDocuments({
          ownerId: userId,
          createdAt: { $gte: start, $lte: end },
        }),
        Bot.countDocuments({ userId, isActive: true }),
      ]);

      // Current month total usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyChats = bots.reduce((sum, bot) => {
        if (bot.currentMonthUsage?.month === currentMonth) {
          return sum + bot.currentMonthUsage.chatsUsed;
        }
        return sum;
      }, 0);

      // Chat limit
      const CHAT_LIMITS = {
        free: 50,
        starter: 500,
        pro: 2000,
        business: 10000,
      };
      const chatLimit = CHAT_LIMITS[req.user.plan] || 50;

      // Recent conversations
      const recentConversations = await Conversation.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("botId", "name");

      // Recent leads
      const recentLeads = await Lead.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("botId", "name");

      // Bot wise stats
      const botStats = bots.map((bot) => ({
        botId: bot._id,
        botName: bot.name,
        isLive: bot.isLive,
        totalChats: bot.stats.totalChats,
        totalLeads: bot.stats.totalLeads,
        trainingStatus: bot.trainingStatus,
        monthlyChats:
          bot.currentMonthUsage?.month === currentMonth
            ? bot.currentMonthUsage.chatsUsed
            : 0,
      }));

      return successResponse(res, {
        data: {
          period,
          summary: {
            totalBots,
            totalChats,
            totalLeads,
            monthlyChats,
            chatLimit,
            chatLimitPercentage:
              chatLimit > 0
                ? ((monthlyChats / chatLimit) * 100).toFixed(1)
                : 0,
          },
          botStats,
          recentConversations,
          recentLeads,
        },
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      return errorResponse(res, { message: "Failed to fetch dashboard stats." });
    }
  };

  module.exports = {
    getOverview,
    getChatsGraph,
    getTopQuestions,
    getPeakHours,
    getLanguageStats,
    getDashboardStats,
  };