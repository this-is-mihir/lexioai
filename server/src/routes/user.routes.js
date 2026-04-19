const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));

const {
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
} = require("../controllers/user.controller");

const {
  protect,
  requireEmailVerified,
} = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// MULTER — Image upload
// ----------------------------------------------------------------
const imageStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
  }
};

// Avatar — 5MB
const avatarUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Cover — 10MB
const coverUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ----------------------------------------------------------------
// MULTER ERROR HANDLER
// ----------------------------------------------------------------
const handleMulterError = (upload, fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: fieldName === "avatar"
            ? "Image size cannot exceed 5MB"
            : "Cover image cannot exceed 10MB",
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------
const sensitiveActionLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many attempts. Please try again after 1 hour.",
  },
});

const emailChangeLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many email change requests. Please try again later.",
  },
});

// ----------------------------------------------------------------
// PUBLIC ROUTES — No auth needed
// ----------------------------------------------------------------


// ----------------------------------------------------------------
// PROTECTED ROUTES — Login zaroori
// ----------------------------------------------------------------
router.use(protect);

// ----------------------------------------------------------------
// PROFILE
// ----------------------------------------------------------------
router.get("/profile", getProfile);
router.put("/profile", requireEmailVerified, updateProfile);

// Avatar
router.post(
  "/avatar",
  requireEmailVerified,
  handleMulterError(avatarUpload, "avatar"),
  updateAvatar
);
router.delete("/avatar", requireEmailVerified, removeAvatar);

// Cover Banner
router.post(
  "/cover",
  requireEmailVerified,
  handleMulterError(coverUpload, "cover"),
  updateCover
);
router.delete("/cover", requireEmailVerified, removeCover);

// ----------------------------------------------------------------
// SECURITY
// ----------------------------------------------------------------
router.put("/password", requireEmailVerified, sensitiveActionLimiter, changePassword);

router.post("/change-email/request", requireEmailVerified, emailChangeLimiter, requestEmailChange);
router.post("/change-email/verify", requireEmailVerified, verifyEmailChange);

router.get("/sessions", getSessions);
router.delete("/sessions/all", logoutAllDevices);

// ----------------------------------------------------------------
// 2FA
// ----------------------------------------------------------------
router.post("/2fa/setup", requireEmailVerified, setup2FA);
router.post("/2fa/verify", requireEmailVerified, verify2FA);
router.delete("/2fa", requireEmailVerified, sensitiveActionLimiter, disable2FA);

// ----------------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------------
router.put("/notifications", requireEmailVerified, updateNotificationPrefs);

// ----------------------------------------------------------------
// ACCOUNT
// ----------------------------------------------------------------
router.post("/delete-account", requireEmailVerified, sensitiveActionLimiter, requestAccountDeletion);
router.post("/cancel-deletion", requireEmailVerified, cancelAccountDeletion);

// ----------------------------------------------------------------
// SUPPORT TICKETS
// ----------------------------------------------------------------
router.post("/support-tickets/create", requireEmailVerified, createSupportTicket);
router.get("/support-tickets", requireEmailVerified, getUserTickets);
router.get("/support-tickets/:ticketId", requireEmailVerified, getUserTicketDetail);
router.post("/support-tickets/:ticketId/reply", requireEmailVerified, userReplybToTicket);
router.delete("/support-tickets/:ticketId", requireEmailVerified, deleteSupportTicket);
router.delete("/support-tickets/delete-all", requireEmailVerified, deleteAllSupportTickets);

module.exports = router;