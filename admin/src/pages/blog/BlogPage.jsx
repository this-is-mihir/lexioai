import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Search, Trash2, X, Loader2, Check,
  RefreshCw, Eye, ChevronDown, ChevronLeft, ChevronRight,
  Upload, Download, Filter, Edit2, AlertTriangle, Tag,
  Calendar, User, Eye as EyeIcon,
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";
import { hasPermission } from "../../utils/permissions";
import { uploadImageToCloudinary } from "../../utils/cloudinaryUpload";
import { RichTextEditor } from "../settings/RichTextEditor";

// ─── CONSTANTS ──────────────────────────────────────────────────

const CATEGORIES = [
  { value: "tutorial", label: "Tutorial" },
  { value: "news", label: "News" },
  { value: "tips", label: "Tips" },
  { value: "case_study", label: "Case Study" },
  { value: "update", label: "Update" },
];

const PREDEFINED_TAGS = [
  "AI", "Chatbot", "Tutorial", "Tips", "News", "Feature",
  "Update", "Guide", "Best Practice", "Integration",
];

const COL_STYLE = {
  display: "grid",
  gridTemplateColumns: "minmax(200px, 2fr) minmax(120px, 1fr) 90px 100px 100px 80px",
  alignItems: "center",
  gap: "12px",
};

// ─── HELPERS ─────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Badge = ({ className, children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const StatusBadge = ({ published }) => (
  <Badge className={published
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : "text-gray-400 bg-gray-400/10 border-gray-400/20"
  }>
    {published ? "Published" : "Draft"}
  </Badge>
);

const CategoryBadge = ({ category }) => {
  const colors = {
    tutorial: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    news: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    tips: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    case_study: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    update: "text-green-400 bg-green-400/10 border-green-400/20",
  };
  return (
    <Badge className={colors[category] || "text-[var(--text-muted)] bg-[var(--bg-hover)] border-[var(--border)]"}>
      {CATEGORIES.find(c => c.value === category)?.label || category}
    </Badge>
  );
};

// ─── CUSTOM SELECT ───────────────────────────────────────────────

