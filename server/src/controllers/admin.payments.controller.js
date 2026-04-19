const AuditLog = require("../models/AuditLog.model");
const { successResponse, errorResponse } = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/audit
// ----------------------------------------------------------------
const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.adminId) filter.adminId = req.query.adminId;
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = req.query.action;

    // Date range filter
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { logs, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return errorResponse(res, { message: "Failed to fetch audit logs." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/audit
// @desc    SuperAdmin only — Date range se delete karo
// ----------------------------------------------------------------
const deleteAuditLogs = async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return errorResponse(res, {
        message: "Please provide both from and to dates.",
        statusCode: 400,
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate > toDate) {
      return errorResponse(res, {
        message: "From date cannot be after to date.",
        statusCode: 400,
      });
    }

    const result = await AuditLog.deleteMany({
      createdAt: { $gte: fromDate, $lte: toDate },
    });

    // Log this deletion (after deletion, so won't be deleted)
    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "AUDIT_LOGS_DELETED",
      module: "audit",
      description: `${result.deletedCount} audit logs deleted from ${from} to ${to}`,
    });

    return successResponse(res, {
      message: `${result.deletedCount} audit logs deleted successfully.`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Delete audit logs error:", error);
    return errorResponse(res, { message: "Failed to delete audit logs." });
  }
};

module.exports = { getAuditLogs, deleteAuditLogs };