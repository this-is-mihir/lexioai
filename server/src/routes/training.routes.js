const express = require("express");
const router = express.Router({ mergeParams: true }); // botId parent se milega
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "true";
const noLimit = (req, res, next) => next();
const makeLimiter = (options) => (rateLimitDisabled ? noLimit : rateLimit(options));

const {
  trainWithURL,
  trainWithFile,
  trainWithQA,
  trainWithText,
  getTrainingSources,
  getTrainingStatus,
  deleteTrainingSource,
  updateQA,
} = require("../controllers/training.controller");

const {
  protect,
  requireEmailVerified,
} = require("../middleware/auth.middleware");

// ----------------------------------------------------------------
// MULTER — Memory storage (file buffer se kaam karenge)
// ----------------------------------------------------------------
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF, DOCX, and TXT files are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },
});

// ----------------------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------------------

// URL training — 10 per hour
const urlTrainLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many training requests. Please try again later.",
  },
});

// File upload — 20 per hour
const fileUploadLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many file uploads. Please try again later.",
  },
});

// ----------------------------------------------------------------
// ALL ROUTES — Login + Email verified zaroori hai
// ----------------------------------------------------------------
router.use(protect, requireEmailVerified);

// ----------------------------------------------------------------
// GET TRAINING DATA
// ----------------------------------------------------------------

// Get all training sources
router.get("/", getTrainingSources);

// Get training status
router.get("/status", getTrainingStatus);

// ----------------------------------------------------------------
// ADD TRAINING DATA
// ----------------------------------------------------------------

// Train with URL
router.post("/url", urlTrainLimiter, trainWithURL);

// Train with file
router.post(
  "/file",
  fileUploadLimiter,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File size cannot exceed ${process.env.MAX_FILE_SIZE_MB || 10}MB`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  trainWithFile
);

// Train with Q&A
router.post("/qa", trainWithQA);

// Train with plain text
router.post("/text", trainWithText);

// ----------------------------------------------------------------
// UPDATE TRAINING DATA
// ----------------------------------------------------------------

// Update Q&A
router.put("/qa/:sourceId", updateQA);

// ----------------------------------------------------------------
// DELETE TRAINING DATA
// ----------------------------------------------------------------

// Delete training source
router.delete("/:sourceId", deleteTrainingSource);

module.exports = router;