const express = require("express");
const Plan = require("../models/Plan.model");
const mongoose = require("mongoose");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  getWidgetConfig,
  startWidgetConversation,
  sendWidgetMessage,
  captureWidgetLead,
  endWidgetConversation,
  getPublicStats,
} = require("../controllers/widget.controller");

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------

// Disable rate limiting in development
const isDev = process.env.NODE_ENV !== 'production';

// Message — 30 per minute per IP (disabled in dev)
const messageLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many messages. Please slow down.",
  },
});

// Start conversation — 10 per hour per IP (disabled in dev)
const startLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many conversations started. Please try again later.",
  },
});

// Lead capture — 5 per hour per IP (disabled in dev)
const leadLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ----------------------------------------------------------------
// CORS — Kisi bhi website se allow (widget ke liye)
// ----------------------------------------------------------------
// router.use((req, res, next) => {
//   const origin = req.headers.origin;
//   res.header("Access-Control-Allow-Origin", origin || "*");
//   res.header("Vary", "Origin");
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );

//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }
//   next();
// });


// Public Plans API — Frontend pricing ke liye
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: { plans } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch plans." });
  }
});

// Public Blog API — Frontend blog page ke liye
router.get("/blog", async (req, res) => {
  try {
    const BlogPost = mongoose.model("BlogPost");
    const posts = await BlogPost.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .select("-content")
      .limit(20);
    res.json({ success: true, data: { posts } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch blog." });
  }
});

router.get("/blog/:slug", async (req, res) => {
  try {
    const BlogPost = mongoose.model("BlogPost");
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      isPublished: true,
    });
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    post.views += 1;
    await post.save();
    res.json({ success: true, data: { post } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch post." });
  }
});


// ----------------------------------------------------------------
// PUBLIC ROUTES — No auth needed
// ----------------------------------------------------------------

// Landing page public stats
router.get("/stats", getPublicStats);

// Bot config fetch
router.get("/:embedKey/config", getWidgetConfig);

// Start conversation
router.post("/:embedKey/start", startLimiter, startWidgetConversation);

// Send message
router.post("/:embedKey/message", messageLimiter, sendWidgetMessage);

// Lead capture
router.post("/:embedKey/lead", leadLimiter, captureWidgetLead);

// End conversation
router.post("/:embedKey/end", endWidgetConversation);

module.exports = router;