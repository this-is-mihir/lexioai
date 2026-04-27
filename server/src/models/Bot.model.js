const mongoose = require("mongoose");

// ----------------------------------------------------------------
// CONVERSATION STARTER SCHEMA
// ----------------------------------------------------------------
const conversationStarterSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Label cannot exceed 50 characters"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Message cannot exceed 200 characters"],
    },
    icon: {
      type: String,
      default: "💬",
    },
  },
  { _id: true }
);

// ----------------------------------------------------------------
// BUSINESS HOURS SCHEMA
// ----------------------------------------------------------------
const businessHoursSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: "Asia/Kolkata" },
    schedule: {
      monday: {
        isOpen: { type: Boolean, default: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
      saturday: {
        isOpen: { type: Boolean, default: false },
        open: { type: String, default: "10:00" },
        close: { type: String, default: "16:00" },
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        open: { type: String, default: "10:00" },
        close: { type: String, default: "16:00" },
      },
    },
    afterHoursMessage: {
      type: String,
      default:
        "We are currently closed. Our business hours are Monday-Friday, 9 AM - 6 PM. Please leave your details and we will get back to you.",
      maxlength: [300, "After hours message cannot exceed 300 characters"],
    },
    showBusinessHoursInChat: { type: Boolean, default: true },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// SOCIAL LINKS SCHEMA
// ----------------------------------------------------------------
const socialLinksSchema = new mongoose.Schema(
  {
    whatsapp: { type: String, default: null },
    instagram: { type: String, default: null },
    facebook: { type: String, default: null },
    twitter: { type: String, default: null },
    github: { type: String, default: null },
    linkedin: { type: String, default: null },
    youtube: { type: String, default: null },
    telegram: { type: String, default: null },
  },
  { _id: false }
);

const quickLinksSchema = new mongoose.Schema(
  {
    resumeUrl: { type: String, default: null },
    projectsUrl: { type: String, default: null },
    blogUrl: { type: String, default: null },
    portfolioUrl: { type: String, default: null },
    contactUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    linkedinUrl: { type: String, default: null },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// LEAD CAPTURE SCHEMA
// ----------------------------------------------------------------
const leadCaptureSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    timing: {
      type: String,
      enum: ["immediately", "after_2_messages", "after_bot_fails", "never"],
      default: "after_2_messages",
    },
    fields: {
      name: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true } },
      email: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true } },
      phone: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false } },
      company: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false } },
      message: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false } },
    },
    title: {
      type: String,
      default: "Let us know who you are!",
      maxlength: [100, "Lead capture title cannot exceed 100 characters"],
    },
    subtitle: {
      type: String,
      default: "We'll get back to you as soon as possible.",
      maxlength: [200, "Lead capture subtitle cannot exceed 200 characters"],
    },
    submitButtonText: {
      type: String,
      default: "Start Chatting",
      maxlength: [30, "Submit button text cannot exceed 30 characters"],
    },
    skipButtonText: {
      type: String,
      default: "Skip for now",
      maxlength: [30, "Skip button text cannot exceed 30 characters"],
    },
    allowSkip: { type: Boolean, default: true },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// APPEARANCE SCHEMA
