const Conversation = require("../models/Conversation.model");
const Bot = require("../models/Bot.model");
const AuditLog = require("../models/AuditLog.model");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/conversations
// ----------------------------------------------------------------
const getAllConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.botId) filter.botId = req.query.botId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.language) filter.language = req.query.language;
    if (req.query.unanswered === "true") filter.unansweredCount = { $gt: 0 };
    if (req.query.leadCaptured === "true") filter.leadCaptured = true;

    // Date range filter
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-messages")
        .populate("botId", "name websiteUrl")
        .populate("ownerId", "name email"),
      Conversation.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { conversations, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get all conversations error:", error);
    return errorResponse(res, { message: "Failed to fetch conversations." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/conversations/:conversationId
// ----------------------------------------------------------------
const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId)
      .populate("botId", "name websiteUrl appearance")
      .populate("ownerId", "name email");

    if (!conversation) return notFoundResponse(res, "Conversation not found");

    return successResponse(res, { data: { conversation } });
  } catch (error) {
    console.error("Get conversation error:", error);
    return errorResponse(res, { message: "Failed to fetch conversation." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/conversations
// @desc    Date range se conversations delete karo
// ----------------------------------------------------------------
const deleteConversations = async (req, res) => {
  try {
    const { from, to, botId } = req.body;

    if (!from || !to) {
      return errorResponse(res, {
        message: "Please provide both from and to dates.",
        statusCode: 400,
      });
    }

    // Add 1 day to 'to' date so it includes the entire day (end of day)
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);

    const filter = {
      createdAt: { $gte: new Date(from), $lt: toDate },
    };
    if (botId) filter.botId = botId;

    const result = await Conversation.deleteMany(filter);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "CONVERSATIONS_DELETED",
      module: "conversations",
      description: `${result.deletedCount} conversations deleted from ${from} to ${to}`,
    });

    return successResponse(res, {
      message: `${result.deletedCount} conversations deleted successfully.`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Delete conversations error:", error);
    return errorResponse(res, { message: "Failed to delete conversations." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/bots/:botId/conversations
// ----------------------------------------------------------------
const getBotConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const bot = await Bot.findById(req.params.botId);
    if (!bot) return notFoundResponse(res, "Bot not found");

    const [conversations, total] = await Promise.all([
      Conversation.find({ botId: req.params.botId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),  // messages include karo for chat history display
      Conversation.countDocuments({ botId: req.params.botId }),
    ]);

    return successResponse(res, {
      data: { conversations, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get bot conversations error:", error);
    return errorResponse(res, { message: "Failed to fetch bot conversations." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/conversations/export
// ----------------------------------------------------------------
const exportConversations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const conversations = await Conversation.find(filter)
      .sort({ createdAt: -1 })
      .select("-messages")
      .populate("botId", "name")
      .populate("ownerId", "name email");

    const headers = ["Bot Name", "Owner", "Visitor", "Status", "Messages", "Language", "Lead Captured", "Date"];
    const rows = conversations.map((c) => [
      c.botId?.name || "",
      c.ownerId?.email || "",
      c.visitorName || "Anonymous",
      c.status || "",
      c.totalMessages || 0,
      c.language || "",
      c.leadCaptured ? "Yes" : "No",
      new Date(c.createdAt).toLocaleDateString("en-IN"),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="conversations_${Date.now()}.csv"`);

    return res.send(csv);
  } catch (error) {
    console.error("Export conversations error:", error);
    return errorResponse(res, { message: "Failed to export conversations." });
  }
};

module.exports = {
  getAllConversations,
  getConversation,
  deleteConversations,
  getBotConversations,
  exportConversations,
};