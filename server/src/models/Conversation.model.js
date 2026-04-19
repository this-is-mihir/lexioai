const mongoose = require("mongoose");

// ----------------------------------------------------------------
// MESSAGE SCHEMA
// ----------------------------------------------------------------
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Bot response ke liye
    isAnswered: {
      type: Boolean,
      default: true,
    },
    responseTime: {
      type: Number, // milliseconds
      default: null,
    },
    aiModel: {
      type: String,
      default: null,
    },
  },
  { _id: true },
);

// ----------------------------------------------------------------
// CONVERSATION SCHEMA
// ----------------------------------------------------------------
const conversationSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // BOT & USER INFO
    // ----------------------------------------------------------------
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
      required: true,
      index: true,
    },

    // Bot owner
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ----------------------------------------------------------------
    // VISITOR INFO (website pe aane wala customer)
    // ----------------------------------------------------------------
    visitorId: {
      type: String,
      default: null, // fingerprint ya random ID
      index: true,
    },

    visitorIP: {
      type: String,
      default: null,
    },

    visitorDevice: {
      type: String,
      default: null,
    },

    visitorLocation: {
      country: { type: String, default: null },
      city: { type: String, default: null },
    },

    // ----------------------------------------------------------------
    // LEAD INFO (agar capture kiya)
    // ----------------------------------------------------------------
    leadCaptured: {
      type: Boolean,
      default: false,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    visitorName: {
      type: String,
      default: null,
    },

    visitorEmail: {
      type: String,
      default: null,
    },

    visitorPhone: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // MESSAGES
    // ----------------------------------------------------------------
    messages: {
      type: [messageSchema],
      default: [],
    },

    // ----------------------------------------------------------------
    // CONVERSATION STATUS
    // ----------------------------------------------------------------
    status: {
      type: String,
      enum: ["active", "ended", "abandoned"],
      default: "active",
    },

    endedAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------------------------
    // STATS
    // ----------------------------------------------------------------
    totalMessages: {
      type: Number,
      default: 0,
    },

    unansweredCount: {
      type: Number,
      default: 0,
    },

    // ----------------------------------------------------------------
    // SOURCE
    // ----------------------------------------------------------------
    pageUrl: {
      type: String,
      default: null, // Konse page pe tha visitor jab chat kiya
    },

    language: {
      type: String,
      default: "en",
    },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
conversationSchema.index({ botId: 1, createdAt: -1 });
conversationSchema.index({ ownerId: 1, createdAt: -1 });
conversationSchema.index({ status: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
