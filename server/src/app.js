require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const Sentry = require("@sentry/node");
const passport = require("./config/passport");
const { runSeeders } = require("./seeder");
const paymentRoutes = require("./routes/payment.routes");
const { startAnnouncementCron } = require("./scheduledAnnouncements.cron"); // ← NEW
const { startUserNotificationsCron } = require("./scheduledUserNotifications.cron");
const { getSecuritySettings } = require("./utils/platformSettings.utils");

const app = express();

// ----------------------------------------------------------------
// TRUST PROXY (for production behind reverse proxy/CDN)
// ----------------------------------------------------------------
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY);
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ----------------------------------------------------------------
// SENTRY — Error Monitoring (sabse pehle initialize karo)
// ----------------------------------------------------------------
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// ----------------------------------------------------------------
// SECURITY MIDDLEWARE
// ----------------------------------------------------------------
app.use(helmet());

// ----------------------------------------------------------------
// CORS
// ----------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
  callback(null, true);
} else {
  console.log("Blocked CORS:", origin);
  callback(null, true); // TEMP: sab allow (debug ke liye)
}
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------------------------------------------------
// BODY PARSER
// ----------------------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ----------------------------------------------------------------
// PASSPORT — Google OAuth
// ----------------------------------------------------------------
app.use(passport.initialize());

// ----------------------------------------------------------------
// LOGGER
// ----------------------------------------------------------------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ----------------------------------------------------------------
// GLOBAL RATE LIMITING
// ----------------------------------------------------------------
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";

if (!rateLimitDisabled) {
  const minuteBuckets = new Map();
  const hourBuckets = new Map();

  let securityCache = {
    rateLimitPerMinute: 100,
    rateLimitPerHour: 1000,
    updatedAt: 0,
  };

  const getCurrentSecurityLimits = async () => {
    const now = Date.now();
    if (now - securityCache.updatedAt > 15 * 1000) {
      const security = await getSecuritySettings();
      securityCache = {
        rateLimitPerMinute: Math.max(1, Number(security.rateLimitPerMinute) || 100),
        rateLimitPerHour: Math.max(1, Number(security.rateLimitPerHour) || 1000),
        updatedAt: now,
      };
    }
    return securityCache;
  };

  app.use("/api", async (req, res, next) => {
    try {
      const limits = await getCurrentSecurityLimits();
      const ip = req.ip || req.socket.remoteAddress || "unknown";

      const currentMinute = Math.floor(Date.now() / 60_000);
      const currentHour = Math.floor(Date.now() / 3_600_000);

      const minuteKey = `${ip}:${currentMinute}`;
      const hourKey = `${ip}:${currentHour}`;

      const minuteCount = (minuteBuckets.get(minuteKey) || 0) + 1;
      const hourCount = (hourBuckets.get(hourKey) || 0) + 1;

      minuteBuckets.set(minuteKey, minuteCount);
      hourBuckets.set(hourKey, hourCount);

      if (minuteCount > limits.rateLimitPerMinute || hourCount > limits.rateLimitPerHour) {
        return res.status(429).json({
          success: false,
          message: "Too many requests, please try again later.",
        });
      }

      // Opportunistic cleanup to avoid unbounded growth
      if (minuteBuckets.size > 25_000) {
        for (const key of minuteBuckets.keys()) {
          if (!key.endsWith(`:${currentMinute}`)) {
            minuteBuckets.delete(key);
          }
        }
      }

      if (hourBuckets.size > 25_000) {
        for (const key of hourBuckets.keys()) {
          if (!key.endsWith(`:${currentHour}`)) {
            hourBuckets.delete(key);
          }
        }
      }

      return next();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Rate limiter settings fallback:", error?.message || error);
      }
      return next();
    }
  });
}

// ----------------------------------------------------------------
// HEALTH CHECK ROUTES
// ----------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Lexioai API is running!",
    version: process.env.API_VERSION || "v1",
    environment: process.env.NODE_ENV,
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy!",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ----------------------------------------------------------------
// MAINTENANCE MODE CHECK
// ----------------------------------------------------------------
app.use(async (req, res, next) => {
  if (
    req.path.startsWith("/api/v1/admin") ||
    req.path === "/health" ||
    req.path.startsWith("/api/v1/auth")
  ) {
    return next();
  }
  try {
    const PlatformSettings = require("./models/PlatformSettings.model");
    const settings = await PlatformSettings.getSettings();
    if (settings?.general?.maintenanceMode) {
      return res.status(503).json({
        success: false,
        message: settings.general.maintenanceMessage ||
          "We're upgrading our systems. We'll be back soon!",
        maintenance: true,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Maintenance mode check failed:", error?.message || error);
    }
  }
  next();
});

// ----------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------
// Public routes (no auth required)
app.use("/api/v1/public", require("./routes/public.routes"));

// Protected routes
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/bots", require("./routes/bot.routes"));
app.use("/api/v1/chat", require("./routes/chat.routes"));
app.use("/api/v1/leads", require("./routes/lead.routes"));
app.use("/api/v1/analytics", require("./routes/analytics.routes"));
app.use("/api/v1/user", require("./routes/user.routes"));
app.use("/api/v1/notifications", require("./routes/user.notification.routes"));
app.use("/api/v1/widget", require("./routes/widget.routes"));
app.use("/api/v1/admin", require("./routes/admin.routes"));
app.use("/api/v1/admin", require("./routes/admin.profile.routes"));
app.use("/api/v1/admin/notifications", require("./routes/notification.routes"));
app.use("/api/v1/payments", paymentRoutes);

// Shared routes (auth not strictly required for some endpoints)
app.use("/api/v1/settings", require("./routes/settings.routes"));
app.use("/api/v1/industries", require("./routes/industry.routes"));

// ----------------------------------------------------------------
// 404 HANDLER
// ----------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ----------------------------------------------------------------
// GLOBAL ERROR HANDLER
// ----------------------------------------------------------------
app.use((err, req, res, next) => {
  Sentry.captureException(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ----------------------------------------------------------------
// DATABASE CONNECTION + SERVER START
// ----------------------------------------------------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is required for secure webhook verification");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully!");
    await runSeeders();
    startAnnouncementCron(); // ← NEW — scheduled announcements cron start
    startUserNotificationsCron();

    app.listen(PORT, () => {
      console.log("================================");
      console.log(`🚀 Lexioai Server running!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log("================================");
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
