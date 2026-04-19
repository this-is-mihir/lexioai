const CreditPackage = require("../models/CreditPackage.model");
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
// @route  GET /api/v1/admin/credit-packages
// ----------------------------------------------------------------
const getAllCreditPackages = async (req, res) => {
  try {
    const packages = await CreditPackage.find().sort({ sortOrder: 1 });
    return successResponse(res, { data: { packages } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch credit packages." });
  }
};

// ----------------------------------------------------------------
// @route  POST /api/v1/admin/credit-packages
// ----------------------------------------------------------------
const createCreditPackage = async (req, res) => {
  try {
    const { name, description, credits, pricing, sortOrder } = req.body;

    if (!name || !credits || !pricing?.INR) {
      return validationErrorResponse(res, [
        { field: "general", message: "Name, credits, and INR price are required" },
      ]);
    }

    const pkg = new CreditPackage({
      name, description, credits,
      pricing: {
        INR: pricing.INR,
        USD: pricing.USD || 0,
      },
      sortOrder: sortOrder || 0,
    });

    await pkg.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "CREDIT_PACKAGE_CREATED", module: "credits",
      description: `Credit package "${name}" created (${credits} credits for ₹${pricing.INR})`,
    });

    return successResponse(res, {
      message: "Credit package created!",
      statusCode: 201,
      data: { package: pkg },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to create credit package." });
  }
};

// ----------------------------------------------------------------
// @route  PUT /api/v1/admin/credit-packages/:id
// ----------------------------------------------------------------
const updateCreditPackage = async (req, res) => {
  try {
    const pkg = await CreditPackage.findById(req.params.id);
    if (!pkg) return notFoundResponse(res, "Credit package not found.");

    const { name, description, credits, pricing, sortOrder, isActive } = req.body;

    if (name !== undefined)        pkg.name        = name;
    if (description !== undefined) pkg.description = description;
    if (credits !== undefined)     pkg.credits     = credits;
    if (pricing?.INR !== undefined) pkg.pricing.INR = pricing.INR;
    if (pricing?.USD !== undefined) pkg.pricing.USD = pricing.USD;
    if (sortOrder !== undefined)   pkg.sortOrder   = sortOrder;
    if (isActive !== undefined)    pkg.isActive    = isActive;

    await pkg.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "CREDIT_PACKAGE_UPDATED", module: "credits",
      description: `Credit package "${pkg.name}" updated`,
    });

    return successResponse(res, {
      message: "Credit package updated!",
      data: { package: pkg },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update credit package." });
  }
};

// ----------------------------------------------------------------
// @route  PATCH /api/v1/admin/credit-packages/:id/toggle
// ----------------------------------------------------------------
const toggleCreditPackage = async (req, res) => {
  try {
    const pkg = await CreditPackage.findById(req.params.id);
    if (!pkg) return notFoundResponse(res, "Credit package not found.");

    pkg.isActive = !pkg.isActive;
    await pkg.save();

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "CREDIT_PACKAGE_TOGGLED", module: "credits",
      description: `Credit package "${pkg.name}" ${pkg.isActive ? "activated" : "deactivated"}`,
    });

    return successResponse(res, {
      message: `Package ${pkg.isActive ? "activated" : "deactivated"}!`,
      data: { isActive: pkg.isActive },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to toggle credit package." });
  }
};

// ----------------------------------------------------------------
// @route  DELETE /api/v1/admin/credit-packages/:id
// ----------------------------------------------------------------
const deleteCreditPackage = async (req, res) => {
  try {
    const pkg = await CreditPackage.findById(req.params.id);
    if (!pkg) return notFoundResponse(res, "Credit package not found.");

    await CreditPackage.findByIdAndDelete(pkg._id);

    await AuditLog.log({
      adminId: req.admin._id, adminName: req.admin.name,
      adminRole: req.admin.role, adminIP: getClientIP(req),
      action: "CREDIT_PACKAGE_DELETED", module: "credits",
      description: `Credit package "${pkg.name}" deleted`,
    });

    return successResponse(res, { message: "Credit package deleted." });
  } catch (error) {
    return errorResponse(res, { message: "Failed to delete credit package." });
  }
};

// ----------------------------------------------------------------
// Seed default packages
// ----------------------------------------------------------------
const seedCreditPackages = async (req, res) => {
  try {
    const existing = await CreditPackage.countDocuments();
    if (existing > 0) {
      return errorResponse(res, {
        message: "Credit packages already exist. Delete them first.",
        statusCode: 400,
      });
    }

    const defaults = [
      { name: "Starter Pack",  description: "100 chat credits",  credits: 100,  pricing: { INR: 99,  USD: 2 }, sortOrder: 1 },
      { name: "Growth Pack",   description: "500 chat credits",  credits: 500,  pricing: { INR: 399, USD: 5 }, sortOrder: 2 },
      { name: "Power Pack",    description: "1000 chat credits", credits: 1000, pricing: { INR: 699, USD: 9 }, sortOrder: 3 },
    ];

    await CreditPackage.insertMany(defaults);

    return successResponse(res, {
      message: "Default credit packages seeded!",
      data: { count: defaults.length },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to seed credit packages." });
  }
};

module.exports = {
  getAllCreditPackages,
  createCreditPackage,
  updateCreditPackage,
  toggleCreditPackage,
  deleteCreditPackage,
  seedCreditPackages,
};