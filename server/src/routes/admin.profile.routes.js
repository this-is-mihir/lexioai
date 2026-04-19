const router = require("express").Router();
const {
  getCurrentProfile,
  updateProfile,
  verifyEmailOTP,
  changePassword,
  requestPasswordReset,
  resetPasswordWithOTP,
  setup2FA,
  verify2FA,
  disable2FA,
  getActiveSessions,
  logoutAllDevices,
} = require("../controllers/admin.profile.controller");
const { protectAdmin } = require("../middleware/admin.middleware");

// ================================================================
// Admin Profile Routes (All require authentication)
// ================================================================

// Get current admin profile
router.get("/profile", protectAdmin, getCurrentProfile);

// Update profile (name, email - OTP verification flow)
router.put("/profile", protectAdmin, updateProfile);

// Verify email OTP
router.post("/profile/verify-email-otp", protectAdmin, verifyEmailOTP);

// ================================================================
// Password Management
// ================================================================

// Change password (requires current password)
router.post("/password/change", protectAdmin, changePassword);

// Request password reset (send OTP to email)
router.post("/password/reset-request", requestPasswordReset);

// Reset password with OTP
router.post("/password/reset", resetPasswordWithOTP);

// ================================================================
// Two-Factor Authentication
// ================================================================

// Setup 2FA (generate QR code + secret)
router.post("/2fa/setup", protectAdmin, setup2FA);

// Verify & enable 2FA
router.post("/2fa/verify", protectAdmin, verify2FA);

// Disable 2FA
router.post("/2fa/disable", protectAdmin, disable2FA);

// ================================================================
// Sessions Management
// ================================================================

// Get active sessions
router.get("/sessions", protectAdmin, getActiveSessions);

// Logout from all devices
router.post("/sessions/logout-all", protectAdmin, logoutAllDevices);

module.exports = router;
