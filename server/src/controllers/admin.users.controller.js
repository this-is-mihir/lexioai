const User = require("../models/User.model");
const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const Lead = require("../models/Lead.model");
const AuditLog = require("../models/AuditLog.model");
const AdminUser = require("../models/AdminUser.model");
const AdminActivityLog = require("../models/AdminActivityLog.model");
const { sendAdminCredentialsEmail, sendForcedPasswordResetEmail, sendAdminPasswordChangedEmail } = require("../utils/email.utils");
const { createAdminNotification } = require("./notification.controller");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/users
// ----------------------------------------------------------------
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const plan = req.query.plan;
    const status = req.query.status;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) filter.plan = plan;
    if (status === "banned") filter.isBanned = true;
    if (status === "active") filter.isActive = true;
    if (status === "unverified") filter.isEmailVerified = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select("-password -refreshTokens -twoFactorSecret -backupCodes -otp -passwordResetOTP"),
      User.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return errorResponse(res, { message: "Failed to fetch users." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/users/:userId
// ----------------------------------------------------------------
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password -refreshTokens -twoFactorSecret -backupCodes -otp -passwordResetOTP");

    if (!user) return notFoundResponse(res, "User not found");

    // User ke bots
    const bots = await Bot.find({ userId: user._id })
      .select("name isLive trainingStatus totalCharacters stats embedKey createdAt");

    // Stats
    const [totalChats, totalLeads] = await Promise.all([
      Conversation.countDocuments({ ownerId: user._id }),
      Lead.countDocuments({ ownerId: user._id }),
    ]);

    return successResponse(res, {
      data: {
        user,
        bots,
        stats: { totalChats, totalLeads, totalBots: bots.length },
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return errorResponse(res, { message: "Failed to fetch user details." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/users/:userId/plan
// ----------------------------------------------------------------
const updateUserPlan = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const validPlans = ["free", "starter", "pro", "business"];
    const validCycles = ["monthly", "yearly"];

    if (!plan || !validPlans.includes(plan)) {
      return validationErrorResponse(res, [
        { field: "plan", message: "Invalid plan. Must be: free, starter, pro, or business" },
      ]);
    }

    if (plan !== "free" && !validCycles.includes(billingCycle)) {
      return validationErrorResponse(res, [
        { field: "billingCycle", message: "billingCycle is required for paid plans (monthly or yearly)" },
      ]);
    }

    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    const oldPlan = user.plan;
    const now = new Date();

    user.plan = plan;

    if (plan === "free") {
      user.planStartedAt = null;
      user.planExpiry = null;
    } else {
      const expiry = new Date(now);
      if (billingCycle === "yearly") {
        expiry.setFullYear(expiry.getFullYear() + 1);
      } else {
        expiry.setMonth(expiry.getMonth() + 1);
      }

      user.planStartedAt = now;
      user.planExpiry = expiry;
    }

    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_PLAN_UPDATED",
      module: "users",
      description: `Plan changed for ${user.email}: ${oldPlan} → ${plan}`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
      previousValue: { plan: oldPlan },
      newValue: { plan },
    });

    return successResponse(res, {
      message: `User plan updated to ${plan} successfully!`,
      data: {
        userId: user._id,
        plan,
        billingCycle: plan === "free" ? null : billingCycle,
        planStartedAt: user.planStartedAt,
        planExpiry: user.planExpiry,
      },
    });
  } catch (error) {
    console.error("Update user plan error:", error);
    return errorResponse(res, { message: "Failed to update user plan." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/credits
// ----------------------------------------------------------------
const addChatCredits = async (req, res) => {
  try {
    const { credits, reason } = req.body;

    if (!credits || credits < 1) {
      return validationErrorResponse(res, [
        { field: "credits", message: "Credits must be at least 1" },
      ]);
    }

    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    user.chatCredits += parseInt(credits);
    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "CREDITS_ADDED",
      module: "users",
      description: `${credits} credits added to ${user.email}. Reason: ${reason || "Manual addition"}`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
      newValue: { credits, totalCredits: user.chatCredits },
    });

    return successResponse(res, {
      message: `${credits} credits added successfully!`,
      data: { userId: user._id, creditsAdded: credits, totalCredits: user.chatCredits },
    });
  } catch (error) {
    console.error("Add chat credits error:", error);
    return errorResponse(res, { message: "Failed to add credits." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/ban
// ----------------------------------------------------------------
const banUser = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason?.trim()) {
      return validationErrorResponse(res, [
        { field: "reason", message: "Ban reason is required" },
      ]);
    }

    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");
    if (user.isBanned) {
      return errorResponse(res, { message: "User is already banned.", statusCode: 400 });
    }

    user.isBanned = true;
    user.bannedReason = reason.trim();
    user.isActive = false;
    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_BANNED",
      module: "users",
      description: `User ${user.email} banned. Reason: ${reason}`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
      newValue: { reason },
    });

    return successResponse(res, { message: "User banned successfully." });
  } catch (error) {
    console.error("Ban user error:", error);
    return errorResponse(res, { message: "Failed to ban user." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/unban
// ----------------------------------------------------------------
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");
    if (!user.isBanned) {
      return errorResponse(res, { message: "User is not banned.", statusCode: 400 });
    }

    user.isBanned = false;
    user.bannedReason = null;
    user.isActive = true;
    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_UNBANNED",
      module: "users",
      description: `User ${user.email} unbanned`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, { message: "User unbanned successfully." });
  } catch (error) {
    console.error("Unban user error:", error);
    return errorResponse(res, { message: "Failed to unban user." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/users/:userId
// ----------------------------------------------------------------
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    // Bots bhi delete karo
    await Bot.deleteMany({ userId: user._id });
    await Conversation.deleteMany({ ownerId: user._id });
    await Lead.deleteMany({ ownerId: user._id });
    await User.findByIdAndDelete(user._id);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_DELETED",
      module: "users",
      description: `User ${user.email} permanently deleted`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, { message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse(res, { message: "Failed to delete user." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/verify-email
// ----------------------------------------------------------------
const verifyUserEmail = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    user.isEmailVerified = true;
    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_EMAIL_VERIFIED",
      module: "users",
      description: `Email manually verified for ${user.email}`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, { message: "User email verified successfully." });
  } catch (error) {
    console.error("Verify user email error:", error);
    return errorResponse(res, { message: "Failed to verify email." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/send-email
// ----------------------------------------------------------------
const sendEmailToUser = async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject?.trim() || !message?.trim()) {
      return validationErrorResponse(res, [
        { field: "general", message: "Subject and message are required" },
      ]);
    }

    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      family: 4,
    });

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: user.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7F77DD;">Message from Lexioai</h2>
          <p>Hi ${user.firstName || user.name},</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <p style="color: #999; font-size: 12px;">This message was sent by Lexioai support team.</p>
        </div>
      `,
    });

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "EMAIL_SENT_TO_USER",
      module: "users",
      description: `Email sent to ${user.email}: "${subject}"`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, { message: "Email sent successfully!" });
  } catch (error) {
    console.error("Send email to user error:", error);
    return errorResponse(res, { message: "Failed to send email." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/reset-password
// ----------------------------------------------------------------
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: "Password must be at least 8 characters" },
      ]);
    }

    const user = await User.findById(req.params.userId).select("+password +refreshTokens");
    if (!user) return notFoundResponse(res, "User not found");

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_PASSWORD_RESET",
      module: "users",
      description: `Password reset for user ${user.email} by admin`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, { message: "User password reset successfully." });
  } catch (error) {
    console.error("Reset user password error:", error);
    return errorResponse(res, { message: "Failed to reset password." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/users/export
// ----------------------------------------------------------------
const exportUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("name email plan isEmailVerified isBanned createdAt");

    const headers = ["Name", "Email", "Plan", "Email Verified", "Banned", "Joined Date"];
    const rows = users.map((u) => [
      u.name || "",
      u.email || "",
      u.plan || "",
      u.isEmailVerified ? "Yes" : "No",
      u.isBanned ? "Yes" : "No",
      new Date(u.createdAt).toLocaleDateString("en-IN"),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USERS_EXPORTED",
      module: "users",
      description: `Users CSV exported (${users.length} users)`,
    });

    return res.send(csv);
  } catch (error) {
    console.error("Export users error:", error);
    return errorResponse(res, { message: "Failed to export users." });
  }
};

// ================================================================
// ADMIN MANAGEMENT — SuperAdmin only
// ================================================================

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/admins
// ----------------------------------------------------------------
const getAllAdmins = async (req, res) => {
  try {
    const admins = await AdminUser.find()
      .sort({ createdAt: -1 })
      .select("-password -refreshTokens -twoFactorSecret -backupCodes -otp");

    return successResponse(res, {
      message: "Admins fetched successfully",
      data: { admins, total: admins.length },
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    return errorResponse(res, { message: "Failed to fetch admins." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/admins
// ----------------------------------------------------------------
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, roleId, permissions } = req.body;

    if (!name || !email || !password || !roleId) {
      return validationErrorResponse(res, [
        { field: "general", message: "Name, email, password and roleId are required" },
      ]);
    }

    // Check if role exists
    const Role = require("../models/Role.model");
    const role = await Role.findById(roleId);
    if (!role) {
      return validationErrorResponse(res, [
        { field: "roleId", message: "Invalid role selected" },
      ]);
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResponse(res, {
        message: "An admin with this email already exists.",
        statusCode: 409,
      });
    }

    const admin = new AdminUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "admin",  // Base role is "admin", permissions from custom role
      customRole: roleId,  // Reference to the custom Role
      permissions: permissions || role.permissions,  // Use custom permissions if provided, else use role's permissions
      createdBy: req.admin._id,
    });

    await admin.save();

    await AdminActivityLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "CREATE_ADMIN",
      resourceType: "ADMIN",
      resourceId: admin._id.toString(),
      details: { name, email, roleId: roleId.toString() },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    // Send credentials email
    await sendAdminCredentialsEmail(email, name, password);

    // Create in-app notification
    try {
      await createAdminNotification({
        adminId: admin._id,
        type: "admin_invited",
        category: "admin_action",
        title: "Welcome to Lexioai Admin Panel",
        message: `You have been added as an admin with role: ${role.name}. Please check your email for login credentials.`,
        actionUrl: "/admin/settings",
        actionLabel: "View Settings",
        metadata: {
          roleName: role.name,
          roleLevelPermissions: role.permissions,
          invitedBy: req.admin.name,
          invitedAt: new Date(),
        },
        priority: "high",
        createdBy: req.admin._id,
      });
    } catch (notifError) {
      console.warn("Failed to create in-app notification:", notifError);
      // Don't fail the entire request if notification creation fails
    }

    return successResponse(res, {
      message: "Admin created successfully! Credentials have been sent to their email.",
      data: { admin: admin.toJSON() },
      statusCode: 201,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return errorResponse(res, { message: "Failed to create admin." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/admins/:adminId
// ----------------------------------------------------------------
const updateAdmin = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await AdminUser.findById(req.params.adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot modify SuperAdmin.");
    }

    if (name) admin.name = name.trim();
    if (email) {
      const existing = await AdminUser.findOne({
        email: email.toLowerCase(),
        _id: { $ne: admin._id },
      });
      if (existing) {
        return errorResponse(res, { message: "Email already in use.", statusCode: 409 });
      }
      admin.email = email.toLowerCase().trim();
    }

    await admin.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "ADMIN_UPDATED",
      module: "auth",
      description: `Admin ${admin.email} details updated`,
      targetType: "admin",
      targetId: admin._id,
      targetName: admin.email,
    });

    return successResponse(res, {
      message: "Admin updated successfully!",
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error("Update admin error:", error);
    return errorResponse(res, { message: "Failed to update admin." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/admins/:adminId/permissions
// ----------------------------------------------------------------
const updateAdminPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const admin = await AdminUser.findById(req.params.adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot modify SuperAdmin permissions.");
    }

    const oldPermissions = admin.permissions;
    admin.permissions = permissions;
    await admin.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "ADMIN_PERMISSIONS_UPDATED",
      module: "auth",
      description: `Permissions updated for ${admin.email}`,
      targetType: "admin",
      targetId: admin._id,
      targetName: admin.email,
      previousValue: oldPermissions,
      newValue: permissions,
    });

    // Create notification about permissions update
    try {
      await createAdminNotification({
        adminId: admin._id,
        type: "permissions_updated",
        category: "admin_action",
        title: "Your Permissions Have Been Updated",
        message: `Your access permissions have been modified by SuperAdmin. Please refresh your dashboard for the changes to take effect.`,
        actionUrl: "/admin",
        actionLabel: "Go to Dashboard",
        metadata: {
          changedBy: req.admin.name,
          changedAt: new Date(),
          oldPermissions,
          newPermissions: permissions,
        },
        priority: "high",
        createdBy: req.admin._id,
      });
    } catch (notifError) {
      console.warn("Failed to create permissions update notification:", notifError);
    }

    return successResponse(res, {
      message: "Permissions updated successfully!",
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error("Update admin permissions error:", error);
    return errorResponse(res, { message: "Failed to update permissions." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/admins/:adminId/ban
// ----------------------------------------------------------------
const banAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return validationErrorResponse(res, [
        { field: "reason", message: "Ban reason is required" },
      ]);
    }

    const admin = await AdminUser.findById(req.params.adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");
    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot ban SuperAdmin.");
    }

    admin.isBanned = true;
    admin.bannedReason = reason.trim();
    admin.bannedAt = new Date();
    admin.isActive = false;
    await admin.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "ADMIN_BANNED",
      module: "auth",
      description: `Admin ${admin.email} banned. Reason: ${reason}`,
      targetType: "admin",
      targetId: admin._id,
      targetName: admin.email,
    });

    // Create security alert notification
    try {
      await createAdminNotification({
        adminId: admin._id,
        type: "account_status_changed",
        category: "security",
        title: "Your Account Has Been Disabled",
        message: `Your admin account has been banned. Reason: ${reason}`,
        metadata: {
          action: "banned",
          reason,
          bannedBy: req.admin.name,
          bannedAt: new Date(),
        },
        priority: "critical",
        createdBy: req.admin._id,
      });
    } catch (notifError) {
      console.warn("Failed to create ban notification:", notifError);
    }

    return successResponse(res, { message: "Admin banned successfully." });
  } catch (error) {
    console.error("Ban admin error:", error);
    return errorResponse(res, { message: "Failed to ban admin." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/admins/:adminId/unban
// ----------------------------------------------------------------
const unbanAdmin = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.params.adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    admin.isBanned = false;
    admin.bannedReason = null;
    admin.bannedAt = null;
    admin.isActive = true;
    await admin.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "ADMIN_UNBANNED",
      module: "auth",
      description: `Admin ${admin.email} unbanned`,
      targetType: "admin",
      targetId: admin._id,
      targetName: admin.email,
    });

    // Create notification about account restoration
    try {
      await createAdminNotification({
        adminId: admin._id,
        type: "account_status_changed",
        category: "admin_action",
        title: "Your Account Has Been Restored",
        message: `Your admin account has been restored and is now active again.`,
        actionUrl: "/admin",
        actionLabel: "Go to Dashboard",
        metadata: {
          action: "unbanned",
          unbannedBy: req.admin.name,
          unbannedAt: new Date(),
        },
        priority: "high",
        createdBy: req.admin._id,
      });
    } catch (notifError) {
      console.warn("Failed to create unban notification:", notifError);
    }

    return successResponse(res, { message: "Admin unbanned successfully." });
  } catch (error) {
    console.error("Unban admin error:", error);
    return errorResponse(res, { message: "Failed to unban admin." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/admins/:adminId
// ----------------------------------------------------------------
const deleteAdmin = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.params.adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");
    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot delete SuperAdmin.");
    }

    await AdminUser.findByIdAndDelete(admin._id);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "ADMIN_DELETED",
      module: "auth",
      description: `Admin ${admin.email} deleted`,
      targetType: "admin",
      targetId: admin._id,
      targetName: admin.email,
    });

    return successResponse(res, { message: "Admin deleted successfully." });
  } catch (error) {
    console.error("Delete admin error:", error);
    return errorResponse(res, { message: "Failed to delete admin." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/admins/for-assignment
// @desc    Get active admins for ticket assignment
// ----------------------------------------------------------------
const getAdminsForAssignment = async (req, res) => {
  try {
    const admins = await AdminUser.find({ isActive: true, isBanned: false })
      .sort({ createdAt: -1 })
      .select("_id name avatar");

    return successResponse(res, { data: { admins } });
  } catch (error) {
    console.error("Get admins for assignment error:", error);
    return errorResponse(res, { message: "Failed to fetch admins." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/users/:userId/impersonate
// @desc    SuperAdmin login as user kar sake
// ----------------------------------------------------------------
const impersonateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    if (!user.isActive || user.isBanned) {
      return forbiddenResponse(res, "Cannot impersonate a banned or inactive user.");
    }

    const jwt = require("jsonwebtoken");
    // Special impersonate token — 1 hour only
    const impersonateToken = jwt.sign(
      {
        id: user._id,
        impersonatedBy: req.admin._id,
        isImpersonating: true,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "USER_IMPERSONATED",
      module: "users",
      description: `SuperAdmin impersonating user ${user.email}`,
      targetType: "user",
      targetId: user._id,
      targetName: user.email,
    });

    return successResponse(res, {
      message: `Impersonation token generated for ${user.email}. Valid for 1 hour.`,
      data: {
        impersonateToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          plan: user.plan,
        },
        expiresIn: "1h",
        warning: "This token gives full access to the user account. Use responsibly.",
      },
    });
  } catch (error) {
    console.error("Impersonate user error:", error);
    return errorResponse(res, { message: "Failed to generate impersonation token." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/users/:userId/login-history
// @desc    User ki login history (audit logs se)
// ----------------------------------------------------------------
const getUserLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return notFoundResponse(res, "User not found");

    // User ke auth related audit entries dhundho — widget conversation se
    const Conversation = require("../models/Conversation.model");
    const recentConversations = await Conversation.find({ ownerId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("createdAt pageUrl visitorIP status totalMessages");

    return successResponse(res, {
      data: {
        userId: user._id,
        email: user.email,
        registrationIP: user.registrationIP,
        lastSeen: user.updatedAt,
        recentActivity: recentConversations,
        accountCreated: user.createdAt,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("Get user login history error:", error);
    return errorResponse(res, { message: "Failed to fetch user history." });
  }
};

// ================================================================
// @route   POST /api/v1/admin/admins/:adminId/force-password-reset
// @desc    Force admin to reset password on next login
// ================================================================
const forcePasswordReset = async (req, res) => {
  try {
    const { adminId } = req.params;
    const superAdminId = req.admin._id;

    const admin = await AdminUser.findById(adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot force password reset for SuperAdmin.");
    }

    // Just set the flag - OTP will be generated when they initiate reset from profile
    admin.forcePasswordReset = true;
    await admin.save();

    // Send notification email only (no OTP in email)
    try {
      await sendForcedPasswordResetEmail(admin, req.admin.name);
    } catch (emailError) {
      console.error("Password reset email send error:", emailError);
      return errorResponse(res, { message: "Status updated but failed to send notification email." });
    }

    // Log activity
    const AdminActivityLog = require("../models/AdminActivityLog.model");
    await AdminActivityLog.log({
      adminId: superAdminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "FORCE_PASSWORD_RESET",
      resourceType: "ADMIN",
      resourceId: adminId,
      details: { email: admin.email, emailSent: true },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    return successResponse(res, {
      message: `Password reset notification sent to ${admin.email}. Admin must reset from their profile.`,
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error("Force password reset error:", error);
    return errorResponse(res, { message: "Failed to force password reset." });
  }
};

// ================================================================
// @route   GET /api/v1/admin/admins/:adminId/activity-logs
// @desc    Get activity logs for a specific admin
// ================================================================
const getAdminActivityLogs = async (req, res) => {
  try {
    const { adminId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const AdminActivityLog = require("../models/AdminActivityLog.model");

    const [logs, total] = await Promise.all([
      AdminActivityLog.find({ adminId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminActivityLog.countDocuments({ adminId }),
    ]);

    return successResponse(res, {
      data: {
        logs,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin activity logs error:", error);
    return errorResponse(res, { message: "Failed to fetch activity logs." });
  }
};

// ================================================================
// @route   GET /api/v1/admin/activity-logs
// @desc    Get all activity logs (SuperAdmin only)
// ================================================================
const getAllActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const adminIdFilter = req.query.adminId;
    const actionFilter = req.query.action;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const AdminActivityLog = require("../models/AdminActivityLog.model");

    const filter = {};
    if (adminIdFilter) filter.adminId = adminIdFilter;
    if (actionFilter) filter.action = actionFilter;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      AdminActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminActivityLog.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: {
        logs,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get activity logs error:", error);
    return errorResponse(res, { message: "Failed to fetch activity logs." });
  }
};

// ================================================================
// @route   POST /api/v1/admin/admins/import-csv
// @desc    Bulk import admins from CSV
// ================================================================
const importAdminsCSV = async (req, res) => {
  try {
    if (!req.file) {
      return validationErrorResponse(res, [
        { field: "file", message: "CSV file is required" },
      ]);
    }

    // CSV parsing (using csv-parse library)
    const csv = require("csv-parse/sync");
    const fileContent = req.file.buffer.toString();
    const records = csv.parse(fileContent, { columns: true });

    const createdAdmins = [];
    const errors = [];
    const AdminActivityLog = require("../models/AdminActivityLog.model");

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const { name, email, role, password } = record;

      // Validation
      if (!name || !email || !role || !password) {
        errors.push({
          row: i + 2,
          error: "Missing required fields: name, email, role, password",
        });
        continue;
      }

      if (!["admin", "support"].includes(role)) {
        errors.push({
          row: i + 2,
          error: `Invalid role: ${role}. Must be "admin" or "support"`,
        });
        continue;
      }

      // Check if email exists
      const existing = await AdminUser.findOne({ email: email.toLowerCase() });
      if (existing) {
        errors.push({
          row: i + 2,
          error: `Email already exists: ${email}`,
        });
        continue;
      }

      // Create admin
      try {
        const admin = await AdminUser.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          role,
          createdBy: req.admin._id,
        });

        createdAdmins.push({
          id: admin._id,
          email: admin.email,
          name: admin.name,
        });

        // Log activity
        await AdminActivityLog.log({
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          action: "CREATE_ADMIN",
          resourceType: "ADMIN",
          resourceId: admin._id.toString(),
          details: { email, role },
          ipAddress: getClientIP(req),
          userAgent: req.headers["user-agent"],
        });
      } catch (err) {
        errors.push({
          row: i + 2,
          error: err.message,
        });
      }
    }

    return successResponse(res, {
      message: `Imported ${createdAdmins.length} admins with ${errors.length} errors`,
      data: { createdAdmins, errors },
      statusCode: 201,
    });
  } catch (error) {
    console.error("Import admins CSV error:", error);
    return errorResponse(res, { message: "Failed to import admins." });
  }
};

// ================================================================
// @route   PUT /api/v1/admin/admins/:adminId/online-status
// @desc    Update admin online status
// ================================================================
const updateAdminOnlineStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
      return validationErrorResponse(res, [
        { field: "isOnline", message: "isOnline must be boolean" },
      ]);
    }

    const admin = await AdminUser.findByIdAndUpdate(
      adminId,
      { isOnline, lastLoginIP: getClientIP(req) },
      { new: true }
    );

    if (!admin) return notFoundResponse(res, "Admin not found");

    return successResponse(res, { data: { admin: admin.toJSON() } });
  } catch (error) {
    console.error("Update online status error:", error);
    return errorResponse(res, { message: "Failed to update online status." });
  }
};

// ================================================================
// CHANGE ADMIN PASSWORD (SuperAdmin sets new password for admin)
// ================================================================
const changeAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { newPassword } = req.body;
    const superAdminId = req.admin._id;

    if (!newPassword) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: "New password is required" },
      ]);
    }

    if (newPassword.length < 8) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: "Password must be at least 8 characters" },
      ]);
    }

    const admin = await AdminUser.findById(adminId);
    if (!admin) return notFoundResponse(res, "Admin not found");

    if (admin.role === "superadmin") {
      return forbiddenResponse(res, "Cannot change SuperAdmin password this way.");
    }

    // Update password
    admin.password = newPassword;
    admin.forcePasswordReset = false; // Clear the force reset flag since password is being set
    admin.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null }; // Clear any pending OTP
    await admin.save();

    // Send email with new password
    try {
      await sendAdminPasswordChangedEmail(admin, newPassword, req.admin.name);
    } catch (emailError) {
      console.error("Password change email send error:", emailError);
      return errorResponse(res, { message: "Password updated but failed to send email notification." });
    }

    // Log activity
    await AdminActivityLog.log({
      adminId: superAdminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "CHANGE_ADMIN_PASSWORD",
      resourceType: "ADMIN",
      resourceId: adminId,
      details: { email: admin.email, passwordChanged: true },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    return successResponse(res, {
      message: `Password updated. New credentials sent to ${admin.email}.`,
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error("Change admin password error:", error);
    return errorResponse(res, { message: "Failed to change admin password." });
  }
};

// ================================================================
// @route   DELETE /api/v1/admin/activity-logs/:id
// @desc    Delete a single activity log entry
// ================================================================
const deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;
    const AdminActivityLog = require("../models/AdminActivityLog.model");

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, { message: "Invalid activity log ID" }, 400);
    }

    const deletedLog = await AdminActivityLog.findByIdAndDelete(id);

    if (!deletedLog) {
      return errorResponse(res, { message: "Activity log not found" }, 404);
    }

    return successResponse(res, {
      message: "Activity log deleted successfully",
      data: { deletedId: id },
    });
  } catch (error) {
    console.error("Delete activity log error:", error);
    return errorResponse(res, { message: "Failed to delete activity log" });
  }
};

module.exports = {
  getAllUsers, getUserDetails, updateUserPlan, addChatCredits,
  banUser, unbanUser, deleteUser, verifyUserEmail, sendEmailToUser,
  resetUserPassword, exportUsers, impersonateUser, getUserLoginHistory,
  getAllAdmins, createAdmin, updateAdmin, updateAdminPermissions,
  banAdmin, unbanAdmin, deleteAdmin, getAdminsForAssignment,
  forcePasswordReset, changeAdminPassword, getAdminActivityLogs, getAllActivityLogs, deleteActivityLog, importAdminsCSV,
  updateAdminOnlineStatus,}