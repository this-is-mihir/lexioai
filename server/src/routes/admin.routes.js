const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");


// ----------------------------------------------------------------
// CONTROLLERS
// ----------------------------------------------------------------
const {
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  forgotPassword,
  resetPassword,
  setup2FA,
  verify2FA,
  getSessions,
  logoutAllDevices,
} = require("../controllers/admin.auth.controller");

const {
  getAllUsers,
  getUserDetails,
  updateUserPlan,
  addChatCredits,
  banUser,
  unbanUser,
  deleteUser,
  verifyUserEmail,
  sendEmailToUser,
  resetUserPassword,
  exportUsers,
} = require("../controllers/admin.users.controller");

const {
  getAllBots,
  getBotDetails,
  toggleBotLive,
  deleteBot,
  getBotLeads,
} = require("../controllers/admin.bots.controller");

const {
  getAllConversations,
  getConversation,
  deleteConversations,
  getBotConversations,
  exportConversations,
} = require("../controllers/admin.conversations.controller");

const {
  getAllLeads,
  deleteLead,
  exportLeads,
} = require("../controllers/admin.leads.controller");

const {
  getAllCreditPackages,
  createCreditPackage,
  updateCreditPackage,
  toggleCreditPackage,
  deleteCreditPackage,
  seedCreditPackages,
} = require("../controllers/admin.credits.controller");

const {
  getAllPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  seedDefaultPlans,
} = require("../controllers/admin.plans.controller");

const {
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
  bulkDeleteCoupons,
} = require("../controllers/admin.coupons.controller");

const {
  getDashboardStats,
  getRevenueStats,
  getUserGrowth,
  getActivityFeed,
  deleteActivityFeed,
  getSuspiciousActivity,
  deleteActivityLog,
} = require("../controllers/admin.stats.controller");

const {
  getAllAnnouncements,
  getAnnouncementStats,
  createAnnouncement,
  resendAnnouncement,
  deleteAnnouncement,
} = require("../controllers/admin.announcements.controller");

const {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  previewRaw,
  setDefaultTemplate,
} = require("../controllers/admin.emailtemplates.controller");

const {
  getAllTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
} = require("../controllers/admin.tickets.controller");

const {
  getAllBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  togglePublish,
  uploadBlogImage,
} = require("../controllers/admin.blog.controller");

const {
  getAllAIKeys,
  createAIKey,
  updateAIKey,
  deleteAIKey,
  testAIKey,
  autoTestAIKey,
} = require("../controllers/admin.aikeys.controller");

const {
  getSettings,
  updateGeneralSettings,
  updateAISettings,
  updateLandingPageStats,
  updateLegalContent,
  addChangelog,
  deleteChangelog,
  updateReferralSettings,
  updateBrandingSettings,
  updateOperationsSettings,
  updateIntegrationsSettings,
  updateSecuritySettings,
  rotateJWTSecret,
} = require("../controllers/admin.settings.controller");

const {
  requestPasswordReset,
  resetPasswordWithOTP,
} = require("../controllers/admin.profile.controller");

const {
  getUploadSignature,
  deleteImageFromCloudinary,
} = require("../controllers/cloudinary.controller");

const {
  getAllAuditLogs,
  deleteAuditLogs,
  exportAuditLogsCSV,
  getAuditStats,
} = require("../controllers/admin.audit.controller");

const {
  protectAdmin,
  requireSuperAdmin,
  requirePermission,
  require2FA,
} = require("../middleware/admin.middleware");

// ----------------------------------------------------------------
// MULTER — Avatar upload
// ----------------------------------------------------------------
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP allowed"), false);
  },
});

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many login attempts." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many reset requests." },
});

// ----------------------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------------------
router.post("/auth/login", loginLimiter, login);
router.post("/auth/refresh", refreshToken);
router.post("/auth/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/request-password-reset", forgotPasswordLimiter, requestPasswordReset);
router.post("/auth/reset-password-with-otp", resetPasswordWithOTP);

// ----------------------------------------------------------------
// PROTECTED ROUTES — Admin auth required
// ----------------------------------------------------------------
router.use(protectAdmin);

// ----------------------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------------------
router.get("/auth/me", getMe);
router.post("/auth/logout", logout);
router.put("/auth/profile", updateProfile);
router.post("/auth/avatar", avatarUpload.single("avatar"), updateAvatar);
router.put("/auth/password", changePassword);
router.post("/auth/2fa/setup", setup2FA);
router.post("/auth/2fa/verify", verify2FA);
router.get("/auth/sessions", getSessions);
router.delete("/auth/sessions/all", logoutAllDevices);

