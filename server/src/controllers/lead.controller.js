const Lead = require("../models/Lead.model");
const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");

// ----------------------------------------------------------------
// PLAN LIMITS
// ----------------------------------------------------------------
const LEAD_LIMITS = {
  free: 10,      // Sirf 10 leads visible
  starter: -1,   // Unlimited
  pro: -1,
  business: -1,
};

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
// @route   POST /api/v1/leads/:botId
// @desc    New lead capture karo (chat se)
// @access  Private
// ----------------------------------------------------------------
const createLead = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Free plan check
    if (req.user.plan === "free") {
      return forbiddenResponse(
        res,
        "Lead capture is available on Starter and above plans."
      );
    }

    const { name, email, phone, company, message, conversationId, pageUrl, visitorIP, visitorDevice } = req.body;

    // Kam se kam ek field honi chahiye
    if (!name && !email && !phone) {
      return validationErrorResponse(res, [
        { field: "general", message: "At least name, email, or phone is required" },
      ]);
    }

    // Email format check
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return validationErrorResponse(res, [
          { field: "email", message: "Please enter a valid email address" },
        ]);
      }
    }

    // Duplicate check — same email same bot
    if (email) {
      const existing = await Lead.findOne({
        botId: bot._id,
        email: email.toLowerCase(),
      });

      if (existing) {
        return errorResponse(res, {
          message: "A lead with this email already exists.",
          statusCode: 409,
          data: { leadId: existing._id },
        });
      }
    }

    const lead = new Lead({
      botId: bot._id,
      ownerId: req.user._id,
      conversationId: conversationId || null,
      name: name?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      message: message?.trim() || null,
      pageUrl: pageUrl || null,
      visitorIP: visitorIP || null,
      visitorDevice: visitorDevice || null,
    });

    await lead.save();

    // Conversation update karo
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        leadCaptured: true,
        leadId: lead._id,
        visitorName: name || null,
        visitorEmail: email || null,
        visitorPhone: phone || null,
      });
    }

    // Bot stats update
    await Bot.findByIdAndUpdate(bot._id, {
      $inc: { "stats.totalLeads": 1 },
    });
    return successResponse(res, {
      message: "Lead captured successfully!",
      statusCode: 201,
      data: { lead },
    });
  } catch (error) {
    console.error("Create lead error:", error);
    return errorResponse(res, { message: "Failed to capture lead." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/leads/:botId
// @desc    Bot ke saare leads lo
// @access  Private
// ----------------------------------------------------------------
const getLeads = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    // Free plan — sirf 10 leads
    const leadLimit = LEAD_LIMITS[req.user.plan];
    const actualLimit = leadLimit === -1 ? limit : Math.min(limit, leadLimit);
    const actualSkip = leadLimit === -1 ? skip : 0;

    // Filter
    const filter = { botId: bot._id };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(actualSkip)
      .limit(actualLimit);

    const total = await Lead.countDocuments(filter);

    return successResponse(res, {
      data: {
        leads,
        total,
        page,
        totalPages: Math.ceil(total / actualLimit),
        isLimited: leadLimit !== -1,
        limit: leadLimit,
      },
    });
  } catch (error) {
    console.error("Get leads error:", error);
    return errorResponse(res, { message: "Failed to fetch leads." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/leads/:botId/:leadId
// @desc    Single lead lo
// @access  Private
// ----------------------------------------------------------------
const getLead = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const lead = await Lead.findOne({
      _id: req.params.leadId,
      botId: bot._id,
    });

    if (!lead) return notFoundResponse(res, "Lead not found");

    return successResponse(res, { data: { lead } });
  } catch (error) {
    console.error("Get lead error:", error);
    return errorResponse(res, { message: "Failed to fetch lead." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/leads/:botId/:leadId
// @desc    Lead update karo (status, notes)
// @access  Private
// ----------------------------------------------------------------
const updateLead = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const lead = await Lead.findOne({
      _id: req.params.leadId,
      botId: bot._id,
    });

    if (!lead) return notFoundResponse(res, "Lead not found");

    const { status, notes, name, email, phone, company } = req.body;

    if (status) {
      const validStatuses = ["new", "contacted", "qualified", "converted", "lost"];
      if (!validStatuses.includes(status)) {
        return validationErrorResponse(res, [
          { field: "status", message: "Invalid status. Must be: new, contacted, qualified, converted, or lost" },
        ]);
      }
      lead.status = status;
    }

    if (notes !== undefined) lead.notes = notes?.trim() || null;
    if (name !== undefined) lead.name = name?.trim() || null;
    if (email !== undefined) lead.email = email?.toLowerCase().trim() || null;
    if (phone !== undefined) lead.phone = phone?.trim() || null;
    if (company !== undefined) lead.company = company?.trim() || null;

    await lead.save();

    return successResponse(res, {
      message: "Lead updated successfully!",
      data: { lead },
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return errorResponse(res, { message: "Failed to update lead." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/leads/:botId/:leadId
// @desc    Lead delete karo
// @access  Private
// ----------------------------------------------------------------
const deleteLead = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const lead = await Lead.findOneAndDelete({
      _id: req.params.leadId,
      botId: bot._id,
    });

    if (!lead) return notFoundResponse(res, "Lead not found");

    // Bot stats update
    await Bot.findByIdAndUpdate(bot._id, {
      $inc: { "stats.totalLeads": -1 },
    });

    return successResponse(res, { message: "Lead deleted successfully." });
  } catch (error) {
    console.error("Delete lead error:", error);
    return errorResponse(res, { message: "Failed to delete lead." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/leads/:botId/export
// @desc    Leads CSV export karo
// @access  Private (Pro+)
// ----------------------------------------------------------------
const exportLeads = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // CSV export sirf Pro+ plans ke liye
    if (!["pro", "business"].includes(req.user.plan)) {
      return forbiddenResponse(
        res,
        "CSV export is available on Pro and Business plans."
      );
    }

    const leads = await Lead.find({ botId: bot._id }).sort({ createdAt: -1 });

    if (leads.length === 0) {
      return errorResponse(res, {
        message: "No leads found to export.",
        statusCode: 404,
      });
    }

    // CSV generate karo
    const headers = ["Name", "Email", "Phone", "Company", "Message", "Status", "Notes", "Date"];
    const rows = leads.map((lead) => [
      lead.name || "",
      lead.email || "",
      lead.phone || "",
      lead.company || "",
      lead.message || "",
      lead.status || "",
      lead.notes || "",
      new Date(lead.createdAt).toLocaleDateString("en-IN"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${bot.name}_leads_${Date.now()}.csv"`
    );

    return res.send(csvContent);
  } catch (error) {
    console.error("Export leads error:", error);
    return errorResponse(res, { message: "Failed to export leads." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/leads/:botId/stats
// @desc    Lead stats lo
// @access  Private
// ----------------------------------------------------------------
const getLeadStats = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const stats = await Lead.aggregate([
      { $match: { botId: bot._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };

    stats.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return successResponse(res, {
      data: {
        total,
        statusCounts,
        conversionRate:
          total > 0
            ? ((statusCounts.converted / total) * 100).toFixed(1)
            : 0,
      },
    });
  } catch (error) {
    console.error("Get lead stats error:", error);
    return errorResponse(res, { message: "Failed to fetch lead stats." });
  }
};
// ----------------------------------------------------------------
// @route   DELETE /api/v1/leads/:botId
// @desc    All leads delete karo for a bot
// @access  Private
// ----------------------------------------------------------------
const deleteAllLeads = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const result = await Lead.deleteMany({ botId: bot._id });
    const remaining = await Lead.countDocuments({ botId: bot._id });

    await Bot.findByIdAndUpdate(bot._id, {
      $set: { "stats.totalLeads": remaining },
    });

    return successResponse(res, {
      message: "All leads deleted successfully.",
      data: { deletedCount: result.deletedCount || 0 },
    });
  } catch (error) {
    console.error("Delete all leads error:", error);
    return errorResponse(res, { message: "Failed to delete all leads." });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  deleteAllLeads,
  exportLeads,
  getLeadStats,
};