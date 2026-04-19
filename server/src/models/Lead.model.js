const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // BOT & OWNER
    // ----------------------------------------------------------------
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
      required: true,
      index: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    // ----------------------------------------------------------------
    // LEAD INFO
    // ----------------------------------------------------------------
    name: {
      type: String,
      trim: true,
      default: null,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    company: {
      type: String,
      trim: true,
      default: null,
    },

    message: {
      type: String,
      trim: true,
      default: null,
    },

    // ----------------------------------------------------------------
    // SOURCE INFO
    // ----------------------------------------------------------------
    pageUrl: {
      type: String,
      default: null,
    },

    visitorIP: {
      type: String,
      default: null,
    },

    visitorDevice: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------------
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },

    // ----------------------------------------------------------------
    // NOTES
    // ----------------------------------------------------------------
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
leadSchema.index({ botId: 1, createdAt: -1 });
leadSchema.index({ ownerId: 1, createdAt: -1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;