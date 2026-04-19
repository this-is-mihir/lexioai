const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  batchDeleteNotifications,
  sendNotification,
} = require("../controllers/notification.controller");
const { protectAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

// ================================================================
// MIDDLEWARE — All notification routes require admin authentication
// ================================================================
router.use(protectAdmin);

// ================================================================
// GET ENDPOINTS
// ================================================================

/**
 * GET /api/v1/admin/notifications
 * Fetch paginated notifications for current admin
 * Query Params: page, limit, type, category, isRead
 */
router.get("/", getNotifications);

/**
 * GET /api/v1/admin/notifications/unread-count
 * Get count of unread notifications (for badge display)
 * Note: This route must be BEFORE /:id routes to avoid conflict
 */
router.get("/unread-count", getUnreadCount);

// ================================================================
// POST ENDPOINTS — Mark as read
// ================================================================

/**
 * POST /api/v1/admin/notifications/:id/read
 * Mark a single notification as read
 */
router.post("/:id/read", markAsRead);

/**
 * POST /api/v1/admin/notifications/:id/unread
 * Mark a single notification as unread
 */
router.post("/:id/unread", markAsUnread);

/**
 * POST /api/v1/admin/notifications/read-all
 * Mark ALL unread notifications as read
 * Note: This route must be BEFORE /:id routes
 */
router.post("/read-all", markAllAsRead);

/**
 * POST /api/v1/admin/notifications/send
 * SuperAdmin sends custom notification to staff
 * Note: This route must be BEFORE /:id routes
 */
router.post("/send", sendNotification);

// ================================================================
// DELETE ENDPOINTS
// ================================================================

/**
 * DELETE /api/v1/admin/notifications/batch-delete
 * Batch delete notifications (max 100)
 * Note: This route must be BEFORE /:id routes
 */
router.delete("/batch-delete", batchDeleteNotifications);

/**
 * DELETE /api/v1/admin/notifications/:id
 * Archive (soft delete) a single notification
 */
router.delete("/:id", deleteNotification);

// ================================================================
// EXPORT
// ================================================================

module.exports = router;
