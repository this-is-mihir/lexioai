const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    // HTML body — supports {{userName}}, {{planName}}, {{message}}, {{appName}}, {{supportEmail}}, {{loginUrl}}
    htmlBody: { type: String, required: true, maxlength: 100000 },
    textBody: { type: String, maxlength: 10000 },
    usedVariables: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastPreviewedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ isDefault: 1 });

// Static method: render template with variables
emailTemplateSchema.statics.renderTemplate = function(htmlBody, variables) {
  var vars = variables || {};
  var defaults = {
    userName:     vars.userName     || "User",
    planName:     vars.planName     || "Free",
    message:      vars.message      || "",
    appName:      vars.appName      || "Lexioai",
    supportEmail: vars.supportEmail || "support@lexioai.com",
    loginUrl:     vars.loginUrl     || "https://app.lexioai.com",
  };
  var rendered = htmlBody;
  Object.entries(defaults).forEach(function(entry) {
    rendered = rendered.replace(new RegExp("{{" + entry[0] + "}}", "g"), entry[1]);
  });
  return rendered;
};

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);