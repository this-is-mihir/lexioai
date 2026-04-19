const Lead = require("../models/Lead.model");
const Bot = require("../models/Bot.model");
const AuditLog = require("../models/AuditLog.model");
const { successResponse, errorResponse, notFoundResponse } = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route  GET /api/v1/admin/leads
// ----------------------------------------------------------------
const getAllLeads = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const skip   = (page - 1) * limit;
    const search = req.query.search;
    const status = req.query.status;
    const botId  = req.query.botId;

    const filter = {};
    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: "i" } },
        { email:   { $regex: search, $options: "i" } },
        { phone:   { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (botId)  filter.botId  = botId;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("botId",   "name websiteUrl")
        .populate("ownerId", "name email"),
      Lead.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { leads, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get all leads error:", error);
    return errorResponse(res, { message: "Failed to fetch leads." });
  }
};

// ----------------------------------------------------------------
// @route  DELETE /api/v1/admin/leads/:leadId
// ----------------------------------------------------------------
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return notFoundResponse(res, "Lead not found");

    await Lead.findByIdAndDelete(lead._id);

    await AuditLog.log({
      adminId:   req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP:   getClientIP(req),
      action:    "LEAD_DELETED",
      module:    "leads",
      description: `Lead ${lead.email || lead.name || lead._id} deleted`,
      targetType: "lead",
      targetId:   lead._id,
      targetName: lead.email || lead.name || String(lead._id),
    });

    return successResponse(res, { message: "Lead deleted." });
  } catch (error) {
    console.error("Delete lead error:", error);
    return errorResponse(res, { message: "Failed to delete lead." });
  }
};

// ----------------------------------------------------------------
// @route  GET /api/v1/admin/leads/export
// ----------------------------------------------------------------
const exportLeads = async (req, res) => {
  try {
    const botId  = req.query.botId;
    const filter = botId ? { botId } : {};

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .populate("botId",   "name")
      .populate("ownerId", "name email");

    const headers = ["Name","Email","Phone","Company","Message","Bot","Status","Page URL","Date"];
    const rows = leads.map(l => [
      l.name    || "",
      l.email   || "",
      l.phone   || "",
      l.company || "",
      l.message || "",
      l.botId?.name || "",
      l.status  || "",
      l.pageUrl || "",
      new Date(l.createdAt).toLocaleDateString("en-IN"),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="leads_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error("Export leads error:", error);
    return errorResponse(res, { message: "Failed to export leads." });
  }
};

module.exports = { getAllLeads, deleteLead, exportLeads };