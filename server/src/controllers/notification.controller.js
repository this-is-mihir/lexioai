const AdminNotification = require("../models/AdminNotification.model");
const AdminUser = require("../models/AdminUser.model");
const AdminActivityLog = require("../models/AdminActivityLog.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ================================================================
// @route   GET /api/v1/admin/notifications
// @desc    Get all notifications for current admin (paginated)
// @access  Private (Admin)
// ================================================================
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, isRead } = req.query;
    const adminId = req.admin._id;

    // Validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Cap at 100

    // Build filters
    const filters = {};

    if (type && typeof type === "string") {
      filters.type = type;
    }

    if (category && typeof category === "string") {
      filters.category = category;
    }

    if (isRead !== undefined) {
      filters.isRead = isRead === "true" || isRead === true;
    }

    // Fetch notifications with pagination
    const result = await AdminNotification.getPaginated(adminId, pageNum, limitNum, filters);

    return successResponse(res, {
      message: "Notifications fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return errorResponse(res, {
      message: "Failed to fetch notifications",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   GET /api/v1/admin/notifications/unread-count
// @desc    Get count of unread notifications (for badge)
// @access  Private (Admin)
// ================================================================
const getUnreadCount = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Fast query with index
    const unreadCount = await AdminNotification.getUnreadCount(adminId);

    return successResponse(res, {
      message: "Unread count fetched",
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return errorResponse(res, {
      message: "Failed to fetch unread count",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   POST /api/v1/admin/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private (Admin)
// ================================================================
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;

    // Validation
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification ID" },
      ]);
    }

    // Find notification
    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return notFoundResponse(res, "Notification not found");
    }

    // Security: Ensure admin can only mark their own notifications
    if (notification.adminId.toString() !== adminId.toString()) {
      return forbiddenResponse(res, "You cannot access this notification");
    }

    // Mark as read
    await notification.markAsRead();

    return successResponse(res, {
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return errorResponse(res, {
      message: "Failed to mark notification as read",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   POST /api/v1/admin/notifications/read-all
// @desc    Mark ALL unread notifications as read
// @access  Private (Admin)
// ================================================================
const markAllAsRead = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Mark all unread as read
    const result = await AdminNotification.markAllAsRead(adminId);

    return successResponse(res, {
      message: "All notifications marked as read",
      data: { marked: result.modifiedCount },
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return errorResponse(res, {
      message: "Failed to mark all notifications as read",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   POST /api/v1/admin/notifications/:id/unread
// @desc    Mark notification as unread
// @access  Private (Admin)
// ================================================================
const markAsUnread = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;

    // Validation
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification ID" },
      ]);
    }

    // Find notification
    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return notFoundResponse(res, "Notification not found");
    }

    // Security: Ensure admin can only modify their own notifications
    if (notification.adminId.toString() !== adminId.toString()) {
      return forbiddenResponse(res, "You cannot access this notification");
    }

    // Mark as unread
    await notification.markAsUnread();

    return successResponse(res, {
      message: "Notification marked as unread",
      data: { notification },
    });
  } catch (error) {
    console.error("Mark as unread error:", error);
    return errorResponse(res, {
      message: "Failed to mark notification as unread",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   DELETE /api/v1/admin/notifications/:id
// @desc    Archive (soft delete) a notification
// @access  Private (Admin)
// ================================================================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;

    // Validation
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification ID" },
      ]);
    }

    // Find notification
    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return notFoundResponse(res, "Notification not found");
    }

    // Security: Admin can only delete their own notifications (or SuperAdmin can delete any)
    if (notification.adminId.toString() !== adminId.toString() && req.admin.role !== "superadmin") {
      return forbiddenResponse(res, "You can only delete your own notifications");
    }

    // Archive (soft delete)
    await notification.archive();

    return successResponse(res, {
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return errorResponse(res, {
      message: "Failed to delete notification",
      statusCode: 500,
    });
  }
};

// ================================================================
// @route   DELETE /api/v1/admin/notifications/batch-delete
// @desc    Archive multiple notifications
// @access  Private (Admin)
// ================================================================
const batchDeleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    const adminId = req.admin._id;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return validationErrorResponse(res, [
        { field: "ids", message: "Array of notification IDs is required" },
      ]);
    }

    if (ids.length > 100) {
      return validationErrorResponse(res, [
        { field: "ids", message: "Cannot delete more than 100 notifications at once" },
      ]);
    }

    // Find all notifications to delete
    const notifications = await AdminNotification.find({
      _id: { $in: ids },
    });

    if (notifications.length !== ids.length) {
      return forbiddenResponse(res, "Some notifications were not found");
    }

    // Verify admin owns all notifications (or is SuperAdmin)
    if (req.admin.role !== "superadmin") {
      const ownedByAdmin = notifications.every(n => n.adminId.toString() === adminId.toString());
      if (!ownedByAdmin) {
        return forbiddenResponse(res, "You can only delete your own notifications");
      }
    }

    // Archive all
    const result = await AdminNotification.updateMany(
      { _id: { $in: ids } },
      { isArchived: true, archivedAt: new Date() }
    );

    return successResponse(res, {
      message: "Notifications deleted successfully",
      data: { deleted: result.modifiedCount },
    });
  } catch (error) {
    console.error("Batch delete notifications error:", error);
    return errorResponse(res, {
      message: "Failed to delete notifications",
      statusCode: 500,
    });
  }
};

// ================================================================
// INTERNAL FUNCTIONS — For system use (not exposed as API)
// ================================================================

/**
 * Create a notification for an admin
 * Used internally when system events occur
 */
const createAdminNotification = async ({
  adminId,
  type,
  category,
  title,
  message,
  actionUrl = null,
  actionLabel = null,
  metadata = {},
  priority = "medium",
  createdBy = null,
}) => {
  try {
    // Security check: Admin must exist
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }

    // Create notification
    const notification = await AdminNotification.createNotification(adminId, {
      type,
      category,
      title,
      message,
      actionUrl,
      actionLabel,
      metadata,
      priority,
      createdBy,
    });

    return notification;
  } catch (error) {
    console.error("Create admin notification error:", error);
    throw error;
  }
};

