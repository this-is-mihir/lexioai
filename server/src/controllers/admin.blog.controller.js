const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const AuditLog = require("../models/AuditLog.model");
const PlatformSettings = require("../models/PlatformSettings.model");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response.utils");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

// ----------------------------------------------------------------
// Blog Post Schema — PlatformSettings ke andar store karenge
// ----------------------------------------------------------------
const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, trim: true, default: null },
    content: { type: String, required: true },
    coverImage: { type: String, default: null },
    tags: { type: [String], default: [] },
    category: {
      type: String,
      enum: ["tutorial", "news", "tips", "case_study", "update"],
      default: "tutorial",
    },
    author: { type: String, default: "Lexioai Team" },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    seo: {
      metaTitle: { type: String, default: null },
      metaDescription: { type: String, default: null },
      keywords: { type: [String], default: [] },
    },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/blog
// ----------------------------------------------------------------
const getAllBlogPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.published === "true") filter.isPublished = true;
    if (req.query.published === "false") filter.isPublished = false;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { excerpt: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-content"),
      BlogPost.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: { posts, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get all blog posts error:", error);
    return errorResponse(res, { message: "Failed to fetch blog posts." });
  }
};

// ----------------------------------------------------------------
// @route   GET /api/v1/admin/blog/:postId
// ----------------------------------------------------------------
const getBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.postId);
    if (!post) return notFoundResponse(res, "Blog post not found");
    return successResponse(res, { data: { post } });
  } catch (error) {
    return errorResponse(res, { message: "Failed to fetch blog post." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/blog
// ----------------------------------------------------------------
const createBlogPost = async (req, res) => {
  try {
    const { title, slug, excerpt, content, tags, category, author, isPublished, seo, coverImage } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return validationErrorResponse(res, [
        { field: "general", message: "Title and content are required" },
      ]);
    }

    // Auto generate slug if not provided
    const postSlug = slug?.trim() ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await BlogPost.findOne({ slug: postSlug });
    if (existing) {
      return errorResponse(res, { message: "A post with this slug already exists.", statusCode: 409 });
    }

    const post = new BlogPost({
      title: title.trim(),
      slug: postSlug,
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverImage: coverImage || null,
      tags: tags || [],
      category: category || "tutorial",
      author: author || "Lexioai Team",
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
      seo: seo || {},
    });

    await post.save();

    await AuditLog.log({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminRole: req.admin.role,
      adminIP: getClientIP(req),
      action: "BLOG_POST_CREATED",
      module: "settings",
      description: `Blog post created: "${title}"`,
    });

    return successResponse(res, {
      message: "Blog post created successfully!",
      statusCode: 201,
      data: { post },
    });
  } catch (error) {
    console.error("Create blog post error:", error);
    return errorResponse(res, { message: "Failed to create blog post." });
  }
};

// ----------------------------------------------------------------
// @route   PUT /api/v1/admin/blog/:postId
// ----------------------------------------------------------------
const updateBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.postId);
    if (!post) return notFoundResponse(res, "Blog post not found");

    const fields = ["title", "excerpt", "content", "coverImage", "tags", "category", "author", "seo"];
    fields.forEach((f) => { if (req.body[f] !== undefined) post[f] = req.body[f]; });

    if (req.body.isPublished !== undefined) {
      post.isPublished = req.body.isPublished;
      if (req.body.isPublished && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    await post.save();

    return successResponse(res, {
      message: "Blog post updated successfully!",
      data: { post },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to update blog post." });
  }
};

// ----------------------------------------------------------------
// @route   DELETE /api/v1/admin/blog/:postId
// ----------------------------------------------------------------
const deleteBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.postId);
    if (!post) return notFoundResponse(res, "Blog post not found");

    return successResponse(res, { message: "Blog post deleted successfully." });
  } catch (error) {
    return errorResponse(res, { message: "Failed to delete blog post." });
  }
};

// ----------------------------------------------------------------
// @route   PATCH /api/v1/admin/blog/:postId/publish
// ----------------------------------------------------------------
const togglePublish = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.postId);
    if (!post) return notFoundResponse(res, "Blog post not found");

    post.isPublished = !post.isPublished;
    if (post.isPublished && !post.publishedAt) {
      post.publishedAt = new Date();
    }
    await post.save();

    return successResponse(res, {
      message: `Post ${post.isPublished ? "published" : "unpublished"} successfully.`,
      data: { isPublished: post.isPublished },
    });
  } catch (error) {
    return errorResponse(res, { message: "Failed to toggle publish status." });
  }
};

// ----------------------------------------------------------------
// @route   POST /api/v1/admin/blog/upload-image
// ----------------------------------------------------------------
const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return validationErrorResponse(res, [
        { field: "file", message: "No file provided" },
      ]);
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      const sizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      return errorResponse(res, {
        message: `File size: ${sizeMB}MB | Maximum allowed: 5MB`,
        statusCode: 400,
      });
    }

    // Check if file is image
    if (!req.file.mimetype.startsWith("image/")) {
      return errorResponse(res, {
        message: "Only image files allowed (JPG, PNG, WebP, GIF)",
        statusCode: 400,
      });
    }

    // Upload to Cloudinary using buffer
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${process.env.CLOUDINARY_FOLDER}/blog`,
          resource_type: "auto",
          max_file_size: 5242880, // 5MB in bytes
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return resolve(
              errorResponse(res, {
                message: `Upload failed: ${error.message}`,
                statusCode: 400,
              })
            );
          }

          if (!result?.secure_url) {
            return resolve(
              errorResponse(res, {
                message: "Upload completed but no image URL received",
                statusCode: 400,
              })
            );
          }

          // Log audit
          AuditLog.log({
            adminId: req.admin._id,
            adminName: req.admin.name,
            adminRole: req.admin.role,
            adminIP: getClientIP(req),
            action: "BLOG_IMAGE_UPLOADED",
            module: "blog",
            description: `Blog image uploaded: ${result.public_id}`,
          }).catch(console.error);

          return resolve(
            successResponse(res, {
              message: "Image uploaded successfully!",
              statusCode: 200,
              data: {
                url: result.secure_url,
                publicId: result.public_id,
                size: result.bytes,
              },
            })
          );
        }
      );

      uploadStream.on("error", (error) => {
        console.error("Upload stream error:", error);
        resolve(
          errorResponse(res, {
            message: `Upload error: ${error.message}`,
            statusCode: 400,
          })
        );
      });

      // Convert buffer to stream and pipe to uploadStream
      const readableStream = Readable.from(req.file.buffer);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Upload blog image error:", error);
    return errorResponse(res, {
      message: `Upload error: ${error.message}`,
      statusCode: 400,
    });
  }
};

module.exports = {
  getAllBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  togglePublish,
  uploadBlogImage,
};