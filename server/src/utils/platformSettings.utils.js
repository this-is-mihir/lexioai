const PlatformSettings = require("../models/PlatformSettings.model");

const USER_PLANS = ["free", "starter", "pro", "business"];

const DEFAULT_SECURITY = {
  rateLimitPerMinute: 100,
  rateLimitPerHour: 1000,
  jwtExpiry: "15m",
  refreshTokenExpiry: "7d",
  sessionTimeout: 30,
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,
  passwordRequireNumbers: true,
};

const DEFAULT_BRANDING = {
  platformName: "Lexioai",
  logoUrl: null,
  faviconUrl: null,
  watermarkUrl: null,
  primaryColor: "#7C3AED",
  secondaryColor: "#EC4899",
  accentColor: "#06B6D4",
};

const DEFAULT_GENERAL = {
  siteName: "Lexioai",
  supportEmail: "support@lexioai.com",
  maintenanceMode: false,
  maintenanceMessage: "We're upgrading our systems. We'll be back soon!",
  allowNewRegistrations: true,
  defaultPlan: "free",
};

const parseDurationToMs = (value, fallbackMs = 7 * 24 * 60 * 60 * 1000) => {
  if (!value || typeof value !== "string") return fallbackMs;

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([smhdw])$/);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;

  const factors = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * (factors[unit] || 1);
};

const getPlatformSettings = async () => {
  try {
    return await PlatformSettings.getSettings();
  } catch (error) {
    return null;
  }
};

const normalizePlan = (plan) => {
  if (!plan) return "free";
  const normalized = String(plan).toLowerCase();
  return USER_PLANS.includes(normalized) ? normalized : "free";
};

const getGeneralSettings = async () => {
  const settings = await getPlatformSettings();
  return {
    ...DEFAULT_GENERAL,
    ...(settings?.general?.toObject ? settings.general.toObject() : settings?.general || {}),
    defaultPlan: normalizePlan(settings?.general?.defaultPlan || DEFAULT_GENERAL.defaultPlan),
  };
};

const getSecuritySettings = async () => {
  const settings = await getPlatformSettings();
  return {
    ...DEFAULT_SECURITY,
    ...(settings?.security?.toObject ? settings.security.toObject() : settings?.security || {}),
  };
};

const getPasswordPolicy = async () => {
  const security = await getSecuritySettings();

  return {
    minLength: Math.max(4, Number(security.passwordMinLength) || DEFAULT_SECURITY.passwordMinLength),
    requireSpecialChar: Boolean(security.passwordRequireSpecialChar),
    requireNumbers: Boolean(security.passwordRequireNumbers),
  };
};

const validatePasswordByPolicy = (password, policy) => {
  const issues = [];

  if (!password || typeof password !== "string") {
    issues.push("Password is required");
    return issues;
  }

  if (password.length < policy.minLength) {
    issues.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    issues.push("Password must include at least one number (0-9)");
  }

  if (policy.requireSpecialChar && !/[^A-Za-z0-9]/.test(password)) {
    issues.push("Password must include at least one special character");
  }

  return issues;
};

const getJWTSettings = async () => {
  const security = await getSecuritySettings();

  return {
    accessExpiry: security.jwtExpiry || DEFAULT_SECURITY.jwtExpiry,
    refreshExpiry: security.refreshTokenExpiry || DEFAULT_SECURITY.refreshTokenExpiry,
    sessionTimeoutMinutes: Number(security.sessionTimeout) || DEFAULT_SECURITY.sessionTimeout,
  };
};

const getPublicSettingsPayload = async () => {
  const settings = await getPlatformSettings();

  const branding = {
    ...DEFAULT_BRANDING,
    ...(settings?.branding?.toObject ? settings.branding.toObject() : settings?.branding || {}),
  };

  const general = {
    ...DEFAULT_GENERAL,
    ...(settings?.general?.toObject ? settings.general.toObject() : settings?.general || {}),
    defaultPlan: normalizePlan(settings?.general?.defaultPlan || DEFAULT_GENERAL.defaultPlan),
  };

  const legal = {
    termsOfService: settings?.legal?.termsOfService || "",
    privacyPolicy: settings?.legal?.privacyPolicy || "",
    lastUpdated: settings?.legal?.lastUpdated || null,
  };

  return {
    branding,
    general,
    legal,
    timestamp: new Date().toISOString(),
  };
};

const getCloudinaryIntegrationConfig = async () => {
  const settings = await getPlatformSettings();
  const cloudinary = settings?.integrations?.cloudinary || {};

  const fromSettings = {
    cloudName: cloudinary.cloudName,
    apiKey: cloudinary.apiKey,
    apiSecret: cloudinary.apiSecret,
    enabled: Boolean(cloudinary.enabled),
  };

  const fromEnv = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    enabled: true,
  };

  if (
    fromSettings.enabled &&
    fromSettings.cloudName &&
    fromSettings.apiKey &&
    fromSettings.apiSecret
  ) {
    return fromSettings;
  }

  return fromEnv;
};

const getSMTPIntegrationConfig = async () => {
  const settings = await getPlatformSettings();
  const smtp = settings?.integrations?.smtp || {};

  const fromSettings = {
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: Boolean(smtp.secure),
    user: smtp.username,
    pass: smtp.password,
    fromEmail: smtp.fromEmail,
    enabled: Boolean(smtp.enabled),
  };

  const fromEnv = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    fromEmail: process.env.EMAIL_FROM_ADDRESS,
    enabled: true,
  };

  if (
    fromSettings.enabled &&
    fromSettings.host &&
    fromSettings.user &&
    fromSettings.pass
  ) {
    return fromSettings;
  }

  return fromEnv;
};

const getAIIntegrationConfig = async () => {
  const settings = await getPlatformSettings();

  return {
    gemini: {
      enabled: Boolean(settings?.integrations?.gemini?.enabled),
      apiKey: settings?.integrations?.gemini?.apiKey || "",
    },
    groq: {
      enabled: Boolean(settings?.integrations?.groq?.enabled),
      apiKey: settings?.integrations?.groq?.apiKey || "",
    },
  };
};

module.exports = {
  USER_PLANS,
  parseDurationToMs,
  normalizePlan,
  getPlatformSettings,
  getGeneralSettings,
  getSecuritySettings,
  getPasswordPolicy,
  validatePasswordByPolicy,
  getJWTSettings,
  getPublicSettingsPayload,
  getCloudinaryIntegrationConfig,
  getSMTPIntegrationConfig,
  getAIIntegrationConfig,
};
