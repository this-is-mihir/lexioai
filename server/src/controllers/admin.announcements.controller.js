const Announcement = require("../models/Announcement.model");
const EmailTemplate = require("../models/EmailTemplate.model");
const User = require("../models/User.model");
const AuditLog = require("../models/AuditLog.model");
const { sendEmail } = require("../utils/email.utils");
const { successResponse, errorResponse } = require("../utils/response.utils");

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
function buildUserFilter(targetAudience) {
  switch (targetAudience) {
    case "all":
      return {};
    case "free":
      return { plan: "free" };
    case "paid":
      return { plan: { $in: ["starter", "pro", "business"] } };
    case "starter":
      return { plan: "starter" };
    case "pro":
      return { plan: "pro" };
    case "business":
      return { plan: "business" };
    default:
      return {};
  }
}

function renderVars(str, vars) {
  if (!str) return "";
  const defaults = {
    userName: (vars && vars.userName) || "User",
    planName: (vars && vars.planName) || "Free",
    message: (vars && vars.message) || "",
    appName: (vars && vars.appName) || "Lexioai",
    supportEmail: (vars && vars.supportEmail) || "support@lexioai.com",
    loginUrl: (vars && vars.loginUrl) || "https://app.lexioai.com",
  };
  let out = str;
  Object.entries(defaults).forEach(function (entry) {
    out = out.replace(new RegExp("{{" + entry[0] + "}}", "g"), entry[1]);
  });
  return out;
}

async function deliverAnnouncement(announcement, users, isResend) {
  var type = announcement.type;
  var emailSubject = announcement.emailSubject;
  var message = announcement.message;
  var emailTemplateId = announcement.emailTemplateId;
  var title = announcement.title;

  var template = null;
  if (emailTemplateId && (type === "email" || type === "both")) {
    template = await EmailTemplate.findById(emailTemplateId);
  }

  var sentCount = isResend ? announcement.sentCount : 0;
  var failedCount = isResend ? announcement.failedCount : 0;
  var failedList = isResend ? announcement.failedRecipients.slice() : [];

  announcement.status = "sending";
  await announcement.save();

  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    var vars = {
      userName: user.name || user.firstName || "User",
      planName: user.plan || "free",
      message: message,
      appName: "Lexioai",
      supportEmail: "support@lexioai.com",
      loginUrl: process.env.CLIENT_URL || "https://app.lexioai.com",
    };

    if (type === "email" || type === "both") {
      try {
        var subject = renderVars(emailSubject || title, vars);
        var html = template
          ? renderVars(template.htmlBody, vars)
          : "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px'>" +
            "<h2 style='color:#6366f1'>" +
            renderVars(title, vars) +
            "</h2>" +
            "<p style='color:#374151;line-height:1.7'>" +
            renderVars(message, vars) +
            "</p>" +
            "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'/>" +
            "<p style='color:#9ca3af;font-size:12px'>— " +
            vars.appName +
            " Team | " +
            "<a href='" +
            vars.loginUrl +
            "' style='color:#6366f1'>Open App</a> | " +
            "<a href='mailto:" +
            vars.supportEmail +
            "' style='color:#6366f1'>Support</a></p></div>";

        await sendEmail({ to: user.email, subject: subject, html: html });
        sentCount++;
      } catch (err) {
        failedCount++;
        var alreadyFailed = failedList.find(function (f) {
          return f.userId && f.userId.toString() === user._id.toString();
        });
        if (!alreadyFailed) {
          failedList.push({
            userId: user._id,
            email: user.email,
            reason: err.message,
          });
        }
      }
    }

    if (type === "inapp" || type === "both") {
      sentCount++;
    }
  }

  if (failedCount === 0) {
    announcement.status = "sent";
  } else if (sentCount === 0) {
    announcement.status = "failed";
  } else {
    announcement.status = "partial";
  }

  announcement.sentCount = sentCount;
  announcement.failedCount = failedCount;
  announcement.failedRecipients = failedList;
  announcement.sentAt = new Date();
  await announcement.save();
}

