const AdminUser = require("../models/AdminUser.model");
const AuditLog = require("../models/AuditLog.model");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const cloudinary = require("cloudinary").v2;
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  unauthorizedResponse,
} = require("../utils/response.utils");
const { generateOTP } = require("../utils/email.utils");
const {
  getPasswordPolicy,
  validatePasswordByPolicy,
  getJWTSettings,
  parseDurationToMs,
  getSMTPIntegrationConfig,
  getGeneralSettings,
} = require("../utils/platformSettings.utils");

// ----------------------------------------------------------------
// CLOUDINARY CONFIG
// ----------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ----------------------------------------------------------------
// HELPER — Tokens generate karo
// ----------------------------------------------------------------
const generateAdminTokens = async (adminId) => {
  const jwtSettings = await getJWTSettings();

  const accessToken = jwt.sign(
    { id: adminId, type: "admin" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: jwtSettings.accessExpiry || process.env.JWT_ACCESS_EXPIRES || "15m" }
  );

  const refreshToken = jwt.sign(
    { id: adminId, type: "admin" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: jwtSettings.refreshExpiry || process.env.JWT_REFRESH_EXPIRES || "7d" }
  );

  return { accessToken, refreshToken };
};

// ----------------------------------------------------------------
// HELPER — Refresh token cookie set karo
// ----------------------------------------------------------------
const setAdminRefreshCookie = async (res, token) => {
  const jwtSettings = await getJWTSettings();
  const refreshExpiry = jwtSettings.refreshExpiry || process.env.JWT_REFRESH_EXPIRES || "7d";
  let maxAge = parseDurationToMs(refreshExpiry, 7 * 24 * 60 * 60 * 1000);

  if (Number(jwtSettings.sessionTimeoutMinutes) > 0) {
    maxAge = Math.min(maxAge, Number(jwtSettings.sessionTimeoutMinutes) * 60 * 1000);
  }

  res.cookie("adminRefreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge,
  });
};

