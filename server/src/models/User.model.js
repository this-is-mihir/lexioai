const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------------
    // IDENTITY
    // ----------------------------------------------------------------
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
      default: null,
    },

    // Virtual field — firstName + lastName
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_\.]+$/,
        "Username can only contain letters, numbers, underscores and dots",
      ],
      default: null,
    },

    professionalTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Professional title cannot exceed 100 characters"],
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [300, "Bio cannot exceed 300 characters"],
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    coverBanner: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------------
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    googleId: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ----------------------------------------------------------------
    // CONTACT & SOCIAL
    // ----------------------------------------------------------------
    phone: {
      countryCode: { type: String, default: "+91" },
      number: { type: String, trim: true, default: null },
    },

    whatsapp: {
      type: String,
      trim: true,
      default: null,
    },

    website: {
      type: String,
      trim: true,
      maxlength: [200, "Website URL cannot exceed 200 characters"],
      default: null,
    },

    calendarLink: {
      type: String,
      trim: true,
      maxlength: [200, "Calendar link cannot exceed 200 characters"],
      default: null,
    },

    socialLinks: {
      linkedin:  { type: String, trim: true, default: null },
      twitter:   { type: String, trim: true, default: null },
      github:    { type: String, trim: true, default: null },
      instagram: { type: String, trim: true, default: null },
      youtube:   { type: String, trim: true, default: null },
      facebook:  { type: String, trim: true, default: null },
    },

    // ----------------------------------------------------------------
    // BUSINESS INFO
    // ----------------------------------------------------------------
    business: {
      company: {
        type: String,
        trim: true,
        maxlength: [100, "Company name cannot exceed 100 characters"],
        default: null,
      },
      industry: {
        type: String,
        enum: [
          "technology", "ecommerce", "healthcare", "education", "finance",
          "real_estate", "marketing", "legal", "consulting", "restaurant",
          "travel", "manufacturing", "media", "nonprofit", "other",
        ],
        default: null,
      },
      companySize: {
        type: String,
        enum: ["1", "2-10", "11-50", "51-200", "201-500", "500+"],
        default: null,
      },
      companyWebsite: { type: String, trim: true, default: null },
      gstNumber:      { type: String, trim: true, default: null },
    },

    // ----------------------------------------------------------------
    // LOCATION
    // ----------------------------------------------------------------
    location: {
      country: { type: String, trim: true, default: null },
      state:   { type: String, trim: true, default: null },
      city:    { type: String, trim: true, default: null },
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    // ----------------------------------------------------------------
    // PREFERENCES
    // ----------------------------------------------------------------
    preferences: {
      language:           { type: String, enum: ["en", "hi"], default: "en" },
      currency:           { type: String, enum: ["INR", "USD"], default: "INR" },
      dateFormat:         { type: String, enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], default: "DD/MM/YYYY" },
      timeFormat:         { type: String, enum: ["12h", "24h"], default: "12h" },
      emailDigest:        { type: String, enum: ["daily", "weekly", "never"], default: "weekly" },
      notificationSound:  { type: Boolean, default: true },
      viewMode:           { type: String, enum: ["comfortable", "compact"], default: "comfortable" },
      defaultBotLanguage: { type: String, enum: ["auto", "en", "hi", "hinglish"], default: "auto" },
    },

    // ----------------------------------------------------------------
    // PLAN & SUBSCRIPTION
    // ----------------------------------------------------------------
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "business"],
      default: "free",
    },

    planExpiry: {
      type: Date,
      default: null,
    },

    planStartedAt: {
      type: Date,
      default: null,
    },

    chatCredits: {
      type: Number,
      default: 0,
    },

    // Razorpay — needed for subscription cancel + webhook lookup
    razorpaySubId: {
      type: String,
      default: null,
    },

    lastPaymentId: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // FREE TRIAL ABUSE PREVENTION
    // ----------------------------------------------------------------
    hasUsedFreeTrial: {
      type: Boolean,
      default: false,
    },

    registrationIP: {
      type: String,
      default: null,
    },

    deviceFingerprint: {
      type: String,
      default: null,
    },

    // ----------------------------------------------------------------
    // REFERRAL
    // ----------------------------------------------------------------
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referralCount: {
      type: Number,
      default: 0,
    },

    // ----------------------------------------------------------------
    // OTP
    // ----------------------------------------------------------------
    otp: {
      code:        { type: String, default: null },
      expiresAt:   { type: Date,   default: null },
      attempts:    { type: Number, default: 0    },
      lockedUntil: { type: Date,   default: null },
    },

    passwordResetOTP: {
      code:      { type: String, default: null },
      expiresAt: { type: Date,   default: null },
      attempts:  { type: Number, default: 0    },
    },

    // ----------------------------------------------------------------
    // ACCOUNT STATUS
    // ----------------------------------------------------------------
    isActive: {
      type: Boolean,
      default: true,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    bannedReason: {
      type: String,
      default: null,
    },

    deletionRequestedAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------------------------
    // 2FA
    // ----------------------------------------------------------------
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },

    backupCodes: {
      type: [String],
      default: [],
      select: false,
    },

    // ----------------------------------------------------------------
    // NOTIFICATION PREFERENCES
    // ----------------------------------------------------------------
    notificationPrefs: {
      email: {
        payment:     { type: Boolean, default: true  },
        planExpiry:  { type: Boolean, default: true  },
        botLimit:    { type: Boolean, default: true  },
        newLogin:    { type: Boolean, default: true  },
        newsletter:  { type: Boolean, default: false },
        weeklyReport:{ type: Boolean, default: true  },
      },
      inApp: {
        payment:       { type: Boolean, default: true },
        planExpiry:    { type: Boolean, default: true },
        botLimit:      { type: Boolean, default: true },
        newLogin:      { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        tips:          { type: Boolean, default: true },
      },
    },

    // ----------------------------------------------------------------
    // PROFILE COMPLETION
    // ----------------------------------------------------------------
    profileCompletion: {
      type: Number,
      default: 0,
    },

    // ----------------------------------------------------------------
    // PUBLIC PROFILE
    // ----------------------------------------------------------------
    isProfilePublic: {
      type: Boolean,
      default: false,
    },

    publicProfileSlug: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    // ----------------------------------------------------------------
    // REFRESH TOKENS
    // ----------------------------------------------------------------
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------
// email, username, referralCode, publicProfileSlug already indexed via unique:true in schema
userSchema.index({ googleId: 1 });
userSchema.index({ registrationIP: 1 });
userSchema.index({ deviceFingerprint: 1 });
userSchema.index({ razorpaySubId: 1 });   // webhook lookup ke liye fast search

// ----------------------------------------------------------------
// VIRTUAL — Full name
// ----------------------------------------------------------------
userSchema.virtual("fullName").get(function () {
  if (this.lastName) return `${this.firstName} ${this.lastName}`;
  return this.firstName;
});

// ----------------------------------------------------------------
// PRE SAVE — Password hash + name sync + profile completion
// ----------------------------------------------------------------
userSchema.pre("save", async function () {
  // Password hash
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Name sync — firstName + lastName
  if (this.isModified("firstName") || this.isModified("lastName")) {
    this.name = this.lastName
      ? `${this.firstName} ${this.lastName}`
      : this.firstName;
  }

  // Profile completion calculate
  this.profileCompletion = calculateProfileCompletion(this);

  // Auto-generate unique fields if missing to prevent MongoDB duplicate null errors
  if (!this.referralCode) {
    this.generateReferralCode();
  }
  
  if (!this.username) {
    this.username = `user_${this._id.toString()}`;
  }

  if (!this.publicProfileSlug) {
    this.publicProfileSlug = `profile_${this._id.toString()}`;
  }
});

// ----------------------------------------------------------------
// HELPER — Profile completion score
// ----------------------------------------------------------------
const calculateProfileCompletion = (user) => {
  const fields = [
    { field: user.firstName,           weight: 10 },
    { field: user.lastName,            weight: 5  },
    { field: user.username,            weight: 10 },
    { field: user.avatar,              weight: 15 },
    { field: user.bio,                 weight: 10 },
    { field: user.professionalTitle,   weight: 5  },
    { field: user.phone?.number,       weight: 10 },
    { field: user.website,             weight: 5  },
    { field: user.business?.company,   weight: 5  },
    { field: user.location?.country,   weight: 5  },
    { field: user.socialLinks?.linkedin, weight: 5 },
    { field: user.isEmailVerified,     weight: 10 },
    { field: user.twoFactorEnabled,    weight: 5  },
  ];

  let total = 0;
  fields.forEach(({ field, weight }) => {
    if (field) total += weight;
  });

  return Math.min(100, total);
};

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isPlanActive = function () {
  if (this.plan === "free") return true;
  if (!this.planExpiry) return false;
  return new Date() < new Date(this.planExpiry);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject({ virtuals: true });
  delete user.password;
  delete user.twoFactorSecret;
  delete user.backupCodes;
  delete user.refreshTokens;
  delete user.otp;
  delete user.passwordResetOTP;
  return user;
};

userSchema.methods.generateReferralCode = function () {
  const { v4: uuidv4 } = require("uuid");
  this.referralCode = uuidv4().replace(/-/g, "").substring(0, 8).toUpperCase();
};

const User = mongoose.model("User", userSchema);

module.exports = User;