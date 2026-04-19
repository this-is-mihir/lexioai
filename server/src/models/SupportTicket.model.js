const mongoose = require("mongoose");

const ticketReplySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },

    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    senderName: {
      type: String,
      required: true,
    },

    senderAvatar: {
      type: String,
      default: null,
    },

    screenshotUrl: {
      type: String,
      default: null,
    },

    attachments: {
      type: [String],
      default: [],
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // TICKET INFO
    // ----------------------------------------------------------------
    ticketId: {
      type: String,
      unique: true,
      // Auto-generated: LXA-2026-XXXXX
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "billing", "technical", "account", "bot_issue",
        "training", "feature_request", "other",
      ],
      default: "other",
    },

    // ----------------------------------------------------------------
    // PRIORITY & STATUS
    // ----------------------------------------------------------------
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_user", "resolved", "closed"],
      default: "open",
    },

    // ----------------------------------------------------------------
    // USER INFO
    // ----------------------------------------------------------------
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userName: {
      type: String,
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
    },

    // ----------------------------------------------------------------
    // ATTACHMENTS
    // ----------------------------------------------------------------
    screenshotUrl: {
      type: String,
      default: null,
    },

    attachments: {
      type: [String],
      default: [],
    },

    // ----------------------------------------------------------------
    // ASSIGNMENT
    // ----------------------------------------------------------------
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },

    assignedToName: {
      type: String,
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------------------------
    // REPLIES
    // ----------------------------------------------------------------
    replies: {
      type: [ticketReplySchema],
      default: [],
    },

    lastReplyAt: {
      type: Date,
      default: null,
    },

    lastReplyBy: {
      type: String,
      enum: ["user", "admin"],
      default: null,
    },

    // ----------------------------------------------------------------
    // RESOLUTION
    // ----------------------------------------------------------------
    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },

    resolutionNote: {
      type: String,
      default: null,
    },

    // User satisfaction rating
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // ----------------------------------------------------------------
    // UNREAD COUNT
    // ----------------------------------------------------------------
    unreadByAdmin: {
      type: Number,
      default: 0,
    },

    unreadByUser: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ assignedTo: 1 });


// ----------------------------------------------------------------
// PRE SAVE — Auto generate ticketId
// ----------------------------------------------------------------
supportTicketSchema.pre("save", async function () {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("SupportTicket").countDocuments();
    this.ticketId = `LXA-${year}-${String(count + 1).padStart(5, "0")}`;
  }
});

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;