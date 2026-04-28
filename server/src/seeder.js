const AdminUser = require("./models/AdminUser.model");
const Plan = require("./models/Plan.model");
const PlatformSettings = require("./models/PlatformSettings.model");
const Industry = require("./models/Industry.model");

// ----------------------------------------------------------------
// SEED SUPERADMIN
// ----------------------------------------------------------------
const seedSuperAdmin = async () => {
  try {
    const existing = await AdminUser.findOne({ role: "superadmin" });
    
    // If SuperAdmin exists, ensure they have ALL permissions
    if (existing) {
      const allPermissions = {
        users: { view: true, edit: true, ban: true, delete: true, impersonate: true, exportCsv: true },
        bots: { view: true, edit: true, delete: true },
        conversations: { view: true, delete: true, export: true },
        plans: { view: true, edit: true, create: true, delete: true },
        coupons: { view: true, create: true, edit: true, delete: true },
        announcements: { view: true, create: true, delete: true },
        blog: { view: true, create: true, edit: true, delete: true },
        tickets: { view: true, reply: true, assign: true, close: true },
        audit: { view: true, delete: true },
        settings: { view: true, edit: true },
        stats: { view: true },
      };
      
      // Update if permissions are missing/incomplete
      if (!existing.permissions?.blog?.view) {
        existing.permissions = allPermissions;
        await existing.save();
        console.log("✅ SuperAdmin permissions updated:", existing.email);
      } else {
        console.log("✅ SuperAdmin already exists:", existing.email);
      }
      return;
    }

    if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
      console.log("⚠️ SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in .env — skipping seeder");
      return;
    }

    const superAdmin = new AdminUser({
      name: process.env.SUPERADMIN_NAME || "Super Admin",
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      role: "superadmin",
      isActive: true,
      // ✅ Grant ALL permissions to SuperAdmin
      permissions: {
        users: { view: true, edit: true, ban: true, delete: true, impersonate: true, exportCsv: true },
        bots: { view: true, edit: true, delete: true },
        conversations: { view: true, delete: true, export: true },
        plans: { view: true, edit: true, create: true, delete: true },
        coupons: { view: true, create: true, edit: true, delete: true },
        announcements: { view: true, create: true, delete: true },
        blog: { view: true, create: true, edit: true, delete: true },
        tickets: { view: true, reply: true, assign: true, close: true },
        audit: { view: true, delete: true },
        settings: { view: true, edit: true },
        stats: { view: true },
      },
    });

    await superAdmin.save();
    console.log("✅ SuperAdmin created:", superAdmin.email);
    console.log("⚠️  Please setup 2FA and remove SUPERADMIN credentials from .env!");
  } catch (error) {
    console.error("❌ SuperAdmin seeder error:", error.message);
  }
};

