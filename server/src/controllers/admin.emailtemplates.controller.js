const EmailTemplate = require("../models/EmailTemplate.model");
const AuditLog = require("../models/AuditLog.model");
const { successResponse, errorResponse } = require("../utils/response.utils");

const SUPPORTED_VARIABLES = [
  "{{userName}}",
  "{{planName}}",
  "{{message}}",
  "{{appName}}",
  "{{supportEmail}}",
  "{{loginUrl}}",
];

function extractUsedVariables(html) {
  if (!html) return [];
  return SUPPORTED_VARIABLES.filter((v) => html.includes(v));
}

function renderVars(str, vars) {
  if (!str) return "";
  const defaults = {
    userName: (vars && vars.userName) || "User",
    planName: (vars && vars.planName) || "Free",
    message: (vars && vars.message) || "",
    appName: (vars && vars.appName) || "Lexioai",
    supportEmail: (vars && vars.supportEmail) || "support@lexioai.com",
    loginUrl: (vars && vars.loginUrl) || "https://app.lexioai.com",
  };
  let out = str;
  Object.entries(defaults).forEach(function (entry) {
    out = out.replace(new RegExp("{{" + entry[0] + "}}", "g"), entry[1]);
  });
  return out;
}

// GET /admin/email-templates
const getAllTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find();

   return res.json({
  success: true,
  data: templates
});
  } catch (err) {
    console.error("GET TEMPLATES ERROR:", err);
    return errorResponse(res, err.message, 500);
  }
};

// GET /admin/email-templates/:id
const getTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).populate(
      "createdBy",
      "name",
    );
    if (!template) return errorResponse(res, "Template not found", 404);
    return successResponse(res, "Template fetched", { template });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /admin/email-templates
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      htmlBody,
      textBody,
      isDefault,
      isActive,
    } = req.body;
    if (!name || !subject || !htmlBody) {
      return errorResponse(
        res,
        "Name, subject, and HTML body are required",
        400,
      );
    }
    if (isDefault) {
      await EmailTemplate.updateMany({ isDefault: true }, { isDefault: false });
    }
    const template = await EmailTemplate.create({
      name: name.trim(),
      description: (description && description.trim()) || "",
      subject: subject.trim(),
      htmlBody,
      textBody: textBody || "",
      usedVariables: extractUsedVariables(htmlBody),
      isDefault: !!isDefault,
      isActive: isActive !== false,
      createdBy: req.admin._id,
    });
    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "CREATE",
      module: "announcements",
      description: `Created email template "${name}"`,
      targetType: "announcement",
      targetId: template._id,
      targetName: name,
    });
    return successResponse(res, "Template created!", { template }, 201);
  } catch (err) {
    console.error("CREATE TEMPLATE ERROR:", err); 
    if (err.code === 11000)
      return errorResponse(res, "Template name already exists", 400);
     console.error("FULL ERROR:", err); 
    return errorResponse(res, err.message, 500);
  }
};

// PUT /admin/email-templates/:id
const updateTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return errorResponse(res, "Template not found", 404);
    const {
      name,
      description,
      subject,
      htmlBody,
      textBody,
      isDefault,
      isActive,
    } = req.body;
    if (isDefault && !template.isDefault) {
      await EmailTemplate.updateMany(
        { _id: { $ne: template._id }, isDefault: true },
        { isDefault: false },
      );
    }
    if (name !== undefined) template.name = name.trim();
    if (description !== undefined)
      template.description = (description && description.trim()) || "";
    if (subject !== undefined) template.subject = subject.trim();
    if (htmlBody !== undefined) {
      template.htmlBody = htmlBody;
      template.usedVariables = extractUsedVariables(htmlBody);
    }
    if (textBody !== undefined) template.textBody = textBody || "";
    if (isDefault !== undefined) template.isDefault = !!isDefault;
    if (isActive !== undefined) template.isActive = !!isActive;
    template.updatedBy = req.admin._id;
    await template.save();
    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "UPDATE",
      module: "announcements",
      description: `Updated email template "${template.name}"`,
      targetType: "announcements",
      targetId: template._id,
      targetName: template.name,
    });
    return successResponse(res, "Template updated!", { template });
  } catch (err) {
    if (err.code === 11000)
      return errorResponse(res, "Template name already exists", 400);
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /admin/email-templates/:id
const deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return errorResponse(res, "Template not found", 404);
    if (template.isDefault) {
      return errorResponse(
        res,
        "Cannot delete the default template. Set another as default first.",
        400,
      );
    }
    await template.deleteOne();
    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: req.ip,
      action: "DELETE",
      module: "announcements",
      description: `Deleted email template "${template.name}"`,
      targetType: "announcements",
      targetId: template._id,
      targetName: template.name,
    });
    return successResponse(res, "Template deleted!");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /admin/email-templates/:id/preview
const previewTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return errorResponse(res, "Template not found", 404);
    const dummyVars = {
      userName: "Mihir Patel",
      planName: "Starter",
      message:
        "This is a sample announcement message to preview how your template looks.",
      appName: "Lexioai",
      supportEmail: "support@lexioai.com",
      loginUrl: "https://app.lexioai.com",
    };
    const rendered = renderVars(template.htmlBody, dummyVars);
    template.lastPreviewedAt = new Date();
    await template.save();
    return successResponse(res, "Preview rendered", {
      html: rendered,
      subject: renderVars(template.subject, dummyVars),
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /admin/email-templates/preview-raw
const previewRaw = async (req, res) => {
  try {
    const { htmlBody, subject } = req.body;
    if (!htmlBody) return errorResponse(res, "htmlBody is required", 400);
    const dummyVars = {
      userName: "Mihir Patel",
      planName: "Starter",
      message:
        "This is a sample announcement message to preview how your template looks.",
      appName: "Lexioai",
      supportEmail: "support@lexioai.com",
      loginUrl: "https://app.lexioai.com",
    };
    return successResponse(res, "Preview rendered", {
      html: renderVars(htmlBody, dummyVars),
      subject: renderVars(subject || "", dummyVars),
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /admin/email-templates/:id/set-default
const setDefaultTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return errorResponse(res, "Template not found", 404);
    await EmailTemplate.updateMany({}, { isDefault: false });
    template.isDefault = true;
    await template.save();
    return successResponse(res, `"${template.name}" set as default template!`, {
      template,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  previewRaw,
  setDefaultTemplate,
};
