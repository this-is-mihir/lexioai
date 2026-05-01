const SupportTicket = require("../models/SupportTicket.model");
const AuditLog = require("../models/AuditLog.model");
const {
  successResponse, errorResponse,
  validationErrorResponse, notFoundResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/tickets
// ----------------------------------------------------------------
const getAllTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-replies")
        .populate("assignedTo", "name email"),
      SupportTicket.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { tickets, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch tickets." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/tickets/:ticketId
// ----------------------------------------------------------------
const getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      $or: [
        { _id: req.params.ticketId },
        { ticketId: req.params.ticketId },
      ],
    }).populate("assignedTo", "name email avatar");

    if (!ticket) return notFoundResponse(res, "Ticket not found");

    // Mark admin messages as read
    ticket.unreadByAdmin = 0;
    await ticket.save();

    return successResponse(res, { data: { ticket } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch ticket." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/tickets/:ticketId/reply
// ----------------------------------------------------------------
const replyToTicket = async (req, res) => {
  try {
    const { message, screenshotUrl } = req.body;

    if (!message?.trim()) {
      return validationErrorResponse(res, [
        { field: "message", message: "Reply message is required" },
      ]);
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return notFoundResponse(res, "Ticket not found");

    if (ticket.status === "closed") {
      return errorResponse(res, {
        message: "Cannot reply to a closed ticket.",
        statusCode: 400,
      });
    }

    const replyObj = {
      message: message.trim(),
      senderType: "admin",
      senderId: req.admin._id,
      senderName: req.admin.name,
      senderAvatar: req.admin.avatar,
    };

    // Add screenshot if provided
    if (screenshotUrl) {
      replyObj.screenshotUrl = screenshotUrl;
    }

    ticket.replies.push(replyObj);

    ticket.lastReplyAt = new Date();
    ticket.lastReplyBy = "admin";
    ticket.unreadByUser += 1;

    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Email notification to user
    try {
      const { sendEmail } = require("../utils/email.utils");
      await sendEmail({
        to: ticket.userEmail,
        subject: `Re: ${ticket.subject} [${ticket.ticketId}]`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7F77DD;">Reply to your support ticket</h2>
            <p>Hi ${ticket.userName},</p>
            <p>We've replied to your ticket <strong>${ticket.ticketId}</strong>:</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <a href="${process.env.CLIENT_URL}/support/tickets/${ticket._id}" 
               style="background: #7F77DD; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
              View Ticket
            </a>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Ticket reply email failed:", emailErr.message);
    }

    return successResponse(res, {
      message: "Reply sent successfully!",
      data: { ticket },
    });
  } catch (error) {
    console.error("Reply to ticket error:", error);
    return errorResponse(res, { message: "Failed to send reply." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/tickets/:ticketId/status
// ----------------------------------------------------------------
const updateTicketStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ["open", "in_progress", "waiting_user", "resolved", "closed"];

    if (!status || !validStatuses.includes(status)) {
      return validationErrorResponse(res, [
        { field: "status", message: "Invalid status" },
      ]);
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return notFoundResponse(res, "Ticket not found");

    ticket.status = status;
    if (status === "resolved" || status === "closed") {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = req.admin._id;
      ticket.resolutionNote = resolutionNote || null;
    }

    await ticket.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "TICKET_STATUS_UPDATED", module: "tickets",
      description: `Ticket ${ticket.ticketId} status changed to ${status}`,
      targetType: "ticket", targetId: ticket._id, targetName: ticket.ticketId,
    });

    return successResponse(res, {
      message: "Ticket status updated!",
      data: { status: ticket.status },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update ticket status." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/tickets/:ticketId/assign
// ----------------------------------------------------------------
const assignTicket = async (req, res) => {
  try {
    const { adminId } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return notFoundResponse(res, "Ticket not found");

    const AdminUser = require("../models/AdminUser.model");
    const admin = await AdminUser.findById(adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    ticket.assignedTo = adminId;
    ticket.assignedToName = admin.name;
    ticket.assignedAt = new Date();
    ticket.status = "in_progress";
    await ticket.save();

    return successResponse(res, {
      message: `Ticket assigned to ${admin.name}!`,
      data: { assignedTo: admin.name },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to assign ticket." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/tickets/:ticketId
// ----------------------------------------------------------------
const deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.ticketId);
    if (!ticket) return notFoundResponse(res, "Ticket not found");

    // Log audit
    const AuditLog = require("../models/AuditLog.model");
    await AuditLog.create({
      adminId: req.admin._id,
      action: "DELETE_TICKET",
      targetId: ticket._id,
      targetType: "SupportTicket",
      changes: { ticketId: ticket.ticketId, subject: ticket.subject },
      clientIp: getClientIP(req),
    });

    return successResponse(res, {
      message: "Ticket deleted successfully",
      statusCode: 200,
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to delete ticket." });
  }
};

module.exports = { getAllTickets, getTicket, replyToTicket, updateTicketStatus, assignTicket, deleteTicket };