const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // COUPON CODE
    // ----------------------------------------------------------------
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [4, "Coupon code must be at least 4 characters"],
      maxlength: [20, "Coupon code cannot exceed 20 characters"],
    },

    // ----------------------------------------------------------------
    // DISCOUNT
    // ----------------------------------------------------------------
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: [1, "Discount must be at least 1"],
    },

    // Max discount amount (for percentage coupons)
    maxDiscountAmount: {
      type: Number,
      default: null,
    },

    // ----------------------------------------------------------------
    // APPLICABILITY
    // ----------------------------------------------------------------
    applicablePlans: {
      type: [String],
      enum: ["starter", "pro", "business", "all"],
      default: ["all"],
    },

    applicableBilling: {
      type: String,
      enum: ["monthly", "yearly", "both"],
      default: "both",
    },

    // Specific user ke liye (null = everyone)
    specificUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ----------------------------------------------------------------
    // USAGE LIMITS
    // ----------------------------------------------------------------
    maxUses: {
      type: Number,
      default: null, // null = unlimited
    },

    maxUsesPerUser: {
      type: Number,
      default: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    usedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now },
        planName: { type: String },
        discountAmount: { type: Number },
      },
    ],

    // ----------------------------------------------------------------
    // VALIDITY
    // ----------------------------------------------------------------
    validFrom: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      default: null, // null = no expiry
    },

    // ----------------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------------
    isActive: {
      type: Boolean,
      default: true,
    },

    // ----------------------------------------------------------------
    // META
    // ----------------------------------------------------------------
    description: {
      type: String,
      trim: true,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------

couponSchema.index({ isActive: 1 });
couponSchema.index({ validUntil: 1 });

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------
couponSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (now < new Date(this.validFrom)) return false;
  if (this.validUntil && now > new Date(this.validUntil)) return false;
  if (this.maxUses && this.usedCount >= this.maxUses) return false;
  return true;
};

couponSchema.methods.calculateDiscount = function (amount) {
  if (this.discountType === "percentage") {
    const discount = (amount * this.discountValue) / 100;
    if (this.maxDiscountAmount) {
      return Math.min(discount, this.maxDiscountAmount);
    }
    return discount;
  }
  return Math.min(this.discountValue, amount);
};

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;