// ----------------------------------------------------------------
// HELPER — IP address
// ----------------------------------------------------------------
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/login
// @desc    Admin login
// @access  Public
// ----------------------------------------------------------------
const login = async (req, res) => {
  try {
    const { email, password, twoFactorCode, adminType } = req.body;

    if (!email || !password) {
      return validationErrorResponse(res, [
        { field: "general", message: "Email and password are required" },
      ]);
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() })
      .select("+password +refreshTokens +twoFactorSecret +backupCodes");

    if (!admin) {
      return unauthorizedResponse(res, "Invalid email or password.");
    }

    if (!admin.isActive || admin.isBanned) {
      return forbiddenResponse(res, "Your account has been deactivated. Contact SuperAdmin.");
    }

    // Validate adminType access
    if (adminType === 'admin') {
      // Only superadmin can access /admin/login
      if (admin.role !== 'superadmin') {
        return forbiddenResponse(res, "Only SuperAdmins can access the admin portal. Please use the support portal instead.");
      }
    } else if (adminType === 'support') {
      // Non-superadmin can access /support/login
      if (admin.role === 'superadmin') {
        return forbiddenResponse(res, "SuperAdmins must use the admin portal, not the support portal.");
      }
    }

    // Password verify
    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      await AuditLog.log({
        adminId: admin._id,
        adminName: admin.name,
        adminRole: admin.role,
        adminIP: getClientIP(req),
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Failed login attempt for ${email}`,
        status: "failed",
      });
      return unauthorizedResponse(res, "Invalid email or password.");
    }

    // 2FA check — SuperAdmin ke liye mandatory
    if (admin.twoFactorEnabled) {
      if (!twoFactorCode) {
        return successResponse(res, {
          message: "2FA code required.",
          data: {
            requires2FA: true,
            adminId: admin._id,
          },
        });
      }

      // 2FA verify karo
      const verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: "base32",
        token: twoFactorCode.toString(),
        window: 2,
      });

      const isBackupCode = admin.backupCodes?.includes(
        twoFactorCode.toUpperCase()
      );

      if (!verified && !isBackupCode) {
        return errorResponse(res, {
          message: "Invalid 2FA code.",
          statusCode: 400,
        });
      }

      // Backup code use kiya toh remove karo
      if (isBackupCode) {
        admin.backupCodes = admin.backupCodes.filter(
          (c) => c !== twoFactorCode.toUpperCase()
        );
      }
    }

    // SuperAdmin ke liye 2FA mandatory check
    if (admin.role === "superadmin" && !admin.twoFactorEnabled) {
      // Login allow karo but 2FA setup force karo
      const { accessToken, refreshToken } = await generateAdminTokens(admin._id);
      admin.refreshTokens.push(refreshToken);
      admin.lastLoginAt = new Date();
      admin.lastLoginIP = getClientIP(req);
      await admin.save();
      await setAdminRefreshCookie(res, refreshToken);

      return successResponse(res, {
        message: "Login successful! Please setup 2FA immediately.",
        data: {
          accessToken,
          admin: admin.toJSON(),
          requires2FASetup: true,
        },
      });
    }

    // Tokens generate karo
    const { accessToken, refreshToken } = await generateAdminTokens(admin._id);

    admin.refreshTokens.push(refreshToken);
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = getClientIP(req);
    await admin.save();

    await setAdminRefreshCookie(res, refreshToken);

    // Audit log
    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "LOGIN_SUCCESS",
      module: "auth",
      description: `${admin.role} logged in successfully`,
    });

    return successResponse(res, {
      message: "Login successful!",
      data: {
        accessToken,
        admin: admin.toJSON(),
        requires2FASetup: false,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return errorResponse(res, { message: "Login failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/logout
// @desc    Admin logout
// @access  Private
// ----------------------------------------------------------------
const logout = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id).select("+refreshTokens");
    const token = req.cookies?.adminRefreshToken;

    if (token) {
      admin.refreshTokens = admin.refreshTokens.filter((t) => t !== token);
      await admin.save();
    }

    res.clearCookie("adminRefreshToken");

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "LOGOUT",
      module: "auth",
      description: `${admin.role} logged out`,
    });

    return successResponse(res, { message: "Logged out successfully." });
  } catch (error) {
    console.error("Admin logout error:", error);
    return errorResponse(res, { message: "Logout failed." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/refresh
// @desc    Access token refresh karo
// @access  Public (cookie)
// ----------------------------------------------------------------
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.adminRefreshToken;

    if (!token) {
      return unauthorizedResponse(res, "No refresh token found.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return unauthorizedResponse(res, "Invalid or expired refresh token.");
    }

    const admin = await AdminUser.findById(decoded.id).select("+refreshTokens");

    if (!admin || !admin.refreshTokens.includes(token)) {
      return unauthorizedResponse(res, "Invalid session. Please login again.");
    }

    if (!admin.isActive || admin.isBanned) {
      return forbiddenResponse(res, "Account deactivated.");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAdminTokens(admin._id);

    // Purana token replace karo
    admin.refreshTokens = admin.refreshTokens.filter((t) => t !== token);
    admin.refreshTokens.push(newRefreshToken);
    await admin.save();

    await setAdminRefreshCookie(res, newRefreshToken);

    return successResponse(res, {
      data: { accessToken },
    });
  } catch (error) {
    console.error("Admin refresh token error:", error);
    return errorResponse(res, { message: "Token refresh failed." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/auth/me
// @desc    Current admin info
// @access  Private
// ----------------------------------------------------------------
const getMe = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id);
    return successResponse(res, { data: { admin: admin.toJSON() } });
  } catch (error) {
    console.error("Admin getMe error:", error);
    return errorResponse(res, { message: "Failed to fetch admin info." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/auth/profile
// @desc    Profile update karo
// @access  Private
// ----------------------------------------------------------------
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const admin = await AdminUser.findById(req.admin._id);

    if (name !== undefined) {
      if (!name.trim()) {
        return validationErrorResponse(res, [
          { field: "name", message: "Name cannot be empty" },
        ]);
      }
      admin.name = name.trim();
    }

    await admin.save();

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "PROFILE_UPDATED",
      module: "auth",
      description: "Admin updated their profile",
    });

    return successResponse(res, {
      message: "Profile updated successfully!",
      data: { admin: admin.toJSON() },
    });
  } catch (error) {
    console.error("Admin update profile error:", error);
    return errorResponse(res, { message: "Failed to update profile." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/avatar
// @desc    Avatar upload
// @access  Private
// ----------------------------------------------------------------
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return validationErrorResponse(res, [
        { field: "avatar", message: "Please select an image" },
      ]);
    }

    const { mimetype, buffer, size } = req.file;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimetype)) {
      return validationErrorResponse(res, [
        { field: "avatar", message: "Only JPEG, PNG, and WebP images are allowed" },
      ]);
    }

    if (size > 2 * 1024 * 1024) {
      return validationErrorResponse(res, [
        { field: "avatar", message: "Image size cannot exceed 2MB" },
      ]);
    }

    const admin = await AdminUser.findById(req.admin._id);

    try {
      // Old avatar delete
      if (admin.avatar?.includes("cloudinary")) {
        const parts = admin.avatar.split("/");
        const publicId = parts[parts.length - 1].split(".")[0];
        console.log("Deleting old avatar:", publicId);
        try {
          await cloudinary.uploader.destroy(
            `${process.env.CLOUDINARY_FOLDER}/admin-avatars/${publicId}`
          );
        } catch (deleteErr) {
          console.log("Old avatar delete error:", deleteErr.message);
          // Continue even if delete fails
        }
      }

      // Upload new avatar using upload_stream with explicit auth headers
      console.log("Starting Cloudinary upload...");
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${process.env.CLOUDINARY_FOLDER}/admin-avatars`,
            public_id: `admin_${admin._id}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
            resource_type: "auto",
          },
          (err, result) => {
            if (err) {
              console.error("Upload stream error details:", err);
              reject(err);
            } else {
              console.log("Upload successful");
              resolve(result);
            }
          }
        );
        
        // Write buffer to stream
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          reject(err);
        });
        
        stream.end(buffer);
      });

      if (!result || !result.secure_url) {
        throw new Error("Upload failed: No secure URL returned");
      }

      admin.avatar = result.secure_url;
      await admin.save();
    } catch (uploadErr) {
      console.error("Complete upload error:", uploadErr);
      throw uploadErr;
    }

    return successResponse(res, {
      message: "Avatar updated successfully!",
      data: { avatar: admin.avatar },
    });
  } catch (error) {
    console.error("Admin update avatar error:", error);
    return errorResponse(res, { message: "Failed to update avatar." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/auth/password
// @desc    Password change
// @access  Private
// ----------------------------------------------------------------
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const passwordPolicy = await getPasswordPolicy();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return validationErrorResponse(res, [
        { field: "general", message: "All fields are required" },
      ]);
    }

    if (newPassword !== confirmPassword) {
      return validationErrorResponse(res, [
        { field: "confirmPassword", message: "Passwords do not match" },
      ]);
    }

    const passwordIssues = validatePasswordByPolicy(newPassword, passwordPolicy);
    if (passwordIssues.length > 0) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: passwordIssues[0] },
      ]);
    }

    if (currentPassword === newPassword) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: "New password must be different" },
      ]);
    }

    const admin = await AdminUser.findById(req.admin._id).select("+password +refreshTokens");

    const isValid = await admin.comparePassword(currentPassword);
    if (!isValid) {
      return errorResponse(res, {
        message: "Current password is incorrect.",
        statusCode: 400,
      });
    }

    admin.password = newPassword;
    // Current session rakho
    const currentToken = req.cookies?.adminRefreshToken;
    admin.refreshTokens = currentToken
      ? admin.refreshTokens.filter((t) => t === currentToken)
      : [];

    await admin.save();

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "PASSWORD_CHANGED",
      module: "auth",
      description: "Admin changed their password",
    });

    return successResponse(res, {
      message: "Password changed successfully! Other devices have been logged out.",
    });
  } catch (error) {
    console.error("Admin change password error:", error);
    return errorResponse(res, { message: "Failed to change password." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/forgot-password
// @desc    Forgot password — OTP email
// @access  Public
// ----------------------------------------------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return validationErrorResponse(res, [
        { field: "email", message: "Email is required" },
      ]);
    }

    // Same message for security
    const successMsg = "If this email is registered, you'll receive a reset code shortly.";

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return successResponse(res, { message: successMsg });
    }

    const otp = generateOTP();
    admin.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lockedUntil: null,
    };
    await admin.save();

    // Email bhejo
    const nodemailer = require("nodemailer");
    const smtp = await getSMTPIntegrationConfig();
    const general = await getGeneralSettings();

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Boolean(smtp.secure),
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const fromAddress =
      smtp.fromEmail ||
      process.env.EMAIL_FROM_ADDRESS ||
      general.supportEmail ||
      "noreply@lexioai.com";
    const fromName = process.env.EMAIL_FROM_NAME || general.siteName || "Lexioai";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: admin.email,
      subject: "Admin Password Reset - Lexioai",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7F77DD;">Password Reset Request</h2>
          <p>Hi ${admin.name},</p>
          <p>Your password reset code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #7F77DD; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please contact SuperAdmin immediately.</p>
        </div>
      `,
    });

    return successResponse(res, { message: successMsg });
  } catch (error) {
    console.error("Admin forgot password error:", error);
    return errorResponse(res, { message: "Failed to send reset code." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/reset-password
// @desc    Password reset karo
// @access  Public
// ----------------------------------------------------------------
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const passwordPolicy = await getPasswordPolicy();

    if (!email || !otp || !newPassword) {
      return validationErrorResponse(res, [
        { field: "general", message: "All fields are required" },
      ]);
    }

    const passwordIssues = validatePasswordByPolicy(newPassword, passwordPolicy);
    if (passwordIssues.length > 0) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: passwordIssues[0] },
      ]);
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() })
      .select("+password +refreshTokens");

    if (!admin) {
      return errorResponse(res, {
        message: "Invalid or expired reset code.",
        statusCode: 400,
      });
    }

    if (!admin.otp?.code) {
      return errorResponse(res, {
        message: "No reset code found. Please request a new one.",
        statusCode: 400,
      });
    }

    if (new Date() > new Date(admin.otp.expiresAt)) {
      return errorResponse(res, {
        message: "Reset code has expired.",
        statusCode: 400,
      });
    }

    if (admin.otp.code !== otp.toString()) {
      admin.otp.attempts += 1;
      await admin.save();
      return errorResponse(res, {
        message: "Invalid reset code.",
        statusCode: 400,
      });
    }

    admin.password = newPassword;
    admin.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null };
    admin.refreshTokens = [];
    await admin.save();

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "PASSWORD_RESET",
      module: "auth",
      description: "Admin reset their password",
    });

    return successResponse(res, {
      message: "Password reset successful! Please login with your new password.",
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return errorResponse(res, { message: "Failed to reset password." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/2fa/setup
// @desc    2FA setup — QR code
// @access  Private
// ----------------------------------------------------------------
const setup2FA = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id).select("+twoFactorSecret");

    if (admin.twoFactorEnabled) {
      return errorResponse(res, {
        message: "2FA is already enabled.",
        statusCode: 400,
      });
    }

    const secret = speakeasy.generateSecret({
      name: `Lexioai Admin (${admin.email})`,
      issuer: "lexioai.com",
      length: 32,
    });

    admin.twoFactorSecret = secret.base32;
    await admin.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return successResponse(res, {
      message: "Scan the QR code with your authenticator app.",
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32,
      },
    });
  } catch (error) {
    console.error("Admin setup 2FA error:", error);
    return errorResponse(res, { message: "Failed to setup 2FA." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/auth/2fa/verify
// @desc    2FA enable karo
// @access  Private
// ----------------------------------------------------------------
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return validationErrorResponse(res, [
        { field: "token", message: "2FA code is required" },
      ]);
    }

    const admin = await AdminUser.findById(req.admin._id).select("+twoFactorSecret");

    if (!admin.twoFactorSecret) {
      return errorResponse(res, {
        message: "Please setup 2FA first.",
        statusCode: 400,
      });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: "base32",
      token: token.toString(),
      window: 2,
    });

    if (!verified) {
      return errorResponse(res, {
        message: "Invalid code. Please try again.",
        statusCode: 400,
      });
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    admin.twoFactorEnabled = true;
    admin.backupCodes = backupCodes;
    await admin.save();

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "2FA_ENABLED",
      module: "auth",
      description: "Admin enabled 2FA",
    });

    return successResponse(res, {
      message: "2FA enabled successfully! Save your backup codes.",
      data: { backupCodes },
    });
  } catch (error) {
    console.error("Admin verify 2FA error:", error);
    return errorResponse(res, { message: "Failed to enable 2FA." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/auth/sessions
// @desc    Active sessions
// @access  Private
// ----------------------------------------------------------------
const getSessions = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id).select("+refreshTokens");
    const currentToken = req.cookies?.adminRefreshToken;

    const sessions = admin.refreshTokens.map((token, index) => {
      let decoded = null;
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      } catch {}

      return {
        sessionId: index,
        isCurrent: token === currentToken,
        expiresAt: decoded ? new Date(decoded.exp * 1000) : null,
      };
    });

    return successResponse(res, {
      data: { sessions, total: sessions.length },
    });
  } catch (error) {
    console.error("Admin get sessions error:", error);
    return errorResponse(res, { message: "Failed to fetch sessions." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/auth/sessions/all
// @desc    Logout all devices
// @access  Private
// ----------------------------------------------------------------
const logoutAllDevices = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id).select("+refreshTokens");
    admin.refreshTokens = [];
    await admin.save();

    res.clearCookie("adminRefreshToken");

    await AuditLog.log({
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role,
      adminIP: getClientIP(req),
      action: "LOGOUT_ALL_DEVICES",
      module: "auth",
      description: "Admin logged out from all devices",
    });

    return successResponse(res, { message: "Logged out from all devices." });
  } catch (error) {
    console.error("Admin logout all devices error:", error);
    return errorResponse(res, { message: "Failed to logout all devices." });
  }
};

module.exports = {
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  forgotPassword,
  resetPassword,
  setup2FA,
  verify2FA,
  getSessions,
  logoutAllDevices,
};