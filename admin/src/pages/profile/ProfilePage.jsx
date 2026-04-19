import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, Upload, Eye, EyeOff, Copy, Check, AlertTriangle,
  Smartphone, LogOut, X, Loader2, Mail, Key, QrCode, Shield,
  Image as ImageIcon, Calendar, Briefcase, Zap
} from "lucide-react";
import adminApi from "../../api/axios";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";

// ─── PROFILE PAGE ───────────────────────────────────────────────

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
  });

  // Modals
  const [modals, setModals] = useState({
    changePassword: false,
    passwordReset: false,
    setup2FA: false,
    disable2FA: false,
    logoutAll: false,
  });

  // Fetch current profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await adminApi.get("/profile");
      return res.data.data.admin;
    },
    onSuccess: (data) => {
      setFormData({ name: data.name, email: data.email });
      setAvatarError(false); // Reset avatar error on success
    },
  });

  const currentAdmin = profileData || admin;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[var(--text)]">Profile Settings</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage your admin account</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
          {["profile", "security"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition-colors capitalize flex items-center gap-2 border-b-2 ${
                activeTab === tab
                  ? "text-primary-500 border-primary-500"
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--text)]"
              }`}
            >
              {tab === "profile" && <User className="w-4 h-4" />}
              {tab === "security" && <Lock className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {activeTab === "profile" && (
            <ProfileTab
              admin={currentAdmin}
              isLoading={isLoading}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {activeTab === "security" && (
            <SecurityTab modals={modals} setModals={setModals} admin={currentAdmin} />
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <PasswordChangeModal
        open={modals.changePassword}
        onClose={() => setModals((p) => ({ ...p, changePassword: false }))}
      />
      <PasswordResetModal
        open={modals.passwordReset}
        onClose={() => setModals((p) => ({ ...p, passwordReset: false }))}
      />
      <Setup2FAModal
        open={modals.setup2FA}
        onClose={() => setModals((p) => ({ ...p, setup2FA: false }))}
      />
      <Disable2FAModal
        open={modals.disable2FA}
        onClose={() => setModals((p) => ({ ...p, disable2FA: false }))}
      />
      <LogoutAllModal
        open={modals.logoutAll}
        onClose={() => setModals((p) => ({ ...p, logoutAll: false }))}
      />
    </div>
  );
}

// ─── PROFILE TAB ────────────────────────────────────────────────

function ProfileTab({ admin, isLoading, isEditing, setIsEditing, formData, setFormData }) {
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [displayAvatar, setDisplayAvatar] = useState(admin?.avatar || null);
  const fileInputRef = useRef(null);
  const { updateAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  // Update display avatar when admin data changes
  useEffect(() => {
    if (admin?.avatar) {
      setDisplayAvatar(admin.avatar);
      setAvatarError(false);
    }
  }, [admin?.avatar]);

  const updateMut = useMutation({
    mutationFn: async () => {
      const res = await adminApi.put("/profile", {
        name: formData.name,
        email: formData.email,
      });
      return res.data.data.admin;
    },
    onSuccess: (data) => {
      updateAdmin(data);
      setIsEditing(false);
      toast.success("Profile updated!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Update failed");
    },
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB size limit
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      // Send file directly to backend - backend handles Cloudinary upload
      // This avoids server time sync issues with Cloudinary signed requests
      const formData = new FormData();
      formData.append("avatar", file);

      console.log("Uploading avatar to backend...");
      const res = await adminApi.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Backend already deleted old image and uploaded new one
      const avatarUrl = res.data.data.avatar;

      // Update store with new avatar
      const updatedAdmin = { ...admin, avatar: avatarUrl };
      updateAdmin(updatedAdmin);
      setDisplayAvatar(avatarUrl);
      setAvatarError(false);

      // Invalidate query to refetch latest profile data
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });

      toast.success("Avatar updated! Old image deleted.");

      // Refresh page after 1 second to ensure avatar shows everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-hover)] rounded-lg p-6 border border-[var(--border)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" /> Profile Picture
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            {displayAvatar && !avatarError ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                onError={() => setAvatarError(true)}
                className="w-full h-full rounded-full object-cover border-2 border-[var(--border)]"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center">
                <User className="w-10 h-10 text-primary-500" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-lg"
            >
              {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
            </button>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Max 2MB • JPG, PNG, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--bg-hover)] rounded-lg p-6 border border-[var(--border)]"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">Personal Information</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm px-3 py-1.5 rounded text-primary-500 hover:bg-primary-500/10 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="input w-full text-sm h-fit py-2"
              />
            ) : (
              <p className="text-[var(--text)]">{admin?.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className="input w-full text-sm h-fit py-2"
              />
            ) : (
              <p className="text-[var(--text)]">{admin?.email}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Role</label>
            <p className="text-[var(--text)] capitalize">{admin?.role || "Admin"}</p>
          </div>

          {/* Created Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Account Created</label>
            <p className="text-[var(--text)]">
              {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              className="flex-1 btn-primary"
            >
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
              Save Changes
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── SECURITY TAB ───────────────────────────────────────────────

function SecurityTab({ modals, setModals, admin }) {
  return (
    <div className="space-y-6">
      {/* Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-hover)] rounded-lg p-6 border border-[var(--border)]"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
              <Lock className="w-5 h-5" /> Password
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Last changed 3 months ago
            </p>
          </div>
          <button
            onClick={() => setModals((p) => ({ ...p, changePassword: true }))}
            className="btn-secondary text-sm"
          >
            Change Password
          </button>
        </div>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--bg-hover)] rounded-lg p-6 border border-[var(--border)]"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
              <Shield className="w-5 h-5" /> Two-Factor Authentication
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
              {admin?.twoFactorEnabled ? (
                <>
                  <Check className="w-4 h-4 text-green-500" /> Enabled
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-500" /> Not enabled
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setModals((p) => ({
              ...p,
              [admin?.twoFactorEnabled ? "disable2FA" : "setup2FA"]: true,
            }))}
            className={`btn-secondary text-sm ${admin?.twoFactorEnabled ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : ""}`}
          >
            {admin?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </motion.div>

      {/* Active Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-hover)] rounded-lg p-6 border border-[var(--border)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5" /> Active Sessions
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Chrome on Windows</p>
              <p className="text-xs text-[var(--text-muted)]">192.168.1.1 • Active now</p>
            </div>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded flex items-center gap-1">
              <Check className="w-3 h-3" /> Current
            </span>
          </div>
        </div>
        <button
          onClick={() => setModals((p) => ({ ...p, logoutAll: true }))}
          className="mt-4 btn-secondary text-red-500 border-red-500 w-full text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Logout From All Devices
        </button>
      </motion.div>
    </div>
  );
}

// ─── MODALS ─────────────────────────────────────────────────────

function PasswordChangeModal({ open, onClose }) {
  const [tab, setTab] = useState(1); // Tab 1: Remember password, Tab 2: Forgot password
  const [currentPassForm, setCurrentPassForm] = useState({ current: "", new: "", confirm: "" });
  const [forgotForm, setForgotForm] = useState({ email: "", otp: "", newPassword: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, forgot: false });
  const [otpSent, setOtpSent] = useState(false);
  const { admin } = useAuthStore();

  // Current password mutation
  const currentPassMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/password/change", {
        currentPassword: currentPassForm.current,
        newPassword: currentPassForm.new,
        confirmPassword: currentPassForm.confirm,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      onClose();
      setCurrentPassForm({ current: "", new: "", confirm: "" });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to change password");
    },
  });

  // Request OTP mutation
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      // Security check: email must match logged-in user's email
      if (forgotForm.email !== admin?.email) {
        throw new Error("This is not your registered email");
      }
      const res = await adminApi.post("/password/reset-request", {
        email: forgotForm.email,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("OTP sent to your email!");
      setOtpSent(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || "Failed to send OTP");
    },
  });

  // Reset password mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/password/reset", {
        email: forgotForm.email,
        otp: forgotForm.otp,
        newPassword: forgotForm.newPassword,
        confirmPassword: forgotForm.confirm,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully!");
      onClose();
      setTab(1);
      setCurrentPassForm({ current: "", new: "", confirm: "" });
      setForgotForm({ email: "", otp: "", newPassword: "", confirm: "" });
      setOtpSent(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reset password");
    },
  });

  const handleClose = () => {
    setTab(1);
    setCurrentPassForm({ current: "", new: "", confirm: "" });
    setForgotForm({ email: "", otp: "", newPassword: "", confirm: "" });
    setOtpSent(false);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg)] rounded-lg shadow-lg max-w-md w-full p-6 border border-[var(--border)]">
              <h2 className="text-xl font-bold text-[var(--text)] mb-6">Change Password</h2>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
                <button
                  onClick={() => setTab(1)}
                  className={`flex-1 py-2 px-3 text-sm font-medium transition-colors border-b-2 ${
                    tab === 1
                      ? "text-primary-500 border-primary-500"
                      : "text-[var(--text-muted)] border-transparent hover:text-[var(--text)]"
                  }`}
                >
                  Current Password
                </button>
                <button
                  onClick={() => setTab(2)}
                  className={`flex-1 py-2 px-3 text-sm font-medium transition-colors border-b-2 ${
                    tab === 2
                      ? "text-primary-500 border-primary-500"
                      : "text-[var(--text-muted)] border-transparent hover:text-[var(--text)]"
                  }`}
                >
                  Forgot Password
                </button>
              </div>

              {/* Tab 1: Current Password */}
              {tab === 1 && (
                <>
                  {/* Current Password */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={currentPassForm.current}
                        onChange={(e) => setCurrentPassForm((p) => ({ ...p, current: e.target.value }))}
                        className="input w-full text-sm h-fit py-2 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={currentPassForm.new}
                        onChange={(e) => setCurrentPassForm((p) => ({ ...p, new: e.target.value }))}
                        className="input w-full text-sm h-fit py-2 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={currentPassForm.confirm}
                      onChange={(e) => setCurrentPassForm((p) => ({ ...p, confirm: e.target.value }))}
                      className="input w-full text-sm h-fit py-2"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button onClick={handleClose} className="flex-1 btn-secondary flex items-center justify-center">
                      Cancel
                    </button>
                    <button
                      onClick={() => currentPassMutation.mutate()}
                      disabled={currentPassMutation.isPending || !currentPassForm.current || !currentPassForm.new || !currentPassForm.confirm}
                      className="flex-1 btn-primary flex items-center justify-center"
                    >
                      {currentPassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Update
                    </button>
                  </div>
                </>
              )}

              {/* Tab 2: Forgot Password */}
              {tab === 2 && (
                <>
                  {!otpSent ? (
                    <>
                      {/* Email Input */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Email</label>
                        <input
                          type="email"
                          value={forgotForm.email}
                          onChange={(e) => setForgotForm((p) => ({ ...p, email: e.target.value }))}
                          className="input w-full text-sm h-fit py-2"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3">
                        <button onClick={handleClose} className="flex-1 btn-secondary flex items-center justify-center">
                          Cancel
                        </button>
                        <button
                          onClick={() => requestOtpMutation.mutate()}
                          disabled={requestOtpMutation.isPending || !forgotForm.email}
                          className="flex-1 btn-primary flex items-center justify-center"
                        >
                          {requestOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Send OTP
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* OTP Input */}
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">OTP</label>
                        <input
                          type="text"
                          maxLength="6"
                          value={forgotForm.otp}
                          onChange={(e) => setForgotForm((p) => ({ ...p, otp: e.target.value.replace(/\D/g, "") }))}
                          className="input w-full text-center text-2xl tracking-widest h-fit py-2"
                          placeholder="000000"
                        />
                      </div>

                      {/* New Password */}
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.forgot ? "text" : "password"}
                            value={forgotForm.newPassword}
                            onChange={(e) => setForgotForm((p) => ({ ...p, newPassword: e.target.value }))}
                            className="input w-full text-sm h-fit py-2 pr-10"
                          />
                          <button
                            onClick={() => setShowPasswords((p) => ({ ...p, forgot: !p.forgot }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                          >
                            {showPasswords.forgot ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={forgotForm.confirm}
                          onChange={(e) => setForgotForm((p) => ({ ...p, confirm: e.target.value }))}
                          className="input w-full text-sm h-fit py-2"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setOtpSent(false)}
                          className="flex-1 btn-secondary flex items-center justify-center"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => resetMutation.mutate()}
                          disabled={resetMutation.isPending || !forgotForm.otp || !forgotForm.newPassword || !forgotForm.confirm}
                          className="flex-1 btn-primary flex items-center justify-center"
                        >
                          {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Reset
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function PasswordResetModal({ open, onClose }) {
  return createPortal(
    <AnimatePresence>
      {open && <div className="fixed inset-0 bg-black/50" onClick={onClose} />}
    </AnimatePresence>,
    document.body
  );
}

function Setup2FAModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [token, setToken] = useState("");
  const queryClient = useQueryClient();

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/2fa/setup");
      return res.data.data;
    },
    onSuccess: (data) => {
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep(2);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Setup failed");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/2fa/verify", { 
        secret,
        token
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("2FA enabled successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setStep(1);
      setToken("");
      setQrCode(null);
      setSecret(null);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Verification failed");
    },
  });

  const handleClose = () => {
    setStep(1);
    setToken("");
    setQrCode(null);
    setSecret(null);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg)] rounded-lg shadow-lg max-w-md w-full p-6 border border-[var(--border)]">
              {step === 1 ? (
                <>
                  <h2 className="text-xl font-bold text-[var(--text)] mb-4">Enable Two-Factor Authentication</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">Secure your account with an authenticator app like Google Authenticator or Authy.</p>
                  <button
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    {setupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Generate QR Code
                  </button>
                  <button onClick={handleClose} className="w-full btn-secondary mt-2 flex items-center justify-center">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-[var(--text)] mb-4">Scan QR Code</h2>
                  {qrCode && (
                    <div className="mb-4 p-4 bg-white rounded-lg flex justify-center">
                      <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mb-4 bg-[var(--bg-hover)] p-3 rounded">
                    Secret: <code className="font-mono text-primary-400">{secret}</code>
                  </p>
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Enter 6-digit code</label>
                    <input
                      type="text"
                      maxLength="6"
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                      className="input w-full text-center text-2xl tracking-widest h-fit py-2"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleClose} className="flex-1 btn-secondary flex items-center justify-center">
                      Cancel
                    </button>
                    <button
                      onClick={() => verifyMutation.mutate()}
                      disabled={verifyMutation.isPending || token.length !== 6}
                      className="flex-1 btn-primary flex items-center justify-center"
                    >
                      {verifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Verify
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Disable2FAModal({ open, onClose }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/2fa/disable", { password });
      return res.data;
    },
    onSuccess: () => {
      toast.success("2FA disabled successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setPassword("");
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to disable 2FA");
    },
  });

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg)] rounded-lg shadow-lg max-w-md w-full p-6 border border-[var(--border)]">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">Disable Two-Factor Authentication</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Enter your password to confirm disabling 2FA.</p>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full text-sm h-fit py-2 pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 btn-secondary flex items-center justify-center">
                  Cancel
                </button>
                <button
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending || !password}
                  className="flex-1 btn-primary text-red-500 border-red-500 flex items-center justify-center"
                >
                  {disableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Disable
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function LogoutAllModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { logout, adminType } = useAuthStore();

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("/sessions/logout-all");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Logged out from all devices!");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setTimeout(() => {
        logout();
        // Determine redirect based on admin type
        const redirectUrl = adminType === 'support' ? '/support/login' : '/admin/login';
        window.location.href = redirectUrl;
      }, 1000);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to logout from all devices");
    },
  });

  const handleClose = () => {
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg)] rounded-lg shadow-lg max-w-md w-full p-6 border border-[var(--border)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text)]">Logout All Devices</h2>
              </div>
              
              <p className="text-sm text-[var(--text-muted)] mb-2">
                This will log you out from all your active sessions and devices.
              </p>
              <p className="text-xs text-red-400 mb-6 bg-red-500/10 p-3 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                You will need to login again
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={handleClose} 
                  disabled={logoutAllMutation.isPending}
                  className="flex-1 btn-secondary flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => logoutAllMutation.mutate()}
                  disabled={logoutAllMutation.isPending}
                  className="flex-1 btn-primary text-red-500 border-red-500 flex items-center justify-center"
                >
                  {logoutAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Logout All
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
