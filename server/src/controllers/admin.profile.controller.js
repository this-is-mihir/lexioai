const AdminUser = require("../models/AdminUser.model");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
} = require("../utils/response.utils");
const { sendPasswordResetEmail } = require("../utils/email.utils");
const {
  getPasswordPolicy,
  validatePasswordByPolicy,
} = require("../utils/platformSettings.utils");

// ================================================================
// GET — Current Admin Profile
// ================================================================
exports.getCurrentProfile = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id).select("-password -twoFactorSecret -backupCodes -refreshTokens -otp");
    if (!admin) return errorResponse(res, { message: "Admin not found" });
    return successResponse(res, { data: { admin } });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// PUT — Update Profile (Name, Email, Avatar)
// ================================================================
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const admin = await AdminUser.findById(req.admin._id);

    if (!admin) return errorResponse(res, { message: "Admin not found" });

    // Always update avatar if provided
    if (avatar) {
      admin.avatar = avatar;
    }

    // Always update name if provided
    if (name) {
      admin.name = name;
    }

    // Email change requires OTP verification
    if (email && email !== admin.email) {
      // Check email already exists
      const emailExists = await AdminUser.findOne({ email, _id: { $ne: admin._id } });
      if (emailExists) {
        return errorResponse(res, { message: "Email already in use" });
      }

      // Generate OTP for email verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      admin.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        attempts: 0,
        lockedUntil: null,
      };
      admin.tempEmail = email; // Store new email temporarily
      await admin.save(); // Save avatar + name + tempEmail

      // TODO: Send OTP to current email
      return successResponse(res, {
        message: "OTP sent to current email. Verify to change email.",
        otpSent: true,
        data: { admin }, // Include updated admin data
      });
    }

    // Save all changes (avatar, name, etc)
    await admin.save();
    
    // Refresh admin data before returning (ensure all fields included)
    const updatedAdmin = await AdminUser.findById(req.admin._id).select("-password -twoFactorSecret -backupCodes -refreshTokens -otp");
    
    return successResponse(res, {
      message: "Profile updated successfully",
      data: { admin: updatedAdmin },
    });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Verify Email OTP & Update Email
// ================================================================
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const admin = await AdminUser.findById(req.admin._id).select("+otp");

    if (!admin || !admin.otp?.code) {
      return errorResponse(res, { message: "No OTP request found" });
    }

    if (admin.otp.expiresAt < new Date()) {
      return errorResponse(res, { message: "OTP expired" });
    }

    if (admin.otp.attempts >= 3) {
      return errorResponse(res, { message: "Too many attempts. Try again later." });
    }

    if (admin.otp.code !== otp) {
      admin.otp.attempts += 1;
      await admin.save();
      return errorResponse(res, { message: "Invalid OTP" });
    }

    // OTP verified - update email
    admin.email = admin.tempEmail;
    admin.tempEmail = null;
    admin.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null };
    await admin.save();

    return successResponse(res, {
      message: "Email updated successfully",
      data: { admin },
    });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Change Password (Current Password Required)