function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "", disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="input text-sm h-fit py-2 w-full flex items-center justify-between gap-2 text-left disabled:opacity-50"
      >
        <span className={selected ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
          {selected ? selected.label : placeholder}
        </span>
        {disabled
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)] shrink-0" />
          : <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[999] left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  opt.value === value
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-[var(--text)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span className={opt.value === value ? "" : "ml-5"}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BLOG MODAL (CREATE/EDIT) ────────────────────────────────────

function BlogModal({ post, onClose, onSave, canCreate, canEdit }) {
  const [form, setForm] = useState(post || {
    title: "", slug: "", excerpt: "", content: "", category: "tutorial",
    tags: [], author: "Lexioai Team", isPublished: false,
    coverImage: "", seo: { metaTitle: "", metaDescription: "", keywords: [] },
    tagInput: "", keywordInput: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ Load content from API while keeping initial form data
  useEffect(() => {
    if (post?._id) {
      adminApi.get(`/blog/${post._id}`)
        .then(res => {
          const fullPost = res.data.data.post; // ← FIXED: API returns { data: { post: ... } }
          // Merge: Keep initial data but add content from API
          setForm(prev => ({
            ...prev,
            ...fullPost,
          }));
        })
        .catch(err => console.error("Failed to load post:", err));
    }
  }, [post?._id]);

  // Check if user has permission to perform this action
  const canSave = post?._id ? canEdit : canCreate;

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev };
      if (field === "title" && !post) {
        // Auto-generate slug from title
        const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        next.slug = slug;
      }
      next[field] = value;
      return next;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    if (file.size > maxSize) {
      toast.error(`File size: ${fileSizeMB}MB | Maximum allowed: 5MB`);
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed (JPG, PNG, WebP, GIF)");
      return;
    }

    setUploading(true);
    try {
      // Upload using generic Cloudinary upload utility (same as Settings)
      const url = await uploadImageToCloudinary(file, 'blog');
      
      if (url) {
        handleChange("coverImage", url);
        toast.success(`Image uploaded! (${fileSizeMB}MB)`);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err) {
      const errorMsg = err.message || "Upload failed";
      console.error("Upload error:", errorMsg);
      toast.error(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddTag = () => {
    if (form.tagInput?.trim() && form.tags?.length < 10) {
      setForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), prev.tagInput.trim()],
        tagInput: "",
      }));
    }
  };

  const handleRemoveTag = (index) => {
    setForm(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddKeyword = () => {
    if (form.keywordInput?.trim() && form.seo?.keywords?.length < 5) {
      setForm(prev => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: [...(prev.seo?.keywords || []), prev.keywordInput.trim()],
        },
        keywordInput: "",
      }));
    }
  };

  const handleRemoveKeyword = (index) => {
    setForm(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        keywords: (prev.seo?.keywords || []).filter((_, i) => i !== index),
      },
    }));
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title, slug: form.slug, excerpt: form.excerpt,
        content: form.content, category: form.category, tags: form.tags,
        author: form.author, isPublished: form.isPublished,
        coverImage: form.coverImage,
        seo: form.seo,
      };
      if (post?._id) {
        return adminApi.put(`/blog/${post._id}`, payload);
      } else {
        return adminApi.post("/blog", payload);
      }
    },
    onSuccess: () => {
      toast.success(post ? "Post updated!" : "Post created!");
      onSave();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to save"),
  });

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 h-full z-[201] w-full max-w-3xl bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-hover)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">
            {post ? "Edit Post" : "Create Blog Post"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title & Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Post title..."
                className="input w-full text-sm h-fit py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                placeholder="auto-generated-from-title"
                className="input w-full text-sm h-fit py-2 font-mono"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Excerpt (Short Description)</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => handleChange("excerpt", e.target.value)}
              placeholder="Brief summary of the post..."
              rows={2}
              className="input w-full text-sm resize-none"
            />
          </div>

          {/* Content (Rich Text) */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Content *</label>
            <RichTextEditor
              value={form.content || ""}
              onChange={(html) => handleChange("content", html)}
              placeholder="Write your blog content with headings, links, and formatting..."
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              Use editor tools for bold, italic, headings (H1/H2/H3), font size, links, lists, alignment, and more.
            </p>
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Cover Image</label>
            <p className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <span>📸 Max 5MB | Formats: JPG, PNG, WebP, GIF</span>
            </p>
            {form.coverImage && (
              <div className="mb-2 relative rounded-lg overflow-hidden border border-[var(--border)]">
                <img src={form.coverImage} alt="Cover" className="w-full h-32 object-cover" />
                <button
                  onClick={() => handleChange("coverImage", "")}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded hover:bg-red-600"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary text-xs gap-1 flex-1"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                type="text"
                value={form.coverImage}
                onChange={(e) => handleChange("coverImage", e.target.value)}
                placeholder="Or paste image URL..."
                className="input flex-1 text-xs h-fit py-2"
              />
            </div>
          </div>

          {/* Category & Author */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Category</label>
              <CustomSelect
                value={form.category}
                onChange={(v) => handleChange("category", v)}
                options={CATEGORIES}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Author</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => handleChange("author", e.target.value)}
                className="input w-full text-sm h-fit py-2"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Tags (Max 10)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={form.tagInput}
                onChange={(e) => setForm(prev => ({ ...prev, tagInput: e.target.value }))}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className="input flex-1 text-sm h-fit py-2"
              />
              <button onClick={handleAddTag} className="btn-primary px-3 text-sm">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags?.map((tag, i) => (
                <Badge key={i} className="text-primary-400 bg-primary-400/10 border-primary-400/20 gap-1.5">
                  {tag}
                  <button onClick={() => handleRemoveTag(i)} className="hover:text-primary-300">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {PREDEFINED_TAGS.filter(t => !form.tags?.includes(t)).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleAddTag && setForm(prev => ({ ...prev, tagInput: tag })) && handleAddTag()}
                  className="text-xs px-2 py-1 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg)] transition-colors text-[var(--text-muted)]"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">SEO Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Meta Title</label>
                <input
                  type="text"
                  value={form.seo?.metaTitle || ""}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    seo: { ...prev.seo, metaTitle: e.target.value }
                  }))}
                  placeholder="For search engines..."
                  className="input w-full text-sm h-fit py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Meta Description</label>
                <textarea
                  value={form.seo?.metaDescription || ""}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    seo: { ...prev.seo, metaDescription: e.target.value }
                  }))}
                  placeholder="Brief description for search results..."
                  rows={2}
                  className="input w-full text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] mb-2 block">Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={form.keywordInput}
                    onChange={(e) => setForm(prev => ({ ...prev, keywordInput: e.target.value }))}
                    onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
                    placeholder="Add keyword..."
                    className="input flex-1 text-sm h-fit py-2"
                  />
                  <button onClick={handleAddKeyword} className="btn-primary px-3 text-sm">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.seo?.keywords?.map((kw, i) => (
                    <Badge key={i} className="text-cyan-400 bg-cyan-400/10 border-cyan-400/20 gap-1.5">
                      {kw}
                      <button onClick={() => handleRemoveKeyword(i)} className="hover:text-cyan-300">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Publish */}
          <div className="border-t border-[var(--border)] pt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="publish"
              checked={form.isPublished}
              onChange={(e) => handleChange("isPublished", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="publish" className="text-sm text-[var(--text)] cursor-pointer">
              Publish immediately (uncheck to save as draft)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-hover)] flex items-center gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('Save clicked:', { canSave, title: form.title, content: form.content, isPending: saveMut.isPending });
              if (!form.title) {
                toast.error('Title is required');
                return;
              }
              if (!form.content) {
                toast.error('Content is required');
                return;
              }
              if (!canSave) {
                toast.error(post ? 'No edit permission' : 'No create permission');
                return;
              }
              saveMut.mutate();
            }}
            disabled={!form.title || !form.content || saveMut.isPending}
            className="btn-primary px-4 py-2 text-sm gap-2 disabled:opacity-50"
            title=""
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {post ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </>,
    document.body
  );
}