// ----------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------
router.get("/stats/dashboard",    requirePermission("stats", "view"), getDashboardStats);
router.get("/stats/revenue",      requirePermission("stats", "view"), getRevenueStats);
router.get("/stats/user-growth",  requirePermission("stats", "view"), getUserGrowth);
router.get("/stats/activity-feed",requirePermission("stats", "view"), getActivityFeed);
router.delete("/stats/activity-feed", requireSuperAdmin,              deleteActivityFeed);
router.get("/stats/suspicious",   requirePermission("stats", "view"), getSuspiciousActivity);

// ----------------------------------------------------------------
// LEADS MANAGEMENT
// ----------------------------------------------------------------
router.get("/leads/export",          requirePermission("bots", "view"),   exportLeads);
router.get("/leads",                 requirePermission("bots", "view"),   getAllLeads);
router.delete("/leads/:leadId",      requirePermission("bots", "delete"), deleteLead);

// ----------------------------------------------------------------
// USER MANAGEMENT
// ----------------------------------------------------------------
router.get("/users",                            requirePermission("users", "view"),      getAllUsers);
router.get("/users/export",                     requirePermission("users", "exportCsv"), exportUsers);
router.get("/users/:userId",                    requirePermission("users", "view"),      getUserDetails);
router.put("/users/:userId/plan",               requirePermission("users", "edit"),      updateUserPlan);
router.post("/users/:userId/credits",           requirePermission("users", "edit"),      addChatCredits);
router.post("/users/:userId/ban",               requirePermission("users", "ban"),       banUser);
router.post("/users/:userId/unban",             requirePermission("users", "ban"),       unbanUser);
router.delete("/users/:userId",                 requirePermission("users", "delete"),    deleteUser);
router.post("/users/:userId/verify-email",      requirePermission("users", "edit"),      verifyUserEmail);
router.post("/users/:userId/send-email",        requirePermission("users", "edit"),      sendEmailToUser);
router.post("/users/:userId/reset-password",    requireSuperAdmin,                       resetUserPassword);

// ----------------------------------------------------------------
// BOT MANAGEMENT
// ----------------------------------------------------------------
router.get("/bots",                        requirePermission("bots", "view"),   getAllBots);
router.get("/bots/:botId",                 requirePermission("bots", "view"),   getBotDetails);
router.put("/bots/:botId/toggle",          requirePermission("bots", "edit"),   toggleBotLive);
router.delete("/bots/:botId",              requirePermission("bots", "delete"), deleteBot);
router.get("/bots/:botId/leads",           requirePermission("bots", "view"),   getBotLeads);
router.get("/bots/:botId/conversations",   requirePermission("bots", "view"),   getBotConversations);

// ----------------------------------------------------------------
// CONVERSATION MANAGEMENT
// ----------------------------------------------------------------
router.get("/conversations/export",              requirePermission("conversations", "view"), exportConversations);
router.get("/conversations",                     requirePermission("conversations", "view"), getAllConversations);
router.get("/conversations/:conversationId",     requirePermission("conversations", "view"), getConversation);
router.delete("/conversations",                  requireSuperAdmin,                          deleteConversations);

// ----------------------------------------------------------------
// PLAN MANAGEMENT
// ----------------------------------------------------------------
router.get("/plans",              getAllPlans);
router.post("/plans/seed",        requireSuperAdmin,                    seedDefaultPlans);
router.get("/plans/:planId",      requirePermission("plans", "view"),   getPlan);
router.post("/plans",             requirePermission("plans", "create"), createPlan);
router.put("/plans/:planId",      requirePermission("plans", "edit"),   updatePlan);
router.delete("/plans/:planId",   requirePermission("plans", "delete"), deletePlan);

// ----------------------------------------------------------------
// CREDIT PACKAGES
// ----------------------------------------------------------------
router.get("/credit-packages",              requirePermission("plans", "view"),   getAllCreditPackages);
router.post("/credit-packages/seed",        requireSuperAdmin,                    seedCreditPackages);
router.post("/credit-packages",             requirePermission("plans", "create"), createCreditPackage);
router.put("/credit-packages/:id",          requirePermission("plans", "edit"),   updateCreditPackage);
router.patch("/credit-packages/:id/toggle", requirePermission("plans", "edit"),   toggleCreditPackage);
router.delete("/credit-packages/:id",       requirePermission("plans", "delete"), deleteCreditPackage);

