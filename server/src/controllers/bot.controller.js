const Bot = require("../models/Bot.model");
const User = require("../models/User.model");
const cloudinary = require("cloudinary").v2;
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");
const axios = require("axios");

// ----------------------------------------------------------------
// CLOUDINARY CONFIG
// ----------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cheerio = require("cheerio");

// ----------------------------------------------------------------
// PLAN LIMITS
// ----------------------------------------------------------------
const PLAN_LIMITS = {
  free: { bots: 1, files: 0, urlPages: 1 },
  starter: { bots: 3, files: 10, urlPages: 50 },
  pro: { bots: 10, files: 15, urlPages: 100 },
  business: { bots: 20, files: 25, urlPages: 200 },
};

// ----------------------------------------------------------------
// HELPER — Plan limit check
// ----------------------------------------------------------------
const getPlanLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.free;

// ----------------------------------------------------------------
// HELPER — URL validate karo
// ----------------------------------------------------------------
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ----------------------------------------------------------------
// HELPER — Bot owner check karo
// ----------------------------------------------------------------
const getBotAndVerifyOwner = async (botId, userId) => {
  const bot = await Bot.findById(botId);
  if (!bot) return { error: "notFound" };
  if (bot.userId.toString() !== userId.toString()) return { error: "forbidden" };
  return { bot };
};

