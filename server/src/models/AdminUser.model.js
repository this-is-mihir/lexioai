const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminUserSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // IDENTITY
    // ----------------------------------------------------------------
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // ROLE
    // ----------------------------------------------------------------
    role: {
      type: String,
      enum: ["superadmin", "admin", "support"],
      default: "support",
    },

    // ----------------------------------------------------------------
    // CUSTOM ROLE — Reference to custom Role model
    // ----------------------------------------------------------------
    customRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    // ----------------------------------------------------------------
    // PERMISSIONS — SuperAdmin sets these for admin/support
    // ----------------------------------------------------------------
    permissions: {
      // User Management
      users: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        ban: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        impersonate: { type: Boolean, default: false },
        exportCsv: { type: Boolean, default: false },
      },

      // Bot Management
      bots: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      // Conversation Management
      conversations: {
        view: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        export: { type: Boolean, default: false },
      },

      // Plan Management
      plans: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      // Coupon Management
      coupons: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      // Announcements
      announcements: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      // Blog Management
      blog: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      // Support Tickets
      tickets: {
        view: { type: Boolean, default: false },
        reply: { type: Boolean, default: false },
        assign: { type: Boolean, default: false },
        close: { type: Boolean, default: false },
      },

      // Audit Logs
      audit: {
        view: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }, // SuperAdmin only
      },

      // Platform Settings
      settings: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },

      // Stats & Analytics
      stats: {
        view: { type: Boolean, default: true },
      },
    },

    // ----------------------------------------------------------------
    // 2FA — Mandatory for SuperAdmin
    // ----------------------------------------------------------------
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },

    backupCodes: {
      type: [String],
      default: [],
      select: false,
    },

    // ----------------------------------------------------------------
    // OTP — Password reset ke liye
    // ----------------------------------------------------------------
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lockedUntil: { type: Date, default: null },
    },

    // ----------------------------------------------------------------
    // EMAIL VERIFICATION — Temporary email for change request
    // ----------------------------------------------------------------
    tempEmail: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // ACCOUNT STATUS
    // ----------------------------------------------------------------
    isActive: {
      type: Boolean,
      default: true,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    bannedReason: {
      type: String,
      default: null,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------------------------
    // SESSIONS
    // ----------------------------------------------------------------
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIP: {
      type: String,
      default: null,
    },

    forcePasswordReset: {
      type: Boolean,
      default: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    // ----------------------------------------------------------------
    // CREATED BY
    // ----------------------------------------------------------------
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------

adminUserSchema.index({ role: 1 });
adminUserSchema.index({ isActive: 1 });

// ----------------------------------------------------------------
// PRE SAVE — Password hash
// ----------------------------------------------------------------
adminUserSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // SuperAdmin ke liye sab permissions true
  if (this.role === "superadmin") {
    this.permissions = getFullPermissions();
  }
});

// ----------------------------------------------------------------
// HELPER — Full permissions for SuperAdmin
// ----------------------------------------------------------------
const getFullPermissions = () => ({
  users: { view: true, edit: true, ban: true, delete: true, impersonate: true, exportCsv: true },
  bots: { view: true, edit: true, delete: true },
  conversations: { view: true, delete: true, export: true },
  plans: { view: true, edit: true, create: true, delete: true },
  coupons: { view: true, create: true, edit: true, delete: true },
  announcements: { view: true, create: true, delete: true },
  blog: { view: true, create: true, edit: true, delete: true },
  tickets: { view: true, reply: true, assign: true, close: true },
  audit: { view: true, delete: true },
  settings: { view: true, edit: true },
  stats: { view: true },
});

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------
adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminUserSchema.methods.hasPermission = function (module, action) {
  if (this.role === "superadmin") return true;
  return this.permissions?.[module]?.[action] === true;
};

adminUserSchema.methods.toJSON = function () {
  const admin = this.toObject();
  delete admin.password;
  delete admin.twoFactorSecret;
  delete admin.backupCodes;
  delete admin.refreshTokens;
  delete admin.otp;
  return admin;
};

const AdminUser = mongoose.model("AdminUser", adminUserSchema);

module.exports = AdminUser;