// ================================================================
// ADMIN COUPONS CONTROLLER
// ================================================================
const Coupon = require("../models/Coupon.model");
const AuditLog = require("../models/AuditLog.model");
const {
  successResponse, errorResponse,
  validationErrorResponse, notFoundResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// GET ALL COUPONS
// ----------------------------------------------------------------
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return successResponse(res, { data: { coupons, total: coupons.length } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch coupons." });
  }
};

// ----------------------------------------------------------------
// GET SINGLE COUPON
// ----------------------------------------------------------------
const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId);
    if (!coupon) return notFoundResponse(res, "Coupon not found");
    return successResponse(res, { data: { coupon } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch coupon." });
  }
};

// ----------------------------------------------------------------
// CREATE COUPON
// ----------------------------------------------------------------
const createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue, maxUses, validUntil,
      applicablePlans, applicableBilling, description,
      maxDiscountAmount, specificUserId, maxUsesPerUser,
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return validationErrorResponse(res, [
        { field: "general", message: "Code, discount type and value are required" },
      ]);
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return errorResponse(res, { message: "Coupon code already exists.", statusCode: 409 });
    }

    const coupon = new Coupon({
      code:              code.toUpperCase().trim(),
      discountType,
      discountValue,
      maxUses:           maxUses || null,
      validUntil:        validUntil || null,
      applicablePlans:   applicablePlans || ["all"],
      applicableBilling: applicableBilling || "both",
      description:       description || null,
      maxDiscountAmount: maxDiscountAmount || null,
      specificUserId:    specificUserId || null,
      maxUsesPerUser:    maxUsesPerUser ?? 1,
      createdBy:         req.admin._id,
    });

    await coupon.save();

    await AuditLog.log({
      adminId:     req.admin._id,
      adminName:   req.admin.name,
      adminRole:   req.admin.role,
      adminIP:     getClientIP(req),
      action:      "COUPON_CREATED",
      module:      "coupons",
      description: `Coupon "${code}" created: ${discountValue}${discountType === "percentage" ? "%" : "₹"} off`,
      targetType:  "coupon",
      targetId:    coupon._id,
      targetName:  code,
    });

    return successResponse(res, {
      message:    "Coupon created successfully!",
      statusCode: 201,
      data:       { coupon },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to create coupon." });
  }
};

// ----------------------------------------------------------------
// UPDATE COUPON
// ----------------------------------------------------------------
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId);
    if (!coupon) return notFoundResponse(res, "Coupon not found");

    if (req.body.code !== undefined) {
      const normalizedCode = String(req.body.code || "").trim().toUpperCase();

      if (!normalizedCode || normalizedCode.length < 4) {
        return validationErrorResponse(res, [
          { field: "code", message: "Coupon code must be at least 4 characters" },
        ]);
      }

      if (normalizedCode !== coupon.code) {
        const existingCoupon = await Coupon.findOne({
          code: normalizedCode,
          _id: { $ne: coupon._id },
        });

        if (existingCoupon) {
          return errorResponse(res, { message: "Coupon code already exists.", statusCode: 409 });
        }
      }

      coupon.code = normalizedCode;
    }

    const fields = [
      "discountType", "discountValue", "maxUses", "validUntil",
      "applicablePlans", "applicableBilling", "description",
      "maxDiscountAmount", "maxUsesPerUser", "isActive",
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) coupon[f] = req.body[f];
    });

    await coupon.save();

    await AuditLog.log({
      adminId:     req.admin._id,
      adminName:   req.admin.name,
      adminRole:   req.admin.role,
      adminIP:     getClientIP(req),
      action:      "COUPON_UPDATED",
      module:      "coupons",
      description: `Coupon "${coupon.code}" updated`,
      targetType:  "coupon",
      targetId:    coupon._id,
      targetName:  coupon.code,
    });

    return successResponse(res, { message: "Coupon updated successfully!", data: { coupon } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update coupon." });
  }
};

// ----------------------------------------------------------------
// TOGGLE COUPON ACTIVE / INACTIVE
// ----------------------------------------------------------------
const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId);
    if (!coupon) return notFoundResponse(res, "Coupon not found");

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return successResponse(res, {
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully.`,
      data:    { isActive: coupon.isActive },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to toggle coupon." });
  }
};

// ----------------------------------------------------------------
// DELETE SINGLE COUPON
// ----------------------------------------------------------------
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
    if (!coupon) return notFoundResponse(res, "Coupon not found");

    await AuditLog.log({
      adminId:     req.admin._id,
      adminName:   req.admin.name,
      adminRole:   req.admin.role,
      adminIP:     getClientIP(req),
      action:      "COUPON_DELETED",
      module:      "coupons",
      description: `Coupon "${coupon.code}" deleted`,
      targetType:  "coupon",
      targetId:    coupon._id,
      targetName:  coupon.code,
    });

    return successResponse(res, { message: "Coupon deleted successfully." });
  } catch (error) {
    return errorResponse(res, { message: "Failed to delete coupon." });
  }
};

// ----------------------------------------------------------------
// BULK DELETE COUPONS
// ----------------------------------------------------------------
const bulkDeleteCoupons = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationErrorResponse(res, [
        { field: "ids", message: "Please provide an array of coupon IDs" },
      ]);
    }

    const result = await Coupon.deleteMany({ _id: { $in: ids } });

    await AuditLog.log({
      adminId:     req.admin._id,
      adminName:   req.admin.name,
      adminRole:   req.admin.role,
      adminIP:     getClientIP(req),
      action:      "COUPON_BULK_DELETED",
      module:      "coupons",
      description: `Bulk deleted ${result.deletedCount} coupons`,
    });

    return successResponse(res, {
      message: `${result.deletedCount} coupons deleted successfully.`,
      data:    { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to bulk delete coupons." });
  }
};

module.exports = {
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  bulkDeleteCoupons,
};