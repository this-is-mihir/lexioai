const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  getAllIndustries,
  createIndustry,
  deleteIndustry,
} = require("../controllers/industry.controller");

const router = express.Router();

// Public routes
router.get("/", getAllIndustries);

// Protected routes (requires authentication)
router.post("/", protect, createIndustry);
router.delete("/:id", protect, deleteIndustry);

module.exports = router;
