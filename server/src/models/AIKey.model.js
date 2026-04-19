const mongoose = require("mongoose");
const crypto = require("crypto");

// ─── ENCRYPTION SETUP ───────────────────────────────────────────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.warn("⚠️ ENCRYPTION_KEY must be at least 32 chars!");
}

const ALGORITHM = "aes-256-cbc";

const encrypt = (text) => {
  if (!text) return null;
  try {
    if (!ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY is not set in .env file");
    }
    
    // ENCRYPTION_KEY should be 32-char hex string (64 hex chars = 32 bytes)
    if (ENCRYPTION_KEY.length !== 64) {
      throw new Error(`ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${ENCRYPTION_KEY.length}`);
    }

    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    
    if (key.length !== 32) {
      throw new Error(`Encryption key must be 32 bytes, got ${key.length}`);
    }

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text), "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("❌ Encryption error:", error.message);
    console.error("Full error:", error);
    return null;
  }
};

const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    // Check if data has the correct format (iv:encrypted)
    if (!encryptedData.includes(":")) {
      // Data might be plain text or incorrectly formatted
      console.warn("⚠️ Data doesn't match encryption format, treating as plain text");
      return encryptedData;
    }

    const [iv, encrypted] = encryptedData.split(":");
    
    // Validate that both parts exist and are hex strings
    if (!iv || !encrypted) {
      console.warn("⚠️ Invalid encryption format (missing iv or encrypted part)");
      return encryptedData; // Return as-is if format is wrong
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    // If decryption fails, return the data as-is (might be plain text)
    return encryptedData;
  }
};

const maskKey = (fullKey) => {
  if (!fullKey) return "—";
  return fullKey.substring(0, 4) + "..." + fullKey.slice(-4);
};

// ─── AI KEY SCHEMA ──────────────────────────────────────────────

const aiKeySchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // PROVIDER
    // ----------------------------------------------------------------
    provider: {
      type: String,
      enum: ["gemini", "groq", "openai", "anthropic", "custom"],
      required: true,
    },

    // Display name — SuperAdmin set kare
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Gemini Key 1", "Groq Backup", "OpenAI Main"
    },

    // ----------------------------------------------------------------
    // API KEY — Encrypted store karenge
    // ----------------------------------------------------------------
    apiKey: {
      type: String,
      required: true,
      select: false, // Default mein hide
      set: function (value) {
        return encrypt(value);
      },
    },

    // Getter for masked key (no decryption)
    keyMask: {
      type: String,
      enum: ["hidden"],
      default: "hidden",
    },

    // Model name
    model: {
      type: String,
      required: true,
      trim: true,
      // e.g. "gemini-2.5-flash", "llama-3.1-8b-instant"
    },

    // ----------------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------------
    isActive: {
      type: Boolean,
      default: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
      // Ek provider mein sirf ek primary ho sakta hai
    },

    // ----------------------------------------------------------------
    // ROTATION
    // ----------------------------------------------------------------
    priority: {
      type: Number,
      default: 1,
      // Low number = higher priority (1 = first try)
    },

    // ----------------------------------------------------------------
    // USAGE STATS
    // ----------------------------------------------------------------
    stats: {
      totalRequests: { type: Number, default: 0 },
      successRequests: { type: Number, default: 0 },
      failedRequests: { type: Number, default: 0 },
      rateLimitHits: { type: Number, default: 0 },
      lastUsedAt: { type: Date, default: null },
      lastFailedAt: { type: Date, default: null },
      lastError: { type: String, default: null },
      avgResponseTime: { type: Number, default: 0 }, // milliseconds
      requestsThisMonth: { type: Number, default: 0 },
    },

    // ----------------------------------------------------------------
    // TEST TRACKING
    // ----------------------------------------------------------------
    testResult: {
      status: {
        type: String,
        enum: ["untested", "testing", "success", "failed"],
        default: "untested",
      },
      message: { type: String, default: null },
      timestamp: { type: Date, default: null },
      error: { type: String, default: null },
      responseTime: { type: Number, default: null }, // milliseconds
    },

    // ----------------------------------------------------------------
    // FAILURE TRACKING FOR AUTO-DISABLE
    // ----------------------------------------------------------------
    consecutiveFailures: {
      type: Number,
      default: 0,
    },

    // ----------------------------------------------------------------
    // RATE LIMIT TRACKING
    // ----------------------------------------------------------------
    rateLimit: {
      isLimited: { type: Boolean, default: false },
      limitedUntil: { type: Date, default: null },
      // Kitne second baad retry karna hai
      retryAfter: { type: Number, default: 0 },
    },

    // ----------------------------------------------------------------
    // META
    // ----------------------------------------------------------------
    notes: {
      type: String,
      trim: true,
      default: null,
    },

    // ----------------------------------------------------------------
    // AUTO TESTING
    // ----------------------------------------------------------------
    autoTest: {
      enabled: { type: Boolean, default: false },
      interval: {
        type: String,
        enum: ["5min", "15min", "hourly", "daily"],
        default: "hourly",
      },
      nextTestAt: { type: Date, default: null },
      lastTestedAt: { type: Date, default: null },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
aiKeySchema.index({ provider: 1, isActive: 1 });
aiKeySchema.index({ provider: 1, priority: 1 });
aiKeySchema.index({ isPrimary: 1 });

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

// Get decrypted key (NEVER expose in API responses)
aiKeySchema.methods.getDecryptedKey = function () {
  if (!this.apiKey) return null;
  return decrypt(this.apiKey);
};

// Get masked key for display
aiKeySchema.methods.getMaskedKey = function () {
  if (!this.apiKey) return "—";
  const decrypted = decrypt(this.apiKey);
  return maskKey(decrypted);
};

// Key available hai ya nahi check karo
aiKeySchema.methods.isAvailable = function () {
  if (!this.isActive) return false;
  if (this.rateLimit.isLimited) {
    // Check karo limit expire hua kya
    if (this.rateLimit.limitedUntil && new Date() > new Date(this.rateLimit.limitedUntil)) {
      this.rateLimit.isLimited = false;
      this.rateLimit.limitedUntil = null;
      this.rateLimit.retryAfter = 0;
      return true;
    }
    return false;
  }
  return true;
};

// Rate limit mark karo
aiKeySchema.methods.markRateLimited = async function (retryAfterSeconds = 60) {
  this.rateLimit.isLimited = true;
  this.rateLimit.retryAfter = retryAfterSeconds;
  this.rateLimit.limitedUntil = new Date(Date.now() + retryAfterSeconds * 1000);
  this.stats.rateLimitHits += 1;
  this.stats.lastFailedAt = new Date();
  await this.save();
};

// Success track karo
aiKeySchema.methods.markSuccess = async function () {
  this.stats.totalRequests += 1;
  this.stats.successRequests += 1;
  this.stats.lastUsedAt = new Date();
  // Rate limit clear karo agar tha
  if (this.rateLimit.isLimited) {
    this.rateLimit.isLimited = false;
    this.rateLimit.limitedUntil = null;
  }
  await this.save();
};

// Failure track karo
aiKeySchema.methods.markFailed = async function (error) {
  this.stats.totalRequests += 1;
  this.stats.failedRequests += 1;
  this.stats.lastFailedAt = new Date();
  this.stats.lastError = error?.substring(0, 200) || "Unknown error";
  this.consecutiveFailures += 1;
  
  // Auto-disable after 3 failures
  if (this.consecutiveFailures >= 3) {
    this.isActive = false;
  }
  
  await this.save();
};

// ─── STATIC METHODS ─────────────────────────────────────────────

/**
 * Get best available key for a provider (load balancing)
 * Priority: isPrimary → least requests → least failures
 */
aiKeySchema.statics.getBestKeyForProvider = async function (provider) {
  const keys = await this.find({
    provider,
    isActive: true,
  }).sort({
    isPrimary: -1,
    "stats.requestsThisMonth": 1,
    "stats.failedRequests": 1,
  });

  if (keys.length === 0) return null;

  // Check first is available (not rate limited)
  for (const key of keys) {
    if (key.isAvailable()) {
      return key;
    }
  }

  return null;
};

/**
 * Get all keys for a provider with status
 */
aiKeySchema.statics.getByProvider = async function (provider) {
  return await this.find({ provider }).sort({ isPrimary: -1, priority: 1 });
};

const AIKey = mongoose.model("AIKey", aiKeySchema);

module.exports = AIKey;