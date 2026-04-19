const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    // ================================================================
    // RECIPIENT
    // ================================================================
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: [true, "Admin ID is required"],
      index: true, // Fast lookup by admin
    },

    // ================================================================
    // NOTIFICATION TYPE & CATEGORY
    // ================================================================
    type: {
      type: String,
      enum: [
        // Admin Management Actions
        "admin_invited",          // When admin is first invited
        "role_assigned",          // When role is assigned/updated
        "permissions_updated",    // When permissions change
        "account_status_changed", // When banned/unbanned
        "password_reset_required",// Password reset needed
        
        // Role Management
        "new_role_created",       // New custom role created
        "role_deleted",           // Role deleted
        
        // Security Alerts
        "security_alert",         // Suspicious activity
        "system_alert",           // General system alert
        "failed_login_attempts",  // Too many failed logins
        "2fa_disabled",           // 2FA disabled
        
        // General/System Notifications
        "general_notification",   // General notification
        "system_maintenance",     // Maintenance window
        "api_alert",              // API issues
        "new_feature",            // New feature announcement
        "platform_update",        // Platform update
      ],
      required: true,
      index: true, // Filter by type
    },

    category: {
      type: String,
      enum: ["admin_action", "security", "system"],
      required: true,
      index: true, // Filter by category
    },

    // ================================================================
    // NOTIFICATION CONTENT
    // ================================================================
    title: {
      type: String,
      required: [true, "Notification title is required"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },

    // ================================================================
    // ACTION & METADATA
    // ================================================================
    actionUrl: {
      type: String,
      default: null,
      // When clicked, navigate to this URL
      // e.g., "/admin/admins", "/admin/roles", "/admin/settings"
    },

    actionLabel: {
      type: String,
      default: null,
      // Button text if needed
      // e.g., "View Admin", "Edit Role", "Review Alert"
    },

    // Additional data dependent on notification type
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Examples:
      // { roleName: "Support Team", permissions: {...} }
      // { fromAdminName: "Ravi Kumar", fromAdminEmail: "ravi@..." }
      // { reason: "Multiple failed login attempts" }
    },

    // ================================================================
    // READ STATUS
    // ================================================================
    isRead: {
      type: Boolean,
      default: false,
      index: true, // For "unread count" query optimization
    },

    readAt: {
      type: Date,
      default: null,
    },

    // ================================================================
    // IMPORTANCE LEVEL
    // ================================================================
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // ================================================================
    // DELIVERY STATUS (if we add email/push later)
    // ================================================================
    deliveryStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
        failureReason: { type: String, default: null },
      },
      inApp: {
        delivered: { type: Boolean, default: true },
        deliveredAt: { type: Date, default: Date.now },
      },
    },

    // ================================================================
    // ARCHIVAL
    // ================================================================
    isArchived: {
      type: Boolean,
      default: false,
      // Soft delete - for GDPR compliance, don't hard delete
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    // ================================================================
    // SOURCE - Who/What created this notification
    // ================================================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
      // If SuperAdmin created it (e.g., system alert)
      // If null, it's auto-generated by system
    },

    // ================================================================
    // TIMESTAMPS
    // ================================================================
  },
  {
    timestamps: true,
    // createdAt: auto - when notification was created
    // updatedAt: auto - when notification was updated
  }
);

// ================================================================
// INDEXES - For query optimization (PRODUCTION CRITICAL)
// ================================================================

// Find all unread notifications for an admin (MOST COMMON QUERY)
adminNotificationSchema.index({ adminId: 1, isRead: 1, createdAt: -1 });

// Unread count badge (fast lookup)
adminNotificationSchema.index({ adminId: 1, isRead: 1 });

// Filter by type
adminNotificationSchema.index({ adminId: 1, type: 1, createdAt: -1 });

// Filter by category
adminNotificationSchema.index({ adminId: 1, category: 1, createdAt: -1 });

// Old notifications cleanup (TTL in days - optional, can archive instead)
adminNotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days auto-delete (optional)
);

// ================================================================
// VIRTUALS
// ================================================================

// Time-relative display (e.g., "2 minutes ago")
adminNotificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// ================================================================
// METHODS
// ================================================================

// Mark notification as read
adminNotificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Mark notification as unread
adminNotificationSchema.methods.markAsUnread = async function () {
  if (this.isRead) {
    this.isRead = false;
    this.readAt = null;
    await this.save();
  }
  return this;
};

// Archive notification (soft delete)
adminNotificationSchema.methods.archive = async function () {
  if (!this.isArchived) {
    this.isArchived = true;
    this.archivedAt = new Date();
    await this.save();
  }
  return this;
};

// ================================================================
// STATICS
// ================================================================

// Get unread count for admin
adminNotificationSchema.statics.getUnreadCount = async function (adminId) {
  const count = await this.countDocuments({
    adminId,
    isRead: false,
    isArchived: false,
  });
  return count;
};

// Get notifications with pagination
adminNotificationSchema.statics.getPaginated = async function (
  adminId,
  page = 1,
  limit = 20,
  filters = {}
) {
  const skip = (page - 1) * limit;

  // Build filter query
  const query = {
    adminId,
    isArchived: false,
    ...filters,
  };

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // lean() for read-only, better performance
    this.countDocuments(query),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

// Mark all unread as read
adminNotificationSchema.statics.markAllAsRead = async function (adminId) {
  const result = await this.updateMany(
    { adminId, isRead: false, isArchived: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};

// Create notification (with validation)
adminNotificationSchema.statics.createNotification = async function (
  adminId,
  { type, category, title, message, actionUrl, actionLabel, metadata, priority, createdBy }
) {
  // Validation
  if (!adminId) throw new Error("Admin ID is required");
  if (!type || !category || !title || !message) {
    throw new Error("type, category, title, and message are required");
  }

  return await this.create({
    adminId,
    type,
    category,
    title,
    message,
    actionUrl: actionUrl || null,
    actionLabel: actionLabel || null,
    metadata: metadata || {},
    priority: priority || "medium",
    createdBy: createdBy || null,
  });
};

// ================================================================
// EXPORT
// ================================================================

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
