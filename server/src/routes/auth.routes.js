const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));
const passport = require("../config/passport");

const {
  register,
  verifyOTP,
  resendOTP,
  login,
  verifyLogin2FA,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/auth.controller");

const {
  googleCallback,
  googleFailure,
} = require("../controllers/auth.google.controller");

const { protect, requireEmailVerified } = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------

// Login — 5 attempts per 15 minutes
const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP — 3 requests per hour
const otpLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register — 10 per hour
const registerLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// ----------------------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------------------

// Register
router.post("/register", registerLimiter, register);

// Verify OTP
router.post("/verify-otp", verifyOTP);

// Resend OTP
router.post("/resend-otp", otpLimiter, resendOTP);

// Login
router.post("/login", loginLimiter, login);

// Login 2FA verification
router.post("/login/verify-2fa", loginLimiter, verifyLogin2FA);

// Refresh Token
router.post("/refresh", refreshToken);

// Forgot Password
router.post("/forgot-password", otpLimiter, forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

// ----------------------------------------------------------------
// GOOGLE OAUTH ROUTES
// ----------------------------------------------------------------

// Step 1 — Google pe redirect karo
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Step 2 — Google callback
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) return next(err);

      if (!user) {
        const errorText = encodeURIComponent(
          info?.message || "Google login failed. Please try again."
        );
        return res.redirect(`/api/v1/auth/google/failure?error=${errorText}`);
      }

      req.user = user;
      return next();
    })(req, res, next);
  },
  googleCallback
);

// Google failure handler
router.get("/google/failure", googleFailure);

// ----------------------------------------------------------------
// PRIVATE ROUTES
// ----------------------------------------------------------------

// Get current user — email verified zaroori
router.get("/me", protect, requireEmailVerified, getMe);

// Logout — email verify nahi bhi ho to logout ho sake
router.post("/logout", protect, logout);

module.exports = router;