// ----------------------------------------------------------------
// @route   POST /api/v1/bots
// @desc    Create new bot
// @access  Private
// ----------------------------------------------------------------
const createBot = async (req, res) => {
  try {
    const user = req.user;
    const limits = getPlanLimits(user.plan);

    // Plan limit check
    if (limits.bots !== -1) {
      const botCount = await Bot.countDocuments({
        userId: user._id,
        isActive: true,
      });

      if (botCount >= limits.bots) {
        return forbiddenResponse(
          res,
          `Your ${user.plan} plan allows maximum ${limits.bots} bot(s). Please upgrade your plan to create more bots.`
        );
      }
    }

    const {
      name,
      description,
      websiteUrl,
      websiteName,
      industry,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return validationErrorResponse(res, [
        { field: "name", message: "Bot name is required" },
      ]);
    }

    if (name.trim().length < 2) {
      return validationErrorResponse(res, [
        { field: "name", message: "Bot name must be at least 2 characters" },
      ]);
    }

    if (name.trim().length > 50) {
      return validationErrorResponse(res, [
        { field: "name", message: "Bot name cannot exceed 50 characters" },
      ]);
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      return validationErrorResponse(res, [
        { field: "websiteUrl", message: "Please enter a valid website URL" },
      ]);
    }

    // Validate industry exists in database
    if (industry && industry.trim()) {
      const Industry = require("../models/Industry.model");
      const industryExists = await Industry.findOne({ value: industry.trim().toLowerCase().replace(/\s+/g, "_") });
      if (!industryExists) {
        return validationErrorResponse(res, [
          { field: "industry", message: "Selected industry is not valid" },
        ]);
      }
    }

    // Bot banao
    const bot = new Bot({
      userId: user._id,
      name: name.trim(),
      description: description?.trim() || null,
      websiteUrl: websiteUrl?.trim() || null,
      websiteName: websiteName?.trim() || null,
      industry: industry || "other",
    });

    // Free plan mein watermark ON rakho
    if (user.plan === "free") {
      bot.behavior.showPoweredBy = true;
    }

    await bot.save();

    // Free trial mark karo
    if (!user.hasUsedFreeTrial) {
      await User.findByIdAndUpdate(user._id, {
        hasUsedFreeTrial: true,
      });
    }

    return successResponse(res, {
      message: "Bot created successfully!",
      statusCode: 201,
      data: { bot },
    });
  } catch (error) {
    console.error("Create bot error:", error);
    
    // Check if it's a Mongoose validation error
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(err => ({
        field: err.path || "general",
        message: err.message
      }));
      return validationErrorResponse(res, errorMessages);
    }
    
    return errorResponse(res, {
      message: `Failed to create bot: ${error.message || 'Please try again.'}`,
    });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/bots
// @desc    Get all bots of current user
// @access  Private
// ----------------------------------------------------------------
const getBots = async (req, res) => {
  try {
    const bots = await Bot.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    const limits = getPlanLimits(req.user.plan);

    return successResponse(res, {
      data: {
        bots,
        total: bots.length,
        limit: limits.bots,
        canCreateMore: limits.bots === -1 || bots.length < limits.bots,
      },
    });
  } catch (error) {
    console.error("Get bots error:", error);
    return errorResponse(res, { message: "Failed to fetch bots." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/bots/:botId
// @desc    Get single bot
// @access  Private
// ----------------------------------------------------------------
const getBot = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    return successResponse(res, { data: { bot } });
  } catch (error) {
    console.error("Get bot error:", error);
    return errorResponse(res, { message: "Failed to fetch bot." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/basic
// @desc    Update bot basic info
// @access  Private
// ----------------------------------------------------------------
const updateBotBasic = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const { name, description, websiteUrl, websiteName, industry } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return validationErrorResponse(res, [
          { field: "name", message: "Bot name cannot be empty" },
        ]);
      }
      if (name.trim().length < 2) {
        return validationErrorResponse(res, [
          { field: "name", message: "Bot name must be at least 2 characters" },
        ]);
      }
      if (name.trim().length > 50) {
        return validationErrorResponse(res, [
          { field: "name", message: "Bot name cannot exceed 50 characters" },
        ]);
      }
      bot.name = name.trim();
    }

    if (description !== undefined) bot.description = description?.trim() || null;
    if (websiteName !== undefined) bot.websiteName = websiteName?.trim() || null;
    if (industry !== undefined) bot.industry = industry;

    if (websiteUrl !== undefined) {
      if (websiteUrl && !isValidUrl(websiteUrl)) {
        return validationErrorResponse(res, [
          { field: "websiteUrl", message: "Please enter a valid website URL" },
        ]);
      }
      bot.websiteUrl = websiteUrl?.trim() || null;
      bot.isInstalled = false; // Re-verify zaroori hoga
    }

    await bot.save();

    return successResponse(res, {
      message: "Bot updated successfully!",
      data: { bot },
    });
  } catch (error) {
    console.error("Update bot basic error:", error);
    return errorResponse(res, { message: "Failed to update bot." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/appearance
// @desc    Update bot appearance
// @access  Private
// ----------------------------------------------------------------
const updateBotAppearance = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const allowedFields = [
      "primaryColor", "secondaryColor", "backgroundColor",
      "userMessageColor", "botMessageColor", "userMessageTextColor",
      "botMessageTextColor", "avatarType", "avatarEmoji", "avatarImageUrl",
      "avatarBgColor", "position", "widgetSize", "chatWindowHeight",
      "chatWindowWidth", "borderRadius", "launcherSize", "launcherIcon",
      "launcherCustomIcon", "fontFamily", "fontSize", "darkModeSupport",
      "mobileFullScreen", "hideOnMobile",
      // New fields for bot settings
      "brandColor", "avatarId", "bubbleSize", "chatWindowTitle",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        bot.appearance[field] = req.body[field];
      }
    });

    await bot.save();

    return successResponse(res, {
      message: "Appearance updated successfully!",
      data: { appearance: bot.appearance },
    });
  } catch (error) {
    console.error("Update appearance error:", error);
    return errorResponse(res, { message: "Failed to update appearance." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/behavior
// @desc    Update bot behavior
// @access  Private
// ----------------------------------------------------------------
const updateBotBehavior = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Language check — Hindi/Hinglish sirf Pro+ ke liye
    if (
      req.body.language &&
      ["hi", "hinglish"].includes(req.body.language) &&
      !["pro", "business"].includes(req.user.plan)
    ) {
      return forbiddenResponse(
        res,
        "Hindi and Hinglish language support is available on Pro and Business plans only."
      );
    }

    // showPoweredBy — sirf Pro+ mein disable ho sakta hai
    if (req.body.showPoweredBy === false && ["free", "starter"].includes(req.user.plan)) {
      return forbiddenResponse(
        res,
        "Removing 'Powered by Lexioai' branding requires Pro or Business plan."
      );
    }

    const allowedFields = [
      "language", "tone", "aiModel", "responseLength", "creativity",
      "welcomeMessage", "fallbackMessage", "offlineMessage", "inputPlaceholder",
      "typingIndicator", "showTimestamp", "soundEnabled", "autoOpen",
      "autoOpenDelay", "showPoweredBy", "maxConversationLength",
      "allowFileUpload", "allowEmoji", "showRestartButton", "restartMessage",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        bot.behavior[field] = req.body[field];
      }
    });

    await bot.save();

    return successResponse(res, {
      message: "Behavior updated successfully!",
      data: { behavior: bot.behavior },
    });
  } catch (error) {
    console.error("Update behavior error:", error);
    return errorResponse(res, { message: "Failed to update behavior." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/contact
// @desc    Update bot contact info
// @access  Private
// ----------------------------------------------------------------
const updateBotContact = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const allowedFields = [
      "phone", "whatsapp", "email", "address",
      "showCallButton", "showWhatsappButton", "showEmailButton",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        bot.contactInfo[field] = req.body[field];
      }
    });

    // Social links bhi update karo
    const socialFields = [
      "instagram", "facebook", "twitter", "linkedin", "youtube", "telegram",
    ];

    socialFields.forEach((field) => {
      if (req.body.socialLinks?.[field] !== undefined) {
        bot.socialLinks[field] = req.body.socialLinks[field];
      }
    });

    await bot.save();

    return successResponse(res, {
      message: "Contact info updated successfully!",
      data: {
        contactInfo: bot.contactInfo,
        socialLinks: bot.socialLinks,
      },
    });
  } catch (error) {
    console.error("Update contact error:", error);
    return errorResponse(res, { message: "Failed to update contact info." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/business-hours
// @desc    Update business hours
// @access  Private
// ----------------------------------------------------------------
const updateBusinessHours = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const { enabled, timezone, schedule, afterHoursMessage, showBusinessHoursInChat } = req.body;

    if (enabled !== undefined) bot.businessHours.enabled = enabled;
    if (timezone !== undefined) bot.businessHours.timezone = timezone;
    if (afterHoursMessage !== undefined) bot.businessHours.afterHoursMessage = afterHoursMessage;
    if (showBusinessHoursInChat !== undefined) bot.businessHours.showBusinessHoursInChat = showBusinessHoursInChat;

    if (schedule) {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      days.forEach((day) => {
        if (schedule[day]) {
          if (schedule[day].isOpen !== undefined)
            bot.businessHours.schedule[day].isOpen = schedule[day].isOpen;
          if (schedule[day].open !== undefined)
            bot.businessHours.schedule[day].open = schedule[day].open;
          if (schedule[day].close !== undefined)
            bot.businessHours.schedule[day].close = schedule[day].close;
        }
      });
    }

    await bot.save();

    return successResponse(res, {
      message: "Business hours updated successfully!",
      data: { businessHours: bot.businessHours },
    });
  } catch (error) {
    console.error("Update business hours error:", error);
    return errorResponse(res, { message: "Failed to update business hours." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/lead-capture
// @desc    Update lead capture settings
// @access  Private
// ----------------------------------------------------------------
const updateLeadCapture = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Lead capture sirf Starter+ ke liye
    if (req.body.enabled === true && req.user.plan === "free") {
      return forbiddenResponse(
        res,
        "Lead capture is available on Starter and above plans."
      );
    }

    const allowedFields = [
      "enabled", "timing", "fields", "title", "subtitle",
      "submitButtonText", "skipButtonText", "allowSkip",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        bot.leadCapture[field] = req.body[field];
      }
    });

    await bot.save();

    return successResponse(res, {
      message: "Lead capture updated successfully!",
      data: { leadCapture: bot.leadCapture },
    });
  } catch (error) {
    console.error("Update lead capture error:", error);
    return errorResponse(res, { message: "Failed to update lead capture." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/starters
// @desc    Update conversation starters
// @access  Private
// ----------------------------------------------------------------
const updateConversationStarters = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const { starters } = req.body;

    if (!Array.isArray(starters)) {
      return validationErrorResponse(res, [
        { field: "starters", message: "Starters must be an array" },
      ]);
    }

    if (starters.length > 4) {
      return validationErrorResponse(res, [
        { field: "starters", message: "Maximum 4 conversation starters allowed" },
      ]);
    }

    // Validate each starter
    for (let i = 0; i < starters.length; i++) {
      const starter = starters[i];
      if (!starter.label || !starter.label.trim()) {
        return validationErrorResponse(res, [
          { field: `starters[${i}].label`, message: "Label is required for each starter" },
        ]);
      }
      if (!starter.message || !starter.message.trim()) {
        return validationErrorResponse(res, [
          { field: `starters[${i}].message`, message: "Message is required for each starter" },
        ]);
      }
    }

    bot.conversationStarters = starters;
    await bot.save();

    return successResponse(res, {
      message: "Conversation starters updated successfully!",
      data: { conversationStarters: bot.conversationStarters },
    });
  } catch (error) {
    console.error("Update starters error:", error);
    return errorResponse(res, { message: "Failed to update conversation starters." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/bots/:botId/toggle
// @desc    Toggle bot active/inactive
// @access  Private
// ----------------------------------------------------------------
const toggleBot = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    bot.isLive = !bot.isLive;
    await bot.save();

    return successResponse(res, {
      message: `Bot is now ${bot.isLive ? "live" : "offline"}.`,
      data: { isLive: bot.isLive },
    });
  } catch (error) {
    console.error("Toggle bot error:", error);
    return errorResponse(res, { message: "Failed to toggle bot status." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/bots/:botId/embed
// @desc    Get embed code
// @access  Private
// ----------------------------------------------------------------
const getEmbedCode = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const embedCode = bot.getEmbedCode();

    return successResponse(res, {
      data: {
        botId: bot.embedKey,
        botName: bot.name,
        embedCode,
        isInstalled: bot.isInstalled,
        installedAt: bot.installedAt,
        lastVerifiedAt: bot.lastVerifiedAt,
      },
    });
  } catch (error) {
    console.error("Get embed code error:", error);
    return errorResponse(res, { message: "Failed to get embed code." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/bots/:botId/verify
// @desc    Verify bot installation on website
// @access  Private
// ----------------------------------------------------------------
const verifyInstallation = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    if (!bot.websiteUrl) {
      return validationErrorResponse(res, [
        {
          field: "websiteUrl",
          message: "Please add your website URL in bot settings before verifying.",
        },
      ]);
    }

    try {
      // Website fetch karo
      const response = await axios.get(bot.websiteUrl, {
        timeout: parseInt(process.env.CRAWLER_TIMEOUT_MS) || 10000,
        headers: {
          "User-Agent": process.env.CRAWLER_USER_AGENT || "LexioaiBot/1.0",
        },
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Widget script check karo
      let isFound = false;

      // Check 1: script src mein widget.js
      $("script[src]").each((_, el) => {
        const src = $(el).attr("src") || "";
        if (src.includes("lexioai") && src.includes("widget")) {
          isFound = true;
        }
      });

      // Check 2: inline script mein lexioaiConfig
      if (!isFound) {
        $("script:not([src])").each((_, el) => {
          const content = $(el).html() || "";
          if (content.includes("lexioaiConfig") || content.includes("lexioai")) {
            isFound = true;
          }
        });
      }

      // Check 3: embedKey
      if (!isFound && html.includes(bot.embedKey)) {
        isFound = true;
      }

      if (isFound) {
        bot.isInstalled = true;
        bot.installedAt = bot.installedAt || new Date();
        bot.lastVerifiedAt = new Date();
        await bot.save();

        return successResponse(res, {
          message: "✅ Bot successfully detected on your website!",
          data: {
            isInstalled: true,
            installedAt: bot.installedAt,
            lastVerifiedAt: bot.lastVerifiedAt,
            websiteUrl: bot.websiteUrl,
          },
        });
      } else {
        return successResponse(res, {
          message: "❌ Bot not detected on your website. Please make sure you have added the embed code correctly.",
          data: {
            isInstalled: false,
            websiteUrl: bot.websiteUrl,
            embedCode: bot.getEmbedCode(),
          },
        });
      }
    } catch (fetchError) {
      return errorResponse(res, {
        message: `Could not reach your website. Please make sure ${bot.websiteUrl} is accessible and try again.`,
        statusCode: 400,
      });
    }
  } catch (error) {
    console.error("Verify installation error:", error);
    return errorResponse(res, { message: "Failed to verify installation." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/bots/:botId
// @desc    Delete bot (soft delete)
// @access  Private
// ----------------------------------------------------------------
const deleteBot = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Soft delete
    bot.isActive = false;
    bot.isLive = false;
    await bot.save();

    return successResponse(res, {
      message: "Bot deleted successfully.",
    });
  } catch (error) {
    console.error("Delete bot error:", error);
    return errorResponse(res, { message: "Failed to delete bot." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/bots/:botId/stats
// @desc    Get bot stats
// @access  Private
// ----------------------------------------------------------------
const getBotStats = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const currentMonth = new Date().toISOString().slice(0, 7);

    return successResponse(res, {
      data: {
        stats: bot.stats,
        currentMonthChats:
          bot.currentMonthUsage.month === currentMonth
            ? bot.currentMonthUsage.chatsUsed
            : 0,
        trainingStatus: bot.trainingStatus,
        lastTrainedAt: bot.lastTrainedAt,
        isLive: bot.isLive,
        isInstalled: bot.isInstalled,
      },
    });
  } catch (error) {
    console.error("Get bot stats error:", error);
    return errorResponse(res, { message: "Failed to fetch bot stats." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/bots/:botId/upload-avatar
// @desc    Upload custom bot avatar to Cloudinary
// @access  Private
// ----------------------------------------------------------------
const uploadBotAvatar = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerifyOwner(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    if (!req.file) {
      return errorResponse(res, { message: "File is required" });
    }

    // File size validation (2MB max = 2097152 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return errorResponse(res, { message: "File size must not exceed 2MB" });
    }

    // MIME type validation
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return errorResponse(res, { message: "Only JPG, PNG, and WebP files are allowed" });
    }

    // Delete old avatar if it exists
    if (bot.appearance.avatarId && bot.appearance.avatarType === "custom") {
      try {
        await cloudinary.uploader.destroy(bot.appearance.avatarId);
      } catch (err) {
        console.warn("Failed to delete old avatar:", err);
        // Continue anyway - don't fail if old delete fails
      }
    }

    // Upload to Cloudinary using buffer
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${process.env.CLOUDINARY_FOLDER || "lexioai"}/avatars`,
          resource_type: "image",
          format: "png",
        },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return resolve(
              errorResponse(res, { message: "Failed to upload avatar to cloud storage" })
            );
          }

          // Update bot with new avatar
          bot.appearance.avatarType = "custom";
          bot.appearance.avatarImageUrl = result.secure_url;
          bot.appearance.avatarId = result.public_id;

          await bot.save();

          return resolve(
            successResponse(res, {
              message: "Avatar uploaded successfully!",
              data: {
                avatarUrl: result.secure_url,
                publicId: result.public_id,
                appearance: bot.appearance,
              },
            })
          );
        }
      );

      // Upload file buffer
      uploadStream.end(req.file.buffer);
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return errorResponse(res, { message: "Failed to upload avatar" });
  }
};

module.exports = {
  createBot,
  getBots,
  getBot,
  updateBotBasic,
  updateBotAppearance,
  updateBotBehavior,
  updateBotContact,
  updateBusinessHours,
  updateLeadCapture,
  updateConversationStarters,
  toggleBot,
  getEmbedCode,
  verifyInstallation,
  deleteBot,
  getBotStats,
  uploadBotAvatar,
};