const Razorpay  = require("razorpay");
const crypto    = require("crypto");
const User          = require("../models/User.model");
const Plan          = require("../models/Plan.model");
const CreditPackage = require("../models/CreditPackage.model");
const Coupon        = require("../models/Coupon.model");
const AuditLog      = require("../models/AuditLog.model");
const PaymentTransaction = require("../models/PaymentTransaction.model");
const { sendPaymentSuccessEmail } = require("../utils/email.utils");
const { dispatchEventNotification } = require("../utils/eventNotifications.utils");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response.utils");

// ----------------------------------------------------------------
// RAZORPAY INSTANCE
// ----------------------------------------------------------------
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

const CREDIT_ELIGIBLE_PLANS = ["pro", "business"];
const SUPPORTED_CURRENCIES = ["INR", "USD"];
const CURRENCY_SYMBOL = {
  INR: "₹",
  USD: "$",
};

const normalizeCurrency = (value) => {
  const normalized = String(value || "INR").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : "INR";
};

const getPlanAmountByCurrency = (plan, billingCycle, currency) => {
  if (!plan || !billingCycle) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  const amount = plan?.pricing?.[normalizedCurrency]?.[billingCycle];
  if (amount === undefined || amount === null) return null;
  return Number(amount);
};

const getPackageAmountByCurrency = (pkg, currency) => {
  if (!pkg) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  const amount = pkg?.pricing?.[normalizedCurrency];
  if (amount === undefined || amount === null) return null;
  return Number(amount);
};

const isCreditEligiblePlan = (plan) =>
  CREDIT_ELIGIBLE_PLANS.includes(String(plan || "").toLowerCase());

const reservePaymentTransaction = async ({
  razorpayPaymentId,
  userId,
  kind,
  razorpayOrderId = null,
  razorpaySubscriptionId = null,
  planName = null,
  billingCycle = null,
}) => {
  const result = await PaymentTransaction.updateOne(
    { razorpayPaymentId },
    {
      $setOnInsert: {
        userId,
        kind,
        razorpayOrderId,
        razorpaySubscriptionId,
        planName,
        billingCycle,
        status: "processing",
      },
    },
    { upsert: true }
  );

  const wasInserted = Boolean(result?.upsertedCount || result?.upsertedId);
  if (wasInserted) return { reserved: true, existing: null };

  const existing = await PaymentTransaction.findOne({ razorpayPaymentId }).lean();
  if (
    existing?.status === "failed" &&
    existing?.userId &&
    String(existing.userId) === String(userId)
  ) {
    await PaymentTransaction.updateOne(
      { _id: existing._id, status: "failed" },
      {
        $set: {
          status: "processing",
          failureReason: null,
          kind,
          razorpayOrderId,
          razorpaySubscriptionId,
          planName,
          billingCycle,
        },
      }
    );
    return { reserved: true, existing: null };
  }

  return { reserved: false, existing };
};

// ----------------------------------------------------------------
// PLAN → RAZORPAY PLAN ID MAP (from .env)
// ----------------------------------------------------------------
const getRazorpayPlanId = (planName, billingCycle, currency = "INR") => {
  const normalizedCurrency = normalizeCurrency(currency);
  const keyWithCurrency = `RAZORPAY_${planName.toUpperCase()}_${billingCycle.toUpperCase()}_${normalizedCurrency}`;
  const legacyKey = `RAZORPAY_${planName.toUpperCase()}_${billingCycle.toUpperCase()}`;

  if (normalizedCurrency === "INR") {
    return process.env[keyWithCurrency] || process.env[legacyKey] || null;
  }

  return process.env[keyWithCurrency] || null;
};

