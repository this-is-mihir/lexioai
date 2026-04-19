const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/user.notification.controller");
const { protect, requireEmailVerified } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect, requireEmailVerified);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/read-all", markAllAsRead);
router.post("/delete-all", deleteAllNotifications);
router.post("/:id/read", markAsRead);
router.post("/:id/unread", markAsUnread);
router.post("/:id/delete", deleteNotification);

module.exports = router;
