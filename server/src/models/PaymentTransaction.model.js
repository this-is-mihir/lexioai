const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["subscription", "credits"],
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
      trim: true,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
      trim: true,
    },
    planName: {
      type: String,
      enum: ["free", "starter", "pro", "business", "credits", null],
      default: null,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", null],
      default: null,
    },
    amountINR: {
      type: Number,
      default: 0,
    },
    credits: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["processing", "verified", "failed"],
      default: "processing",
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ userId: 1, kind: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
