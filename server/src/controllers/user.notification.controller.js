const mongoose = require("mongoose");
const Announcement = require("../models/Announcement.model");
const UserAnnouncementState = require("../models/UserAnnouncementState.model");
const UserNotification = require("../models/UserNotification.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response.utils");
const { isInAppNotificationEnabled } = require("../utils/notificationPrefs.utils");

const PRIORITIES = ["low", "medium", "high"];

const getAudienceByPlan = (plan) => {
  switch (plan) {
    case "free":
      return ["all", "free"];
    case "starter":
      return ["all", "paid", "starter"];
    case "pro":
      return ["all", "paid", "pro"];
    case "business":
      return ["all", "paid", "business"];
    default:
      return ["all"];
  }
};

const getBaseAnnouncementMatch = (user) => {
  if (!isInAppNotificationEnabled(user, "announcements", true)) {
    return { _id: { $in: [] } };
  }

  return {
    type: { $in: ["inapp", "both"] },
    status: { $in: ["sent", "partial", "sending"] },
    targetAudience: { $in: getAudienceByPlan(user.plan) },
  };
};

const parseBooleanQuery = (value) => {
  if (value === undefined) return undefined;
  if (["true", "1", true, 1].includes(value)) return true;
  if (["false", "0", false, 0].includes(value)) return false;
  return undefined;
};

const buildVisibilityPipeline = ({ user, priority, isRead, announcementId }) => {
  const userObjectId = new mongoose.Types.ObjectId(user._id);
  const match = getBaseAnnouncementMatch(user);

  if (priority) {
    match.priority = priority;
  }

  if (announcementId) {
    match._id = announcementId;
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        displayAt: { $ifNull: ["$sentAt", "$createdAt"] },
      },
    },
    {
      $lookup: {
        from: "userannouncementstates",
        let: { annId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$announcementId", "$$annId"] },
                  { $eq: ["$userId", userObjectId] },
                ],
              },
            },
          },
          { $project: { _id: 0, isRead: 1, readAt: 1, isDeleted: 1, deletedAt: 1 } },
          { $limit: 1 },
        ],
        as: "userState",
      },
    },
    {
      $addFields: {
        isDeleted: {
          $ifNull: [{ $first: "$userState.isDeleted" }, false],
        },
        deletedAt: { $ifNull: [{ $first: "$userState.deletedAt" }, null] },
        isRead: {
          $ifNull: [{ $first: "$userState.isRead" }, false],
        },
        readAt: { $ifNull: [{ $first: "$userState.readAt" }, null] },
      },
    },
    { $match: { isDeleted: false } },
  ];

  if (typeof isRead === "boolean") {
    pipeline.push({ $match: { isRead } });
  }

  return pipeline;
};

const getVisibleAnnouncementIds = async (user) => {
  const rows = await Announcement.aggregate([
    ...buildVisibilityPipeline({ user, priority: undefined, isRead: undefined, announcementId: undefined }),
    { $project: { _id: 1 } },
  ]);

  return rows.map((row) => row._id);
};

const findVisibleAnnouncementById = async (user, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const objectId = new mongoose.Types.ObjectId(id);
  const result = await Announcement.aggregate([
    ...buildVisibilityPipeline({ user, priority: undefined, isRead: undefined, announcementId: objectId }),
    { $project: { _id: 1 } },
    { $limit: 1 },
  ]);

  return result[0] || null;
};

const getAnnouncementNotifications = async ({ user, priority, isRead }) => {
  return Announcement.aggregate([
    ...buildVisibilityPipeline({ user, priority, isRead, announcementId: undefined }),
    { $sort: { displayAt: -1, createdAt: -1 } },
    {
      $project: {
        userState: 0,
        __v: 0,
        failedRecipients: 0,
        emailTemplateId: 0,
        isDeleted: 0,
        deletedAt: 0,
      },
    },
  ]);
};

