const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));

const {
  createBot,
  getBots,
  getBot,
  updateBotBasic,
  updateBotAppearance,
  updateBotBehavior,
  updateBotContact,
  updateBusinessHours,
  updateLeadCapture,
  updateConversationStarters,
  toggleBot,
  getEmbedCode,
  verifyInstallation,
  deleteBot,
  getBotStats,
  uploadBotAvatar,
} = require("../controllers/bot.controller");

const { protect, requireEmailVerified, requirePlan } = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// MULTER — Memory storage for avatar upload
// ----------------------------------------------------------------
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WebP files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------

// Create bot — 10 per hour
const createBotLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many bot creation attempts. Please try again later.",
  },
});

// Verify installation — 10 per hour
const verifyLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
  },
});

// ----------------------------------------------------------------
// ALL ROUTES — Login + Email verified zaroori hai
// ----------------------------------------------------------------
router.use(protect, requireEmailVerified);

// ----------------------------------------------------------------
// BOT CRUD
// ----------------------------------------------------------------

// Create bot
router.post("/", createBotLimiter, createBot);

// Get all bots
router.get("/", getBots);

// Get single bot
router.get("/:botId", getBot);

// Delete bot
router.delete("/:botId", deleteBot);

// ----------------------------------------------------------------
// BOT SETTINGS UPDATE
// ----------------------------------------------------------------

// Basic info update
router.put("/:botId/basic", updateBotBasic);

// Appearance update
router.put("/:botId/appearance", updateBotAppearance);

// Avatar upload
router.post("/:botId/upload-avatar", upload.single("avatar"), uploadBotAvatar);

// Behavior update
router.put("/:botId/behavior", updateBotBehavior);

// Contact info update
router.put("/:botId/contact", updateBotContact);

// Business hours update
router.put("/:botId/business-hours", updateBusinessHours);

// Lead capture update
router.put("/:botId/lead-capture", updateLeadCapture);

// Conversation starters update
router.put("/:botId/starters", updateConversationStarters);

// Toggle bot live/offline
router.put("/:botId/toggle", toggleBot);

// ----------------------------------------------------------------
// BOT EMBED & VERIFY
// ----------------------------------------------------------------

// Get embed code
router.get("/:botId/embed", getEmbedCode);

// Verify installation
router.post("/:botId/verify", verifyLimiter, verifyInstallation);

// ----------------------------------------------------------------
// BOT STATS
// ----------------------------------------------------------------

// Get bot stats
router.get("/:botId/stats", getBotStats);

// Training routes — nested
router.use("/:botId/training", require("./training.routes"));

module.exports = router;