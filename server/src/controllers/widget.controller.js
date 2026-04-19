const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const Lead = require("../models/Lead.model");
const User = require("../models/User.model");
const PlatformSettings = require("../models/PlatformSettings.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const { sendBotLimitWarningEmail } = require("../utils/email.utils");
const { dispatchEventNotification } = require("../utils/eventNotifications.utils");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");
const {
  getMessageIntent,
  getQuickLinkByIntent,
  buildQuickLinkResponse,
} = require("../utils/linkResolver.utils");

// ----------------------------------------------------------------
// AI CLIENTS
// ----------------------------------------------------------------
const aiService = require("../utils/ai.service");

// ----------------------------------------------------------------
// HELPER — Bot embedKey se find karo
// ----------------------------------------------------------------
const getBotByEmbedKey = async (embedKey) => {
  const bot = await Bot.findOne({ embedKey, isActive: true });
  return bot;
};

// ----------------------------------------------------------------
// HELPER — Check business hours
// ----------------------------------------------------------------
const isWithinBusinessHours = (businessHours) => {
  if (!businessHours?.enabled) return true; // Disabled = always open

  const now = new Date();
  const timezone = businessHours.timezone || "Asia/Kolkata";

  // Convert to bot's timezone
  const localTime = new Date(
    now.toLocaleString("en-US", { timeZone: timezone }),
  );

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = days[localTime.getDay()];
  const schedule = businessHours.schedule?.[dayName];

  if (!schedule?.isOpen) return false;

  const [openHour, openMin] = schedule.open.split(":").map(Number);
  const [closeHour, closeMin] = schedule.close.split(":").map(Number);

  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

// ----------------------------------------------------------------
// HELPER — Language detect
// ----------------------------------------------------------------
const detectLanguage = (text) => {
  const input = String(text || "").trim();
  if (!input) return "en";

  const hindiRegex = /[\u0900-\u097F]/;
  if (hindiRegex.test(input)) return "hi";

  const latinText = input.toLowerCase().replace(/[^a-z\s]/g, " ");
  const tokens = latinText.split(/\s+/).filter(Boolean);

  const hinglishMarkers = new Set([
    "hai", "ho", "hun", "hota", "hoti", "karte", "karna", "karo", "kr", "kya",
    "kyu", "kyun", "kaise", "kon", "kaun", "mera", "meri", "tum", "aap", "main",
    "mera", "nahi", "haan", "acha", "achha", "thik", "sahi", "samjha", "bata", "bro",
  ]);

  const markerHits = tokens.reduce(
    (count, token) => (hinglishMarkers.has(token) ? count + 1 : count),
    0
  );

  if (markerHits >= 2) return "hinglish";

  return "en";
};

const formatAssistantReply = (text) => {
  const value = String(text || "").trim();
  if (!value) return value;

  return value
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\s+(\d+\.\s+\*\*)/g, "$1\n$2")
    .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2")
    .replace(/([^\n])\s+([-•]\s+)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const CREDIT_ELIGIBLE_PLANS = ["pro", "business"];

const isCreditEligiblePlan = (plan) =>
  CREDIT_ELIGIBLE_PLANS.includes(String(plan || "").toLowerCase());

const getCurrentMonthToken = () => new Date().toISOString().slice(0, 7);

const notifyOwnerBotLimitReached = async ({ owner, bot, chatLimit }) => {
  if (!owner?._id || !bot?._id) return;

  const chatsUsed = Number(bot?.currentMonthUsage?.chatsUsed || 0);
  const effectiveChatsUsed = Math.max(chatsUsed, chatLimit);

  await dispatchEventNotification({
    user: owner,
    type: "botLimit",
    title: "Monthly chat limit reached",
    message: `Your bot has reached its monthly chat limit (${chatLimit} chats). Buy credits or upgrade your plan to continue serving visitors.`,
    priority: "high",
    dedupeKey: `bot-limit-${bot._id}-${getCurrentMonthToken()}`,
    metadata: {
      botId: bot._id,
      chatLimit,
      chatsUsed: effectiveChatsUsed,
    },
    emailPrefKey: "botLimit",
    inAppPrefKey: "botLimit",
    fallbackEmailEnabled: true,
    fallbackInAppEnabled: true,
    sendEmail: () => sendBotLimitWarningEmail(owner, effectiveChatsUsed, chatLimit),
  });
};

// ----------------------------------------------------------------
// @route   GET /api/v1/widget/:embedKey/config
// @desc    Bot config fetch karo — widget ke liye
// @access  Public
// ----------------------------------------------------------------
const getWidgetConfig = async (req, res) => {
  try {
    const bot = await getBotByEmbedKey(req.params.embedKey);
    const platformSettings = await PlatformSettings.getSettings();

    if (!bot) {
      return notFoundResponse(res, "Bot not found");
    }

    if (!bot.isLive) {
      return errorResponse(res, {
        message: "Bot is currently offline.",
        statusCode: 503,
        data: {
          offlineMessage:
            bot.behavior?.offlineMessage ||
            "Our bot is currently unavailable. Please try again later.",
        },
      });
    }

    // Bot trained hai?
    if (bot.trainingStatus === "untrained" || !bot.systemPrompt) {
      return errorResponse(res, {
        message: "Bot is not ready yet.",
        statusCode: 503,
        data: {
          offlineMessage:
            "Our assistant is being set up. Please check back soon!",
        },
      });
    }

    // Business hours check
    const isOpen = isWithinBusinessHours(bot.businessHours);

    return successResponse(res, {
      data: {
        botId: bot.embedKey,
        botName: bot.name,
        isOpen,
        appearance: bot.appearance,
        behavior: {
          welcomeMessage: isOpen
            ? bot.behavior?.welcomeMessage
            : bot.businessHours?.afterHoursMessage,
          inputPlaceholder: bot.behavior?.inputPlaceholder,
          typingIndicator: bot.behavior?.typingIndicator,
          showTimestamp: bot.behavior?.showTimestamp,
          soundEnabled: bot.behavior?.soundEnabled,
          autoOpen: bot.behavior?.autoOpen,
          autoOpenDelay: bot.behavior?.autoOpenDelay,
          showPoweredBy: bot.behavior?.showPoweredBy,
          allowEmoji: bot.behavior?.allowEmoji,
          showRestartButton: bot.behavior?.showRestartButton,
          restartMessage: bot.behavior?.restartMessage,
          maxConversationLength: bot.behavior?.maxConversationLength,
        },
        contactInfo: bot.contactInfo,
        socialLinks: bot.socialLinks,
        conversationStarters: bot.conversationStarters,
        leadCapture: bot.leadCapture,
        businessHours: {
          enabled: bot.businessHours?.enabled,
          isOpen,
          afterHoursMessage: bot.businessHours?.afterHoursMessage,
          showBusinessHoursInChat: bot.businessHours?.showBusinessHoursInChat,
        },
        platformBranding: {
          platformName: platformSettings?.branding?.platformName || "Lexioai",
          watermarkUrl: platformSettings?.branding?.watermarkUrl || null,
        },
      },
    });
  } catch (error) {
    console.error("Get widget config error:", error);
    return errorResponse(res, { message: "Failed to load bot configuration." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/widget/:embedKey/start
// @desc    New conversation start karo
// @access  Public
// ----------------------------------------------------------------
const startWidgetConversation = async (req, res) => {
  try {
    const bot = await getBotByEmbedKey(req.params.embedKey);

    if (!bot) return notFoundResponse(res, "Bot not found");
    if (!bot.isLive) {
      return errorResponse(res, {
        message: bot.behavior?.offlineMessage || "Bot is offline.",
        statusCode: 503,
      });
    }

    // Chat limit check
    const CHAT_LIMITS = {
      free: 50,
      starter: 500,
      pro: 2000,
      business: 10000,
    };

    // Bot owner ka plan check karo
    const owner = await User.findById(bot.userId);
    if (!owner || owner.isBanned || !owner.isActive) {
      return errorResponse(res, {
        message: bot.behavior?.offlineMessage || "Bot is offline.",
        statusCode: 503,
      });
    }

    if (owner.plan !== "free" && !owner.isPlanActive()) {
      return errorResponse(res, {
        message: "Bot owner subscription is inactive.",
        statusCode: 429,
      });
    }

    const chatLimit = CHAT_LIMITS[owner?.plan] || 50;
    const hasReached = await bot.hasReachedChatLimit(chatLimit);

    if (hasReached) {
      // Credits only for Pro/Business after monthly limit is reached
      if (!isCreditEligiblePlan(owner.plan)) {
        notifyOwnerBotLimitReached({ owner, bot, chatLimit }).catch(() => {});
        return errorResponse(res, {
          message:
            bot.behavior?.offlineMessage ||
            "Chat limit reached. Please try again later.",
          statusCode: 429,
        });
      }

      const creditDeducted = await User.findOneAndUpdate(
        { _id: owner._id, chatCredits: { $gt: 0 } },
        { $inc: { chatCredits: -1 } },
        { new: true }
      );

      if (!creditDeducted) {
        notifyOwnerBotLimitReached({ owner, bot, chatLimit }).catch(() => {});
        return errorResponse(res, {
          message:
            bot.behavior?.offlineMessage ||
            "Chat limit reached. Please try again later.",
          statusCode: 429,
        });
      }
    }

    const { visitorId, visitorIP, visitorDevice, pageUrl } = req.body;

    // Business hours check
    const isOpen = isWithinBusinessHours(bot.businessHours);

    // Conversation banao
    const conversation = new Conversation({
      botId: bot._id,
      ownerId: bot.userId,
      visitorId: visitorId || null,
      visitorIP: visitorIP || req.ip || null,
      visitorDevice: visitorDevice || req.headers["user-agent"] || null,
      pageUrl: pageUrl || null,
    });

    // Welcome message
    const welcomeMsg = isOpen
      ? bot.behavior?.welcomeMessage || "👋 Hi there! How can I help you today?"
      : bot.businessHours?.afterHoursMessage || "We are currently closed.";

    conversation.messages.push({
      role: "bot",
      content: welcomeMsg,
      isAnswered: true,
    });

    conversation.totalMessages = 1;
    await conversation.save();

    // Chat count increment
    await bot.incrementChatCount();

    return successResponse(res, {
      statusCode: 201,
      data: {
        conversationId: conversation._id,
        welcomeMessage: welcomeMsg,
        isOpen,
      },
    });
  } catch (error) {
    console.error("Start widget conversation error:", error);
    return errorResponse(res, { message: "Failed to start conversation." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/widget/:embedKey/message
// @desc    Message bhejo aur AI response lo
// @access  Public
// ----------------------------------------------------------------
const sendWidgetMessage = async (req, res) => {
  try {
    const bot = await getBotByEmbedKey(req.params.embedKey);

    if (!bot) return notFoundResponse(res, "Bot not found");
    if (!bot.isLive) {
      return errorResponse(res, {
        message: "Bot is offline.",
        statusCode: 503,
      });
    }

    const { conversationId, message, visitorId } = req.body;

    if (!conversationId) {
      return validationErrorResponse(res, [
        { field: "conversationId", message: "Conversation ID is required" },
      ]);
    }

    if (!message || !message.trim()) {
      return validationErrorResponse(res, [
        { field: "message", message: "Message is required" },
      ]);
    }

    if (message.trim().length > 1000) {
      return validationErrorResponse(res, [
        { field: "message", message: "Message cannot exceed 1000 characters" },
      ]);
    }

    // Conversation find karo
    const conversation = await Conversation.findOne({
      _id: conversationId,
      botId: bot._id,
    });

    if (!conversation) {
      return notFoundResponse(res, "Conversation not found");
    }

    if (conversation.status === "ended") {
      return errorResponse(res, {
        message: "Conversation has ended.",
        statusCode: 400,
      });
    }

    if (!bot.systemPrompt) {
      return errorResponse(res, {
        message: "Bot is not trained yet.",
        statusCode: 400,
      });
    }

    // Max conversation length check
    const maxLength = bot.behavior?.maxConversationLength || 50;
    if (conversation.messages.length >= maxLength) {
      return errorResponse(res, {
        message:
          "Maximum conversation length reached. Please start a new conversation.",
        statusCode: 400,
        data: { maxReached: true },
      });
    }

    // User message add karo
    conversation.messages.push({
      role: "user",
      content: message.trim(),
    });

    // Language detect
    const lang = detectLanguage(message);
    conversation.language = lang;

    const linkIntent = getMessageIntent(message);
    if (linkIntent) {
      const quickLink = getQuickLinkByIntent(bot, linkIntent);
      if (quickLink) {
        const quickReply = buildQuickLinkResponse({
          intent: linkIntent,
          url: quickLink,
          language: lang,
        });

        conversation.messages.push({
          role: "bot",
          content: quickReply,
          isAnswered: true,
          responseTime: 0,
          aiModel: "link-resolver",
        });
        conversation.totalMessages += 2;

        await Bot.findByIdAndUpdate(bot._id, {
          $inc: { "stats.totalMessages": 2 },
        });
        await conversation.save();

        return successResponse(res, {
          data: {
            conversationId: conversation._id,
            reply: quickReply,
            model: "link-resolver",
            isAnswered: true,
            responseTime: 0,
            totalMessages: conversation.messages.length,
            leadCaptureRequired: bot.leadCapture?.enabled || false,
          },
        });
      }
    }

    // AI response lo
    const startTime = Date.now();
    const { response: aiResponse, model } = await aiService.getAIResponse(
      bot,
      conversation.messages.slice(0, -1),
      message.trim(),
      { replyLanguage: lang },
    );
    const formattedReply = formatAssistantReply(aiResponse);
    const responseTime = Date.now() - startTime;

    // Check answered
    const fallbackMsg = bot.behavior?.fallbackMessage || "I'm sorry";
    const isAnswered = !formattedReply
      .toLowerCase()
      .includes(fallbackMsg.toLowerCase().substring(0, 20));

    // Bot response add karo
    conversation.messages.push({
      role: "bot",
      content: formattedReply,
      isAnswered,
      responseTime,
      aiModel: model,
    });

    conversation.totalMessages += 2;
    if (!isAnswered) {
      conversation.unansweredCount += 1;
      await Bot.findByIdAndUpdate(bot._id, {
        $inc: { "stats.unansweredCount": 1 },
      });
    }

    await Bot.findByIdAndUpdate(bot._id, {
      $inc: { "stats.totalMessages": 2 },
    });

    await conversation.save();

    return successResponse(res, {
      data: {
        conversationId: conversation._id,
        reply: formattedReply,
        model,
        isAnswered,
        responseTime,
        totalMessages: conversation.messages.length,
        leadCaptureRequired: bot.leadCapture?.enabled || false,  // ← Add this flag
      },
    });
  } catch (error) {
    console.error("Send widget message error:", error);
    return errorResponse(res, { message: "Failed to send message." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/widget/:embedKey/lead
// @desc    Lead capture karo
// @access  Public
// ----------------------------------------------------------------
const captureWidgetLead = async (req, res) => {
  try {
    const bot = await getBotByEmbedKey(req.params.embedKey);

    if (!bot) return notFoundResponse(res, "Bot not found");

    // Lead capture enabled hai?
    if (!bot.leadCapture?.enabled) {
      return errorResponse(res, {
        message: "Lead capture is not enabled for this bot.",
        statusCode: 400,
      });
    }

    const { name, email, phone, company, message, conversationId, pageUrl } =
      req.body;

    // Validation — kam se kam ek field honi chahiye
    if (!name && !email && !phone) {
      return validationErrorResponse(res, [
        {
          field: "general",
          message: "At least name, email, or phone is required",
        },
      ]);
    }

    // Email format check
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return validationErrorResponse(res, [
          { field: "email", message: "Please enter a valid email address" },
        ]);
      }
    }

    // Duplicate check — same email same bot
    if (email) {
      const existing = await Lead.findOne({
        botId: bot._id,
        email: email.toLowerCase(),
      });
      if (existing) {
        // Already exists — return success (don't reveal duplicate)
        return successResponse(res, {
          message: "Thank you! We'll be in touch soon.",
          data: { leadId: existing._id },
        });
      }
    }

    const lead = new Lead({
      botId: bot._id,
      ownerId: bot.userId,
      conversationId: conversationId || null,
      name: name?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      message: message?.trim() || null,
      pageUrl: pageUrl || null,
      visitorIP: req.ip || null,
      visitorDevice: req.headers["user-agent"] || null,
    });

    await lead.save();

    // Conversation update karo
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        leadCaptured: true,
        leadId: lead._id,
        visitorName: name || null,
        visitorEmail: email || null,
        visitorPhone: phone || null,
      });
    }

    // Bot stats update
    await Bot.findByIdAndUpdate(bot._id, {
      $inc: { "stats.totalLeads": 1 },
    });

    return successResponse(res, {
      message: "Thank you! We'll be in touch soon.",
      statusCode: 201,
      data: { leadId: lead._id },
    });
  } catch (error) {
    console.error("Capture widget lead error:", error);
    return errorResponse(res, { message: "Failed to save your information." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/widget/:embedKey/end
// @desc    Conversation end karo
// @access  Public
// ----------------------------------------------------------------
const endWidgetConversation = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return validationErrorResponse(res, [
        { field: "conversationId", message: "Conversation ID is required" },
      ]);
    }

    const bot = await getBotByEmbedKey(req.params.embedKey);
    if (!bot) return notFoundResponse(res, "Bot not found");

    await Conversation.findOneAndUpdate(
      { _id: conversationId, botId: bot._id },
      { status: "ended", endedAt: new Date() },
    );

    return successResponse(res, { message: "Conversation ended." });
  } catch (error) {
    console.error("End widget conversation error:", error);
    return errorResponse(res, { message: "Failed to end conversation." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/widget/stats
// @desc    Public stats — landing page ke liye
// @access  Public
// ----------------------------------------------------------------
const getPublicStats = async (req, res) => {
  try {
    const User = require("../models/User.model");

    const [totalUsers, totalBots, totalChats, totalLeads] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Bot.countDocuments({ isActive: true }),
      Conversation.countDocuments(),
      Lead.countDocuments(),
    ]);

    return successResponse(res, {
      data: {
        totalUsers,
        totalBots,
        totalChats,
        totalLeads,
      },
    });
  } catch (error) {
    console.error("Get public stats error:", error);
    return errorResponse(res, { message: "Failed to fetch stats." });
  }
};

module.exports = {
  getWidgetConfig,
  startWidgetConversation,
  sendWidgetMessage,
  captureWidgetLead,
  endWidgetConversation,
  getPublicStats,
};
