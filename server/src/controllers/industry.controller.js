const Industry = require("../models/Industry.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");

// ----------------------------------------------------------------
// @route   GET /api/v1/industries
// ----------------------------------------------------------------
const getAllIndustries = async (req, res) => {
  try {
    const industries = await Industry.find().sort({ label: 1 });
    
    return successResponse(res, {
      message: "Industries fetched successfully",
      data: { industries },
    });
  } catch (error) {
    console.error("Get industries error:", error);
    return errorResponse(res, { message: "Failed to fetch industries" });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/industries
// ----------------------------------------------------------------
const createIndustry = async (req, res) => {
  try {
    const { label } = req.body;

    if (!label || !label.trim()) {
      return validationErrorResponse(res, [
        { field: "label", message: "Industry name is required" },
      ]);
    }

    const value = label.toLowerCase().replace(/\s+/g, "_");

    // Check if already exists
    const existing = await Industry.findOne({
      $or: [{ label }, { value }],
    });

    if (existing) {
      return errorResponse(res, {
        message: "This industry already exists",
        statusCode: 409,
      });
    }

    // Create new industry
    const industry = new Industry({
      label: label.trim(),
      value,
      isCustom: true,
      createdBy: req.user?._id || null,
    });

    await industry.save();

    return successResponse(res, {
      message: "Industry created successfully",
      statusCode: 201,
      data: { industry },
    });
  } catch (error) {
    console.error("Create industry error:", error);
    return errorResponse(res, { message: "Failed to create industry" });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/industries/:id
// ----------------------------------------------------------------
const deleteIndustry = async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id);

    if (!industry) {
      return notFoundResponse(res, "Industry not found");
    }

    // Don't allow deletion of default industries
    if (!industry.isCustom) {
      return forbiddenResponse(res, "Cannot delete default industries");
    }

    await Industry.findByIdAndDelete(req.params.id);

    return successResponse(res, {
      message: "Industry deleted successfully",
      data: { industry },
    });
  } catch (error) {
    console.error("Delete industry error:", error);
    return errorResponse(res, { message: "Failed to delete industry" });
  }
};

module.exports = {
  getAllIndustries,
  createIndustry,
  deleteIndustry,
};
