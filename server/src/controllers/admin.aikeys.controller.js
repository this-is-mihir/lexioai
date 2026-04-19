const AIKey = require("../models/AIKey.model");
const AuditLog = require("../models/AuditLog.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/ai-keys
// @desc    Saari AI keys (without actual key value)
// ----------------------------------------------------------------
const getAllAIKeys = async (req, res) => {
  try {
    const keys = await AIKey.find()
      .sort({ provider: 1, priority: 1 })
      .populate("createdBy", "name email");

    // Transform keys — add maskedKey, remove encrypted apiKey
    const transformedKeys = keys.map((key) => {
      const obj = key.toObject();
      return {
        _id: obj._id,
        provider: obj.provider,
        name: obj.name,
        model: obj.model,
        maskedKey: key.getMaskedKey(), // Use method to get masked key (####...46A)
        isActive: obj.isActive,
        isPrimary: obj.isPrimary,
        priority: obj.priority,
        stats: obj.stats || {},
        testResult: obj.testResult || {},
        rateLimit: obj.rateLimit || {},
        consecutiveFailures: obj.consecutiveFailures || 0,
        notes: obj.notes,
        createdBy: obj.createdBy,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        // DO NOT include apiKey (encrypted)
      };
    });

    // Group by provider
    const grouped = {
      gemini: transformedKeys.filter((k) => k.provider === "gemini"),
      groq: transformedKeys.filter((k) => k.provider === "groq"),
      openai: transformedKeys.filter((k) => k.provider === "openai"),
      anthropic: transformedKeys.filter((k) => k.provider === "anthropic"),
      custom: transformedKeys.filter((k) => k.provider === "custom"),
    };

    return successResponse(res, {
      data: {
        keys: transformedKeys,
        grouped,
        total: transformedKeys.length,
        active: transformedKeys.filter((k) => k.isActive).length,
        rateLimited: transformedKeys.filter((k) => k.rateLimit.isLimited).length,
      },
    });
  } catch (error) {
    console.error("Get AI keys error:", error);
    return errorResponse(res, { message: "Failed to fetch AI keys." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/ai-keys
// @desc    New AI key add karo
// ----------------------------------------------------------------
const createAIKey = async (req, res) => {
  try {
    const { provider, name, apiKey, model, priority, notes, isPrimary } = req.body;

    if (!provider || !name || !apiKey || !model) {
      return validationErrorResponse(res, [
        { field: "general", message: "Provider, name, API key and model are required" },
      ]);
    }

    const validProviders = ["gemini", "groq", "openai", "anthropic", "custom"];
    if (!validProviders.includes(provider)) {
      return validationErrorResponse(res, [
        { field: "provider", message: "Invalid provider. Must be: gemini, groq, openai, anthropic, or custom" },
      ]);
    }

    // Agar isPrimary true hai to baaki sab false kar do
    if (isPrimary) {
      await AIKey.updateMany(
        { provider, isPrimary: true },
        { $set: { isPrimary: false } }
      );
    }

    const key = new AIKey({
      provider,
      name: name.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      priority: priority || 1,
      notes: notes?.trim() || null,
      isPrimary: isPrimary || false,
      createdBy: req.admin._id,
    });

    await key.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "AI_KEY_ADDED",
      module: "settings",
      description: `New ${provider} API key added: "${name}"`,
    });

    // Response mein actual key hide karo
    const keyObj = key.toObject();
    keyObj.apiKey = "***hidden***";

    return successResponse(res, {
      message: "AI key added successfully!",
      statusCode: 201,
      data: { key: keyObj },
    });
  } catch (error) {
    console.error("Create AI key error:", error.message || error);
    return errorResponse(res, { message: `Failed to add AI key: ${error.message}` });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/ai-keys/:keyId
// @desc    AI key update karo
// ----------------------------------------------------------------
const updateAIKey = async (req, res) => {
  try {
    const key = await AIKey.findById(req.params.keyId);
    if (!key) return notFoundResponse(res, "AI key not found");

    const { name, apiKey, model, priority, notes, isActive, isPrimary } = req.body;

    if (name !== undefined) key.name = name.trim();
    // Only update apiKey if provided and not empty (optional rotation)
    if (apiKey !== undefined && apiKey && apiKey.trim() !== "" && apiKey !== "***hidden***") {
      key.apiKey = apiKey.trim();
    }
    if (model !== undefined) key.model = model.trim();
    if (priority !== undefined) key.priority = priority;
    if (notes !== undefined) key.notes = notes?.trim() || null;
    if (isActive !== undefined) key.isActive = isActive;

    // Primary set karo
    if (isPrimary === true) {
      await AIKey.updateMany(
        { provider: key.provider, isPrimary: true, _id: { $ne: key._id } },
        { $set: { isPrimary: false } }
      );
      key.isPrimary = true;
    } else if (isPrimary === false) {
      // Uncheck primary
      key.isPrimary = false;
    }

    await key.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "AI_KEY_UPDATED",
      module: "settings",
      description: `AI key "${key.name}" updated${apiKey ? " (key rotated)" : ""}`,
    });

    const keyObj = key.toObject();
    keyObj.apiKey = "***hidden***";

    return successResponse(res, {
      message: "AI key updated successfully!",
      data: { key: keyObj },
    });
  } catch (error) {
    console.error("Update AI key error:", error.message || error);
    return errorResponse(res, { message: `Failed to update AI key: ${error.message}` });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/ai-keys/:keyId
// ----------------------------------------------------------------
const deleteAIKey = async (req, res) => {
  try {
    const key = await AIKey.findByIdAndDelete(req.params.keyId);
    if (!key) return notFoundResponse(res, "AI key not found");

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "AI_KEY_DELETED",
      module: "settings",
      description: `AI key "${key.name}" (${key.provider}) deleted`,
    });

    return successResponse(res, { message: "AI key deleted successfully." });
  } catch (error) {
    console.error("Delete AI key error:", error);
    return errorResponse(res, { message: "Failed to delete AI key." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/ai-keys/:keyId/test
// @desc    Key test karo — actual request bhejo
// ----------------------------------------------------------------
const testAIKey = async (req, res) => {
  try {
    const key = await AIKey.findById(req.params.keyId).select("+apiKey");
    if (!key) return notFoundResponse(res, "AI key not found");

    const testMessage = "Say 'Hello! This is a test.' in exactly those words.";
    const systemPrompt = "You are a test assistant. Follow instructions exactly.";

    let response = "";
    let success = false;
    let error = null;
    const startTime = Date.now();

    // Get decrypted API key
    const decryptedKey = key.getDecryptedKey();
    if (!decryptedKey) {
      return errorResponse(res, { message: "Failed to decrypt API key." });
    }

    try {
      if (key.provider === "gemini") {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(decryptedKey);
        const model = genAI.getGenerativeModel({
          model: key.model,
          systemInstruction: systemPrompt,
        });
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(testMessage);
        response = result.response.text();
        success = true;
      } else if (key.provider === "groq") {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: decryptedKey });
        const completion = await groq.chat.completions.create({
          model: key.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: testMessage },
          ],
          max_tokens: 50,
        });
        response = completion.choices[0]?.message?.content || "";
        success = true;
      } else {
        // Custom/OpenAI
        const axios = require("axios");
        const result = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: key.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: testMessage },
            ],
            max_tokens: 50,
          },
          {
            headers: { Authorization: `Bearer ${decryptedKey}` },
            timeout: 10000,
          }
        );
        response = result.data.choices[0]?.message?.content || "";
        success = true;
      }
    } catch (err) {
      error = err.message || "Unknown error";
      success = false;
    }

    const responseTime = Date.now() - startTime;

    // Track test in key stats
    let updatedKey;
    if (success) {
      updatedKey = await AIKey.findByIdAndUpdate(
        req.params.keyId,
        {
          $set: {
            "testResult.status": "success",
            "testResult.message": "Key verified successfully",
            "testResult.timestamp": new Date(),
            "testResult.error": null,
            "testResult.responseTime": responseTime,
            isActive: true, // Auto-activate key when test passes
            consecutiveFailures: 0, // Reset failure counter
          },
        },
        { returnDocument: 'after' }
      );
    } else {
      updatedKey = await AIKey.findByIdAndUpdate(
        req.params.keyId,
        {
          $set: {
            "testResult.status": "failed",
            "testResult.message": error,
            "testResult.timestamp": new Date(),
            "testResult.error": error,
            "testResult.responseTime": responseTime,
          },
          $inc: {
            consecutiveFailures: 1, // Increment failure counter
          },
        },
        { returnDocument: 'after' }
      );
    }

    // Transform updated key for response
    const updatedKeyObj = updatedKey.toObject();
    const transformedKey = {
      _id: updatedKeyObj._id,
      provider: updatedKeyObj.provider,
      name: updatedKeyObj.name,
      model: updatedKeyObj.model,
      maskedKey: updatedKey.getMaskedKey(),
      isActive: updatedKeyObj.isActive,
      isPrimary: updatedKeyObj.isPrimary,
      priority: updatedKeyObj.priority,
      stats: updatedKeyObj.stats || {},
      testResult: updatedKeyObj.testResult || {},
      rateLimit: updatedKeyObj.rateLimit || {},
      consecutiveFailures: updatedKeyObj.consecutiveFailures || 0,
      notes: updatedKeyObj.notes,
      createdBy: updatedKeyObj.createdBy,
      createdAt: updatedKeyObj.createdAt,
      updatedAt: updatedKeyObj.updatedAt,
    };

    return successResponse(res, {
      data: {
        keyTestedId: req.params.keyId,
        keyName: key.name,
        provider: key.provider,
        model: key.model,
        success,
        message: success ? "✅ Key verified successfully!" : `❌ ${error}`,
        response: success ? response.substring(0, 100) : null,
        error: success ? null : error,
        responseTime,
        testedAt: new Date(),
        key: transformedKey, // Include full updated key object
      },
    });
  } catch (error) {
    console.error("Test AI key error:", error);
    return errorResponse(res, { message: "Failed to test AI key." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/ai-keys/:keyId/auto-test
// @desc    Auto-testing enable/disable karo
// ----------------------------------------------------------------
const autoTestAIKey = async (req, res) => {
  try {
    const key = await AIKey.findById(req.params.keyId);
    if (!key) return notFoundResponse(res, "AI key not found");

    const { enabled, interval } = req.body;

    // Validate interval
    const validIntervals = ["5min", "15min", "hourly", "daily"];
    if (enabled && !validIntervals.includes(interval)) {
      return errorResponse(res, { 
        message: "Invalid interval. Must be: 5min, 15min, hourly, or daily" 
      });
    }

    // TODO: Integrate with a job scheduler (node-cron or Bull queue)
    // For now, we'll just store the configuration
    
    // Add autoTest field to AIKey model if needed
    key.autoTest = {
      enabled: enabled || false,
      interval: interval || "hourly",
      nextTestAt: enabled ? new Date() : null,
      lastTestedAt: null,
    };

    await key.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "AI_KEY_AUTO_TEST_UPDATE",
      module: "settings",
      description: `Auto-testing ${enabled ? "enabled" : "disabled"} for "${key.name}" (interval: ${interval || "N/A"})`,
    });

    return successResponse(res, {
      message: `Auto-testing ${enabled ? "enabled" : "disabled"}!`,
      data: {
        keyId: key._id,
        autoTestEnabled: enabled,
        interval: interval || null,
      },
    });
  } catch (error) {
    console.error("Auto test configuration error:", error);
    return errorResponse(res, { message: "Failed to configure auto-testing." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/ai-keys/:keyId/reset-limit
// @desc    Rate limit manually reset karo
// ----------------------------------------------------------------
const resetRateLimit = async (req, res) => {
  try {
    const key = await AIKey.findById(req.params.keyId);
    if (!key) return notFoundResponse(res, "AI key not found");

    key.rateLimit.isLimited = false;
    key.rateLimit.limitedUntil = null;
    key.rateLimit.retryAfter = 0;
    await key.save();

    return successResponse(res, {
      message: `Rate limit reset for "${key.name}"!`,
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to reset rate limit." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/ai-keys/stats
// @desc    AI keys usage stats
// ----------------------------------------------------------------
const getAIKeyStats = async (req, res) => {
  try {
    const keys = await AIKey.find().select("-apiKey");

    const stats = {
      total: keys.length,
      active: keys.filter((k) => k.isActive).length,
      rateLimited: keys.filter((k) => k.rateLimit.isLimited).length,
      byProvider: {},
      totalRequests: 0,
      totalSuccess: 0,
      totalFailed: 0,
      totalRateLimitHits: 0,
    };

    keys.forEach((key) => {
      if (!stats.byProvider[key.provider]) {
        stats.byProvider[key.provider] = {
          total: 0,
          active: 0,
          rateLimited: 0,
          requests: 0,
        };
      }
      stats.byProvider[key.provider].total += 1;
      if (key.isActive) stats.byProvider[key.provider].active += 1;
      if (key.rateLimit.isLimited) stats.byProvider[key.provider].rateLimited += 1;
      stats.byProvider[key.provider].requests += key.stats.totalRequests;

      stats.totalRequests += key.stats.totalRequests;
      stats.totalSuccess += key.stats.successRequests;
      stats.totalFailed += key.stats.failedRequests;
      stats.totalRateLimitHits += key.stats.rateLimitHits;
    });

    return successResponse(res, { data: { stats, keys } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch AI key stats." });
  }
};

module.exports = {
  getAllAIKeys,
  createAIKey,
  updateAIKey,
  deleteAIKey,
  testAIKey,
  autoTestAIKey,
  resetRateLimit,
  getAIKeyStats,
};