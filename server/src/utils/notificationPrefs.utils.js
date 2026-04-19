const getBooleanPref = (value, fallback) => {
  return typeof value === "boolean" ? value : fallback;
};

const isEmailNotificationEnabled = (user, key, fallback = true) => {
  const value = user?.notificationPrefs?.email?.[key];
  return getBooleanPref(value, fallback);
};

const isInAppNotificationEnabled = (user, key, fallback = true) => {
  const value = user?.notificationPrefs?.inApp?.[key];
  return getBooleanPref(value, fallback);
};

module.exports = {
  isEmailNotificationEnabled,
  isInAppNotificationEnabled,
};