// ----------------------------------------------------------------
const appearanceSchema = new mongoose.Schema(
  {
    // Colors
    brandColor: { 
      type: String, 
      default: "#7F77DD",
      match: [/^#[0-9A-F]{6}$/i, "Brand color must be a valid hex code"]
    },
    primaryColor: { type: String, default: "#7F77DD" },
    secondaryColor: { type: String, default: "#FFFFFF" },
    backgroundColor: { type: String, default: "#FFFFFF" },
    userMessageColor: { type: String, default: "#7F77DD" },
    botMessageColor: { type: String, default: "#F5F5F5" },
    userMessageTextColor: { type: String, default: "#FFFFFF" },
    botMessageTextColor: { type: String, default: "#1A1A1A" },

    // Avatar - Support both default icons and custom uploads
    avatarType: {
      type: String,
      enum: ["default", "custom", "emoji"],
      default: "default",
    },
    avatarId: { 
      type: String, 
      default: "default-1",
      // Can be "default-1" to "default-10" or cloudinary URL
    },
    avatarEmoji: { type: String, default: "🤖" },
    avatarImageUrl: { type: String, default: null },
    avatarBgColor: { type: String, default: "#7F77DD" },

    // Widget Position - All 4 corners
    position: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
    },
    
    // Widget Size
    bubbleSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    widgetSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    chatWindowHeight: { type: Number, default: 600, min: 400, max: 800 },
    chatWindowWidth: { type: Number, default: 380, min: 300, max: 500 },
    borderRadius: { type: Number, default: 16, min: 0, max: 24 },

    // Chat Window Customization
    chatWindowTitle: {
      type: String,
      default: "Chat with us",
      maxlength: [30, "Chat window title cannot exceed 30 characters"],
      trim: true,
    },

    // Launcher button
    launcherSize: { type: Number, default: 56, min: 40, max: 72 },
    launcherIcon: {
      type: String,
      enum: ["chat", "message", "help", "bot", "custom"],
      default: "chat",
    },
    launcherCustomIcon: { type: String, default: null },

    // Font
    fontFamily: {
      type: String,
      enum: ["system", "inter", "roboto", "poppins", "nunito"],
      default: "system",
    },
    fontSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },

    // Dark mode
    darkModeSupport: { type: Boolean, default: false },

    // Mobile
    mobileFullScreen: { type: Boolean, default: true },
    hideOnMobile: { type: Boolean, default: false },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// BEHAVIOR SCHEMA
// ----------------------------------------------------------------
const behaviorSchema = new mongoose.Schema(
  {
    // Language
    language: {
      type: String,
      enum: ["auto", "en", "hi", "hinglish"],
      default: "auto",
    },

    // Tone
    tone: {
      type: String,
      enum: ["professional", "friendly", "casual", "formal"],
      default: "friendly",
    },

    // AI Settings
    aiModel: {
      type: String,
      enum: ["gemini", "groq", "auto"],
      default: "auto",
    },
    responseLength: {
      type: String,
      enum: ["short", "medium", "detailed"],
      default: "medium",
    },
    creativity: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },

    // Messages
    welcomeMessage: {
      type: String,
      default: "👋 Hi there! How can I help you today?",
      maxlength: [300, "Welcome message cannot exceed 300 characters"],
    },
    fallbackMessage: {
      type: String,
      default:
        "I'm sorry, I couldn't find an answer to your question. Please contact us directly for assistance.",
      maxlength: [300, "Fallback message cannot exceed 300 characters"],
    },
    offlineMessage: {
      type: String,
      default: "Our bot is currently unavailable. Please try again later or contact us directly.",
      maxlength: [300, "Offline message cannot exceed 300 characters"],
    },
    inputPlaceholder: {
      type: String,
      default: "Type your message...",
      maxlength: [50, "Input placeholder cannot exceed 50 characters"],
    },

    // Features
    typingIndicator: { type: Boolean, default: true },
    showTimestamp: { type: Boolean, default: false },
    soundEnabled: { type: Boolean, default: false },
    autoOpen: { type: Boolean, default: false },
    autoOpenDelay: { type: Number, default: 3, min: 1, max: 30 },
    showPoweredBy: { type: Boolean, default: true },

    // Conversation
    maxConversationLength: { type: Number, default: 50 },
    allowFileUpload: { type: Boolean, default: false },
    allowEmoji: { type: Boolean, default: true },

    // Restart
    showRestartButton: { type: Boolean, default: true },
    restartMessage: {
      type: String,
      default: "Conversation restarted. How can I help you?",
      maxlength: [200, "Restart message cannot exceed 200 characters"],
    },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// CONTACT INFO SCHEMA
// ----------------------------------------------------------------
const contactInfoSchema = new mongoose.Schema(
  {
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    showCallButton: { type: Boolean, default: false },
    showWhatsappButton: { type: Boolean, default: false },
    showEmailButton: { type: Boolean, default: false },
  },
  { _id: false }
);

// ----------------------------------------------------------------
// TRAINING SOURCE SCHEMA
// ----------------------------------------------------------------
const trainingSourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["url", "file", "qa", "text"],
      required: true,
    },
    // URL training
    url: { type: String, default: null },
    crawledPages: { type: Number, default: 0 },

    // File training
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileSize: { type: Number, default: null },
    fileType: { type: String, default: null },
    cloudinaryId: { type: String, default: null },

    // Q&A training
    question: { type: String, default: null },
    answer: { type: String, default: null },

    // Text training
    text: { type: String, default: null },
    textTitle: { type: String, default: null },

    // Common
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    errorMessage: { type: String, default: null },
    characterCount: { type: Number, default: 0 },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ----------------------------------------------------------------
// MAIN BOT SCHEMA
// ----------------------------------------------------------------
const botSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // OWNER
    // ----------------------------------------------------------------
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    // ----------------------------------------------------------------
    // BASIC INFO
    // ----------------------------------------------------------------
    name: {
      type: String,
      required: [true, "Bot name is required"],
      trim: true,
      minlength: [2, "Bot name must be at least 2 characters"],
      maxlength: [50, "Bot name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      default: null,
    },

    // Website jahan bot use hoga
    websiteUrl: {
      type: String,
      trim: true,
      default: null,
    },

    websiteName: {
      type: String,
      trim: true,
      maxlength: [100, "Website name cannot exceed 100 characters"],
      default: null,
    },

    industry: {
      type: String,
      trim: true,
      default: "other",
    },

    // ----------------------------------------------------------------
    // APPEARANCE
    // ----------------------------------------------------------------
    appearance: { type: appearanceSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // BEHAVIOR
    // ----------------------------------------------------------------
    behavior: { type: behaviorSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // CONTACT INFO
    // ----------------------------------------------------------------
    contactInfo: { type: contactInfoSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // SOCIAL LINKS
    // ----------------------------------------------------------------
    socialLinks: { type: socialLinksSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // QUICK LINKS (auto/manual from training and profile)
    // ----------------------------------------------------------------
    quickLinks: { type: quickLinksSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // BUSINESS HOURS
    // ----------------------------------------------------------------
    businessHours: { type: businessHoursSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // LEAD CAPTURE
    // ----------------------------------------------------------------
    leadCapture: { type: leadCaptureSchema, default: () => ({}) },

    // ----------------------------------------------------------------
    // CONVERSATION STARTERS (max 4)
    // ----------------------------------------------------------------
    conversationStarters: {
      type: [conversationStarterSchema],
      default: [],
      validate: {
        validator: function (starters) {
          return starters.length <= 4;
        },
        message: "Maximum 4 conversation starters allowed",
      },
    },

    // ----------------------------------------------------------------
    // TRAINING
    // ----------------------------------------------------------------
    trainingSources: {
      type: [trainingSourceSchema],
      default: [],
    },

    trainingStatus: {
      type: String,
      enum: ["untrained", "training", "trained", "failed"],
      default: "untrained",
    },

    lastTrainedAt: { type: Date, default: null },

    totalCharacters: { type: Number, default: 0 },

    // ----------------------------------------------------------------
    // SYSTEM PROMPT (AI ke liye)
    // ----------------------------------------------------------------
    systemPrompt: {
      type: String,
      default: null,
      maxlength: [50000, "System prompt cannot exceed 50000 characters"],
    },

    // ----------------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------------
    isActive: { type: Boolean, default: true },

    isLive: { type: Boolean, default: false },

    // Verify kiya hai user ne apni website pe?
    isInstalled: { type: Boolean, default: false },

    installedAt: { type: Date, default: null },

    lastVerifiedAt: { type: Date, default: null },

    // ----------------------------------------------------------------
    // STATS (denormalized for fast queries)
    // ----------------------------------------------------------------
    stats: {
      totalChats: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      totalLeads: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      satisfactionScore: { type: Number, default: 0 },
      unansweredCount: { type: Number, default: 0 },
    },

    // ----------------------------------------------------------------
    // CURRENT MONTH USAGE (chat limit ke liye)
    // ----------------------------------------------------------------
    currentMonthUsage: {
      month: { type: String, default: null }, // "2026-03"
      chatsUsed: { type: Number, default: 0 },
    },

    // ----------------------------------------------------------------
    // EMBED CONFIG
    // ----------------------------------------------------------------
    embedKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    allowedDomains: {
      type: [String],
      default: [],
    },

    // ----------------------------------------------------------------
    // CUSTOM CSS (Business plan)
    // ----------------------------------------------------------------
    customCSS: {
      type: String,
      default: null,
      maxlength: [5000, "Custom CSS cannot exceed 5000 characters"],
    },

    // ----------------------------------------------------------------
    // WEBHOOK (Business plan)
    // ----------------------------------------------------------------
    webhookUrl: {
      type: String,
      default: null,
    },

    webhookSecret: {
      type: String,
      default: null,
    },

    webhookEvents: {
      type: [String],
      enum: ["new_chat", "new_lead", "new_message", "chat_ended"],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
botSchema.index({ userId: 1, createdAt: -1 });
botSchema.index({ isActive: 1 });

// ----------------------------------------------------------------
// PRE SAVE — embedKey generate karo
// ----------------------------------------------------------------
botSchema.pre("save", function () {
  if (!this.embedKey) {
    const { v4: uuidv4 } = require("uuid");
    this.embedKey = uuidv4().replace(/-/g, "");
  }
});

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

// Embed code generate karo
botSchema.methods.getEmbedCode = function () {
  const widgetUrl = process.env.WIDGET_CDN_URL || "https://cdn.lexioai.com";
  const apiBaseUrl = process.env.API_BASE_URL || `${process.env.APP_URL || "http://localhost:5000"}/api/v1`;
  return `<script
  src="${widgetUrl}/widget.js"
  data-key="${this.embedKey}"
  data-api-base="${apiBaseUrl}"
  defer>
</script>`;
};

// Check karo bot is month ke liye chat limit mein hai ya nahi
botSchema.methods.hasReachedChatLimit = async function (planChatLimit) {
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-03"

  // New month — reset karo
  if (this.currentMonthUsage.month !== currentMonth) {
    this.currentMonthUsage = { month: currentMonth, chatsUsed: 0 };
    await this.save();
    return false;
  }

  return this.currentMonthUsage.chatsUsed >= planChatLimit;
};

// Chat count increment karo
botSchema.methods.incrementChatCount = async function () {
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (this.currentMonthUsage.month !== currentMonth) {
    this.currentMonthUsage = { month: currentMonth, chatsUsed: 1 };
  } else {
    this.currentMonthUsage.chatsUsed += 1;
  }

  this.stats.totalChats += 1;
  await this.save();
};

const Bot = mongoose.model("Bot", botSchema);

module.exports = Bot;
