const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));

const {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  deleteAllLeads,
  exportLeads,
  getLeadStats,
} = require("../controllers/lead.controller");

const {
  protect,
  requireEmailVerified,
} = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------
const createLeadLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many lead requests. Please try again later.",
  },
});

// ----------------------------------------------------------------
// ALL ROUTES — Login + Email verified
// ----------------------------------------------------------------
router.use(protect, requireEmailVerified);

// ----------------------------------------------------------------
// SPECIFIC ROUTES PEHLE
// ----------------------------------------------------------------
router.get("/:botId/stats", getLeadStats);
router.get("/:botId/export", exportLeads);

// ----------------------------------------------------------------
// GENERIC ROUTES BAAD MEIN
// ----------------------------------------------------------------
router.post("/:botId", createLeadLimiter, createLead);
router.get("/:botId", getLeads);
router.delete("/:botId", deleteAllLeads);
router.get("/:botId/:leadId", getLead);
router.put("/:botId/:leadId", updateLead);
router.delete("/:botId/:leadId", deleteLead);
module.exports = router;