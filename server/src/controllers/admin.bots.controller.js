const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const Lead = require("../models/Lead.model");
const AuditLog = require("../models/AuditLog.model");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/bots
// ----------------------------------------------------------------
const getAllBots = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const status = req.query.status;
    const training = req.query.training;

    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { websiteUrl: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "live") filter.isLive = true;
    if (status === "offline") filter.isLive = false;
    if (training) filter.trainingStatus = training;

    const [bots, total] = await Promise.all([
      Bot.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email plan")
        .select("-systemPrompt -trainingSources"),
      Bot.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { bots, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get all bots error:", error);
    return errorResponse(res, { message: "Failed to fetch bots." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/bots/:botId
// ----------------------------------------------------------------
const getBotDetails = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.botId)
      .populate("userId", "name email plan avatar");

    if (!bot) return notFoundResponse(res, "Bot not found");

    const [totalConversations, totalLeads] = await Promise.all([
      Conversation.countDocuments({ botId: bot._id }),
      Lead.countDocuments({ botId: bot._id }),
    ]);

    return successResponse(res, {
      data: {
        bot,
        stats: { totalConversations, totalLeads },
      },
    });
  } catch (error) {
    console.error("Get bot details error:", error);
    return errorResponse(res, { message: "Failed to fetch bot details." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/bots/:botId/toggle
// ----------------------------------------------------------------
const toggleBotLive = async (req, res) => {
  try {
    // Check permission
    if (!req.admin.isSuperAdmin && !req.admin.permissions?.bots?.edit) {
      return forbiddenResponse(res, "You do not have permission to edit bots.");
    }

    const bot = await Bot.findById(req.params.botId);
    if (!bot) return notFoundResponse(res, "Bot not found");

    bot.isLive = !bot.isLive;
    await bot.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: bot.isLive ? "BOT_ENABLED" : "BOT_DISABLED",
      module: "bots",
      description: `Bot "${bot.name}" ${bot.isLive ? "enabled" : "disabled"} by admin`,
      targetType: "bot",
      targetId: bot._id,
      targetName: bot.name,
    });

    return successResponse(res, {
      message: `Bot ${bot.isLive ? "enabled" : "disabled"} successfully.`,
      data: { isLive: bot.isLive },
    });
  } catch (error) {
    console.error("Toggle bot live error:", error);
    return errorResponse(res, { message: "Failed to toggle bot." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/bots/:botId
// ----------------------------------------------------------------
const deleteBot = async (req, res) => {
  try {
    // Check permission
    if (!req.admin.isSuperAdmin && !req.admin.permissions?.bots?.delete) {
      return forbiddenResponse(res, "You do not have permission to delete bots.");
    }

    const bot = await Bot.findById(req.params.botId);
    if (!bot) return notFoundResponse(res, "Bot not found");

    await Conversation.deleteMany({ botId: bot._id });
    await Lead.deleteMany({ botId: bot._id });
    await Bot.findByIdAndDelete(bot._id);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "BOT_DELETED",
      module: "bots",
      description: `Bot "${bot.name}" deleted by admin`,
      targetType: "bot",
      targetId: bot._id,
      targetName: bot.name,
    });

    return successResponse(res, { message: "Bot deleted successfully." });
  } catch (error) {
    console.error("Delete bot error:", error);
    return errorResponse(res, { message: "Failed to delete bot." });
  }
};



// ----------------------------------------------------------------
// @route   GET /api/v1/admin/bots/:botId/leads
// ----------------------------------------------------------------
const getBotLeads = async (req, res) => {
  try {
    const Lead = require("../models/Lead.model");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const bot = await Bot.findById(req.params.botId);
    if (!bot) return notFoundResponse(res, "Bot not found");

    const [leads, total] = await Promise.all([
      Lead.find({ botId: req.params.botId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments({ botId: req.params.botId }),
    ]);

    return successResponse(res, {
      data: { leads, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get bot leads error:", error);
    return errorResponse(res, { message: "Failed to fetch bot leads." });
  }
};


module.exports = { getAllBots, getBotDetails, toggleBotLive, deleteBot, getBotLeads };