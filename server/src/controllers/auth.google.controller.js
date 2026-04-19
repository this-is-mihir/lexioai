const {
  generateTokens,
  setRefreshTokenCookie,
} = require("../utils/jwt.utils");
const {
  successResponse,
  errorResponse,
} = require("../utils/response.utils");
const { sendNewLoginEmail } = require("../utils/email.utils");
const { dispatchEventNotification } = require("../utils/eventNotifications.utils");
const User = require("../models/User.model");

// ----------------------------------------------------------------
// HELPER — IP address lo
// ----------------------------------------------------------------
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

// ----------------------------------------------------------------
// @route   GET /api/v1/auth/google
// @desc    Google OAuth redirect
// @access  Public
// ----------------------------------------------------------------
// (Passport middleware handle karta hai — route mein define hoga)

// ----------------------------------------------------------------
// @route   GET /api/v1/auth/google/callback
// @desc    Google OAuth callback — token generate karo
// @access  Public
// ----------------------------------------------------------------
const googleCallback = async (req, res) => {
  try {
    // req.user — passport ne set kiya hai
    if (!req.user) {
      const clientURL = process.env.CLIENT_URL;
      return res.redirect(
        `${clientURL}/login?error=Google+login+failed.+Please+try+again.`
      );
    }

    const user = await User.findById(req.user._id).select("+refreshTokens");

    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=User+not+found.+Please+register+again.`
      );
    }

    // Tokens generate karo
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Refresh token save karo (max 5 devices)
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }
    user.refreshTokens.push(refreshToken);
    await user.save();

    // Cookie set karo
    await setRefreshTokenCookie(res, refreshToken);

    // Login alert notification
    const ip = getClientIP(req);
    const device = req.headers["user-agent"] || "Unknown";
    dispatchEventNotification({
      user,
      type: "newLogin",
      title: "New login detected",
      message: `A new login was detected from ${ip}. If this was not you, please secure your account immediately.`,
      priority: "medium",
      metadata: { ip, device },
      emailPrefKey: "newLogin",
      inAppPrefKey: "newLogin",
      fallbackEmailEnabled: true,
      fallbackInAppEnabled: true,
      sendEmail: () =>
        sendNewLoginEmail(user, {
          ip,
          device,
        }),
    }).catch(() => {});

    // Frontend pe redirect karo with access token
    // Token URL mein dena safe nahi — isliye short-lived temp token use karenge
    // Frontend pe jaake /auth/refresh se proper token lega
    const clientURL = process.env.CLIENT_URL;
    return res.redirect(
      `${clientURL}/auth/google/success?token=${accessToken}`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=Something+went+wrong.+Please+try+again.`
    );
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/auth/google/failure
// @desc    Google OAuth failure handler
// @access  Public
// ----------------------------------------------------------------
const googleFailure = (req, res) => {
  const message =
    req.query.error ||
    "Google login failed. Please try again or use email/password.";
  return res.redirect(
    `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(message)}`
  );
};

module.exports = {
  googleCallback,
  googleFailure,
};