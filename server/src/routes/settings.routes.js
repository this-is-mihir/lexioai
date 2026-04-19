const express = require("express");
const router = express.Router();
const { getUploadSignature } = require("../controllers/cloudinary.controller");

// ================================================================
// SETTINGS ROUTES — Shared, auth not required
// ================================================================

/**
 * POST /api/v1/settings/cloudinary-signature
 * Get Cloudinary upload signature for client-side uploads
 * Used by: Profile avatar, Support tickets, User uploads
 */
router.post("/cloudinary-signature", getUploadSignature);

module.exports = router;
