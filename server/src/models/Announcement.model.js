const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    emailSubject: { type: String, trim: true, maxlength: 300 },
    message: { type: String, required: true, maxlength: 10000 },
    emailTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailTemplate", default: null },
    type: { type: String, enum: ["email", "inapp", "both"], default: "both" },
    // "paid" = starter + pro + business combined
    targetAudience: { type: String, enum: ["all", "free", "paid", "starter", "pro", "business"], default: "all" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["draft", "scheduled", "sending", "sent", "failed", "partial"], default: "draft" },
    sendNow: { type: Boolean, default: true },
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    failedRecipients: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email:  { type: String },
        reason: { type: String },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ status: 1, scheduledAt: 1 });
announcementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);