// ─── TABLE HEADER ────────────────────────────────────────────────

function BlogTableHeader() {
  const th = "text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider";
  return (
    <div style={COL_STYLE} className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
      <span className={th}>Title</span>
      <span className={th}>Category</span>
      <span className={th}>Status</span>
      <span className={th}>Author</span>
      <span className={th}>Views</span>
      <span className={`${th} text-right`}>Actions</span>
    </div>
  );
}

function BlogRow({ post, onEdit, onDelete, onPublish, canCreate, canEdit, canDelete }) {
  return (
    <div
      style={COL_STYLE}
      className="px-4 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors group items-center cursor-pointer"
    >
      {/* Title */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">{post.title}</p>
        <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">/{post.slug}</p>
      </div>

      {/* Category */}
      <div><CategoryBadge category={post.category} /></div>

      {/* Status */}
      <div><StatusBadge published={post.isPublished} /></div>

      {/* Author */}
      <div className="text-sm text-[var(--text-muted)] truncate">{post.author}</div>

      {/* Views */}
      <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
        <EyeIcon className="w-3.5 h-3.5" />
        {post.views || 0}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); if (canEdit) onPublish(post._id, post.isPublished); }}
          disabled={!canEdit}
          className="text-xs px-2 py-1.5 rounded bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={canEdit ? (post.isPublished ? "Unpublish" : "Publish") : "No permission"}
        >
          {post.isPublished ? "Unpub" : "Publish"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (canEdit) onEdit(post); }}
          disabled={!canEdit}
          className="text-xs px-2 py-1.5 rounded bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={canEdit ? "Edit post" : "No permission"}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (canDelete) onDelete(post._id); }}
          disabled={!canDelete}
          className="text-xs px-2 py-1.5 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={canDelete ? "Delete post" : "No permission"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function BlogPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();
  const [search, setSearch] = useState("");
  const [filterPublished, setFilterPublished] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Permission checks
  const canView = hasPermission(admin, "blog", "view");
  const canCreate = hasPermission(admin, "blog", "create");
  const canEdit = hasPermission(admin, "blog", "edit");
  const canDelete = hasPermission(admin, "blog", "delete");

  // Fetch posts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-blog", filterPublished, filterCategory, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page, limit: 20 });
      if (filterPublished !== "all") p.set("published", filterPublished === "published");
      if (filterCategory !== "all") p.set("category", filterCategory);
      const r = await adminApi.get(`/blog?${p}`);
      return r.data.data;
    },
  });

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const filteredPosts = search.trim()
    ? posts.filter(p => 
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
        p.slug?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  // Mutations
  const deleteMut = useMutation({
    mutationFn: (postId) => {
      if (!canDelete) {
        return Promise.reject(new Error("You don't have permission to delete blog posts"));
      }
      return adminApi.delete(`/blog/${postId}`);
    },
    onSuccess: () => {
      toast.success("Post deleted!");
      queryClient.invalidateQueries(["admin-blog"]);
      setDeleteConfirm(null);
    },
    onError: (e) => {
      if (e.message === "You don't have permission to delete blog posts") {
        toast.error(e.message);
      } else {
        toast.error(e?.response?.data?.message || "Failed to delete");
      }
    },
  });

  const publishMut = useMutation({
    mutationFn: ({ postId, currentState }) => {
      if (!canEdit) {
        return Promise.reject(new Error("You don't have permission to edit blog posts"));
      }
      return adminApi.patch(`/blog/${postId}/publish`, { isPublished: !currentState });
    },
    onSuccess: () => {
      toast.success("Status updated!");
      queryClient.invalidateQueries(["admin-blog"]);
    },
    onError: (e) => {
      if (e.message === "You don't have permission to edit blog posts") {
        toast.error(e.message);
      } else {
        toast.error(e?.response?.data?.message || "Failed to update");
      }
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: () => {
      if (!canDelete) {
        return Promise.reject(new Error("You don't have permission to delete blog posts"));
      }
      return adminApi.post("/blog/bulk-delete", { ids: selectedIds });
    },
    onSuccess: () => {
      toast.success("Posts deleted!");
      queryClient.invalidateQueries(["admin-blog"]);
      setSelectedIds([]);
    },
    onError: (e) => {
      if (e.message === "You don't have permission to delete blog posts") {
        toast.error(e.message);
      } else {
        toast.error(e?.response?.data?.message || "Failed to delete");
      }
    },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      if (!canView) {
        return Promise.reject(new Error("You don't have permission to view blog posts"));
      }
      const r = await adminApi.get("/blog?limit=10000");
      return r.data.data?.posts || [];
    },
    onSuccess: (posts) => {
      const header = ["Title", "Slug", "Category", "Author", "Status", "Views", "Published At", "Created"];
      const rows = posts.map(p => [
        p.title,
        p.slug,
        p.category,
        p.author,
        p.isPublished ? "Published" : "Draft",
        p.views,
        p.publishedAt ? new Date(p.publishedAt).toLocaleString("en-IN") : "—",
        new Date(p.createdAt).toLocaleString("en-IN"),
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blog-posts-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    },
    onError: (e) => {
      if (e.message === "You don't have permission to view blog posts") {
        toast.error(e.message);
      } else {
        toast.error(e?.response?.data?.message || "Export failed");
      }
    },
  });

  useEffect(() => { setPage(1); }, [filterPublished, filterCategory, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Blog Posts</h1>
          <p className="text-sm text-[var(--text-muted)]">Create and manage blog content</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn-secondary gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => { if (!canView) { toast.error("No permission to export"); return; } exportMut.mutate(); }}
            disabled={exportMut.isPending || !canView}
            className="btn-secondary gap-2 disabled:opacity-50"
            title={!canView ? "No permission to view blog posts" : ""}
          >
            <Download className="w-4 h-4" />
            {exportMut.isPending ? "Exporting..." : "Export"}
          </button>
          <button
            onClick={() => { if (!canCreate) { toast.error("No permission to create blog posts"); return; } setEditingPost({}); }}
            disabled={!canCreate}
            className="btn-primary gap-2 disabled:opacity-50"
            title={!canCreate ? "No permission to create blog posts" : ""}
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative" style={{ flex: "1 1 240px" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, slug, excerpt..."
              className="input text-sm pl-9 h-fit py-2 w-full"
            />
          </div>

          <div className="w-32">
            <CustomSelect
              value={filterPublished}
              onChange={setFilterPublished}
              options={[
                { value: "all", label: "All Status" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Drafts" },
              ]}
            />
          </div>

          <div className="w-32">
            <CustomSelect
              value={filterCategory}
              onChange={setFilterCategory}
              options={[{ value: "all", label: "All Categories" }, ...CATEGORIES]}
            />
          </div>

          {(filterPublished !== "all" || filterCategory !== "all") && (
            <button
              onClick={() => { setFilterPublished("all"); setFilterCategory("all"); }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-400/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={() => { if (!canDelete) { toast.error("No permission to delete blog posts"); return; } bulkDeleteMut.mutate(); }}
              disabled={bulkDeleteMut.isPending || !canDelete}
              className="btn-danger text-xs gap-1 disabled:opacity-50"
              title={!canDelete ? "No permission to delete blog posts" : ""}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selectedIds.length}
            </button>
          )}

          <div className="ml-auto text-xs text-[var(--text-muted)]">
            {total} post{total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <BlogTableHeader />

          {/* Skeleton */}
          {isLoading && [...Array(5)].map((_, i) => (
            <div key={i} style={COL_STYLE} className="px-4 py-4 border-b border-[var(--border)] animate-pulse">
              <div className="space-y-1.5">
                <div className="h-3.5 w-40 bg-[var(--bg-hover)] rounded" />
                <div className="h-2.5 w-24 bg-[var(--bg-hover)] rounded" />
              </div>
              <div className="h-5 w-20 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-5 w-20 bg-[var(--bg-hover)] rounded-full" />
              <div className="h-4 w-24 bg-[var(--bg-hover)] rounded" />
              <div className="h-4 w-12 bg-[var(--bg-hover)] rounded" />
              <div className="flex gap-1.5 ml-auto">
                <div className="h-7 w-14 bg-[var(--bg-hover)] rounded" />
                <div className="h-7 w-7 bg-[var(--bg-hover)] rounded" />
              </div>
            </div>
          ))}

          {/* Empty */}
          {!isLoading && filteredPosts.length === 0 && (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-[var(--text)]">No posts found</p>
              <p className="text-xs mt-1">Start creating blog posts to grow your audience</p>
            </div>
          )}

          {/* Rows */}
          {!isLoading && filteredPosts.map(post => (
            <BlogRow
              key={post._id}
              post={post}
              onEdit={setEditingPost}
              onDelete={setDeleteConfirm}
              onPublish={(id, state) => publishMut.mutate({ postId: id, currentState: state })}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-hover)]">
            <span className="text-xs text-[var(--text-muted)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingPost !== null && (
          <BlogModal
            post={editingPost._id ? editingPost : null}
            onClose={() => setEditingPost(null)}
            onSave={() => {
              setEditingPost(null);
              queryClient.invalidateQueries(["admin-blog"]);
            }}
            canCreate={canCreate}
            canEdit={canEdit}
          />
          
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[var(--text)]">Delete Post?</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary px-4 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => deleteMut.mutate(deleteConfirm)}
                  disabled={deleteMut.isPending}
                  className="btn-danger px-4 py-2 text-sm"
                >
                  {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
