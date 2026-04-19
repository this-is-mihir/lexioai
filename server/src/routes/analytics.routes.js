const express = require("express");
const router = express.Router();

const {
  getOverview,
  getChatsGraph,
  getTopQuestions,
  getPeakHours,
  getLanguageStats,
  getDashboardStats,
} = require("../controllers/analytics.controller");

const {
  protect,
  requireEmailVerified,
} = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// ALL ROUTES — Login + Email verified
// ----------------------------------------------------------------
router.use(protect, requireEmailVerified);

// ----------------------------------------------------------------
// DASHBOARD — Saare bots ka combined stats
// ----------------------------------------------------------------
router.get("/dashboard", getDashboardStats);

// ----------------------------------------------------------------
// BOT SPECIFIC ANALYTICS
// ----------------------------------------------------------------

// Overview stats
router.get("/:botId/overview", getOverview);

// Chat volume graph
router.get("/:botId/chats-graph", getChatsGraph);

// Top questions (Pro+)
router.get("/:botId/top-questions", getTopQuestions);

// Peak hours heatmap (Pro+)
router.get("/:botId/peak-hours", getPeakHours);

// Language distribution
router.get("/:botId/languages", getLanguageStats);

module.exports = router;