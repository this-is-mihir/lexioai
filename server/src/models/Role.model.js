const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // ----------------------------------------------------------------
    // PERMISSIONS — Same structure as AdminUser permissions
    // ----------------------------------------------------------------
    permissions: {
      users: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        ban: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        impersonate: { type: Boolean, default: false },
        exportCsv: { type: Boolean, default: false },
      },

      bots: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      conversations: {
        view: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        export: { type: Boolean, default: false },
      },

      payments: {
        view: { type: Boolean, default: false },
        refund: { type: Boolean, default: false },
        manualActivate: { type: Boolean, default: false },
      },

      plans: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      coupons: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      announcements: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      tickets: {
        view: { type: Boolean, default: false },
        reply: { type: Boolean, default: false },
        assign: { type: Boolean, default: false },
        close: { type: Boolean, default: false },
      },

      audit: {
        view: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      settings: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },

      stats: {
        view: { type: Boolean, default: true },
      },

      // Admin Management (only SuperAdmin)
      admins: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        ban: { type: Boolean, default: false },
        forcePasswordReset: { type: Boolean, default: false },
      },
    },

    // ----------------------------------------------------------------
    // METADATA
    // ----------------------------------------------------------------
    isDefault: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },

    adminsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
// Note: name field already has unique index from 'unique: true'
roleSchema.index({ createdBy: 1 });

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------
roleSchema.methods.toJSON = function () {
  const role = this.toObject();
  return role;
};

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
