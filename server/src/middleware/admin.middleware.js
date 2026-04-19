const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser.model");
const {
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} = require("../utils/response.utils");

// ----------------------------------------------------------------
// @middleware  protectAdmin
// @desc        Admin JWT verify karo
// ----------------------------------------------------------------
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    // Bearer token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return unauthorizedResponse(res, "Access denied. Please login to continue.");
    }

    // Token verify karo
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return unauthorizedResponse(res, "Session expired. Please login again.");
      }
      return unauthorizedResponse(res, "Invalid token. Please login again.");
    }

    // Admin find karo
    const admin = await AdminUser.findById(decoded.id).select("+refreshTokens");

    if (!admin) {
      return unauthorizedResponse(res, "Admin account not found.");
    }

    if (!admin.isActive || admin.isBanned) {
      return forbiddenResponse(res, "Your admin account has been deactivated.");
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Protect admin middleware error:", error);
    return errorResponse(res, { message: "Authentication failed." });
  }
};

// ----------------------------------------------------------------
// @middleware  requireSuperAdmin
// @desc        Sirf SuperAdmin allow karo
// ----------------------------------------------------------------
const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "superadmin") {
    return forbiddenResponse(
      res,
      "This action requires SuperAdmin privileges."
    );
  }
  next();
};

// ----------------------------------------------------------------
// @middleware  requirePermission
// @desc        Specific permission check karo
// Usage: requirePermission("users", "ban")
// ----------------------------------------------------------------
const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.admin) {
      return unauthorizedResponse(res, "Please login to continue.");
    }

    // SuperAdmin — always allow
    if (req.admin.role === "superadmin") {
      return next();
    }

    // Permission check
    if (!req.admin.hasPermission(module, action)) {
      return forbiddenResponse(
        res,
        `You don't have permission to ${action} ${module}.`
      );
    }

    next();
  };
};

// ----------------------------------------------------------------
// @middleware  require2FA
// @desc        SuperAdmin ke liye 2FA verify zaroori
// ----------------------------------------------------------------
const require2FA = async (req, res, next) => {
  if (req.admin?.role !== "superadmin") {
    return next(); // Non-superadmin ke liye skip
  }

  if (!req.admin.twoFactorEnabled) {
    return forbiddenResponse(
      res,
      "SuperAdmin must enable 2FA before accessing the admin panel."
    );
  }

  next();
};

// ----------------------------------------------------------------
// @middleware  logAdminAction
// @desc        Admin action automatically audit log mein save karo
// Usage: logAdminAction("USER_BANNED", "users", "User banned")
// ----------------------------------------------------------------
const logAdminAction = (action, module, getDescription) => {
  return async (req, res, next) => {
    // Response finish hone ke baad log karo
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Sirf successful actions log karo
      if (body?.success) {
        try {
          const AuditLog = require("../models/AuditLog.model");
          const description =
            typeof getDescription === "function"
              ? getDescription(req, body)
              : getDescription;

          await AuditLog.log({
            adminId: req.admin._id,
            adminName: req.admin.name,
            adminRole: req.admin.role,
            adminIP: req.ip,
            action,
            module,
            description,
            userAgent: req.headers["user-agent"],
            status: "success",
          });
        } catch (err) {
          console.error("Audit log middleware error:", err.message);
        }
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  protectAdmin,
  requireSuperAdmin,
  requirePermission,
  require2FA,
  logAdminAction,
};