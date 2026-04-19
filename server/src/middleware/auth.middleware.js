const User = require("../models/User.model");
const { verifyAccessToken } = require("../utils/jwt.utils");
const { unauthorizedResponse, forbiddenResponse } = require("../utils/response.utils");

// ----------------------------------------------------------------
// PROTECT MIDDLEWARE — Login check karo
// ----------------------------------------------------------------
const protect = async (req, res, next) => {
  try {
    let token;

    // Token header se lo
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Token nahi mila
    if (!token) {
      return unauthorizedResponse(res, "Please login to access this resource");
    }

    // Token verify karo
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return unauthorizedResponse(res, "Invalid or expired token");
    }

    // User find karo
    const user = await User.findById(decoded.id);
    if (!user) {
      return unauthorizedResponse(res, "User no longer exists");
    }

    // Banned check karo
    if (user.isBanned) {
      return forbiddenResponse(res, "Your account has been banned. Please contact support.");
    }

    // Active check karo
    if (!user.isActive) {
      return forbiddenResponse(res, "Your account is deactivated.");
    }

    // User ko request mein attach karo
    req.user = user;
    next();
  } catch (error) {
    return unauthorizedResponse(res, "Authentication failed");
  }
};

// ----------------------------------------------------------------
// EMAIL VERIFIED MIDDLEWARE
// ----------------------------------------------------------------
const requireEmailVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return forbiddenResponse(res, "Please verify your email first");
  }
  next();
};

// ----------------------------------------------------------------
// PLAN CHECK MIDDLEWARE
// ----------------------------------------------------------------
const requirePlan = (...plans) => {
  return (req, res, next) => {
    if (!plans.includes(req.user.plan)) {
      return forbiddenResponse(
        res,
        `This feature requires ${plans.join(" or ")} plan`
      );
    }
    next();
  };
};

// ----------------------------------------------------------------
// OPTIONAL AUTH — Login ho toh user attach karo, nahi toh bhi chalega
// ----------------------------------------------------------------
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user && !user.isBanned && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  requireEmailVerified,
  requirePlan,
  optionalAuth,
};