// ----------------------------------------------------------------
// COUPON MANAGEMENT
// ----------------------------------------------------------------
router.get("/coupons",                       requirePermission("coupons", "view"),   getAllCoupons);
router.post("/coupons/bulk-delete",          requirePermission("coupons", "delete"), bulkDeleteCoupons);  // must be before /:couponId
router.post("/coupons",                      requirePermission("coupons", "create"), createCoupon);
router.get("/coupons/:couponId",             requirePermission("coupons", "view"),   getCoupon);
router.put("/coupons/:couponId",             requirePermission("coupons", "edit"),   updateCoupon);
router.patch("/coupons/:couponId/toggle",    requirePermission("coupons", "edit"),   toggleCoupon);
router.delete("/coupons/:couponId",          requirePermission("coupons", "delete"), deleteCoupon);

// ----------------------------------------------------------------
// ANNOUNCEMENTS
// NOTE: /stats and /:id/resend must be before /:announcementId
// ----------------------------------------------------------------
router.get("/announcements/stats",                  requirePermission("announcements", "view"),   getAnnouncementStats);
router.get("/announcements",                        requirePermission("announcements", "view"),   getAllAnnouncements);
router.post("/announcements",                       requirePermission("announcements", "create"), createAnnouncement);
router.post("/announcements/:id/resend",            requirePermission("announcements", "create"), resendAnnouncement);
router.delete("/announcements/:announcementId",     requirePermission("announcements", "delete"), deleteAnnouncement);

// ----------------------------------------------------------------
// EMAIL TEMPLATES
// NOTE: /preview-raw must be before /:id
// ----------------------------------------------------------------
router.get("/email-templates",                       requirePermission("announcements", "view"),   getAllTemplates);
router.post("/email-templates/preview-raw",          requirePermission("announcements", "view"),   previewRaw);
router.post("/email-templates",                      requirePermission("announcements", "create"), createTemplate);
router.get("/email-templates/:id",                   requirePermission("announcements", "view"),   getTemplate);
router.put("/email-templates/:id",                   requirePermission("announcements", "edit"),   updateTemplate);
router.delete("/email-templates/:id",                requirePermission("announcements", "delete"), deleteTemplate);
router.post("/email-templates/:id/preview",          requirePermission("announcements", "view"),   previewTemplate);
router.patch("/email-templates/:id/set-default",     requirePermission("announcements", "edit"),   setDefaultTemplate);

// ----------------------------------------------------------------
// SUPPORT TICKETS
// ----------------------------------------------------------------
router.get("/tickets",                       requirePermission("tickets", "view"),   getAllTickets);
router.get("/tickets/:ticketId",             requirePermission("tickets", "view"),   getTicket);
router.post("/tickets/:ticketId/reply",      requirePermission("tickets", "reply"),  replyToTicket);
router.put("/tickets/:ticketId/status",      requirePermission("tickets", "close"),  updateTicketStatus);
router.post("/tickets/:ticketId/assign",     requirePermission("tickets", "assign"), assignTicket);
router.delete("/tickets/:ticketId",          requirePermission("tickets", "close"),  deleteTicket);

// ----------------------------------------------------------------
// BLOG MANAGEMENT
// ----------------------------------------------------------------
router.post("/blog/upload-image",         requirePermission("blog", "create"), avatarUpload.single("file"), uploadBlogImage);
router.get("/blog",                       requirePermission("blog", "view"),   getAllBlogPosts);
router.post("/blog",                      requirePermission("blog", "create"), createBlogPost);
router.get("/blog/:postId",               requirePermission("blog", "view"),   getBlogPost);
router.put("/blog/:postId",               requirePermission("blog", "edit"),   updateBlogPost);
router.delete("/blog/:postId",            requirePermission("blog", "delete"), deleteBlogPost);
router.patch("/blog/:postId/publish",     requirePermission("blog", "edit"),   togglePublish);

// ----------------------------------------------------------------
// API KEYS MANAGEMENT
// ----------------------------------------------------------------
router.get("/ai-keys",                       requirePermission("settings", "view"),   getAllAIKeys);
router.post("/ai-keys",                      requirePermission("settings", "edit"),   createAIKey);
router.post("/ai-keys/:keyId/test",          requirePermission("settings", "edit"),   testAIKey);
router.post("/ai-keys/:keyId/auto-test",     requirePermission("settings", "edit"),   autoTestAIKey);
router.put("/ai-keys/:keyId",                requirePermission("settings", "edit"),   updateAIKey);
router.delete("/ai-keys/:keyId",             requirePermission("settings", "edit"),   deleteAIKey);

