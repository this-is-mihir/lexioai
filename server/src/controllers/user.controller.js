const User = require("../models/User.model");
const cloudinary = require("cloudinary").v2;
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");
const {
  generateOTP,
  sendEmailChangeOTP,
  sendPasswordChangedEmail,
} = require("../utils/email.utils");
const {
  clearRefreshTokenCookie,
  verifyRefreshToken,
} = require("../utils/jwt.utils");
const {
  getPasswordPolicy,
  validatePasswordByPolicy,
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
// HELPER — Cloudinary image upload
// ----------------------------------------------------------------
const uploadToCloudinary = async (buffer, folder, publicId, transformation) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${process.env.CLOUDINARY_FOLDER}/${folder}`,
        public_id: publicId,
        transformation,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// ----------------------------------------------------------------
// HELPER — Cloudinary image delete
// ----------------------------------------------------------------
const deleteFromCloudinary = async (url, folder) => {
  if (!url || !url.includes("cloudinary")) return;
  try {
    const parts = url.split("/");
    const fileWithExt = parts[parts.length - 1];
    const publicId = fileWithExt.split(".")[0];
    await cloudinary.uploader.destroy(
      `${process.env.CLOUDINARY_FOLDER}/${folder}/${publicId}`
    );
  } catch (err) {
    console.warn("Cloudinary delete failed:", err.message);
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/user/profile
// @desc    Get current user profile
// @access  Private
// ----------------------------------------------------------------
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return notFoundResponse(res, "User not found");

    return successResponse(res, {
      data: { user: user.toJSON() },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse(res, { message: "Failed to fetch profile." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/user/profile
// @desc    Update profile — all fields
// @access  Private
// ----------------------------------------------------------------
const updateProfile = async (req, res) => {
  try {
    const {
      firstName, lastName, username, professionalTitle, bio,
      phone, whatsapp, website, calendarLink, socialLinks,
      business, location, timezone, preferences, isProfilePublic,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return notFoundResponse(res, "User not found");

    // ---- IDENTITY ----
    if (firstName !== undefined) {
      if (!firstName.trim()) {
        return validationErrorResponse(res, [
          { field: "firstName", message: "First name cannot be empty" },
        ]);
      }
      if (firstName.trim().length < 2) {
        return validationErrorResponse(res, [
          { field: "firstName", message: "First name must be at least 2 characters" },
        ]);
      }
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) user.lastName = lastName?.trim() || null;

    if (username !== undefined && username !== null) {
      const usernameRegex = /^[a-z0-9_\.]+$/;
      if (!usernameRegex.test(username.toLowerCase())) {
        return validationErrorResponse(res, [
          { field: "username", message: "Username can only contain letters, numbers, underscores and dots" },
        ]);
      }
      // Duplicate check
      const existing = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existing) {
        return errorResponse(res, {
          message: "This username is already taken. Please choose another.",
          statusCode: 409,
        });
      }
      user.username = username.toLowerCase().trim();

      // Public profile slug set karo
      user.publicProfileSlug = username.toLowerCase().trim();
    }

    if (professionalTitle !== undefined) user.professionalTitle = professionalTitle?.trim() || null;
    if (bio !== undefined) {
      if (bio && bio.length > 300) {
        return validationErrorResponse(res, [
          { field: "bio", message: "Bio cannot exceed 300 characters" },
        ]);
      }
      user.bio = bio?.trim() || null;
    }

    // ---- CONTACT ----
    if (phone !== undefined) {
      if (phone === null) {
        user.phone = { countryCode: "+91", number: null };
      } else {
        if (phone.countryCode) user.phone.countryCode = phone.countryCode;
        if (phone.number !== undefined) user.phone.number = phone.number?.trim() || null;
      }
    }

    if (whatsapp !== undefined) user.whatsapp = whatsapp?.trim() || null;
    if (website !== undefined) user.website = website?.trim() || null;
    if (calendarLink !== undefined) user.calendarLink = calendarLink?.trim() || null;

    // ---- SOCIAL LINKS ----
    if (socialLinks) {
      const socialFields = ["linkedin", "twitter", "github", "instagram", "youtube", "facebook"];
      socialFields.forEach((field) => {
        if (socialLinks[field] !== undefined) {
          user.socialLinks[field] = socialLinks[field]?.trim() || null;
        }
      });
    }

    // ---- BUSINESS ----
    if (business) {
      if (business.company !== undefined) user.business.company = business.company?.trim() || null;
      if (business.industry !== undefined) user.business.industry = business.industry || null;
      if (business.companySize !== undefined) user.business.companySize = business.companySize || null;
      if (business.companyWebsite !== undefined) user.business.companyWebsite = business.companyWebsite?.trim() || null;
      if (business.gstNumber !== undefined) user.business.gstNumber = business.gstNumber?.trim() || null;
    }

    // ---- LOCATION ----
    if (location) {
      if (location.country !== undefined) user.location.country = location.country?.trim() || null;
      if (location.state !== undefined) user.location.state = location.state?.trim() || null;
      if (location.city !== undefined) user.location.city = location.city?.trim() || null;
    }

    if (timezone !== undefined) user.timezone = timezone;

    // ---- PREFERENCES ----
    if (preferences) {
      const prefFields = ["language", "currency", "dateFormat", "timeFormat", "emailDigest", "notificationSound", "viewMode", "defaultBotLanguage"];
      prefFields.forEach((field) => {
        if (preferences[field] !== undefined) {
          user.preferences[field] = preferences[field];
        }
      });
    }

    // ---- PUBLIC PROFILE ----
    if (isProfilePublic !== undefined) user.isProfilePublic = isProfilePublic;

    await user.save();

    return successResponse(res, {
      message: "Profile updated successfully!",
      data: {
        user: user.toJSON(),
        profileCompletion: user.profileCompletion,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse(res, { message: "Failed to update profile." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/avatar
// @desc    Upload avatar (5MB, auto crop 400x400)
// @access  Private
// ----------------------------------------------------------------
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return validationErrorResponse(res, [
        { field: "avatar", message: "Please select an image to upload" },
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

    const user = await User.findById(req.user._id);

    // Old avatar delete karo
    await deleteFromCloudinary(user.avatar, "avatars");

    // Upload karo
    const result = await uploadToCloudinary(
      buffer,
      "avatars",
      `user_${user._id}_${Date.now()}`,
      [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ]
    );

    user.avatar = result.secure_url;
    await user.save();

    return successResponse(res, {
      message: "Avatar updated successfully!",
      data: {
        avatar: user.avatar,
        profileCompletion: user.profileCompletion,
      },
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return errorResponse(res, { message: "Failed to update avatar." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/avatar
// @desc    Remove avatar
// @access  Private
// ----------------------------------------------------------------
const removeAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.avatar) {
      return errorResponse(res, {
        message: "No avatar to remove.",
        statusCode: 400,
      });
    }

    await deleteFromCloudinary(user.avatar, "avatars");
    user.avatar = null;
    await user.save();

    return successResponse(res, {
      message: "Avatar removed successfully!",
      data: { profileCompletion: user.profileCompletion },
    });
  } catch (error) {
    console.error("Remove avatar error:", error);
    return errorResponse(res, { message: "Failed to remove avatar." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/cover
// @desc    Upload cover banner (10MB)
// @access  Private
// ----------------------------------------------------------------
const updateCover = async (req, res) => {
  try {
    if (!req.file) {
      return validationErrorResponse(res, [
        { field: "cover", message: "Please select an image to upload" },
      ]);
    }

    const { mimetype, buffer, size } = req.file;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimetype)) {
      return validationErrorResponse(res, [
        { field: "cover", message: "Only JPEG, PNG, and WebP images are allowed" },
      ]);
    }

    if (size > 10 * 1024 * 1024) {
      return validationErrorResponse(res, [
        { field: "cover", message: "Cover image cannot exceed 10MB" },
      ]);
    }

    const user = await User.findById(req.user._id);

    // Old cover delete karo
    await deleteFromCloudinary(user.coverBanner, "covers");

    // Upload karo — 1200x400 banner size
    const result = await uploadToCloudinary(
      buffer,
      "covers",
      `cover_${user._id}_${Date.now()}`,
      [
        { width: 1200, height: 400, crop: "fill", gravity: "center" },
        { quality: "auto", fetch_format: "auto" },
      ]
    );

    user.coverBanner = result.secure_url;
    await user.save();

    return successResponse(res, {
      message: "Cover banner updated successfully!",
      data: { coverBanner: user.coverBanner },
    });
  } catch (error) {
    console.error("Update cover error:", error);
    return errorResponse(res, { message: "Failed to update cover banner." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/cover
// @desc    Remove cover banner
// @access  Private
// ----------------------------------------------------------------
const removeCover = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.coverBanner) {
      return errorResponse(res, {
        message: "No cover banner to remove.",
        statusCode: 400,
      });
    }

    await deleteFromCloudinary(user.coverBanner, "covers");
    user.coverBanner = null;
    await user.save();

    return successResponse(res, { message: "Cover banner removed successfully!" });
  } catch (error) {
    console.error("Remove cover error:", error);
    return errorResponse(res, { message: "Failed to remove cover banner." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/user/password
// @desc    Change password
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
        { field: "newPassword", message: "New password must be different from current password" },
      ]);
    }

    const user = await User.findById(req.user._id).select("+password +refreshTokens");

    if (!user.password) {
      return errorResponse(res, {
        message: "This account uses Google login. You cannot set a password.",
        statusCode: 400,
      });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return errorResponse(res, {
        message: "Current password is incorrect.",
        statusCode: 400,
      });
    }

    user.password = newPassword;

    // Current session rakho — baki clear karo
    const currentToken = req.cookies?.refreshToken;
    if (currentToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t === currentToken);
    } else {
      user.refreshTokens = [];
    }

    await user.save();
    await sendPasswordChangedEmail(user).catch(() => {});

    return successResponse(res, {
      message: "Password changed successfully! Other devices have been logged out.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return errorResponse(res, { message: "Failed to change password." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/change-email/request
// @desc    Email change OTP — dono emails pe
// @access  Private
// ----------------------------------------------------------------
const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail?.trim()) {
      return validationErrorResponse(res, [
        { field: "newEmail", message: "New email is required" },
      ]);
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return validationErrorResponse(res, [
        { field: "newEmail", message: "Please enter a valid email address" },
      ]);
    }

    if (newEmail.toLowerCase() === req.user.email) {
      return validationErrorResponse(res, [
        { field: "newEmail", message: "New email must be different from current email" },
      ]);
    }

    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      return errorResponse(res, {
        message: "This email is already registered with another account.",
        statusCode: 409,
      });
    }

    const user = await User.findById(req.user._id);
    const otp = generateOTP();
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;

    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      attempts: 0,
      lockedUntil: null,
    };

    await user.save();

    await Promise.all([
      sendEmailChangeOTP(user.email, user.firstName, otp, true),
      sendEmailChangeOTP(newEmail, user.firstName, otp, false),
    ]);

    return successResponse(res, {
      message: `OTP sent to both ${user.email} and ${newEmail}. Please check both inboxes.`,
      data: {
        currentEmail: user.email,
        newEmail: newEmail.toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Request email change error:", error);
    return errorResponse(res, { message: "Failed to initiate email change." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/change-email/verify
// @desc    OTP verify karke email change karo
// @access  Private
// ----------------------------------------------------------------
const verifyEmailChange = async (req, res) => {
  try {
    const { otp, newEmail } = req.body;

    if (!otp || !newEmail) {
      return validationErrorResponse(res, [
        { field: "general", message: "OTP and new email are required" },
      ]);
    }

    const user = await User.findById(req.user._id);

    if (!user.otp?.code) {
      return errorResponse(res, {
        message: "No OTP found. Please request a new one.",
        statusCode: 400,
      });
    }

    if (user.otp.lockedUntil && new Date() < new Date(user.otp.lockedUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.otp.lockedUntil) - new Date()) / 60000
      );
      return errorResponse(res, {
        message: `Too many attempts. Please try again in ${minutesLeft} minute(s).`,
        statusCode: 429,
      });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return errorResponse(res, {
        message: "OTP has expired. Please request a new one.",
        statusCode: 400,
      });
    }

    if (user.otp.code !== otp.toString()) {
      user.otp.attempts += 1;
      const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;

      if (user.otp.attempts >= maxAttempts) {
        user.otp.lockedUntil = new Date(
          Date.now() + parseInt(process.env.OTP_LOCKOUT_MINUTES || 60) * 60 * 1000
        );
        await user.save();
        return errorResponse(res, {
          message: "Too many wrong attempts. Please try again later.",
          statusCode: 429,
        });
      }

      await user.save();
      return errorResponse(res, {
        message: `Invalid OTP. ${maxAttempts - user.otp.attempts} attempt(s) remaining.`,
        statusCode: 400,
      });
    }

    const existing = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: user._id },
    });

    if (existing) {
      return errorResponse(res, {
        message: "This email is already taken.",
        statusCode: 409,
      });
    }

    user.email = newEmail.toLowerCase().trim();
    user.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null };
    await user.save();

    return successResponse(res, {
      message: "Email updated successfully!",
      data: { email: user.email },
    });
  } catch (error) {
    console.error("Verify email change error:", error);
    return errorResponse(res, { message: "Failed to change email." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/user/notifications
// @desc    Notification preferences update
// @access  Private
// ----------------------------------------------------------------
const updateNotificationPrefs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { email, inApp } = req.body;

    if (email) {
      const emailFields = ["payment", "planExpiry", "botLimit", "newLogin", "newsletter", "weeklyReport"];
      emailFields.forEach((field) => {
        if (email[field] !== undefined) {
          user.notificationPrefs.email[field] = email[field];
        }
      });
    }

    if (inApp) {
      const inAppFields = ["payment", "planExpiry", "botLimit", "newLogin", "announcements", "tips"];
      inAppFields.forEach((field) => {
        if (inApp[field] !== undefined) {
          user.notificationPrefs.inApp[field] = inApp[field];
        }
      });
    }

    await user.save();

    return successResponse(res, {
      message: "Notification preferences updated!",
      data: { notificationPrefs: user.notificationPrefs },
    });
  } catch (error) {
    console.error("Update notification prefs error:", error);
    return errorResponse(res, { message: "Failed to update notification preferences." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/user/sessions
// @desc    Active sessions list
// @access  Private
// ----------------------------------------------------------------
const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+refreshTokens");
    const currentToken = req.cookies?.refreshToken;

    const sessions = user.refreshTokens.map((token, index) => {
      const decoded = verifyRefreshToken(token);
      return {
        sessionId: index,
        token: token.substring(0, 20) + "...",
        isCurrent: token === currentToken,
        expiresAt: decoded ? new Date(decoded.exp * 1000) : null,
      };
    });

    return successResponse(res, {
      data: { sessions, total: sessions.length },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return errorResponse(res, { message: "Failed to fetch sessions." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/sessions/all
// @desc    Logout all devices
// @access  Private
// ----------------------------------------------------------------
const logoutAllDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+refreshTokens");
    user.refreshTokens = [];
    await user.save();
    clearRefreshTokenCookie(res);

    return successResponse(res, {
      message: "Logged out from all devices successfully.",
    });
  } catch (error) {
    console.error("Logout all devices error:", error);
    return errorResponse(res, { message: "Failed to logout all devices." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/2fa/setup
// @desc    2FA setup — QR code generate
// @access  Private
// ----------------------------------------------------------------
const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (user.twoFactorEnabled) {
      return errorResponse(res, {
        message: "2FA is already enabled. Disable it first to reset.",
        statusCode: 400,
      });
    }

    const secret = speakeasy.generateSecret({
      name: `${process.env.TOTP_APP_NAME || "Lexioai"} (${user.email})`,
      issuer: process.env.TOTP_ISSUER || "lexioai.com",
      length: 32,
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return successResponse(res, {
      message: "Scan the QR code with your authenticator app, then verify with the code.",
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32,
        manualEntry: secret.otpauth_url,
      },
    });
  } catch (error) {
    console.error("Setup 2FA error:", error);
    return errorResponse(res, { message: "Failed to setup 2FA." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/2fa/verify
// @desc    2FA verify karke enable karo
// @access  Private
// ----------------------------------------------------------------
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return validationErrorResponse(res, [
        { field: "token", message: "Authenticator code is required" },
      ]);
    }

    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (!user.twoFactorSecret) {
      return errorResponse(res, {
        message: "Please setup 2FA first.",
        statusCode: 400,
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
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

    user.twoFactorEnabled = true;
    user.backupCodes = backupCodes;
    await user.save();

    return successResponse(res, {
      message: "2FA enabled successfully! Save your backup codes in a safe place.",
      data: { backupCodes },
    });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return errorResponse(res, { message: "Failed to enable 2FA." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/2fa
// @desc    2FA disable
// @access  Private
// ----------------------------------------------------------------
const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return validationErrorResponse(res, [
        { field: "token", message: "Authenticator code is required to disable 2FA" },
      ]);
    }

    const user = await User.findById(req.user._id).select("+twoFactorSecret +backupCodes");

    if (!user.twoFactorEnabled) {
      return errorResponse(res, {
        message: "2FA is not enabled.",
        statusCode: 400,
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token.toString(),
      window: 2,
    });

    const isBackupCode = user.backupCodes.includes(token.toUpperCase());

    if (!verified && !isBackupCode) {
      return errorResponse(res, {
        message: "Invalid code.",
        statusCode: 400,
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = [];
    await user.save();

    return successResponse(res, { message: "2FA disabled successfully." });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return errorResponse(res, { message: "Failed to disable 2FA." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/delete-account
// @desc    Account deletion request (7 day grace)
// @access  Private
// ----------------------------------------------------------------
const requestAccountDeletion = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return validationErrorResponse(res, [
        { field: "password", message: "Please confirm your password to delete account" },
      ]);
    }

    const user = await User.findById(req.user._id).select("+password");

    if (user.password) {
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return errorResponse(res, {
          message: "Incorrect password.",
          statusCode: 400,
        });
      }
    }

    user.deletionRequestedAt = new Date();
    await user.save();

    return successResponse(res, {
      message: "Account deletion scheduled. Your account will be deleted in 7 days. You can cancel anytime by logging in.",
      data: {
        deletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.error("Request account deletion error:", error);
    return errorResponse(res, { message: "Failed to process deletion request." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/cancel-deletion
// @desc    Account deletion cancel
// @access  Private
// ----------------------------------------------------------------
const cancelAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.deletionRequestedAt) {
      return errorResponse(res, {
        message: "No deletion request found.",
        statusCode: 400,
      });
    }

    user.deletionRequestedAt = null;
    await user.save();

    return successResponse(res, {
      message: "Account deletion cancelled. Your account is safe!",
    });
  } catch (error) {
    console.error("Cancel account deletion error:", error);
    return errorResponse(res, { message: "Failed to cancel deletion." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/user/public/:username
// @desc    Public profile dekho
// @access  Public
// ----------------------------------------------------------------
// SUPPORT TICKETS
// ----------------------------------------------------------------
const createSupportTicket = async (req, res) => {
  try {
    const { subject, description, email, screenshotUrl } = req.body;

    // Validation
    if (!subject?.trim()) {
      return validationErrorResponse(res, [
        { field: "subject", message: "Subject is required" },
      ]);
    }

    if (!description?.trim()) {
      return validationErrorResponse(res, [
        { field: "description", message: "Description is required" },
      ]);
    }

    if (!email?.trim()) {
      return validationErrorResponse(res, [
        { field: "email", message: "Email is required" },
      ]);
    }

    const SupportTicket = require("../models/SupportTicket.model");

    // Create ticket
    const ticket = await SupportTicket.create({
      subject: subject.trim(),
      description: description.trim(),
      userId: req.user._id,
      userName: req.user.name || req.user.username || "User",
      userEmail: email.trim(),
      screenshotUrl: screenshotUrl || null,
      category: "other",
      priority: "medium",
      status: "open",
      unreadByAdmin: 1,
    });

    return successResponse(res, {
      message: "Support ticket created successfully",
      data: { ticket },
      statusCode: 201,
    });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return errorResponse(res, {
      message: "Failed to create support ticket",
    });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/user/support-tickets
// @desc    Fetch current user's support tickets
// @access  Private
// ----------------------------------------------------------------
const getUserTickets = async (req, res) => {
  try {
    const SupportTicket = require("../models/SupportTicket.model");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      SupportTicket.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-replies"),
      SupportTicket.countDocuments({ userId: req.user._id }),
    ]);

    return successResponse(res, {
      data: {
        tickets,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get user tickets error:", error);
    return errorResponse(res, { message: "Failed to fetch your tickets" });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/user/support-tickets/:ticketId
// @desc    Get full ticket details with replies
// @access  Private (only ticket creator can view)
// ----------------------------------------------------------------
const getUserTicketDetail = async (req, res) => {
  try {
    const SupportTicket = require("../models/SupportTicket.model");
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      userId: req.user._id,
    }).populate("assignedTo", "name email avatar");

    if (!ticket) {
      return forbiddenResponse(res, "You don't have access to this ticket");
    }

    // Mark user messages as read
    ticket.unreadByUser = 0;
    await ticket.save();

    return successResponse(res, { data: { ticket } });
  } catch (error) {
    console.error("Get user ticket error:", error);
    return errorResponse(res, { message: "Failed to fetch ticket" });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/user/support-tickets/:ticketId/reply
// @desc    User replies to their support ticket
// @access  Private (only ticket creator)
// ----------------------------------------------------------------
const userReplybToTicket = async (req, res) => {
  try {
    const { message, screenshotUrl } = req.body;

    if (!message?.trim()) {
      return validationErrorResponse(res, [
        { field: "message", message: "Message is required" },
      ]);
    }

    const SupportTicket = require("../models/SupportTicket.model");
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      userId: req.user._id,
    });

    if (!ticket) {
      return forbiddenResponse(res, "You don't have access to this ticket");
    }

    if (ticket.status === "closed") {
      return errorResponse(res, {
        message: "Cannot reply to a closed ticket",
        statusCode: 400,
      });
    }

    const replyObj = {
      message: message.trim(),
      senderType: "user",
      senderId: req.user._id,
      senderName: req.user.name || req.user.username || "User",
      senderAvatar: req.user.avatar || null,
    };

    // Add screenshot if provided
    if (screenshotUrl) {
      replyObj.screenshotUrl = screenshotUrl;
    }

    ticket.replies.push(replyObj);

    ticket.lastReplyAt = new Date();
    ticket.lastReplyBy = "user";
    ticket.unreadByAdmin = (ticket.unreadByAdmin || 0) + 1;
    await ticket.save();

    return successResponse(res, {
      message: "Reply sent successfully",
      data: { ticket },
    });
  } catch (error) {
    console.error("User reply error:", error);
    return errorResponse(res, { message: "Failed to send reply" });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/support-tickets/:ticketId
// @desc    Delete a specific support ticket (only creator)
// @access  Private (only ticket creator)
// ----------------------------------------------------------------
const deleteSupportTicket = async (req, res) => {
  try {
    const SupportTicket = require("../models/SupportTicket.model");
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      userId: req.user._id,
    });

    if (!ticket) {
      return forbiddenResponse(res, "You don't have access to this ticket");
    }

    // Delete from Cloudinary if screenshot exists
    if (ticket.screenshotUrl) {
      try {
        const cloudinary = require("cloudinary").v2;
        const publicId = ticket.screenshotUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`lexio-tickets/${publicId}`);
      } catch (err) {
        // Continue deletion even if Cloudinary fails
      }
    }

    // Delete screenshots from replies
    if (ticket.replies && ticket.replies.length > 0) {
      for (const reply of ticket.replies) {
        if (reply.screenshotUrl) {
          try {
            const cloudinary = require("cloudinary").v2;
            const publicId = reply.screenshotUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`lexio-tickets/${publicId}`);
          } catch (err) {
            // Continue despite Cloudinary errors
          }
        }
      }
    }

    await SupportTicket.deleteOne({ _id: req.params.ticketId });

    return successResponse(res, {
      message: "Ticket deleted successfully",
      statusCode: 204,
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return errorResponse(res, { message: "Failed to delete ticket" });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/user/support-tickets/delete-all
// @desc    Delete all support tickets for current user
// @access  Private
// ----------------------------------------------------------------
const deleteAllSupportTickets = async (req, res) => {
  try {
    const SupportTicket = require("../models/SupportTicket.model");
    const tickets = await SupportTicket.find({ userId: req.user._id });

    // Delete all Cloudinary images
    if (tickets.length > 0) {
      const cloudinary = require("cloudinary").v2;
      for (const ticket of tickets) {
        // Delete main screenshot
        if (ticket.screenshotUrl) {
          try {
            const publicId = ticket.screenshotUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`lexio-tickets/${publicId}`);
          } catch (err) {
            // Continue despite errors
          }
        }

        // Delete screenshots from replies
        if (ticket.replies && ticket.replies.length > 0) {
          for (const reply of ticket.replies) {
            if (reply.screenshotUrl) {
              try {
                const publicId = reply.screenshotUrl.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`lexio-tickets/${publicId}`);
              } catch (err) {
                // Continue despite errors
              }
            }
          }
        }
      }
    }

    const result = await SupportTicket.deleteMany({ userId: req.user._id });

    return successResponse(res, {
      message: "All tickets deleted successfully",
      data: { deletedCount: result.deletedCount },
      statusCode: 204,
    });
  } catch (error) {
    console.error("Delete all tickets error:", error);
    return errorResponse(res, { message: "Failed to delete tickets" });
  }
};

// ----------------------------------------------------------------
  

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updateCover,
  removeCover,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  updateNotificationPrefs,
  getSessions,
  logoutAllDevices,
  setup2FA,
  verify2FA,
  disable2FA,
  requestAccountDeletion,
  cancelAccountDeletion,
  createSupportTicket,
  getUserTickets,
  getUserTicketDetail,
  userReplybToTicket,
  deleteSupportTicket,
  deleteAllSupportTickets,
};