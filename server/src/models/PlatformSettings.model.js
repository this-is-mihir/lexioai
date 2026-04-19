const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // SINGLETON — Sirf ek document hoga
    // ----------------------------------------------------------------
    key: {
      type: String,
      default: "platform_settings",
      unique: true,
    },

    // ----------------------------------------------------------------
    // GENERAL SETTINGS
    // ----------------------------------------------------------------
    general: {
      siteName: { type: String, default: "Lexioai" },
      siteTagline: { type: String, default: "AI Chatbot for Your Website" },
      supportEmail: { type: String, default: "support@lexioai.com" },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: {
        type: String,
        default: "We're upgrading our systems. We'll be back soon!",
      },
      allowNewRegistrations: { type: Boolean, default: true },
      googleOAuthEnabled: { type: Boolean, default: true },
      defaultPlan: { type: String, default: "free" },
    },

    // ----------------------------------------------------------------
    // AI SETTINGS
    // ----------------------------------------------------------------
    ai: {
      geminiModel: {
        type: String,
        default: "gemini-2.5-flash",
      },
      groqModel: {
        type: String,
        default: "llama-3.1-8b-instant",
      },
      primaryAI: {
        type: String,
        enum: ["gemini", "groq"],
        default: "gemini",
      },
      maxResponseTokens: { type: Number, default: 500 },
      defaultTemperature: { type: Number, default: 0.7 },
    },

    // ----------------------------------------------------------------
    // LANDING PAGE STATS — Override karo agar real stats kam ho
    // ----------------------------------------------------------------
    landingPageStats: {
      totalUsers: { type: Number, default: null }, // null = real data use karo
      totalBots: { type: Number, default: null },
      totalChats: { type: Number, default: null },
      totalLeads: { type: Number, default: null },
      useOverride: { type: Boolean, default: false }, // true = override use karo
    },

    // ----------------------------------------------------------------
    // REFERRAL PROGRAM
    // ----------------------------------------------------------------
    referral: {
      enabled: { type: Boolean, default: true },
      rewardCredits: { type: Number, default: 50 }, // Credits per referral
      rewardForReferred: { type: Number, default: 25 }, // Credits for new user
    },

    // ----------------------------------------------------------------
    // CRAWLER SETTINGS
    // ----------------------------------------------------------------
    crawler: {
      maxPagesDefault: { type: Number, default: 50 },
      timeoutMs: { type: Number, default: 10000 },
      userAgent: { type: String, default: "LexioaiBot/1.0" },
    },

    // ----------------------------------------------------------------
    // FILE UPLOAD SETTINGS
    // ----------------------------------------------------------------
    fileUpload: {
      maxSizeMB: { type: Number, default: 10 },
      avatarMaxSizeMB: { type: Number, default: 5 },
      coverMaxSizeMB: { type: Number, default: 10 },
    },

    // ----------------------------------------------------------------
    // EMAIL SETTINGS
    // ----------------------------------------------------------------
    email: {
      fromName: { type: String, default: "Lexioai" },
      fromAddress: { type: String, default: "noreply@lexioai.com" },
      supportAddress: { type: String, default: "support@lexioai.com" },
    },

    // ----------------------------------------------------------------
    // TERMS & PRIVACY CONTENT
    // ----------------------------------------------------------------
    legal: {
      termsOfService: { type: String, default: "" },
      privacyPolicy: { type: String, default: "" },
      lastUpdated: { type: Date, default: null },
    },

    // ----------------------------------------------------------------
    // CHANGELOG
    // ----------------------------------------------------------------
    changelog: [
      {
        version: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        type: {
          type: String,
          enum: ["feature", "improvement", "bugfix", "security"],
          default: "feature",
        },
        date: { type: Date, default: Date.now },
        isPublished: { type: Boolean, default: true },
      },
    ],

    // ----------------------------------------------------------------
    // SOCIAL LINKS — Footer ke liye
    // ----------------------------------------------------------------
    socialLinks: {
      twitter: { type: String, default: null },
      linkedin: { type: String, default: null },
      github: { type: String, default: null },
      instagram: { type: String, default: null },
      youtube: { type: String, default: null },
    },

    // ----------------------------------------------------------------
    // BRANDING SETTINGS
    // ----------------------------------------------------------------
    branding: {
      platformName: { type: String, default: "Lexioai" },
      logoUrl: { type: String, default: null },
      faviconUrl: { type: String, default: null },
      watermarkUrl: { type: String, default: null },
      primaryColor: { type: String, default: "#7C3AED" },
      secondaryColor: { type: String, default: "#EC4899" },
      accentColor: { type: String, default: "#06B6D4" },
    },

    // ----------------------------------------------------------------
    // INTEGRATIONS SETTINGS
    // ----------------------------------------------------------------
    integrations: {
      cloudinary: {
        cloudName: { type: String, default: "" },
        apiKey: { type: String, default: "" },
        apiSecret: { type: String, default: "" },
        enabled: { type: Boolean, default: false },
      },
      smtp: {
        host: { type: String, default: "" },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: true },
        username: { type: String, default: "" },
        password: { type: String, default: "" },
        fromEmail: { type: String, default: "" },
        enabled: { type: Boolean, default: false },
      },
      gemini: {
        apiKey: { type: String, default: "" },
        enabled: { type: Boolean, default: false },
      },
      groq: {
        apiKey: { type: String, default: "" },
        enabled: { type: Boolean, default: false },
      },
    },

    // ----------------------------------------------------------------
    // SECURITY SETTINGS
    // ----------------------------------------------------------------
    security: {
      rateLimitPerMinute: { type: Number, default: 100 },
      rateLimitPerHour: { type: Number, default: 1000 },
      jwtSecret: { type: String, default: null },
      jwtExpiry: { type: String, default: "15m" },
      refreshTokenExpiry: { type: String, default: "7d" },
      sessionTimeout: { type: Number, default: 30 }, // minutes
      enableTwoFactor: { type: Boolean, default: false },
      passwordMinLength: { type: Number, default: 8 },
      passwordRequireSpecialChar: { type: Boolean, default: true },
      passwordRequireNumbers: { type: Boolean, default: true },
      secretRotationIntervalDays: { type: Number, default: 90 },
      lastSecretRotation: { type: Date, default: null },
    },

    // ----------------------------------------------------------------
    // WIDGET SETTINGS
    // ----------------------------------------------------------------
    widget: {
      version: { type: String, default: "1.0.0" },
      cdnUrl: { type: String, default: "https://cdn.lexioai.com" },
    },

    // ----------------------------------------------------------------
    // EMAIL TEMPLATES — SuperAdmin edit kar sake
    // ----------------------------------------------------------------
    emailTemplates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// STATIC — Get or Create settings (Singleton pattern)
// ----------------------------------------------------------------
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: "platform_settings" });
  if (!settings) {
    settings = await this.create({ key: "platform_settings" });
  }
  return settings;
};

const PlatformSettings = mongoose.model(
  "PlatformSettings",
  platformSettingsSchema
);

module.exports = PlatformSettings;