/**
 * Create notifications for multiple admins
 * Used for system-wide notifications
 */
const createAdminNotificationBatch = async (adminIds, notificationData) => {
  try {
    if (!Array.isArray(adminIds) || adminIds.length === 0) {
      throw new Error("Admin IDs array is required");
    }

    // Create notifications for all admins in parallel
    const notifications = await Promise.all(
      adminIds.map((adminId) =>
        AdminNotification.createNotification(adminId, notificationData)
      )
    );

    return { created: notifications.length, notifications };
  } catch (error) {
    console.error("Create admin notification batch error:", error);
    throw error;
  }
};

// ================================================================
// @route   POST /api/v1/admin/notifications/send
// @desc    SuperAdmin can send custom notifications to staff
// @access  Private (SuperAdmin only)
// ================================================================
const sendNotification = async (req, res) => {
  try {
    // Check if SuperAdmin
    if (req.admin.role !== "superadmin") {
      return forbiddenResponse(res, "Only SuperAdmin can send notifications");
    }

    const { recipientAdminIds, title, message, type = "general_notification", priority = "medium", sendEmail = false } = req.body;

    // Validation
    if (!recipientAdminIds || !Array.isArray(recipientAdminIds) || recipientAdminIds.length === 0) {
      return validationErrorResponse(res, "recipientAdminIds array is required");
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return validationErrorResponse(res, "title is required");
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return validationErrorResponse(res, "message is required");
    }

    // Validate all IDs are MongoDB ObjectIds
    const ObjectId = require("mongoose").Types.ObjectId;
    for (const id of recipientAdminIds) {
      if (!ObjectId.isValid(id)) {
        return validationErrorResponse(res, `Invalid admin ID: ${id}`);
      }
    }

    // Create notification for each admin
    const notificationData = {
      type,
      category: "admin_action",
      title: title.trim(),
      message: message.trim(),
      priority: ["low", "medium", "high", "critical"].includes(priority) ? priority : "medium",
      metadata: {
        sentBy: req.admin.name,
        sentAt: new Date(),
        sendEmail,
      },
      deliveryStatus: "sent",
      createdBy: req.admin._id,
    };

    const result = await createAdminNotificationBatch(recipientAdminIds, notificationData);

    // TODO: Send email if sendEmail is true
    // if (sendEmail) {
    //   await sendEmailNotifications(recipientAdminIds, title, message);
    // }

    return successResponse(res, {
      message: `Notification sent to ${result.created} admin(s)`,
      data: { count: result.created },
    }, 201);
  } catch (error) {
    console.error("Send notification error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// ================================================================
// EXPORT
// ================================================================

module.exports = {
  // Public endpoints
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  batchDeleteNotifications,
  sendNotification,

  // Internal functions
  createAdminNotification,
  createAdminNotificationBatch,
};
