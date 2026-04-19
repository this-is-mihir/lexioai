const PlatformSettings = require("../models/PlatformSettings.model");
const AuditLog = require("../models/AuditLog.model");
const { successResponse, errorResponse, validationErrorResponse } = require("../utils/response.utils");
const { normalizePlan } = require("../utils/platformSettings.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/settings
// ----------------------------------------------------------------
const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    return successResponse(res, { data: { settings } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/general
// ----------------------------------------------------------------
const updateGeneralSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const {
      siteName, siteTagline, supportEmail, maintenanceMode,
      maintenanceMessage, allowNewRegistrations, googleOAuthEnabled, defaultPlan,
    } = req.body;

    if (siteName !== undefined) settings.general.siteName = siteName;
    if (siteTagline !== undefined) settings.general.siteTagline = siteTagline;
    if (supportEmail !== undefined) settings.general.supportEmail = supportEmail;
    if (maintenanceMode !== undefined) settings.general.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.general.maintenanceMessage = maintenanceMessage;
    if (allowNewRegistrations !== undefined) settings.general.allowNewRegistrations = allowNewRegistrations;
    if (googleOAuthEnabled !== undefined) settings.general.googleOAuthEnabled = googleOAuthEnabled;
    if (defaultPlan !== undefined) settings.general.defaultPlan = normalizePlan(defaultPlan);

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "SETTINGS_UPDATED", module: "settings",
      description: "General settings updated",
    });

    return successResponse(res, { message: "Settings updated!", data: { settings } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/ai
// ----------------------------------------------------------------
const updateAISettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { geminiModel, groqModel, primaryAI, maxResponseTokens } = req.body;

    if (geminiModel) settings.ai.geminiModel = geminiModel;
    if (groqModel) settings.ai.groqModel = groqModel;
    if (primaryAI) settings.ai.primaryAI = primaryAI;
    if (maxResponseTokens) settings.ai.maxResponseTokens = maxResponseTokens;

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "AI_SETTINGS_UPDATED", module: "settings",
      description: `AI settings updated: primary=${primaryAI || settings.ai.primaryAI}`,
    });

    return successResponse(res, { message: "AI settings updated!", data: { ai: settings.ai } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update AI settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/landing-stats
// ----------------------------------------------------------------
const updateLandingPageStats = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { totalUsers, totalBots, totalChats, totalLeads, useOverride } = req.body;

    if (totalUsers !== undefined) settings.landingPageStats.totalUsers = totalUsers;
    if (totalBots !== undefined) settings.landingPageStats.totalBots = totalBots;
    if (totalChats !== undefined) settings.landingPageStats.totalChats = totalChats;
    if (totalLeads !== undefined) settings.landingPageStats.totalLeads = totalLeads;
    if (useOverride !== undefined) settings.landingPageStats.useOverride = useOverride;

    await settings.save();

    return successResponse(res, {
      message: "Landing page stats updated!",
      data: { landingPageStats: settings.landingPageStats },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update landing stats." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/legal
// ----------------------------------------------------------------
const updateLegalContent = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { termsOfService, privacyPolicy } = req.body;

    if (termsOfService !== undefined) settings.legal.termsOfService = termsOfService;
    if (privacyPolicy !== undefined) settings.legal.privacyPolicy = privacyPolicy;
    settings.legal.lastUpdated = new Date();

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "LEGAL_UPDATED", module: "settings",
      description: "Terms/Privacy content updated",
    });

    return successResponse(res, { message: "Legal content updated!" });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update legal content." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/settings/changelog
// ----------------------------------------------------------------
const addChangelog = async (req, res) => {
  try {
    const { version, title, description, type } = req.body;

    if (!version || !title || !description) {
      return validationErrorResponse(res, [
        { field: "general", message: "Version, title and description are required" },
      ]);
    }

    const settings = await PlatformSettings.getSettings();
    settings.changelog.unshift({ version, title, description, type: type || "feature" });
    await settings.save();

    return successResponse(res, {
      message: "Changelog added!",
      statusCode: 201,
      data: { changelog: settings.changelog[0] },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to add changelog." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/settings/changelog/:changelogId
// ----------------------------------------------------------------
const deleteChangelog = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    settings.changelog = settings.changelog.filter(
      (c) => c._id.toString() !== req.params.changelogId
    );
    await settings.save();

    return successResponse(res, { message: "Changelog deleted!" });
  } catch (error) {
    return errorResponse(res, { message: "Failed to delete changelog." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/referral
// ----------------------------------------------------------------
const updateReferralSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { enabled, rewardCredits, rewardForReferred } = req.body;

    if (enabled !== undefined) settings.referral.enabled = enabled;
    if (rewardCredits !== undefined) settings.referral.rewardCredits = rewardCredits;
    if (rewardForReferred !== undefined) settings.referral.rewardForReferred = rewardForReferred;

    await settings.save();

    return successResponse(res, {
      message: "Referral settings updated!",
      data: { referral: settings.referral },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update referral settings." });
  }
};



// ----------------------------------------------------------------
// Email Templates — Default templates
// ----------------------------------------------------------------
const DEFAULT_TEMPLATES = {
  welcome: {
    name: "Welcome Email",
    subject: "Welcome to Lexioai! 🎉",
    body: `Hi {{name}},

Welcome to Lexioai! We're excited to have you on board.

Get started by creating your first AI chatbot in minutes.

Best regards,
The Lexioai Team`,
  },
  otp: {
    name: "OTP Verification",
    subject: "Your Lexioai verification code",
    body: `Hi {{name}},

Your verification code is: {{otp}}

This code expires in 10 minutes.

Best regards,
Lexioai`,
  },
  passwordReset: {
    name: "Password Reset",
    subject: "Reset your Lexioai password",
    body: `Hi {{name}},

Your password reset code is: {{otp}}

This code expires in 10 minutes.

Best regards,
Lexioai`,
  },
  planUpgrade: {
    name: "Plan Upgrade",
    subject: "Welcome to {{plan}} plan! 🚀",
    body: `Hi {{name}},

Your account has been upgraded to {{plan}} plan.

You now have access to all {{plan}} features.

Best regards,
Lexioai`,
  },
  planExpiry: {
    name: "Plan Expiry Warning",
    subject: "Your Lexioai plan expires in {{days}} days",
    body: `Hi {{name}},

Your {{plan}} plan expires in {{days}} days.

Renew now to avoid service interruption.

Best regards,
Lexioai`,
  },
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/settings/email-templates
// ----------------------------------------------------------------
const getEmailTemplates = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const templates = settings.emailTemplates || DEFAULT_TEMPLATES;
    return successResponse(res, { data: { templates } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch email templates." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/email-templates/:templateKey
// ----------------------------------------------------------------
const updateEmailTemplate = async (req, res) => {
  try {
    const { templateKey } = req.params;
    const { subject, body, name } = req.body;

    if (!subject?.trim() || !body?.trim()) {
      return validationErrorResponse(res, [
        { field: "general", message: "Subject and body are required" },
      ]);
    }

    const settings = await PlatformSettings.getSettings();

    if (!settings.emailTemplates) {
      settings.emailTemplates = { ...DEFAULT_TEMPLATES };
    }

    settings.emailTemplates[templateKey] = {
      name: name || settings.emailTemplates[templateKey]?.name || templateKey,
      subject: subject.trim(),
      body: body.trim(),
    };

    settings.markModified("emailTemplate");
    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "EMAIL_TEMPLATE_UPDATED",
      module: "settings",
      description: `Email template "${templateKey}" updated`,
    });

    return successResponse(res, {
      message: "Email template updated successfully!",
      data: { template: settings.emailTemplates[templateKey] },
    });
  } catch (error) {
    console.error("Update email template error:", error);
    return errorResponse(res, { message: "Failed to update email template." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/settings/email-templates/reset/:templateKey
// ----------------------------------------------------------------
const resetEmailTemplate = async (req, res) => {
  try {
    const { templateKey } = req.params;

    if (!DEFAULT_TEMPLATES[templateKey]) {
      return notFoundResponse(res, "Template not found");
    }

    const settings = await PlatformSettings.getSettings();
    if (!settings.emailTemplates) settings.emailTemplates = {};
    settings.emailTemplates[templateKey] = DEFAULT_TEMPLATES[templateKey];
    settings.markModified("emailTemplate");
    await settings.save();

    return successResponse(res, {
      message: "Email template reset to default!",
      data: { template: DEFAULT_TEMPLATES[templateKey] },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to reset email template." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/branding
// ----------------------------------------------------------------
const updateBrandingSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { platformName, logoUrl, faviconUrl, watermarkUrl, primaryColor, secondaryColor, accentColor } = req.body;

    if (platformName !== undefined) settings.branding.platformName = platformName;
    if (logoUrl !== undefined) settings.branding.logoUrl = logoUrl;
    if (faviconUrl !== undefined) settings.branding.faviconUrl = faviconUrl;
    if (watermarkUrl !== undefined) settings.branding.watermarkUrl = watermarkUrl;
    if (primaryColor !== undefined) settings.branding.primaryColor = primaryColor;
    if (secondaryColor !== undefined) settings.branding.secondaryColor = secondaryColor;
    if (accentColor !== undefined) settings.branding.accentColor = accentColor;

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "BRANDING_UPDATED", module: "settings",
      description: "Branding settings updated",
    });

    return successResponse(res, { message: "Branding settings updated!", data: { branding: settings.branding } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update branding settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/operations
// ----------------------------------------------------------------
const updateOperationsSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { maintenanceMode, maintenanceMessage, allowNewRegistrations, defaultPlan } = req.body;

    if (maintenanceMode !== undefined) settings.general.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.general.maintenanceMessage = maintenanceMessage;
    if (allowNewRegistrations !== undefined) settings.general.allowNewRegistrations = allowNewRegistrations;
    if (defaultPlan !== undefined) settings.general.defaultPlan = normalizePlan(defaultPlan);

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "OPERATIONS_UPDATED", module: "settings",
      description: "Operations settings updated",
    });

    return successResponse(res, { message: "Operations settings updated!", data: { operations: { maintenanceMode: settings.general.maintenanceMode, maintenanceMessage: settings.general.maintenanceMessage, allowNewRegistrations: settings.general.allowNewRegistrations, defaultPlan: settings.general.defaultPlan } } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update operations settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/integrations
// ----------------------------------------------------------------
const updateIntegrationsSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { cloudinary, smtp, gemini, groq } = req.body;

    if (cloudinary) {
      if (cloudinary.cloudName !== undefined) settings.integrations.cloudinary.cloudName = cloudinary.cloudName;
      if (cloudinary.apiKey !== undefined) settings.integrations.cloudinary.apiKey = cloudinary.apiKey;
      if (cloudinary.apiSecret !== undefined) settings.integrations.cloudinary.apiSecret = cloudinary.apiSecret;
      if (cloudinary.enabled !== undefined) settings.integrations.cloudinary.enabled = cloudinary.enabled;
    }

    if (smtp) {
      if (smtp.host !== undefined) settings.integrations.smtp.host = smtp.host;
      if (smtp.port !== undefined) settings.integrations.smtp.port = smtp.port;
      if (smtp.secure !== undefined) settings.integrations.smtp.secure = smtp.secure;
      if (smtp.username !== undefined) settings.integrations.smtp.username = smtp.username;
      if (smtp.password !== undefined) settings.integrations.smtp.password = smtp.password;
      if (smtp.fromEmail !== undefined) settings.integrations.smtp.fromEmail = smtp.fromEmail;
      if (smtp.enabled !== undefined) settings.integrations.smtp.enabled = smtp.enabled;
    }

    if (gemini) {
      if (gemini.apiKey !== undefined) settings.integrations.gemini.apiKey = gemini.apiKey;
      if (gemini.enabled !== undefined) settings.integrations.gemini.enabled = gemini.enabled;
    }

    if (groq) {
      if (groq.apiKey !== undefined) settings.integrations.groq.apiKey = groq.apiKey;
      if (groq.enabled !== undefined) settings.integrations.groq.enabled = groq.enabled;
    }

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "INTEGRATIONS_UPDATED", module: "settings",
      description: "Integration settings updated",
    });

    return successResponse(res, { message: "Integration settings updated!", data: { integrations: settings.integrations } });
  } catch (error) {
    console.error("Update integrations error:", error);
    return errorResponse(res, { message: "Failed to update integration settings." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/settings/security
// ----------------------------------------------------------------
const updateSecuritySettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const { rateLimitPerMinute, rateLimitPerHour, jwtExpiry, refreshTokenExpiry, sessionTimeout, enableTwoFactor, passwordMinLength, passwordRequireSpecialChar, passwordRequireNumbers, secretRotationIntervalDays } = req.body;

    if (rateLimitPerMinute !== undefined) settings.security.rateLimitPerMinute = rateLimitPerMinute;
    if (rateLimitPerHour !== undefined) settings.security.rateLimitPerHour = rateLimitPerHour;
    if (jwtExpiry !== undefined) settings.security.jwtExpiry = jwtExpiry;
    if (refreshTokenExpiry !== undefined) settings.security.refreshTokenExpiry = refreshTokenExpiry;
    if (sessionTimeout !== undefined) settings.security.sessionTimeout = sessionTimeout;
    if (enableTwoFactor !== undefined) settings.security.enableTwoFactor = enableTwoFactor;
    if (passwordMinLength !== undefined) settings.security.passwordMinLength = passwordMinLength;
    if (passwordRequireSpecialChar !== undefined) settings.security.passwordRequireSpecialChar = passwordRequireSpecialChar;
    if (passwordRequireNumbers !== undefined) settings.security.passwordRequireNumbers = passwordRequireNumbers;
    if (secretRotationIntervalDays !== undefined) settings.security.secretRotationIntervalDays = secretRotationIntervalDays;

    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "SECURITY_UPDATED", module: "settings",
      description: "Security settings updated",
    });

    return successResponse(res, { message: "Security settings updated!", data: { security: settings.security } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update security settings." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/settings/security/rotate-secret
// ----------------------------------------------------------------
const rotateJWTSecret = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const crypto = require("crypto");
    
    const newSecret = crypto.randomBytes(32).toString("hex");
    const oldSecret = settings.security.jwtSecret;
    
    settings.security.jwtSecret = newSecret;
    settings.security.lastSecretRotation = new Date();
    
    await settings.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "JWT_SECRET_ROTATED", module: "settings",
      description: "JWT secret rotated",
    });

    return successResponse(res, { 
      message: "JWT secret rotated! Store this new secret securely.", 
      data: { newSecret }, 
      statusCode: 200 
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to rotate JWT secret." });
  }
};

module.exports = {
  getSettings, updateGeneralSettings, updateAISettings,
  updateLandingPageStats, updateLegalContent,
  addChangelog, deleteChangelog, updateReferralSettings,
  getEmailTemplates, updateEmailTemplate, resetEmailTemplate,
  updateBrandingSettings, updateOperationsSettings, updateIntegrationsSettings, updateSecuritySettings, rotateJWTSecret,
};