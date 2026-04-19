const express  = require("express");
const router   = express.Router();
const { protect } = require("../middleware/auth.middleware");

const {
  validateCoupon,
  createSubscription,
  verifySubscription,
  cancelSubscription,
  getCreditPackages,
  createCreditOrder,
  verifyCreditPayment,
  handleWebhook,
} = require("../controllers/payment.controller");

// ----------------------------------------------------------------
// WEBHOOK — no auth (Razorpay calls this directly)
// ----------------------------------------------------------------
router.post("/webhook", handleWebhook);

// ----------------------------------------------------------------
// PUBLIC — no auth required
// ----------------------------------------------------------------
router.get("/credit-packages", getCreditPackages);

// ----------------------------------------------------------------
// PROTECTED — user must be logged in
// ----------------------------------------------------------------
router.use(protect);

// ----------------------------------------------------------------
// COUPON
// ----------------------------------------------------------------
router.post("/coupon/validate", validateCoupon);

// ----------------------------------------------------------------
// SUBSCRIPTION
// ----------------------------------------------------------------
router.post("/subscription/create", createSubscription);
router.post("/subscription/verify", verifySubscription);
router.post("/subscription/cancel", cancelSubscription);

// ----------------------------------------------------------------
// CREDITS
// ----------------------------------------------------------------
router.post("/credits/create", createCreditOrder);
router.post("/credits/verify", verifyCreditPayment);

module.exports = router;