// ----------------------------------------------------------------
// GET ALL  —  GET /admin/announcements
// ----------------------------------------------------------------
const getAllAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate("createdBy", "name email")
        .populate("emailTemplateId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ----------------------------------------------------------------
// GET STATS  —  GET /admin/announcements/stats
// ----------------------------------------------------------------
const getAnnouncementStats = async (req, res) => {
  try {
    const [total, scheduled, failed] = await Promise.all([
      Announcement.countDocuments(),
      Announcement.countDocuments({ status: "scheduled" }),
      Announcement.countDocuments({ status: { $in: ["failed", "partial"] } }),
    ]);

    const sentStats = await Announcement.aggregate([
      { $match: { status: { $in: ["sent", "partial"] } } },
      {
        $group: {
          _id: null,
          totalRecipients: { $sum: "$totalRecipients" },
          totalSent: { $sum: "$sentCount" },
        },
      },
    ]);

    return res.json({
  success: true,
  data: {
    total,
    scheduled,
    failed,
    totalRecipients: (sentStats[0] && sentStats[0].totalRecipients) || 0,
    totalSent: (sentStats[0] && sentStats[0].totalSent) || 0,
  },
});
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ----------------------------------------------------------------
// CREATE  —  POST /admin/announcements
// ----------------------------------------------------------------
const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      emailSubject,
      message,
      type,
      targetAudience,
      priority,
      sendNow,
      scheduledAt,
      emailTemplateId,
    } = req.body;

    if (!title || !message) {
      return errorResponse(res, "Title and message are required", 400);
    }

    const userFilter = buildUserFilter(targetAudience || "all");
    const users = await User.find({
      ...userFilter,
      isActive: true,
      isBanned: false,
    }).select("_id name firstName email plan");

    const announcement = await Announcement.create({
      title,
      emailSubject: emailSubject || title,
      message,
      type: type || "both",
      targetAudience: targetAudience || "all",
      priority: priority || "medium",
      emailTemplateId: emailTemplateId || null,
      sendNow: sendNow !== false,
      scheduledAt:
        sendNow === false && scheduledAt ? new Date(scheduledAt) : null,
      status: sendNow === false ? "scheduled" : "draft",
      totalRecipients: users.length,
      createdBy: req.admin._id,
    });

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "CREATE",
      module: "announcements",
      description: `Created announcement "${title}" for ${targetAudience} (${users.length} recipients)`,
      targetType: "announcement",
      targetId: announcement._id,
      targetName: title,
    });

    if (sendNow !== false) {
      deliverAnnouncement(announcement, users).catch(console.error);
    }

    return successResponse(
      res,
      sendNow !== false
        ? "Announcement is being sent!"
        : "Announcement scheduled!",
      { announcement },
      201,
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ----------------------------------------------------------------
// RESEND  —  POST /admin/announcements/:id/resend
// ----------------------------------------------------------------
const resendAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return errorResponse(res, "Announcement not found", 404);

    if (!["failed", "partial"].includes(announcement.status)) {
      return errorResponse(
        res,
        "Only failed or partial announcements can be resent",
        400,
      );
    }

    let users = [];
    if (
      announcement.failedRecipients &&
      announcement.failedRecipients.length > 0
    ) {
      const failedUserIds = announcement.failedRecipients
        .map((f) => f.userId)
        .filter(Boolean);
      users = await User.find({
        _id: { $in: failedUserIds },
        isActive: true,
        isBanned: false,
      }).select("_id name firstName email plan");
    }

    if (users.length === 0)
      return errorResponse(res, "No failed recipients to resend to", 400);

    announcement.failedRecipients = [];
    await announcement.save();
    deliverAnnouncement(announcement, users, true).catch(console.error);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "RESEND",
      module: "announcements",
      description: `Resent "${announcement.title}" to ${users.length} failed recipients`,
      targetType: "announcement",
      targetId: announcement._id,
      targetName: announcement.title,
    });

    return successResponse(
      res,
      `Resending to ${users.length} failed recipients...`,
      { announcement },
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ----------------------------------------------------------------
// DELETE  —  DELETE /admin/announcements/:announcementId
// ----------------------------------------------------------------
const deleteAnnouncement = async (req, res) => {
  try {
    const id = req.params.announcementId || req.params.id;
    const announcement = await Announcement.findById(id);
    if (!announcement) return errorResponse(res, "Announcement not found", 404);

    await announcement.deleteOne();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "DELETE",
      module: "announcements",
      description: `Deleted announcement "${announcement.title}"`,
      targetType: "announcement",
      targetId: announcement._id,
      targetName: announcement.title,
    });

    return successResponse(res, "Announcement deleted");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = {
  getAllAnnouncements,
  getAnnouncementStats,
  createAnnouncement,
  resendAnnouncement,
  deleteAnnouncement,
};
