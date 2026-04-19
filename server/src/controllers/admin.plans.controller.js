const Plan = require("../models/Plan.model");
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
// @route   GET /api/v1/admin/plans
// ----------------------------------------------------------------
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 });
    return successResponse(res, { data: { plans } });
  } catch (error) {
    console.error("Get all plans error:", error);
    return errorResponse(res, { message: "Failed to fetch plans." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/plans/:planId
// ----------------------------------------------------------------
const getPlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) return notFoundResponse(res, "Plan not found");
    return successResponse(res, { data: { plan } });
  } catch (error) {
    console.error("Get plan error:", error);
    return errorResponse(res, { message: "Failed to fetch plan." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/plans
// ----------------------------------------------------------------
const createPlan = async (req, res) => {
  try {
    const { name, displayName, description, pricing, limits, features, color, isPopular, sortOrder } = req.body;

    if (!name || !displayName) {
      return validationErrorResponse(res, [
        { field: "general", message: "Name and display name are required" },
      ]);
    }

    const existing = await Plan.findOne({ name });
    if (existing) {
      return errorResponse(res, { message: "Plan with this name already exists.", statusCode: 409 });
    }

    const plan = new Plan({
      name, displayName, description, pricing, limits,
      features, color, isPopular, sortOrder,
    });

    await plan.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "PLAN_CREATED",
      module: "plans",
      description: `New plan created: ${displayName}`,
      targetType: "plan",
      targetId: plan._id,
      targetName: displayName,
    });

    return successResponse(res, {
      message: "Plan created successfully!",
      statusCode: 201,
      data: { plan },
    });
  } catch (error) {
    console.error("Create plan error:", error);
    return errorResponse(res, { message: "Failed to create plan." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/plans/:planId
// ----------------------------------------------------------------
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) return notFoundResponse(res, "Plan not found");

    const oldValues = plan.toObject();
    const updateFields = [
      "displayName", "description", "pricing", "limits",
      "features", "color", "isPopular", "isActive", "sortOrder",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        plan[field] = req.body[field];
      }
    });

    // Yearly per month auto-calculate
    if (req.body.pricing?.INR?.yearly) {
      plan.pricing.INR.yearlyPerMonth = Math.round(req.body.pricing.INR.yearly / 12);
    }
    if (req.body.pricing?.USD?.yearly) {
      plan.pricing.USD.yearlyPerMonth = Math.round(req.body.pricing.USD.yearly / 12);
    }

    await plan.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "PLAN_UPDATED",
      module: "plans",
      description: `Plan "${plan.displayName}" updated`,
      targetType: "plan",
      targetId: plan._id,
      targetName: plan.displayName,
      previousValue: oldValues,
      newValue: req.body,
    });

    return successResponse(res, {
      message: "Plan updated successfully!",
      data: { plan },
    });
  } catch (error) {
    console.error("Update plan error:", error);
    return errorResponse(res, { message: "Failed to update plan." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/plans/:planId
// ----------------------------------------------------------------
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) return notFoundResponse(res, "Plan not found");

    if (["free", "starter", "pro", "business"].includes(plan.name)) {
      return errorResponse(res, {
        message: "Default plans cannot be deleted. You can disable them instead.",
        statusCode: 400,
      });
    }

    await Plan.findByIdAndDelete(plan._id);

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "PLAN_DELETED",
      module: "plans",
      description: `Plan "${plan.displayName}" deleted`,
      targetType: "plan",
      targetId: plan._id,
      targetName: plan.displayName,
    });

    return successResponse(res, { message: "Plan deleted successfully." });
  } catch (error) {
    console.error("Delete plan error:", error);
    return errorResponse(res, { message: "Failed to delete plan." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/plans/seed
// ----------------------------------------------------------------
const seedDefaultPlans = async (req, res) => {
  try {
    const { seedDefaultPlans: seed } = require("../seeder");
    await seed();
    const plans = await Plan.find().sort({ sortOrder: 1 });
    return successResponse(res, {
      message: "Default plans seeded successfully!",
      data: { plans },
    });
  } catch (error) {
    console.error("Seed plans error:", error);
    return errorResponse(res, { message: "Failed to seed plans." });
  }
};

module.exports = { getAllPlans, getPlan, createPlan, updatePlan, deletePlan, seedDefaultPlans };