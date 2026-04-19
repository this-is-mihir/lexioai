const mongoose = require("mongoose");

const adminActivityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },

    adminName: {
      type: String,
      required: true,
    },

    adminEmail: {
      type: String,
      required: true,
    },

    // Action type: "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "BAN", "UNBAN", "FORCE_RESET", "2FA_ENABLE", "2FA_DISABLE", etc.
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "FORCE_LOGOUT",
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",
        "BAN_USER",
        "UNBAN_USER",
        "CREATE_ADMIN",
        "UPDATE_ADMIN",
        "DELETE_ADMIN",
        "BAN_ADMIN",
        "UNBAN_ADMIN",
        "FORCE_PASSWORD_RESET",
        "2FA_ENABLE",
        "2FA_DISABLE",
        "PERMISSION_CHANGE",
        "ROLE_CREATE",
        "ROLE_UPDATE",
        "ROLE_DELETE",
        "ANNOUNCEMENT_CREATE",
        "ANNOUNCEMENT_DELETE",
        "ANNOUNCEMENT_SEND",
        "COUPON_CREATE",
        "COUPON_DELETE",
        "COUPON_EXPORT",
        "SETTINGS_UPDATE",
        "AUDIT_LOG_VIEW",
        "OTHER",
      ],
      required: true,
    },

    // Resource type: "USER", "ADMIN", "BOT", "ANNOUNCEMENT", etc.
    resourceType: {
      type: String,
      default: null,
    },

    // Resource ID
    resourceId: {
      type: String,
      default: null,
    },

    // Details of what changed
    details: {
      type: Object,
      default: {},
    },

    // IP address from which action was performed
    ipAddress: {
      type: String,
      default: null,
    },

    // User agent (browser info)
    userAgent: {
      type: String,
      default: null,
    },

    // Status: "SUCCESS", "FAILED", "PENDING"
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING"],
      default: "SUCCESS",
    },

    // Error message if status is FAILED
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    expireAfterSeconds: 7776000, // 90 days TTL
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
adminActivityLogSchema.index({ adminId: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1 });
adminActivityLogSchema.index({ createdAt: -1 });
adminActivityLogSchema.index({ ipAddress: 1 });

// ----------------------------------------------------------------
// STATIC METHOD — Log activity
// ----------------------------------------------------------------
adminActivityLogSchema.statics.log = async function ({
  adminId,
  adminName,
  adminEmail,
  action,
  resourceType = null,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  status = "SUCCESS",
  errorMessage = null,
}) {
  try {
    await this.create({
      adminId,
      adminName,
      adminEmail,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    });
  } catch (err) {
    console.error("Error logging admin activity:", err);
  }
};

const AdminActivityLog = mongoose.model("AdminActivityLog", adminActivityLogSchema);

module.exports = AdminActivityLog;
