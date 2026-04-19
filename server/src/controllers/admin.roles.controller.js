const Role = require("../models/Role.model");
const AdminUser = require("../models/AdminUser.model");
const AdminActivityLog = require("../models/AdminActivityLog.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response.utils");

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ================================================================
// @route   GET /api/v1/admin/roles
// @desc    Get all custom roles (SuperAdmin only)
// ================================================================
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("createdBy", "name email").sort({ createdAt: -1 });

    return successResponse(res, { message: "Roles fetched", data: { roles } });
  } catch (err) {
    console.error("Error fetching roles:", err);
    return errorResponse(res, "Failed to fetch roles");
  }
};

// ================================================================
// @route   POST /api/v1/admin/roles
// @desc    Create a new custom role (SuperAdmin only)
// ================================================================
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const superAdminId = req.admin._id;

    // Validation
    if (!name || !name.trim()) {
      return validationErrorResponse(res, "Role name is required");
    }

    if (!permissions || typeof permissions !== "object") {
      return validationErrorResponse(res, "Permissions object is required");
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existingRole) {
      return validationErrorResponse(res, "Role with this name already exists");
    }

    // Create role
    const role = await Role.create({
      name: name.trim(),
      description: description || "",
      permissions,
      createdBy: superAdminId,
    });

    // Log activity
    await AdminActivityLog.log({
      adminId: superAdminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "ROLE_CREATE",
      resourceType: "ROLE",
      resourceId: role._id.toString(),
      details: { name, description },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    return successResponse(res, { message: "Role created successfully", data: { role }, statusCode: 201 });
  } catch (err) {
    console.error("Error creating role:", err);
    return errorResponse(res, "Failed to create role");
  }
};

// ================================================================
// @route   PUT /api/v1/admin/roles/:roleId
// @desc    Update a custom role (SuperAdmin only)
// ================================================================
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;
    const superAdminId = req.admin._id;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      return notFoundResponse(res, "Role not found");
    }

    // Check if name is being changed and if it already exists
    if (name && name.trim() !== role.name) {
      const existingRole = await Role.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
      if (existingRole) {
        return validationErrorResponse(res, "Role with this name already exists");
      }
    }

    // Store old data for logging
    const oldData = {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    };

    // Update role
    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description || "";
    if (permissions) role.permissions = permissions;

    await role.save();

    // Log activity
    await AdminActivityLog.log({
      adminId: superAdminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "ROLE_UPDATE",
      resourceType: "ROLE",
      resourceId: roleId,
      details: {
        oldData,
        newData: { name: role.name, description: role.description },
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    return successResponse(res, { message: "Role updated successfully", data: { role } });
  } catch (err) {
    console.error("Error updating role:", err);
    return errorResponse(res, "Failed to update role");
  }
};

// ================================================================
// @route   DELETE /api/v1/admin/roles/:roleId
// @desc    Delete a custom role (SuperAdmin only)
// ================================================================
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const superAdminId = req.admin._id;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      return notFoundResponse(res, "Role not found");
    }

    // Check if any admins are using this role
    const adminsWithRole = await AdminUser.countDocuments({ role: roleId });
    if (adminsWithRole > 0) {
      return validationErrorResponse(res, `Cannot delete role. ${adminsWithRole} admin(s) are using it.`);
    }

    // Delete role
    await Role.deleteOne({ _id: roleId });

    // Log activity
    await AdminActivityLog.log({
      adminId: superAdminId,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: "ROLE_DELETE",
      resourceType: "ROLE",
      resourceId: roleId,
      details: { name: role.name },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    return successResponse(res, { message: "Role deleted successfully" });
  } catch (err) {
    console.error("Error deleting role:", err);
    return errorResponse(res, "Failed to delete role");
  }
};

// ================================================================
// Export
// ================================================================
module.exports = {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
};