// ----------------------------------------------------------------
// PLATFORM SETTINGS
// ----------------------------------------------------------------
router.get("/settings",                           requirePermission("settings", "view"), getSettings);
router.put("/settings/general",                   requirePermission("settings", "edit"), updateGeneralSettings);
router.put("/settings/branding",                  requireSuperAdmin,                     updateBrandingSettings);
router.put("/settings/operations",                requireSuperAdmin,                     updateOperationsSettings);
router.put("/settings/integrations",              requireSuperAdmin,                     updateIntegrationsSettings);
router.put("/settings/security",                  requireSuperAdmin,                     updateSecuritySettings);
router.post("/settings/security/rotate-secret",   requireSuperAdmin,                     rotateJWTSecret);
router.put("/settings/ai",                        requireSuperAdmin,                     updateAISettings);
router.put("/settings/landing-stats",             requireSuperAdmin,                     updateLandingPageStats);
router.put("/settings/legal",                     requireSuperAdmin,                     updateLegalContent);
router.post("/settings/cloudinary-signature",     protectAdmin,                          getUploadSignature);
router.post("/settings/cloudinary-delete",        protectAdmin,                          deleteImageFromCloudinary);
router.post("/settings/changelog",                requireSuperAdmin,                     addChangelog);
router.delete("/settings/changelog/:changelogId", requireSuperAdmin,                     deleteChangelog);
router.put("/settings/referral",                  requireSuperAdmin,                     updateReferralSettings);

// ----------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------
router.get("/audit",                 requirePermission("audit", "view"), getAllAuditLogs);
router.get("/audit/export/csv",      requirePermission("audit", "view"), exportAuditLogsCSV);
router.get("/audit/stats",           requirePermission("audit", "view"), getAuditStats);
router.delete("/audit",              requireSuperAdmin,                   deleteAuditLogs);

// ================================================================
// ROLE MANAGEMENT — SuperAdmin only
// ================================================================
const {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/admin.roles.controller");

router.get("/roles",                     requireSuperAdmin,  getAllRoles);
router.post("/roles",                    requireSuperAdmin,  createRole);
router.put("/roles/:roleId",             requireSuperAdmin,  updateRole);
router.delete("/roles/:roleId",          requireSuperAdmin,  deleteRole);

// ================================================================
// ADMIN MANAGEMENT — SuperAdmin only
// ================================================================
const {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  updateAdminPermissions,
  banAdmin,
  unbanAdmin,
  deleteAdmin,
  getAdminsForAssignment,
  forcePasswordReset,
  changeAdminPassword,
  getAdminActivityLogs,
  getAllActivityLogs,
  importAdminsCSV,
  updateAdminOnlineStatus,
} = require("../controllers/admin.users.controller");

router.get("/admins/for-assignment",        requirePermission("tickets", "assign"),   getAdminsForAssignment);
router.get("/admins/activity/:adminId",     requireSuperAdmin,                        getAdminActivityLogs);
router.get("/admins",                       requireSuperAdmin,                        getAllAdmins);
router.post("/admins",                      requireSuperAdmin,                        createAdmin);
router.post("/admins/import",               requireSuperAdmin,                        importAdminsCSV);
router.put("/admins/:adminId",              requireSuperAdmin,                        updateAdmin);
router.put("/admins/:adminId/permissions",  requireSuperAdmin,                        updateAdminPermissions);
router.post("/admins/:adminId/ban",         requireSuperAdmin,                        banAdmin);
router.post("/admins/:adminId/unban",       requireSuperAdmin,                        unbanAdmin);
router.post("/admins/:adminId/force-reset", requireSuperAdmin,                        forcePasswordReset);
router.post("/admins/:adminId/change-password", requireSuperAdmin,                    changeAdminPassword);
router.put("/admins/:adminId/online-status",requireSuperAdmin,                        updateAdminOnlineStatus);
router.delete("/admins/:adminId",           requireSuperAdmin,                        deleteAdmin);

// ================================================================
// ACTIVITY LOGS — SuperAdmin only
// ================================================================
router.get("/activity-logs",  requireSuperAdmin,  getAllActivityLogs);
router.delete("/activity-logs/:id",  requireSuperAdmin,  deleteActivityLog);

module.exports = router;