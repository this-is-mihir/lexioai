const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));

const {
  startConversation,
  sendMessage,
  endConversation,
  getConversations,
  getConversation,
  deleteConversation,
  deleteAllConversations,
  getUnansweredQuestions,
} = require("../controllers/chat.controller");

const {
  protect,
  requireEmailVerified,
} = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------

// Message send — 30 per minute
const messageLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CHAT_RATE_LIMIT_MAX) || 30,
  message: {
    success: false,
    message: "Too many messages. Please slow down.",
  },
});

// Start conversation — 20 per hour
const startLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many conversations started. Please try again later.",
  },
});

// ----------------------------------------------------------------
// ALL ROUTES — Login + Email verified zaroori
// ----------------------------------------------------------------
router.use(protect, requireEmailVerified);

// ----------------------------------------------------------------
// CONVERSATION ROUTES
// ----------------------------------------------------------------

// Start new conversation
router.post("/:botId/start", startLimiter, startConversation);

// Send message
router.post("/:botId/message", messageLimiter, sendMessage);

// End conversation
router.post("/:botId/end", endConversation);

// Get all conversations
router.get("/:botId/conversations", getConversations);

// Delete all conversations
router.delete("/:botId/conversations", deleteAllConversations);

// Get single conversation
router.get("/:botId/conversations/:conversationId", getConversation);

// Delete single conversation
router.delete("/:botId/conversations/:conversationId", deleteConversation);

// Get unanswered questions
router.get("/:botId/unanswered", getUnansweredQuestions);

module.exports = router;