// ----------------------------------------------------------------
// SEED DEFAULT PLANS
// ----------------------------------------------------------------
const seedDefaultPlans = async () => {
  try {
    const count = await Plan.countDocuments();
    if (count > 0) {
      console.log("✅ Plans already seeded:", count, "plans");
      return;
    }

    const plans = [
      {
        name: "free",
        displayName: "Free",
        description: "Perfect for trying out Lexioai",
        pricing: {
          INR: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
          USD: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
        },
        yearlyDiscountPercent: 0,
        limits: {
          bots: 1,
          chatsPerMonth: 50,
          trainingUrlPages: 1,
          trainingFiles: 0,
          leadCapture: false,
          analytics: false,
          advancedAnalytics: false,
          customBranding: false,
          webhooks: false,
          apiAccess: false,
          prioritySupport: false,
          whiteLabel: false,
        },
        features: [
          "1 Bot",
          "50 chats/month",
          "URL training (1 page)",
          "Basic chat widget",
          "Powered by Lexioai badge",
        ],
        color: "#6B7280",
        isPopular: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "starter",
        displayName: "Starter",
        description: "For freelancers and small businesses",
        pricing: {
          INR: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
          USD: { monthly: 5, yearly: 48, yearlyPerMonth: 4 },
        },
        yearlyDiscountPercent: 17,
        limits: {
          bots: 3,
          chatsPerMonth: 100,
          trainingUrlPages: 50,
          trainingFiles: 10,
          leadCapture: true,
          analytics: true,
          advancedAnalytics: false,
          customBranding: false,
          webhooks: false,
          apiAccess: false,
          prioritySupport: false,
          whiteLabel: false,
        },
        features: [
          "3 Bots",
          "100 chats/month",
          "URL training (50 pages)",
          "10 file uploads (PDF/DOCX)",
          "Lead capture",
          "Basic analytics",
          "Powered by Lexioai badge",
          "Email support",
        ],
        color: "#7F77DD",
        isPopular: false,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "pro",
        displayName: "Pro",
        description: "For growing businesses",
        pricing: {
          INR: { monthly: 899, yearly: 8990, yearlyPerMonth: 749 },
          USD: { monthly: 11, yearly: 108, yearlyPerMonth: 9 },
        },
        yearlyDiscountPercent: 17,
        limits: {
          bots: 10,
          chatsPerMonth: 300,
          trainingUrlPages: 100,
          trainingFiles: 15,
          leadCapture: true,
          analytics: true,
          advancedAnalytics: true,
          customBranding: true,
          webhooks: false,
          apiAccess: false,
          prioritySupport: true,
          whiteLabel: false,
        },
        features: [
          "10 Bots",
          "300 chats/month",
          "URL training (100 pages)",
          "15 file uploads (PDF/DOCX)",
          "Lead capture + export",
          "Advanced analytics",
          "Hindi/Hinglish support",
          "Priority support",
          "No Lexioai badge",
        ],
        color: "#6366F1",
        isPopular: true,
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "business",
        displayName: "Business",
        description: "For enterprises and agencies",
        pricing: {
          INR: { monthly: 2999, yearly: 29990, yearlyPerMonth: 2499 },
          USD: { monthly: 36, yearly: 360, yearlyPerMonth: 30 },
        },
        yearlyDiscountPercent: 17,
        limits: {
          bots: 20,
          chatsPerMonth: 2000,
          trainingUrlPages: 200,
          trainingFiles: 25,
          leadCapture: true,
          analytics: true,
          advancedAnalytics: true,
          customBranding: true,
          webhooks: true,
          apiAccess: true,
          prioritySupport: true,
          whiteLabel: true,
        },
        features: [
          "20 Bots",
          "2,000 chats/month",
          "URL training (200 pages)",
          "25 file uploads (PDF/DOCX)",
          "Webhooks & API access",
          "White label (remove all branding)",
          "Advanced analytics + export",
          "Dedicated support",
          "Custom domain",
        ],
        color: "#0EA5E9",
        isPopular: false,
        isActive: true,
        sortOrder: 4,
      },
    ];

    await Plan.insertMany(plans);
    console.log("✅ Default plans seeded:", plans.length, "plans");
  } catch (error) {
    console.error("❌ Plans seeder error:", error.message);
  }
};

// ----------------------------------------------------------------
// SEED PLATFORM SETTINGS
// ----------------------------------------------------------------
const seedPlatformSettings = async () => {
  try {
    await PlatformSettings.getSettings();
    console.log("✅ Platform settings initialized");
  } catch (error) {
    console.error("❌ Platform settings seeder error:", error.message);
  }
};

// ----------------------------------------------------------------
// SEED DEFAULT INDUSTRIES
// ----------------------------------------------------------------
const seedIndustries = async () => {
  try {
    const defaultIndustries = [
      { label: "Other", value: "other", isCustom: false },
      { label: "Ecommerce", value: "ecommerce", isCustom: false },
      { label: "SaaS", value: "saas", isCustom: false },
      { label: "Education", value: "education", isCustom: false },
      { label: "Healthcare", value: "healthcare", isCustom: false },
    ];

    for (const industry of defaultIndustries) {
      const existing = await Industry.findOne({ value: industry.value });
      if (!existing) {
        await Industry.create(industry);
      }
    }

    console.log("✅ Default industries seeded");
  } catch (error) {
    console.error("❌ Industries seeder error:", error.message);
  }
};

// ----------------------------------------------------------------
// RUN ALL SEEDERS
// ----------------------------------------------------------------
const runSeeders = async () => {
  console.log("🌱 Running seeders...");
  await seedSuperAdmin();
  await seedDefaultPlans();
  await seedPlatformSettings();
  await seedIndustries();
  console.log("🌱 Seeders complete!");
};

module.exports = { runSeeders, seedSuperAdmin, seedDefaultPlans, seedIndustries };