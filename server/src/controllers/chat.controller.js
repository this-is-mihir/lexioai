const Bot = require("../models/Bot.model");
const Conversation = require("../models/Conversation.model");
const { sendBotLimitWarningEmail } = require("../utils/email.utils");
const { dispatchEventNotification } = require("../utils/eventNotifications.utils");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ----------------------------------------------------------------
// PLAN CHAT LIMITS
// ----------------------------------------------------------------
const CHAT_LIMITS = {
  free: 50,
  starter: 100,
  pro: 300,
  business: 2000,
};

// ----------------------------------------------------------------
// HELPER — Bot owner verify
// ----------------------------------------------------------------
const getBotAndVerify = async (botId, userId) => {
  const bot = await Bot.findById(botId);
  if (!bot) return { error: "notFound" };
  if (bot.userId.toString() !== userId.toString())
    return { error: "forbidden" };
  return { bot };
};

// ================================================================
// HELPER — Call Gemini with specific decrypted key
// ================================================================
const callGeminiWithKey = async (decryptedKey, model, systemPrompt, messages, userMessage) => {
  const genAI = new GoogleGenerativeAI(decryptedKey);
  const modelInstance = genAI.getGenerativeModel({
    model: model || "gemini-1.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  });

  const history = messages
    .slice(-10)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

  const chat = modelInstance.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
};

// ================================================================
// HELPER — Call Groq with specific decrypted key
// ================================================================
const callGroqWithKey = async (decryptedKey, model, systemPrompt, messages, userMessage) => {
  const groqClient = new Groq({ apiKey: decryptedKey });
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await groqClient.chat.completions.create({
    model: model || "llama-3.1-8b-instant",
    messages: chatMessages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "";
};

// ================================================================
// HELPER — Intelligent Queue-Based AI Response (Multi-Key Fallback)
// ================================================================
const getAIResponse = async (bot, messages, userMessage) => {
  const AIKey = require("../models/AIKey.model");
  const systemPrompt = `${bot.systemPrompt || `You are ${bot.name}, a helpful assistant.`}

FORMAT RULES:
1. Keep answers detailed but easy to read.
2. Prefer short sections or numbered points over one long paragraph.
3. For list-style questions (projects, features, steps, options), use numbered list.
4. Keep each point concise: title first, then a short explanation.
5. Avoid unnecessary intro/outro lines.`;

  try {
    // 1. Database से सब active keys fetch करो
    const activeKeys = await AIKey.find({
      isActive: true,
      consecutiveFailures: { $lt: 3 }, // Auto-disabled keys छोड़ दो
      "rateLimit.isLimited": false,    // Rate-limited keys छोड़ दो
    })
      .select("+apiKey") // Encrypted key select करो
      .sort({ provider: 1, priority: 1 }) // Provider फिर Priority से sort करो
      .exec();

    console.log(`🔄 AI Queue: Trying with ${activeKeys.length} available keys...`);

    // 2. हर key को loop करो - queue में से एक एक करके
    for (const keyDoc of activeKeys) {
      try {
        const startTime = Date.now();

        // API key decrypt करो
        const decryptedKey = keyDoc.getDecryptedKey();

        if (!decryptedKey) {
          console.warn(`⚠️ Key "${keyDoc.name}" - decryption failed, skipping`);
          continue;
        }

        let response;

        if (keyDoc.provider === "gemini") {
          response = await callGeminiWithKey(
            decryptedKey,
            keyDoc.model,
            systemPrompt,
            messages,
            userMessage
          );
        } else if (keyDoc.provider === "groq") {
          response = await callGroqWithKey(
            decryptedKey,
            keyDoc.model,
            systemPrompt,
            messages,
            userMessage
          );
        } else {
          // Other providers - skip for now
          continue;
        }

        const responseTime = Date.now() - startTime;

        // ✅ Success! Stats update करो
        await AIKey.findByIdAndUpdate(keyDoc._id, {
          $inc: {
            "stats.totalRequests": 1,
            "stats.successRequests": 1,
            "stats.requestsThisMonth": 1,
          },
          $set: {
            "stats.lastUsedAt": new Date(),
            "stats.avgResponseTime": responseTime,
            consecutiveFailures: 0, // Reset failures
          },
        });

        console.log(`✅ AI Response via "${keyDoc.name}" (${keyDoc.provider}) - ${responseTime}ms`);

        return { response, model: keyDoc.name, provider: keyDoc.provider };
      } catch (keyError) {
        // ❌ This key failed, increment failures और अगले को try करो
        const errorMsg = keyError.message || JSON.stringify(keyError);

        try {
          await AIKey.findByIdAndUpdate(keyDoc._id, {
            $inc: {
              "stats.totalRequests": 1,
              "stats.failedRequests": 1,
              consecutiveFailures: 1,
            },
            $set: {
              "stats.lastFailedAt": new Date(),
              "stats.lastError": errorMsg.substring(0, 200),
            },
          });
        } catch (updateError) {
          console.error("Failed to update key stats:", updateError);
        }

        console.warn(
          `⚠️ Key "${keyDoc.name}" (${keyDoc.provider}) failed: ${errorMsg.substring(0, 80)}`
        );

        // अगले key को queue में try करो
        continue;
      }
    }

    // 3. सब keys fail हो गए → Fallback message
    console.error("❌ All AI keys exhausted, returning fallback message");
    return {
      response:
        bot.behavior?.fallbackMessage ||
        "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
      model: "fallback",
      provider: "fallback",
    };
  } catch (error) {
    console.error("🔴 Critical error in getAIResponse:", error);
    return {
      response:
        bot.behavior?.fallbackMessage ||
        "An error occurred. Please try again later.",
      model: "fallback",
      provider: "fallback",
    };
  }
};

// ----------------------------------------------------------------
// HELPER — Language detect karo
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
    "nahi", "haan", "acha", "achha", "thik", "sahi", "samjha", "bata", "bro",
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

const getCurrentMonthToken = () => new Date().toISOString().slice(0, 7);

const notifyBotLimitReached = async ({ user, bot, chatLimit }) => {
  if (!user?._id || !bot?._id) return;

  const chatsUsed = Number(bot?.currentMonthUsage?.chatsUsed || 0);
  const effectiveChatsUsed = Math.max(chatsUsed, chatLimit);

  await dispatchEventNotification({
    user,
    type: "botLimit",
    title: "Monthly chat limit reached",
    message: `You have reached your monthly chat limit (${chatLimit} chats). Buy credits or upgrade your plan to continue.`,
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
    sendEmail: () => sendBotLimitWarningEmail(user, effectiveChatsUsed, chatLimit),
  });
};

// ----------------------------------------------------------------
// @route   POST /api/v1/chat/:botId/start
// @desc    New conversation start karo
// @access  Private (bot owner)
// ----------------------------------------------------------------
const startConversation = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Bot trained hai?
    if (bot.trainingStatus === "untrained") {
      return errorResponse(res, {
        message: "Bot is not trained yet. Please add training data first.",
        statusCode: 400,
      });
    }

    // ----------------------------------------------------------------
    // CHAT SECURITY — Plan + Credits check
    // ----------------------------------------------------------------

    // FREE plan — sirf plan limit, credits bilkul nahi
    if (req.user.plan === "free") {
      const chatLimit = CHAT_LIMITS["free"];
      const hasReached = await bot.hasReachedChatLimit(chatLimit);
      if (hasReached) {
        notifyBotLimitReached({ user: req.user, bot, chatLimit }).catch(() => {});
        return forbiddenResponse(
          res,
          `You have reached your free plan limit of ${chatLimit} chats/month. Upgrade to a paid plan to continue.`
        );
      }
    } else {
      // PAID PLAN — expiry check first
      if (!req.user.isPlanActive()) {
        return forbiddenResponse(
          res,
          "Your subscription has expired. Please renew your plan to continue chatting."
        );
      }

      // Plan limit check
      const chatLimit = CHAT_LIMITS[req.user.plan] || 500;
      const hasReached = await bot.hasReachedChatLimit(chatLimit);

      if (hasReached) {
        // Credits check karo
        if (!req.user.chatCredits || req.user.chatCredits <= 0) {
          notifyBotLimitReached({ user: req.user, bot, chatLimit }).catch(() => {});
          return forbiddenResponse(
            res,
            `Monthly chat limit reached (${chatLimit} chats). Buy credits to continue, or upgrade your plan.`
          );
        }
        // 1 credit deduct karo
        await req.user.constructor.findByIdAndUpdate(
          req.user._id,
          { $inc: { chatCredits: -1 } }
        );
      }
    }

    // New conversation banao
    const conversation = new Conversation({
      botId: bot._id,
      ownerId: req.user._id,
      visitorId: req.body.visitorId || null,
      visitorIP: req.body.visitorIP || null,
      visitorDevice: req.body.visitorDevice || null,
      pageUrl: req.body.pageUrl || null,
    });

    await conversation.save();

    // Welcome message add karo
    const welcomeMessage = {
      role: "bot",
      content: bot.behavior?.welcomeMessage || "👋 Hi there! How can I help you today?",
      isAnswered: true,
      aiModel: null,
    };

    conversation.messages.push(welcomeMessage);
    conversation.totalMessages = 1;
    await conversation.save();

    // Chat count increment
    await bot.incrementChatCount();

    return successResponse(res, {
      message: "Conversation started!",
      statusCode: 201,
      data: {
        conversationId: conversation._id,
        welcomeMessage: welcomeMessage.content,
        botName: bot.name,
        botConfig: {
          appearance: bot.appearance,
          behavior: bot.behavior,
          contactInfo: bot.contactInfo,
          socialLinks: bot.socialLinks,
          conversationStarters: bot.conversationStarters,
          leadCapture: bot.leadCapture,
        },
      },
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    return errorResponse(res, { message: "Failed to start conversation." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/chat/:botId/message
// @desc    Message bhejo aur AI response lo
// @access  Private (bot owner)
// ----------------------------------------------------------------
const sendMessage = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const { conversationId, message } = req.body;

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
        message: "This conversation has ended. Please start a new one.",
        statusCode: 400,
      });
    }

    // Bot trained hai?
    if (!bot.systemPrompt) {
      return errorResponse(res, {
        message: "Bot is not trained yet.",
        statusCode: 400,
      });
    }

    // User message add karo
    const userMsg = {
      role: "user",
      content: message.trim(),
    };
    conversation.messages.push(userMsg);

    // Language detect karo
    const detectedLang = detectLanguage(message);
    conversation.language = detectedLang;

    const linkIntent = getMessageIntent(message);
    if (linkIntent) {
      const quickLink = getQuickLinkByIntent(bot, linkIntent);
      if (quickLink) {
        const quickReply = buildQuickLinkResponse({
          intent: linkIntent,
          url: quickLink,
          language: detectedLang,
        });

        const botMsg = {
          role: "bot",
          content: quickReply,
          isAnswered: true,
          responseTime: 0,
          aiModel: "link-resolver",
        };
        conversation.messages.push(botMsg);
        conversation.totalMessages += 2;

        await Bot.findByIdAndUpdate(bot._id, {
          $inc: { "stats.totalMessages": 2 },
        });
        await conversation.save();

        return successResponse(res, {
          data: {
            conversationId: conversation._id,
            message: quickReply,
            model: "link-resolver",
            isAnswered: true,
            responseTime: 0,
            totalMessages: conversation.totalMessages,
          },
        });
      }
    }

    // AI response lo
    const startTime = Date.now();
    const { response: aiResponse, model } = await getAIResponse(
      bot,
      conversation.messages.slice(0, -1), // User message ke pehle ki history
      message.trim(),
      { replyLanguage: detectedLang }
    );
    const formattedReply = formatAssistantReply(aiResponse);
    const responseTime = Date.now() - startTime;

    // Check karo bot answer de paya ya nahi
    const isAnswered = !formattedReply.includes(bot.behavior?.fallbackMessage || "I'm sorry, I couldn't find");

    // Bot response add karo
    const botMsg = {
      role: "bot",
      content: formattedReply,
      isAnswered,
      responseTime,
      aiModel: model,
    };
    conversation.messages.push(botMsg);

    // Stats update karo
    conversation.totalMessages += 2;
    if (!isAnswered) {
      conversation.unansweredCount += 1;
      // Bot stats update
      await Bot.findByIdAndUpdate(bot._id, {
        $inc: { "stats.unansweredCount": 1 },
      });
    }

    // Bot stats update
    await Bot.findByIdAndUpdate(bot._id, {
      $inc: {
        "stats.totalMessages": 2,
      },
    });

    await conversation.save();

    return successResponse(res, {
      data: {
        conversationId: conversation._id,
        message: formattedReply,
        model,
        isAnswered,
        responseTime,
        totalMessages: conversation.totalMessages,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse(res, { message: "Failed to send message. Please try again." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/chat/:botId/end
// @desc    Conversation end karo
// @access  Private
// ----------------------------------------------------------------
const endConversation = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return validationErrorResponse(res, [
        { field: "conversationId", message: "Conversation ID is required" },
      ]);
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ownerId: req.user._id,
    });

    if (!conversation) {
      return notFoundResponse(res, "Conversation not found");
    }

    conversation.status = "ended";
    conversation.endedAt = new Date();
    await conversation.save();

    return successResponse(res, {
      message: "Conversation ended.",
      data: {
        conversationId,
        totalMessages: conversation.totalMessages,
        duration: conversation.endedAt - conversation.createdAt,
      },
    });
  } catch (error) {
    console.error("End conversation error:", error);
    return errorResponse(res, { message: "Failed to end conversation." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/chat/:botId/conversations
// @desc    Bot ki saari conversations lo
// @access  Private
// ----------------------------------------------------------------
const getConversations = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Free plan — sirf last 10
    const actualLimit = req.user.plan === "free" ? 10 : limit;

    const conversations = await Conversation.find({
      botId: bot._id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .select("-messages"); // Messages exclude karo — heavy hai

    const total = await Conversation.countDocuments({ botId: bot._id });

    return successResponse(res, {
      data: {
        conversations,
        total,
        page,
        totalPages: Math.ceil(total / actualLimit),
        isLimited: req.user.plan === "free",
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return errorResponse(res, { message: "Failed to fetch conversations." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/chat/:botId/conversations/:conversationId
// @desc    Single conversation messages lo
// @access  Private
// ----------------------------------------------------------------
const getConversation = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      botId: bot._id,
    });

    if (!conversation) {
      return notFoundResponse(res, "Conversation not found");
    }

    return successResponse(res, {
      data: { conversation },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return errorResponse(res, { message: "Failed to fetch conversation." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/chat/:botId/conversations/:conversationId
// @desc    Delete single conversation
// @access  Private
// ----------------------------------------------------------------
const deleteConversation = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const deleted = await Conversation.findOneAndDelete({
      _id: req.params.conversationId,
      botId: bot._id,
    });

    if (!deleted) {
      return notFoundResponse(res, "Conversation not found");
    }

    return successResponse(res, {
      message: "Conversation deleted successfully.",
      data: { conversationId: req.params.conversationId },
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return errorResponse(res, { message: "Failed to delete conversation." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/chat/:botId/conversations
// @desc    Delete all conversations for a bot
// @access  Private
// ----------------------------------------------------------------
const deleteAllConversations = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    const result = await Conversation.deleteMany({ botId: bot._id });

    return successResponse(res, {
      message: "All conversations deleted successfully.",
      data: { deletedCount: result.deletedCount || 0 },
    });
  } catch (error) {
    console.error("Delete all conversations error:", error);
    return errorResponse(res, { message: "Failed to delete all conversations." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/chat/:botId/unanswered
// @desc    Unanswered questions lo
// @access  Private
// ----------------------------------------------------------------
const getUnansweredQuestions = async (req, res) => {
  try {
    const { bot, error } = await getBotAndVerify(
      req.params.botId,
      req.user._id
    );

    if (error === "notFound") return notFoundResponse(res, "Bot not found");
    if (error === "forbidden")
      return forbiddenResponse(res, "You do not have access to this bot");

    // Conversations find karo jisme unanswered messages hain
    const conversations = await Conversation.find({
      botId: bot._id,
      unansweredCount: { $gt: 0 },
    }).sort({ createdAt: -1 });

    const unansweredQuestions = [];

    conversations.forEach((conv) => {
      conv.messages.forEach((msg, index) => {
        if (msg.role === "bot" && !msg.isAnswered) {
          // Usse pehle user ka message lo
          const userMsg = conv.messages[index - 1];
          if (userMsg && userMsg.role === "user") {
            unansweredQuestions.push({
              conversationId: conv._id,
              question: userMsg.content,
              botResponse: msg.content,
              timestamp: msg.timestamp,
              visitorName: conv.visitorName || "Anonymous",
            });
          }
        }
      });
    });

    return successResponse(res, {
      data: {
        unansweredQuestions,
        total: unansweredQuestions.length,
      },
    });
  } catch (error) {
    console.error("Get unanswered error:", error);
    return errorResponse(res, { message: "Failed to fetch unanswered questions." });
  }
};

module.exports = {
  startConversation,
  sendMessage,
  endConversation,
  getConversations,
  getConversation,
  getUnansweredQuestions,
  deleteConversation,
  deleteAllConversations,
};
