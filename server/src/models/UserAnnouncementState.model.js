const mongoose = require("mongoose");

const userAnnouncementStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userAnnouncementStateSchema.index({ userId: 1, announcementId: 1 }, { unique: true });
userAnnouncementStateSchema.index({ userId: 1, isRead: 1 });
userAnnouncementStateSchema.index({ userId: 1, isDeleted: 1 });

module.exports = mongoose.model("UserAnnouncementState", userAnnouncementStateSchema);
