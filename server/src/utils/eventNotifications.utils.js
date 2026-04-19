const UserNotification = require("../models/UserNotification.model");
const {
  isEmailNotificationEnabled,
  isInAppNotificationEnabled,
} = require("./notificationPrefs.utils");

const createUserNotification = async ({
  userId,
  type,
  title,
  message,
  priority = "medium",
  metadata = {},
}) => {
  return UserNotification.create({
    userId,
    type,
    title,
    message,
    priority,
    metadata,
  });
};

const trackEventByDedupe = async ({
  userId,
  type,
  title,
  message,
  priority,
  metadata,
  dedupeKey,
  visible,
}) => {
  const result = await UserNotification.updateOne(
    { userId, dedupeKey },
    {
      $setOnInsert: {
        userId,
        type,
        title,
        message,
        priority,
        metadata,
        dedupeKey,
        isHidden: !visible,
      },
    },
    { upsert: true }
  );

  return result?.upsertedCount > 0;
};

const dispatchEventNotification = async ({
  user,
  type,
  title,
  message,
  priority = "medium",
  dedupeKey,
  metadata = {},
  emailPrefKey,
  inAppPrefKey,
  fallbackEmailEnabled = true,
  fallbackInAppEnabled = true,
  sendEmail,
}) => {
  const emailEnabled = emailPrefKey
    ? isEmailNotificationEnabled(user, emailPrefKey, fallbackEmailEnabled)
    : false;
  const inAppEnabled = inAppPrefKey
    ? isInAppNotificationEnabled(user, inAppPrefKey, fallbackInAppEnabled)
    : false;

  if (!emailEnabled && !inAppEnabled) {
    return { emailSent: false, inAppCreated: false, skipped: true };
  }

  let allowDelivery = true;
  let inAppCreated = false;

  if (dedupeKey) {
    allowDelivery = await trackEventByDedupe({
      userId: user._id,
      type,
      title,
      message,
      priority,
      metadata,
      dedupeKey,
      visible: inAppEnabled,
    });

    if (!allowDelivery) {
      return { emailSent: false, inAppCreated: false, deduped: true };
    }

    inAppCreated = inAppEnabled;
  } else if (inAppEnabled) {
    await createUserNotification({
      userId: user._id,
      type,
      title,
      message,
      priority,
      metadata,
    });
    inAppCreated = true;
  }

  let emailSent = false;
  if (emailEnabled && typeof sendEmail === "function") {
    try {
      await sendEmail();
      emailSent = true;
    } catch (error) {
      console.error(`[Notifications] Failed email delivery for ${type}:`, error.message);
    }
  }

  return { emailSent, inAppCreated, deduped: false };
};

module.exports = {
  dispatchEventNotification,
  createUserNotification,
};
