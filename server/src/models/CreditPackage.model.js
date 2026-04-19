const mongoose = require("mongoose");

const creditPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    credits: {
      type: Number,
      required: [true, "Credits amount is required"],
      min: [1, "Credits must be at least 1"],
    },

    pricing: {
      INR: { type: Number, required: true, default: 0 },
      USD: { type: Number, required: true, default: 0 },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    // Razorpay one-time payment product ID (baad mein)
    razorpayProductId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

creditPackageSchema.index({ isActive: 1 });
creditPackageSchema.index({ sortOrder: 1 });

const CreditPackage = mongoose.model("CreditPackage", creditPackageSchema);

module.exports = CreditPackage;