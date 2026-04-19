const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // PLAN IDENTITY
    // ----------------------------------------------------------------
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true,
      enum: ["free", "starter", "pro", "business"],
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Free", "Starter", "Pro", "Business"
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    // ----------------------------------------------------------------
    // PRICING — INR + USD, Monthly + Yearly
    // ----------------------------------------------------------------
    pricing: {
      INR: {
        monthly: { type: Number, default: 0 },
        yearly: { type: Number, default: 0 },
        yearlyPerMonth: { type: Number, default: 0 }, // yearly/12 for display
      },
      USD: {
        monthly: { type: Number, default: 0 },
        yearly: { type: Number, default: 0 },
        yearlyPerMonth: { type: Number, default: 0 },
      },
    },

    // Yearly discount percentage
    yearlyDiscountPercent: {
      type: Number,
      default: 17,
    },

    // ----------------------------------------------------------------
    // FEATURES / LIMITS
    // ----------------------------------------------------------------
    limits: {
      bots: { type: Number, default: 1 }, // -1 = unlimited
      chatsPerMonth: { type: Number, default: 50 }, // -1 = unlimited
      trainingUrlPages: { type: Number, default: 1 },
      trainingFiles: { type: Number, default: 0 }, // 0 = not allowed
      leadCapture: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false }, // Pro+
      customBranding: { type: Boolean, default: false }, // Remove "Powered by"
      webhooks: { type: Boolean, default: false }, // Business only
      apiAccess: { type: Boolean, default: false }, // Business only
      prioritySupport: { type: Boolean, default: false }, // Pro+
      whiteLabel: { type: Boolean, default: false }, // Business only
    },

    // ----------------------------------------------------------------
    // DISPLAY
    // ----------------------------------------------------------------
    features: {
      type: [String], // Feature list for landing page
      default: [],
    },

    color: {
      type: String,
      default: "#7F77DD", // Plan color for UI
    },

    isPopular: {
      type: Boolean,
      default: false, // "Most Popular" badge
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0, // Display order
    },

    // ----------------------------------------------------------------
    // RAZORPAY PLAN IDS
    // ----------------------------------------------------------------
    razorpay: {
      monthlyPlanId: { type: String, default: null },
      yearlyPlanId: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------

planSchema.index({ isActive: 1 });
planSchema.index({ sortOrder: 1 });

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;