// ----------------------------------------------------------------
// INTERNAL HELPER — validate coupon and calculate discount
// Used by: validateCoupon route, createSubscription
// ----------------------------------------------------------------
const getCouponDiscount = async ({ code, planName, billingCycle, originalAmount, userId }) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

  if (!coupon)       throw { statusCode: 404, message: "Invalid coupon code." };
  if (!coupon.isActive) throw { statusCode: 400, message: "This coupon is no longer active." };

  // Check expiry
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    throw { statusCode: 400, message: "This coupon has expired." };
  }

  // Check max total uses
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw { statusCode: 400, message: "This coupon has reached its usage limit." };
  }

  // Check per-user usage
  if (coupon.maxUsesPerUser > 0) {
    const userUsageCount = coupon.usedBy.filter(
      (u) => u.userId.toString() === userId.toString()
    ).length;
    if (userUsageCount >= coupon.maxUsesPerUser) {
      throw {
        statusCode: 400,
        message: `You have already used this coupon ${coupon.maxUsesPerUser} time(s).`,
      };
    }
  }

  // Check applicable plans
  if (
    !coupon.applicablePlans.includes("all") &&
    !coupon.applicablePlans.includes(planName)
  ) {
    throw { statusCode: 400, message: `This coupon is not valid for the ${planName} plan.` };
  }

  // Check applicable billing cycle (skip for credits)
  if (
    planName !== "credits" &&
    coupon.applicableBilling !== "both" &&
    coupon.applicableBilling !== billingCycle
  ) {
    throw {
      statusCode: 400,
      message: `This coupon is only valid for ${coupon.applicableBilling} billing.`,
    };
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round((originalAmount * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else if (coupon.discountType === "fixed") {
    discountAmount = Math.min(coupon.discountValue, originalAmount);
  }

  const finalAmount = Math.max(originalAmount - discountAmount, 0);

  return { coupon, discountAmount, finalAmount };
};

// ----------------------------------------------------------------
// INTERNAL HELPER — mark coupon as used after successful payment
// Non-blocking — won't fail the payment if this errors
// ----------------------------------------------------------------
const markCouponAsUsed = async ({ code, userId, planName, discountAmount }) => {
  try {
    if (!code) return;

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return;

    coupon.usedCount += 1;
    coupon.usedBy.push({
      userId,
      usedAt:         new Date(),
      planName,
      discountAmount,
    });

    // Auto-deactivate if max uses reached
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      coupon.isActive = false;
    }

    await coupon.save();
  } catch (error) {
    console.error("markCouponAsUsed error:", error);
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/coupon/validate
// @desc   Real-time coupon preview — returns discount details
// @body   { code, planName, billingCycle, currency? }
//         planName:     starter | pro | business
//         billingCycle: monthly | yearly
// ----------------------------------------------------------------
const validateCoupon = async (req, res) => {
  try {
    const { code, planName, billingCycle, currency } = req.body;
    const normalizedCurrency = normalizeCurrency(currency);

    if (!code || !planName) {
      return validationErrorResponse(res, [
        { field: "general", message: "code and planName are required" },
      ]);
    }

    if (planName === "credits") {
      return errorResponse(res, {
        message: "Coupons are only available for subscription plans.",
        statusCode: 400,
      });
    }

    if (!billingCycle) {
      return validationErrorResponse(res, [
        { field: "billingCycle", message: "billingCycle is required for plan coupons" },
      ]);
    }

    const plan = await Plan.findOne({ name: planName });
    if (!plan) return notFoundResponse(res, "Plan not found.");

    const originalAmount = getPlanAmountByCurrency(plan, billingCycle, normalizedCurrency);
    if (originalAmount === null) {
      return errorResponse(res, {
        message: `${normalizedCurrency} pricing is not configured for this plan.`,
        statusCode: 400,
      });
    }

    // Validate and calculate
    const { coupon, discountAmount, finalAmount } = await getCouponDiscount({
      code,
      planName,
      billingCycle,
      originalAmount,
      userId: req.user._id,
    });

    return successResponse(res, {
      message: "Coupon applied successfully!",
      data: {
        code:           coupon.code,
        discountType:   coupon.discountType,
        discountValue:  coupon.discountValue,
        currency:       normalizedCurrency,
        originalAmount,
        discountAmount,
        finalAmount,
        summary:
          coupon.discountType === "percentage"
            ? `${coupon.discountValue}% off — you save ${CURRENCY_SYMBOL[normalizedCurrency]}${discountAmount}!`
            : `${CURRENCY_SYMBOL[normalizedCurrency]}${coupon.discountValue} off — you save ${CURRENCY_SYMBOL[normalizedCurrency]}${discountAmount}!`,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(res, { message: err.message, statusCode: err.statusCode });
    }
    console.error("validateCoupon error:", err);
    return errorResponse(res, { message: "Failed to validate coupon." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/subscription/create
// @desc   Create Razorpay subscription — now supports coupon
// @body   { planName, billingCycle, couponCode?, currency? }
// ----------------------------------------------------------------
const createSubscription = async (req, res) => {
  try {
    const { planName, billingCycle, couponCode, currency } = req.body;
    const normalizedCurrency = normalizeCurrency(currency);

    if (!planName || !billingCycle) {
      return validationErrorResponse(res, [
        { field: "general", message: "planName and billingCycle are required" },
      ]);
    }
    if (!["starter", "pro", "business"].includes(planName)) {
      return validationErrorResponse(res, [
        { field: "planName", message: "Invalid plan. Choose starter, pro, or business" },
      ]);
    }
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return validationErrorResponse(res, [
        { field: "billingCycle", message: "billingCycle must be monthly or yearly" },
      ]);
    }

    // ── Coupon handling ──
    let couponData = null;

    if (couponCode) {
      const plan = await Plan.findOne({ name: planName });
      if (!plan) return notFoundResponse(res, "Plan not found.");

      const originalAmount = getPlanAmountByCurrency(plan, billingCycle, normalizedCurrency);
      if (originalAmount === null) {
        return errorResponse(res, {
          message: `${normalizedCurrency} pricing is not configured for this plan.`,
          statusCode: 400,
        });
      }

      try {
        const result = await getCouponDiscount({
          code: couponCode,
          planName,
          billingCycle,
          originalAmount,
          userId: req.user._id,
        });
        couponData = {
          code:           result.coupon.code,
          discountAmount: result.discountAmount,
          finalAmount:    result.finalAmount,
          originalAmount,
        };
      } catch (couponErr) {
        // Invalid coupon — reject request
        return errorResponse(res, {
          message: couponErr.message || "Invalid coupon.",
          statusCode: couponErr.statusCode || 400,
        });
      }
    }

    // ── If coupon applied — create one-time Razorpay Order with discounted amount ──
    // ── If no coupon — create Razorpay Subscription as before ──

    if (couponData && couponData.discountAmount > 0) {
      // Discounted first payment as one-time order
      // Subsequent payments will use subscription (handled by webhook)
      const razorpayPlanId = getRazorpayPlanId(planName, billingCycle, normalizedCurrency);
      if (!razorpayPlanId) {
        return errorResponse(res, { message: `${normalizedCurrency} payment plan not configured. Contact support.` });
      }

      // Create subscription but with first payment discounted via order
      const order = await razorpay.orders.create({
        amount:   Math.round(couponData.finalAmount * 100), // paise
        currency: normalizedCurrency,
        notes: {
          userId:       req.user._id.toString(),
          planName,
          billingCycle,
          currency: normalizedCurrency,
          userEmail:    req.user.email,
          couponCode:   couponData.code,
          discountAmount: couponData.discountAmount,
          paymentType:  "subscription_with_coupon",
        },
      });

      return successResponse(res, {
        message: "Order created with coupon discount!",
        data: {
          paymentType:    "order",       // frontend uses this to open order-based checkout
          orderId:        order.id,
          razorpayKeyId:  process.env.RAZORPAY_KEY_ID,
          planName,
          billingCycle,
          currency: normalizedCurrency,
          originalAmount: couponData.originalAmount,
          discountAmount: couponData.discountAmount,
          finalAmount:    couponData.finalAmount,
          couponCode:     couponData.code,
          user: {
            name:  req.user.name,
            email: req.user.email,
          },
        },
      });
    }

    // No coupon — normal subscription flow
    const razorpayPlanId = getRazorpayPlanId(planName, billingCycle, normalizedCurrency);
    if (!razorpayPlanId) {
      return errorResponse(res, { message: `${normalizedCurrency} payment plan not configured. Contact support.` });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id:         razorpayPlanId,
      customer_notify: 1,
      total_count:     billingCycle === "monthly" ? 12 : 1,
      notes: {
        userId:      req.user._id.toString(),
        planName,
        billingCycle,
        currency: normalizedCurrency,
        userEmail:   req.user.email,
      },
    });

    return successResponse(res, {
      message: "Subscription created!",
      data: {
        paymentType:    "subscription",  // frontend uses this to open subscription checkout
        subscriptionId: subscription.id,
        razorpayKeyId:  process.env.RAZORPAY_KEY_ID,
        planName,
        billingCycle,
        currency: normalizedCurrency,
        user: {
          name:  req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return errorResponse(res, { message: "Failed to create subscription. Try again." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/subscription/verify
// @desc   Verify payment & activate plan
// @body   Subscription: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planName, billingCycle, couponCode?, discountAmount? }
//         Order (coupon): { razorpay_payment_id, razorpay_order_id, razorpay_signature, planName, billingCycle, couponCode?, discountAmount? }
// ----------------------------------------------------------------
const verifySubscription = async (req, res) => {
  let transactionReserved = false;
  let transactionVerified = false;
  let paymentIdForTransaction = null;

  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_order_id,
      razorpay_signature,
      planName,
      billingCycle,
      currency,
      couponCode,
      discountAmount,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature) {
      return validationErrorResponse(res, [
        { field: "general", message: "Payment details missing" },
      ]);
    }

    if (!razorpay_subscription_id && !razorpay_order_id) {
      return validationErrorResponse(res, [
        { field: "general", message: "Subscription or order id is required" },
      ]);
    }

    // ── Signature verify — works for both subscription and order ──
    let body;
    if (razorpay_subscription_id) {
      body = razorpay_payment_id + "|" + razorpay_subscription_id;
    } else {
      body = razorpay_order_id + "|" + razorpay_payment_id;
    }

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return errorResponse(res, {
        message: "Payment verification failed. Invalid signature.",
        statusCode: 400,
      });
    }

    let effectivePlanName = null;
    let effectiveBillingCycle = null;
    let effectiveCurrency = normalizeCurrency(currency);
    let effectiveCouponCode = couponCode || null;
    let effectiveDiscountAmount = Number(discountAmount || 0);

    if (razorpay_subscription_id) {
      const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
      const notes = subscription?.notes || {};

      if (!notes.userId || notes.userId !== req.user._id.toString()) {
        return errorResponse(res, {
          message: "Payment does not belong to current user.",
          statusCode: 403,
        });
      }

      effectivePlanName = notes.planName;
      effectiveBillingCycle = notes.billingCycle;
      effectiveCurrency = normalizeCurrency(notes.currency || effectiveCurrency);
    } else {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const notes = order?.notes || {};

      if (order?.status !== "paid") {
        return errorResponse(res, {
          message: "Order payment is not completed yet.",
          statusCode: 400,
        });
      }

      if (!notes.userId || notes.userId !== req.user._id.toString()) {
        return errorResponse(res, {
          message: "Payment does not belong to current user.",
          statusCode: 403,
        });
      }

      effectivePlanName = notes.planName;
      effectiveBillingCycle = notes.billingCycle;
      effectiveCurrency = normalizeCurrency(notes.currency || effectiveCurrency);
      effectiveCouponCode = notes.couponCode || effectiveCouponCode;
      effectiveDiscountAmount = Number(notes.discountAmount || effectiveDiscountAmount || 0);

      const plan = await Plan.findOne({ name: effectivePlanName }).select("pricing").lean();
      if (!plan) {
        return notFoundResponse(res, "Plan not found.");
      }

      const originalAmount = getPlanAmountByCurrency(plan, effectiveBillingCycle, effectiveCurrency);
      if (originalAmount === null) {
        return errorResponse(res, {
          message: `${effectiveCurrency} pricing is not configured for this plan.`,
          statusCode: 400,
        });
      }
      const expectedAmountPaise = Math.round(
        Math.max(originalAmount - Number(effectiveDiscountAmount || 0), 0) * 100
      );

      if (Number(order.amount) !== expectedAmountPaise) {
        return errorResponse(res, {
          message: "Amount mismatch detected for this subscription payment.",
          statusCode: 400,
        });
      }
    }

    if (!['starter', 'pro', 'business'].includes(effectivePlanName)) {
      return validationErrorResponse(res, [
        { field: "planName", message: "Invalid plan in payment notes" },
      ]);
    }

    if (!['monthly', 'yearly'].includes(effectiveBillingCycle)) {
      return validationErrorResponse(res, [
        { field: "billingCycle", message: "Invalid billing cycle in payment notes" },
      ]);
    }

    const reservation = await reservePaymentTransaction({
      razorpayPaymentId: razorpay_payment_id,
      userId: req.user._id,
      kind: "subscription",
      razorpayOrderId: razorpay_order_id || null,
      razorpaySubscriptionId: razorpay_subscription_id || null,
      planName: effectivePlanName,
      billingCycle: effectiveBillingCycle,
    });

    paymentIdForTransaction = razorpay_payment_id;
    transactionReserved = reservation.reserved;

    if (!reservation.reserved) {
      const user = await User.findById(req.user._id).select("plan planStartedAt planExpiry lastPaymentId");
      const isIdempotentReplay =
        reservation.existing?.status === "verified" ||
        (reservation.existing?.status === "processing" && user?.lastPaymentId === razorpay_payment_id);

      if (isIdempotentReplay) {
        return successResponse(res, {
          message: "Plan payment already verified.",
          data: {
            plan: user?.plan,
            planStartedAt: user?.planStartedAt,
            planExpiry: user?.planExpiry,
          },
        });
      }

      return errorResponse(res, {
        message: "Payment is already being processed. Please retry in a moment.",
        statusCode: 409,
      });
    }

    // Plan expiry calculate karo
    const now    = new Date();
    const expiry = new Date(now);
    if (effectiveBillingCycle === "monthly") {
      expiry.setMonth(expiry.getMonth() + 1);
    } else {
      expiry.setFullYear(expiry.getFullYear() + 1);
    }

    // User plan update karo
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        plan:          effectivePlanName,
        planStartedAt: now,
        planExpiry:    expiry,
        razorpaySubId: razorpay_subscription_id || null,
        lastPaymentId: razorpay_payment_id,
      },
      { returnDocument: 'after' }
    );

    // Mark coupon as used (non-blocking)
    if (effectiveCouponCode) {
      await markCouponAsUsed({
        code:           effectiveCouponCode,
        userId:         req.user._id,
        planName:       effectivePlanName,
        discountAmount: effectiveDiscountAmount || 0,
      });
    }

    await PaymentTransaction.findOneAndUpdate(
      { razorpayPaymentId: razorpay_payment_id },
      {
        $set: {
          status: "verified",
          failureReason: null,
          amountINR: 0,
          planName: effectivePlanName,
          billingCycle: effectiveBillingCycle,
        },
      }
    );
    transactionVerified = true;

    await AuditLog.log({
      adminId:     null,
      adminName:   "System",
      adminRole:   "system",
      adminIP:     getClientIP(req),
      action:      "SUBSCRIPTION_ACTIVATED",
      module:      "payments",
      description: `User ${user.email} subscribed to ${effectivePlanName} (${effectiveBillingCycle})${effectiveCouponCode ? ` with coupon ${effectiveCouponCode}` : ""}`,
      targetType:  "user",
      targetId:    user._id,
      targetName:  user.email,
    });

    try {
      const plan = await Plan.findOne({ name: effectivePlanName }).select("pricing").lean();
      const originalAmount = getPlanAmountByCurrency(plan, effectiveBillingCycle, effectiveCurrency);
      if (originalAmount === null) {
        throw new Error(`${effectiveCurrency} pricing is not configured for this plan.`);
      }
      const parsedDiscount = Number(effectiveDiscountAmount || 0);
      const safeDiscount = Number.isFinite(parsedDiscount) ? parsedDiscount : 0;
      const paidAmount = Math.max(originalAmount - safeDiscount, 0);

      await PaymentTransaction.findOneAndUpdate(
        { razorpayPaymentId: razorpay_payment_id },
        { $set: { amountINR: paidAmount } }
      );

      await dispatchEventNotification({
        user,
        type: "payment",
        title: "Payment received",
        message: `Your ${effectivePlanName} (${effectiveBillingCycle}) payment of ${effectiveCurrency} ${paidAmount} was successful.`,
        priority: "medium",
        metadata: {
          planName: effectivePlanName,
          billingCycle: effectiveBillingCycle,
          currency: effectiveCurrency,
          amount: paidAmount,
          transactionId: razorpay_payment_id,
        },
        dedupeKey: `payment-${razorpay_payment_id}`,
        emailPrefKey: "payment",
        inAppPrefKey: "payment",
        fallbackEmailEnabled: true,
        fallbackInAppEnabled: true,
        sendEmail: () =>
          sendPaymentSuccessEmail(user, {
            plan: effectivePlanName,
            currency: effectiveCurrency,
            amount: paidAmount,
            transactionId: razorpay_payment_id,
          }),
      });
    } catch (notificationError) {
      console.error("Payment notification dispatch failed:", notificationError.message);
    }

    return successResponse(res, {
      message: `${effectivePlanName} plan activated successfully!`,
      data: {
        plan:       user.plan,
        planStartedAt: user.planStartedAt,
        planExpiry: user.planExpiry,
      },
    });
  } catch (error) {
    if (transactionReserved && !transactionVerified && paymentIdForTransaction) {
      await PaymentTransaction.findOneAndUpdate(
        { razorpayPaymentId: paymentIdForTransaction, status: "processing" },
        {
          $set: {
            status: "failed",
            failureReason: error?.message || "Subscription verification failed",
          },
        }
      );
    }

    console.error("Verify subscription error:", error);
    return errorResponse(res, { message: "Failed to verify payment." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/subscription/cancel
// ----------------------------------------------------------------
const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.razorpaySubId) {
      return errorResponse(res, { message: "No active subscription found." });
    }

    await razorpay.subscriptions.cancel(user.razorpaySubId, { cancel_at_cycle_end: 1 });

    return successResponse(res, {
      message: "Subscription cancelled. You can use the plan until expiry date.",
      data: { planExpiry: user.planExpiry },
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return errorResponse(res, { message: "Failed to cancel subscription." });
  }
};

// ----------------------------------------------------------------
// @route  GET /api/v1/payments/credit-packages
// ----------------------------------------------------------------
const getCreditPackages = async (req, res) => {
  try {
    const packages = await CreditPackage.find({ isActive: true }).sort({ sortOrder: 1 });
    return successResponse(res, { data: { packages } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch credit packages." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/credits/create
// @desc   Create order for credit purchase
// @body   { packageId, currency? }
// ----------------------------------------------------------------
const createCreditOrder = async (req, res) => {
  try {
    const { packageId, currency } = req.body;
    const normalizedCurrency = normalizeCurrency(currency);

    // Security checks
    if (!isCreditEligiblePlan(req.user.plan)) {
      return errorResponse(res, {
        message: "Credits are available on Pro and Business plans only.",
        statusCode: 403,
      });
    }
    if (!req.user.isPlanActive()) {
      return errorResponse(res, {
        message: "Your plan has expired. Please renew your subscription to purchase credits.",
        statusCode: 403,
      });
    }

    const pkg = await CreditPackage.findById(packageId);
    if (!pkg || !pkg.isActive) return notFoundResponse(res, "Credit package not found or inactive.");

    const packageAmount = getPackageAmountByCurrency(pkg, normalizedCurrency);
    if (packageAmount === null) {
      return errorResponse(res, {
        message: `${normalizedCurrency} pricing is not configured for this credit package.`,
        statusCode: 400,
      });
    }

    const order = await razorpay.orders.create({
      amount:   Math.round(packageAmount * 100), // minor units
      currency: normalizedCurrency,
      notes: {
        userId:         req.user._id.toString(),
        packageId,
        credits:        pkg.credits,
        currency:       normalizedCurrency,
        packageAmount,
        userEmail:      req.user.email,
      },
    });

    return successResponse(res, {
      message: "Order created!",
      data: {
        orderId:        order.id,
        amount:         packageAmount,
        currency:       normalizedCurrency,
        credits:        pkg.credits,
        packageName:    pkg.name,
        razorpayKeyId:  process.env.RAZORPAY_KEY_ID,
        user: {
          name:  req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    console.error("Create credit order error:", error);
    return errorResponse(res, { message: "Failed to create order." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/credits/verify
// @desc   Verify credit purchase & add credits
// @body   { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId }
// ----------------------------------------------------------------
const verifyCreditPayment = async (req, res) => {
  let transactionReserved = false;
  let transactionVerified = false;
  let paymentIdForTransaction = null;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      packageId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
      return validationErrorResponse(res, [
        { field: "general", message: "Order, payment, signature and packageId are required" },
      ]);
    }

    // Signature verify
    const body        = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return errorResponse(res, { message: "Payment verification failed.", statusCode: 400 });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order?.notes || {};
    const effectiveCurrency = normalizeCurrency(notes.currency);

    if (order?.status !== "paid") {
      return errorResponse(res, {
        message: "Order payment is not completed yet.",
        statusCode: 400,
      });
    }

    if (!notes.userId || notes.userId !== req.user._id.toString()) {
      return errorResponse(res, {
        message: "Payment does not belong to current user.",
        statusCode: 403,
      });
    }

    if (!notes.packageId || notes.packageId !== packageId) {
      return errorResponse(res, {
        message: "Package mismatch detected for this payment.",
        statusCode: 400,
      });
    }

    // Double check security
    const user = await User.findById(req.user._id);
    if (!isCreditEligiblePlan(user.plan)) {
      return errorResponse(res, {
        message: "Credits are available on Pro and Business plans only.",
        statusCode: 403,
      });
    }

    if (!user.isPlanActive()) {
      return errorResponse(res, {
        message: "Your plan has expired. Please renew your subscription to purchase credits.",
        statusCode: 403,
      });
    }

    const pkg = await CreditPackage.findById(notes.packageId);
    if (!pkg || !pkg.isActive) return notFoundResponse(res, "Credit package not found or inactive.");

    const packageAmount = getPackageAmountByCurrency(pkg, effectiveCurrency);
    if (packageAmount === null) {
      return errorResponse(res, {
        message: `${effectiveCurrency} pricing is not configured for this credit package.`,
        statusCode: 400,
      });
    }

    const expectedAmount = Math.round(Number(packageAmount || 0) * 100);
    if (!expectedAmount || Number(order.amount) !== expectedAmount) {
      return errorResponse(res, {
        message: "Amount mismatch detected for this payment.",
        statusCode: 400,
      });
    }

    if (Number(order.amount_paid || 0) < expectedAmount) {
      return errorResponse(res, {
        message: "Paid amount is less than expected package amount.",
        statusCode: 400,
      });
    }

    const reservation = await reservePaymentTransaction({
      razorpayPaymentId: razorpay_payment_id,
      userId: req.user._id,
      kind: "credits",
      razorpayOrderId: razorpay_order_id,
      planName: "credits",
    });

    paymentIdForTransaction = razorpay_payment_id;
    transactionReserved = reservation.reserved;

    if (!reservation.reserved) {
      const latestUser = await User.findById(req.user._id).select("chatCredits lastPaymentId");
      const isIdempotentReplay =
        reservation.existing?.status === "verified" ||
        (reservation.existing?.status === "processing" && latestUser?.lastPaymentId === razorpay_payment_id);

      if (isIdempotentReplay) {
        return successResponse(res, {
          message: "Credits payment already verified.",
          data: {
            creditsAdded: 0,
            totalCredits: latestUser?.chatCredits || 0,
          },
        });
      }

      return errorResponse(res, {
        message: "Payment is already being processed. Please retry in a moment.",
        statusCode: 409,
      });
    }

    // Add credits
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $inc: { chatCredits: pkg.credits },
        $set: { lastPaymentId: razorpay_payment_id },
      },
      { new: true }
    );

    await PaymentTransaction.findOneAndUpdate(
      { razorpayPaymentId: razorpay_payment_id },
      {
        $set: {
          status: "verified",
          failureReason: null,
          amountINR: Number(packageAmount || 0),
          credits: Number(pkg.credits || 0),
          planName: "credits",
        },
      }
    );
    transactionVerified = true;

    await AuditLog.log({
      adminId:     null,
      adminName:   "System",
      adminRole:   "system",
      adminIP:     getClientIP(req),
      action:      "CREDITS_PURCHASED",
      module:      "payments",
      description: `User ${updatedUser.email} purchased ${pkg.credits} credits for ${CURRENCY_SYMBOL[effectiveCurrency]}${packageAmount}`,
      targetType:  "user",
      targetId:    updatedUser._id,
      targetName:  updatedUser.email,
    });

    try {
      const paidAmount = Number(packageAmount || 0);

      await dispatchEventNotification({
        user: updatedUser,
        type: "payment",
        title: "Credits purchase successful",
        message: `You purchased ${pkg.credits} credits for ${effectiveCurrency} ${paidAmount}.`,
        priority: "medium",
        metadata: {
          credits: pkg.credits,
          currency: effectiveCurrency,
          amount: paidAmount,
          transactionId: razorpay_payment_id,
        },
        dedupeKey: `payment-${razorpay_payment_id}`,
        emailPrefKey: "payment",
        inAppPrefKey: "payment",
        fallbackEmailEnabled: true,
        fallbackInAppEnabled: true,
        sendEmail: () =>
          sendPaymentSuccessEmail(updatedUser, {
            plan: "credits",
            currency: effectiveCurrency,
            amount: paidAmount,
            transactionId: razorpay_payment_id,
          }),
      });
    } catch (notificationError) {
      console.error("Credits notification dispatch failed:", notificationError.message);
    }

    return successResponse(res, {
      message: `${pkg.credits} credits added successfully!`,
      data: {
        creditsAdded: pkg.credits,
        totalCredits: updatedUser.chatCredits,
      },
    });
  } catch (error) {
    if (transactionReserved && !transactionVerified && paymentIdForTransaction) {
      await PaymentTransaction.findOneAndUpdate(
        { razorpayPaymentId: paymentIdForTransaction, status: "processing" },
        {
          $set: {
            status: "failed",
            failureReason: error?.message || "Credit verification failed",
          },
        }
      );
    }

    console.error("Verify credit payment error:", error);
    return errorResponse(res, { message: "Failed to verify payment." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/payments/webhook
// ----------------------------------------------------------------
const handleWebhook = async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET is missing; refusing webhook processing.");
    return res.status(503).json({ error: "Webhook temporarily unavailable" });
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature   = req.headers["x-razorpay-signature"];
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSig) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event   = req.body.event;
    const payload = req.body.payload;

    if (event === "subscription.cancelled" || event === "subscription.expired") {
      const subId = payload.subscription?.entity?.id;
      if (subId) {
        await User.findOneAndUpdate(
          { razorpaySubId: subId },
          { plan: "free", planStartedAt: null, planExpiry: null, razorpaySubId: null }
        );
        console.log(`Subscription ${subId} cancelled/expired — user downgraded to free`);
      }
    }

    if (event === "subscription.charged") {
      const subId = payload.subscription?.entity?.id;
      const notes = payload.subscription?.entity?.notes;
      if (subId && notes?.billingCycle) {
        const expiry = new Date();
        const startedAt = new Date();
        if (notes.billingCycle === "monthly") expiry.setMonth(expiry.getMonth() + 1);
        else expiry.setFullYear(expiry.getFullYear() + 1);
        await User.findOneAndUpdate(
          { razorpaySubId: subId },
          { planStartedAt: startedAt, planExpiry: expiry }
        );
        console.log(`Subscription ${subId} renewed`);
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ status: "ok" });
  }
};

module.exports = {
  validateCoupon,
  createSubscription,
  verifySubscription,
  cancelSubscription,
  getCreditPackages,
  createCreditOrder,
  verifyCreditPayment,
  handleWebhook,
};
