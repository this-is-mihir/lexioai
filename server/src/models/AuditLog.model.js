const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // WHO DID IT
    // ----------------------------------------------------------------
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },

    adminName: {
      type: String,
      required: true,
    },

    adminRole: {
      type: String,
      enum: ["superadmin", "admin", "support"],
      required: true,
    },

    adminIP: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // WHAT WAS DONE
    // ----------------------------------------------------------------
    action: {
      type: String,
      required: true,
      // e.g. "USER_BANNED", "PLAN_UPDATED", "BOT_DELETED"
    },

    module: {
      type: String,
      required: true,
      enum: [
        "auth", "users", "bots", "conversations",
        "payments", "plans", "coupons", "announcements",
        "tickets", "settings", "audit","stats"
      ],
    },

    description: {
      type: String,
      required: true,
      // Human readable description
    },

    // ----------------------------------------------------------------
    // WHO WAS AFFECTED
    // ----------------------------------------------------------------
    targetType: {
      type: String,
      enum: ["user", "bot", "payment", "plan", "coupon", "announcement", "ticket", "setting", "admin"],
      default: null,
    },

    targetId: {
      type: String,
      default: null,
    },

    targetName: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // BEFORE & AFTER VALUES
    // ----------------------------------------------------------------
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ----------------------------------------------------------------
    // METADATA
    // ----------------------------------------------------------------
    userAgent: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

// ----------------------------------------------------------------
// STATIC — Log create karo easily
// ----------------------------------------------------------------
auditLogSchema.statics.log = async function ({
  adminId,
  adminName,
  adminRole,
  adminIP,
  action,
  module,
  description,
  targetType = null,
  targetId = null,
  targetName = null,
  previousValue = null,
  newValue = null,
  userAgent = null,
  status = "success",
}) {
  try {
    await this.create({
      adminId,
      adminName,
      adminRole,
      adminIP,
      action,
      module,
      description,
      targetType,
      targetId: targetId?.toString(),
      targetName,
      previousValue,
      newValue,
      userAgent,
      status,
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;