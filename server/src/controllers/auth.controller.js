const User = require("../models/User.model");
const {
  generateTokens,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken,
  generateAccessToken,
  generateTwoFactorToken,
  verifyTwoFactorToken,
} = require("../utils/jwt.utils");
const speakeasy = require("speakeasy");
const {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewLoginEmail,
} = require("../utils/email.utils");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} = require("../utils/response.utils");
const disposableDomains = require("disposable-email-domains");
const {
  getGeneralSettings,
  getPasswordPolicy,
  validatePasswordByPolicy,
} = require("../utils/platformSettings.utils");
const { dispatchEventNotification } = require("../utils/eventNotifications.utils");

// ----------------------------------------------------------------
// HELPER — Disposable email check
// ----------------------------------------------------------------
const isDisposableEmail = (email) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};

// ----------------------------------------------------------------
// HELPER — OTP set karo
// ----------------------------------------------------------------
const setOTP = (user, otp) => {
  const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
  user.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
    attempts: 0,
    lockedUntil: null,
  };
};

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
// @route   POST /api/v1/auth/register
// ----------------------------------------------------------------
const register = async (req, res) => {
  try {
    const { name, email, password, fingerprint } = req.body;
    const generalSettings = await getGeneralSettings();
    const passwordPolicy = await getPasswordPolicy();

    if (!generalSettings.allowNewRegistrations) {
      return forbiddenResponse(
        res,
        "New account registrations are currently disabled by the platform administrator."
      );
    }

    if (!name || !email || !password) {
      return validationErrorResponse(res, [
        { field: "general", message: "Name, email aur password zaroori hain" },
      ]);
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse(res, [
        { field: "email", message: "Please enter a valid email address" },
      ]);
    }

    if (isDisposableEmail(email)) {
      return validationErrorResponse(res, [
        {
          field: "email",
          message: "Disposable/temporary emails are not allowed. Please use your real email address.",
        },
      ]);
    }

    const passwordIssues = validatePasswordByPolicy(password, passwordPolicy);
    if (passwordIssues.length > 0) {
      return validationErrorResponse(res, [
        { field: "password", message: passwordIssues[0] },
      ]);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        const otp = generateOTP();
        setOTP(existingUser, otp);
        await existingUser.save();
        await sendOTPEmail(existingUser, otp);

        return errorResponse(res, {
          message: "This email is already registered but not verified. A new OTP has been sent to your email. Please check your inbox and spam folder.",
          statusCode: 409,
          data: {
            userId: existingUser._id,
            requiresVerification: true,
          },
        });
      }

      return errorResponse(res, {
        message: "This email is already registered. Please login instead.",
        statusCode: 409,
      });
    }

    const ip = getClientIP(req);

    const ipAbuse = await User.findOne({
      registrationIP: ip,
      hasUsedFreeTrial: true,
    });

    const fingerprintAbuse = fingerprint
      ? await User.findOne({
          deviceFingerprint: fingerprint,
          hasUsedFreeTrial: true,
        })
      : null;

    if (ipAbuse || fingerprintAbuse) {
      console.warn(`⚠️ Suspicious registration blocked: ${email} from IP ${ip}`);
      return errorResponse(res, {
        message: "Free plan is only available once per device. Please use your existing account or upgrade to a paid plan.",
        statusCode: 403,
      });
    }

    const otp = generateOTP();

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      plan: generalSettings.defaultPlan,
      registrationIP: ip,
      deviceFingerprint: fingerprint || null,
    });

    setOTP(user, otp);
    await user.save();
    await sendOTPEmail(user, otp);

    return successResponse(res, {
      message: "Registration successful! We've sent a 6-digit OTP to your email. Please check your inbox and spam folder.",
      statusCode: 201,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        isEmailVerified: false,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse(res, { message: "Registration failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/verify-otp
// ----------------------------------------------------------------
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return validationErrorResponse(res, [
        { field: "general", message: "User ID and OTP are required" },
      ]);
    }

    const user = await User.findById(userId).select("+refreshTokens");
    if (!user) {
      return errorResponse(res, {
        message: "Invalid request. Please register again.",
        statusCode: 404,
      });
    }

    if (user.isEmailVerified) {
      return successResponse(res, {
        message: "Your email is already verified. Please login.",
      });
    }

    if (!user.otp?.code) {
      return errorResponse(res, {
        message: "OTP not found. Please click 'Resend OTP' to get a new code.",
        statusCode: 400,
      });
    }

    if (user.otp.lockedUntil && new Date() < new Date(user.otp.lockedUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.otp.lockedUntil) - new Date()) / 60000
      );
      return errorResponse(res, {
        message: `Too many wrong attempts. Please try again in ${minutesLeft} minute(s).`,
        statusCode: 429,
      });
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
      return errorResponse(res, {
        message: "OTP has expired. Please click 'Resend OTP' to get a new code.",
        statusCode: 400,
      });
    }

    if (user.otp.code !== otp.toString()) {
      user.otp.attempts += 1;
      const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;

      if (user.otp.attempts >= maxAttempts) {
        const lockMinutes = parseInt(process.env.OTP_LOCKOUT_MINUTES) || 60;
        user.otp.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        await user.save();
        return errorResponse(res, {
          message: `Too many wrong attempts. Please try again after ${lockMinutes} minutes.`,
          statusCode: 429,
        });
      }

      await user.save();
      const attemptsLeft = maxAttempts - user.otp.attempts;
      return errorResponse(res, {
        message: `Invalid OTP. You have ${attemptsLeft} attempt(s) remaining.`,
        statusCode: 400,
      });
    }

    user.isEmailVerified = true;
    user.hasUsedFreeTrial = true;
    user.otp = { code: null, expiresAt: null, attempts: 0, lockedUntil: null };
    await user.save();

    await sendWelcomeEmail(user);

    const { accessToken, refreshToken } = await generateTokens(user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    await setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, {
      message: "Email verified successfully! Welcome to Lexioai! 🎉",
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return errorResponse(res, { message: "OTP verification failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/resend-otp
// ----------------------------------------------------------------
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return validationErrorResponse(res, [
        { field: "general", message: "User ID is required" },
      ]);
    }

    const user = await User.findById(userId).select("+refreshTokens");
    if (!user) {
      return errorResponse(res, {
        message: "User not found. Please register again.",
        statusCode: 404,
      });
    }

    if (user.isEmailVerified) {
      return successResponse(res, {
        message: "Your email is already verified. Please login.",
      });
    }

    const cooldown = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 30;
    if (user.otp?.expiresAt) {
      const otpCreatedAt =
        new Date(user.otp.expiresAt).getTime() -
        parseInt(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000;
      const secondsSinceCreated = (Date.now() - otpCreatedAt) / 1000;

      if (secondsSinceCreated < cooldown) {
        const waitSeconds = Math.ceil(cooldown - secondsSinceCreated);
        return errorResponse(res, {
          message: `Please wait ${waitSeconds} second(s) before requesting a new OTP.`,
          statusCode: 429,
        });
      }
    }

    const otp = generateOTP();
    setOTP(user, otp);
    await user.save();
    await sendOTPEmail(user, otp);

    return successResponse(res, {
      message: "A new OTP has been sent to your email. Please check your inbox and spam folder.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return errorResponse(res, { message: "Failed to resend OTP. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/login
// ----------------------------------------------------------------
const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return validationErrorResponse(res, [
        { field: "general", message: "Email and password are required" },
      ]);
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password +refreshTokens");

    if (!user) {
      return unauthorizedResponse(res, "Invalid email or password. Please check and try again.");
    }

    if (!user.password && user.googleId) {
      return errorResponse(res, {
        message: "This account was created with Google. Please use 'Sign in with Google' instead.",
        statusCode: 400,
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return unauthorizedResponse(res, "Invalid email or password. Please check and try again.");
    }

    if (user.isBanned) {
      return forbiddenResponse(
        res,
        `Your account has been suspended. Reason: ${user.bannedReason || "Please contact support for more information."}`
      );
    }

    if (!user.isActive) {
      return forbiddenResponse(res, "Your account is deactivated. Please contact support.");
    }

    if (!user.isEmailVerified) {
      const otp = generateOTP();
      setOTP(user, otp);
      await user.save();
      await sendOTPEmail(user, otp);

      return errorResponse(res, {
        message: "Your email is not verified. A new OTP has been sent to your email. Please check your inbox and spam folder.",
        statusCode: 403,
        data: { userId: user._id, requiresVerification: true },
      });
    }

    if (user.twoFactorEnabled) {
      const twoFactorChallengeToken = generateTwoFactorToken(user._id, rememberMe);
      return successResponse(res, {
        message: "2FA required. Enter authenticator code to continue.",
        data: {
          requiresTwoFactor: true,
          twoFactorChallengeToken,
          email: user.email,
        },
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user._id, rememberMe);

    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }
    user.refreshTokens.push(refreshToken);
    await user.save();

    await setRefreshTokenCookie(res, refreshToken, rememberMe);

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

    return successResponse(res, {
      message: "Login successful! Welcome back.",
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, { message: "Login failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/login/verify-2fa
// ----------------------------------------------------------------
const verifyLogin2FA = async (req, res) => {
  try {
    const { challengeToken, token } = req.body;

    if (!challengeToken || !token) {
      return validationErrorResponse(res, [
        { field: "general", message: "Challenge token and authenticator code are required" },
      ]);
    }

    const decoded = verifyTwoFactorToken(challengeToken);
    if (!decoded?.id) {
      return unauthorizedResponse(res, "2FA challenge expired. Please login again.");
    }

    const user = await User.findById(decoded.id).select("+twoFactorSecret +backupCodes +refreshTokens");
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return unauthorizedResponse(res, "2FA is not enabled for this account.");
    }

    const normalizedToken = token.toString().trim();
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: normalizedToken,
      window: 2,
    });

    const backupIndex = user.backupCodes.findIndex(
      (code) => code === normalizedToken.toUpperCase()
    );

    if (!verified && backupIndex === -1) {
      return errorResponse(res, {
        message: "Invalid authenticator or backup code.",
        statusCode: 400,
      });
    }

    if (backupIndex !== -1) {
      user.backupCodes.splice(backupIndex, 1);
    }

    const rememberMe = Boolean(decoded.rememberMe);
    const { accessToken, refreshToken } = await generateTokens(user._id, rememberMe);

    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }
    user.refreshTokens.push(refreshToken);
    await user.save();

    await setRefreshTokenCookie(res, refreshToken, rememberMe);

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

    return successResponse(res, {
      message: "2FA verified. Login successful!",
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Verify login 2FA error:", error);
    return errorResponse(res, { message: "2FA verification failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/logout
// ----------------------------------------------------------------
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: refreshToken },
      });
    }

    clearRefreshTokenCookie(res);

    return successResponse(res, {
      message: "You have been logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse(res, { message: "Logout failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/refresh
// ----------------------------------------------------------------
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return unauthorizedResponse(res, "Session expired. Please login again.");
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      clearRefreshTokenCookie(res);
      return unauthorizedResponse(res, "Session expired. Please login again.");
    }

    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user) {
      clearRefreshTokenCookie(res);
      return unauthorizedResponse(res, "User not found. Please login again.");
    }

    if (!user.refreshTokens.includes(token)) {
      clearRefreshTokenCookie(res);
      return unauthorizedResponse(res, "Session expired. Please login again.");
    }

    const newAccessToken = await generateAccessToken(user._id);

    return successResponse(res, {
      message: "Token refreshed successfully",
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return errorResponse(res, { message: "Session refresh failed. Please login again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/forgot-password
// ----------------------------------------------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return validationErrorResponse(res, [
        { field: "email", message: "Email address is required" },
      ]);
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse(res, [
        { field: "email", message: "Please enter a valid email address" },
      ]);
    }

    const successMsg = "If an account exists with this email, you will receive a password reset OTP shortly. Please check your inbox and spam folder. Make sure you entered the exact email you used to register.";

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return successResponse(res, { message: successMsg });
    }

    // Allow Google accounts to set password via forgot-password
    // if (!user.password && user.googleId) {
    //   return successResponse(res, { message: successMsg });
    // }

    const otp = generateOTP();
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;

    user.passwordResetOTP = {
      code: otp,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      attempts: 0,
    };

    try {
      await user.save();
    } catch (saveErr) {
      console.error(`Failed to save user during password reset:`, saveErr.message);
      throw saveErr;
    }
    
    const emailResult = await sendPasswordResetEmail(user, otp);

    return successResponse(res, {
      message: successMsg,
      data: { userId: user._id },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse(res, { message: "Failed to process request. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/auth/reset-password
// ----------------------------------------------------------------
const resetPassword = async (req, res) => {
  try {
    const { userId, email, otp, newPassword, confirmPassword } = req.body;
    const safeEmail = email?.toLowerCase().trim();
    const effectiveConfirmPassword = confirmPassword || newPassword;
    const passwordPolicy = await getPasswordPolicy();

    if ((!userId && !safeEmail) || !otp || !newPassword) {
      return validationErrorResponse(res, [
        { field: "general", message: "Email or userId, OTP and new password are required" },
      ]);
    }

    if (newPassword !== effectiveConfirmPassword) {
      return validationErrorResponse(res, [
        { field: "confirmPassword", message: "Passwords do not match. Please try again." },
      ]);
    }

    const passwordIssues = validatePasswordByPolicy(newPassword, passwordPolicy);
    if (passwordIssues.length > 0) {
      return validationErrorResponse(res, [
        { field: "newPassword", message: passwordIssues[0] },
      ]);
    }

    const user = userId
      ? await User.findById(userId).select("+password +refreshTokens")
      : await User.findOne({ email: safeEmail }).select("+password +refreshTokens");
    if (!user) {
      return errorResponse(res, {
        message: "Invalid request. Please request a new password reset.",
        statusCode: 404,
      });
    }

    if (!user.passwordResetOTP?.code) {
      return errorResponse(res, {
        message: "No password reset request found. Please request a new OTP.",
        statusCode: 400,
      });
    }

    if (new Date() > new Date(user.passwordResetOTP.expiresAt)) {
      return errorResponse(res, {
        message: "OTP has expired. Please request a new password reset.",
        statusCode: 400,
      });
    }

    if (user.passwordResetOTP.attempts >= 10) {
      return errorResponse(res, {
        message: "Too many wrong attempts. Please request a new OTP.",
        statusCode: 429,
      });
    }

    if (user.passwordResetOTP.code !== otp.toString()) {
      user.passwordResetOTP.attempts += 1;
      await user.save();
      const maxAttempts = 10;
      const attemptsLeft = Math.max(0, maxAttempts - user.passwordResetOTP.attempts);
      return errorResponse(res, {
        message: `Invalid OTP. You have ${attemptsLeft} attempt(s) remaining.`,
        statusCode: 400,
      });
    }

    user.password = newPassword;
    user.passwordResetOTP = { code: null, expiresAt: null, attempts: 0 };
    user.refreshTokens = [];
    await user.save();

    clearRefreshTokenCookie(res);
    await sendPasswordChangedEmail(user);

    return successResponse(res, {
      message: "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, { message: "Password reset failed. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/auth/me
// ----------------------------------------------------------------
const getMe = async (req, res) => {
  try {
    return successResponse(res, {
      message: "User data fetched successfully",
      data: { user: req.user.toJSON() },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return errorResponse(res, { message: "Failed to fetch user data." });
  }
};

module.exports = {
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
};