const getUserEventNotifications = async ({ user, priority, isRead }) => {
  const query = {
    userId: user._id,
    isDeleted: false,
    isHidden: false,
  };

  if (priority) {
    query.priority = priority;
  }

  if (typeof isRead === "boolean") {
    query.isRead = isRead;
  }

  const rows = await UserNotification.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((item) => ({
    _id: item._id,
    title: item.title,
    message: item.message,
    priority: item.priority,
    type: "inapp",
    source: "event",
    eventType: item.type,
    isRead: item.isRead,
    readAt: item.readAt,
    displayAt: item.createdAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

const sortNotificationItems = (items) => {
  return items.sort((a, b) => {
    const aTime = new Date(a.displayAt || a.sentAt || a.createdAt).getTime();
    const bTime = new Date(b.displayAt || b.sentAt || b.createdAt).getTime();
    return bTime - aTime;
  });
};

const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const priority = req.query.priority;
    const isRead = parseBooleanQuery(req.query.isRead);

    if (priority && !PRIORITIES.includes(priority)) {
      return validationErrorResponse(res, [
        { field: "priority", message: "priority must be low, medium, or high" },
      ]);
    }

    const [announcementItems, eventItems] = await Promise.all([
      getAnnouncementNotifications({
        user: req.user,
        priority,
        isRead,
      }),
      getUserEventNotifications({
        user: req.user,
        priority,
        isRead,
      }),
    ]);

    const merged = sortNotificationItems([
      ...announcementItems,
      ...eventItems,
    ]);

    const total = merged.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = merged.slice(startIndex, endIndex);

    return successResponse(res, {
      message: "Notifications fetched successfully",
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    return errorResponse(res, { message: "Failed to fetch notifications." });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [announcementUnread, eventUnread] = await Promise.all([
      Announcement.aggregate([
        ...buildVisibilityPipeline({
          user: req.user,
          priority: undefined,
          isRead: false,
          announcementId: undefined,
        }),
        { $count: "total" },
      ]),
      UserNotification.countDocuments({
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
        isRead: false,
      }),
    ]);

    const unreadCount = (announcementUnread[0]?.total || 0) + eventUnread;

    return successResponse(res, {
      message: "Unread count fetched successfully",
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return errorResponse(res, { message: "Failed to fetch unread count." });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification id" },
      ]);
    }

    const eventNotification = await UserNotification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
      },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (eventNotification) {
      return successResponse(res, {
        message: "Notification marked as read",
      });
    }

    const announcement = await findVisibleAnnouncementById(req.user, id);

    if (!announcement) {
      return notFoundResponse(res, "Notification not found");
    }

    await UserAnnouncementState.findOneAndUpdate(
      { userId: req.user._id, announcementId: id },
      { $set: { isRead: true, readAt: new Date(), isDeleted: false, deletedAt: null } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, {
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return errorResponse(res, { message: "Failed to update notification." });
  }
};

const markAsUnread = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification id" },
      ]);
    }

    const eventNotification = await UserNotification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
      },
      { $set: { isRead: false, readAt: null } },
      { new: true }
    );

    if (eventNotification) {
      return successResponse(res, {
        message: "Notification marked as unread",
      });
    }

    const announcement = await findVisibleAnnouncementById(req.user, id);

    if (!announcement) {
      return notFoundResponse(res, "Notification not found");
    }

    await UserAnnouncementState.findOneAndUpdate(
      { userId: req.user._id, announcementId: id },
      { $set: { isRead: false, readAt: null, isDeleted: false, deletedAt: null } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, {
      message: "Notification marked as unread",
    });
  } catch (error) {
    console.error("Mark notification as unread error:", error);
    return errorResponse(res, { message: "Failed to update notification." });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const announcements = await getVisibleAnnouncementIds(req.user);

    const now = new Date();
    const operations = announcements.map((item) => ({
      updateOne: {
        filter: { userId: req.user._id, announcementId: item },
        update: { $set: { isRead: true, readAt: now, isDeleted: false, deletedAt: null } },
        upsert: true,
      },
    }));

    if (operations.length) {
      await UserAnnouncementState.bulkWrite(operations, { ordered: false });
    }

    const eventResult = await UserNotification.updateMany(
      {
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    const marked = operations.length + Number(eventResult.modifiedCount || 0);

    if (!marked) {
      return successResponse(res, {
        message: "No notifications to mark",
        data: { marked: 0 },
      });
    }

    return successResponse(res, {
      message: "All notifications marked as read",
      data: { marked },
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return errorResponse(res, { message: "Failed to update notifications." });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return validationErrorResponse(res, [
        { field: "id", message: "Invalid notification id" },
      ]);
    }

    const eventNotification = await UserNotification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (eventNotification) {
      return successResponse(res, {
        message: "Notification deleted",
      });
    }

    const announcement = await findVisibleAnnouncementById(req.user, id);

    if (!announcement) {
      return notFoundResponse(res, "Notification not found");
    }

    await UserAnnouncementState.findOneAndUpdate(
      { userId: req.user._id, announcementId: id },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, {
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return errorResponse(res, { message: "Failed to delete notification." });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const announcements = await getVisibleAnnouncementIds(req.user);

    const now = new Date();
    const operations = announcements.map((id) => ({
      updateOne: {
        filter: { userId: req.user._id, announcementId: id },
        update: {
          $set: {
            isDeleted: true,
            deletedAt: now,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length) {
      await UserAnnouncementState.bulkWrite(operations, { ordered: false });
    }

    const eventResult = await UserNotification.updateMany(
      {
        userId: req.user._id,
        isDeleted: false,
        isHidden: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      }
    );

    const deleted = operations.length + Number(eventResult.modifiedCount || 0);

    if (!deleted) {
      return successResponse(res, {
        message: "No notifications to delete",
        data: { deleted: 0 },
      });
    }

    return successResponse(res, {
      message: "All notifications deleted",
      data: { deleted },
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    return errorResponse(res, { message: "Failed to delete notifications." });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