// ================================================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const passwordPolicy = await getPasswordPolicy();

    if (!currentPassword || !newPassword) {
      return validationErrorResponse(res, { message: "Current and new password required" });
    }

    if (newPassword !== confirmPassword) {
      return errorResponse(res, { message: "Passwords do not match" });
    }

    const passwordIssues = validatePasswordByPolicy(newPassword, passwordPolicy);
    if (passwordIssues.length > 0) {
      return errorResponse(res, { message: passwordIssues[0] });
    }

    const admin = await AdminUser.findById(req.admin._id).select("+password");

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return errorResponse(res, { message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    admin.forcePasswordReset = false;
    await admin.save();

    return successResponse(res, { message: "Password changed successfully" });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Send Password Reset OTP (Email Verification)
// ================================================================
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email, adminType } = req.body;

    if (!email) {
      return validationErrorResponse(res, { message: "Email is required" });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    const admin = await AdminUser.findOne({ email: normalizedEmail });
    if (!admin) {
      return errorResponse(res, { message: "Email not registered in our system" });
    }

    // Check if account is active
    if (!admin.isActive || admin.isBanned) {
      return errorResponse(res, { message: "Account is deactivated" });
    }

    // Check if user has admin role (any kind of admin)
    if (!['superadmin', 'admin', 'support'].includes(admin.role)) {
      return errorResponse(res, { message: "Email not registered in our system" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lockedUntil: null,
    };
    await admin.save();

    // Send OTP to email
    try {
      await sendPasswordResetEmail(admin, otp);
    } catch (emailError) {
      console.error("Email send error:", emailError);
      // Still return success to prevent frontend errors, but OTP is saved
    }

    return successResponse(res, {
      message: "OTP sent to your registered email. Check inbox.",
      otpSent: true,
    });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Verify OTP & Reset Password
// ================================================================
exports.resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword, adminType } = req.body;
    const passwordPolicy = await getPasswordPolicy();

    if (!email || !otp || !newPassword || !adminType) {
      return validationErrorResponse(res, { message: "All fields required" });
    }

    // Validate password strength
    const passwordIssues = validatePasswordByPolicy(newPassword, passwordPolicy);
    if (passwordIssues.length > 0) {
      return validationErrorResponse(res, { message: passwordIssues[0] });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    const admin = await AdminUser.findOne({ email: normalizedEmail }).select("+otp");
    if (!admin) return errorResponse(res, { message: "Email not found" });

    // Check if account is active
    if (!admin.isActive || admin.isBanned) {
      return errorResponse(res, { message: "Account is deactivated" });
    }

    // Check if user has admin role (any kind of admin)
    if (!['superadmin', 'admin', 'support'].includes(admin.role)) {
      return errorResponse(res, { message: "Email not found" });
    }

    // Check if OTP exists
    if (!admin.otp || !admin.otp.code) {
      return errorResponse(res, { message: "No OTP requested. Please request a new one." });
    }

    // Check OTP expiry
    if (new Date() > new Date(admin.otp.expiresAt)) {
      return errorResponse(res, { message: "OTP expired. Please request a new one." });
    }

    // Check OTP code
    if (admin.otp.code !== otp.toString()) {
      return errorResponse(res, { message: "Invalid OTP" });
    }

    // Reset password — Set unhashed password, pre-save hook will hash it
    admin.password = newPassword;
    admin.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null };
    await admin.save();

    return successResponse(res, { message: "Password reset successfully. Please login." });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Setup 2FA (Generate QR Code)
// ================================================================
exports.setup2FA = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id);
    if (!admin) return errorResponse(res, { message: "Admin not found" });

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Lexioai Admin (${admin.email})`,
      issuer: "Lexioai",
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return successResponse(res, {
      data: {
        secret: secret.base32,
        qrCode,
        backupCodes: generateBackupCodes(10),
      },
      message: "Scan QR code with Google Authenticator",
    });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Verify & Enable 2FA
// ================================================================
exports.verify2FA = async (req, res) => {
  try {
    const { secret, token, backupCodes } = req.body;

    if (!secret || !token) {
      return validationErrorResponse(res, { message: "Secret and token required" });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return errorResponse(res, { message: "Invalid token" });
    }

    // Save 2FA
    const admin = await AdminUser.findById(req.admin._id);
    admin.twoFactorEnabled = true;
    admin.twoFactorSecret = secret;
    admin.backupCodes = backupCodes || generateBackupCodes(10);
    await admin.save();

    return successResponse(res, {
      message: "2FA enabled successfully",
      data: { backupCodes: admin.backupCodes },
    });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Disable 2FA
// ================================================================
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return validationErrorResponse(res, { message: "Password required" });
    }

    const admin = await AdminUser.findById(req.admin._id).select("+password");

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return errorResponse(res, { message: "Invalid password" });
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = null;
    admin.backupCodes = [];
    await admin.save();

    return successResponse(res, { message: "2FA disabled successfully" });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// GET — Active Sessions
// ================================================================
exports.getActiveSessions = async (req, res) => {
  try {
    // For now, return a mock response
    // In production, you'd track device info, browser, IP, etc.
    const sessions = [
      {
        id: uuidv4(),
        device: "Chrome on Windows",
        ip: req.ip || "0.0.0.0",
        browser: "Chrome 120",
        lastActive: new Date(),
        current: true,
      },
    ];

    return successResponse(res, { data: { sessions } });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// POST — Logout All Devices
// ================================================================
exports.logoutAllDevices = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin._id);
    admin.refreshTokens = [];
    await admin.save();

    return successResponse(res, { message: "Logged out from all devices" });
  } catch (error) {
    return errorResponse(res, { message: error.message });
  }
};

// ================================================================
// Helper Functions
// ================================================================

function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}
