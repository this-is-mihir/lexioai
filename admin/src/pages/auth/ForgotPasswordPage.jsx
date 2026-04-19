import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, ArrowLeft, Sun, Moon, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from "react-hot-toast";
import { authApi } from "../../api/axios";

export default function ForgotPasswordPage() {
  // Dark mode
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // Detect admin type from URL
  const getAdminTypeFromPath = () => {
    if (location.pathname.includes('/admin/forgot-password')) return 'admin';
    if (location.pathname.includes('/support/forgot-password')) return 'support';
    return 'admin';
  };

  const adminType = getAdminTypeFromPath();
  const loginPath = adminType === 'support' ? '/support/login' : '/admin/login';

  // Set page title based on admin type
  useEffect(() => {
    if (location.pathname.includes('/admin/')) {
      document.title = 'superadmin';
    } else if (location.pathname.includes('/support/')) {
      document.title = 'support staff';
    }
  }, [location.pathname]);

  const [step, setStep] = useState("email"); // email | otp | reset
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await authApi.post("/auth/request-password-reset", {
        email: form.email.toLowerCase().trim(),
        adminType: adminType,
      });

      toast.success("OTP sent to your registered email");
      setStep("otp");
    } catch (err) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!form.otp) {
      toast.error("Please enter the OTP");
      return;
    }

    if (!form.newPassword || !form.confirmPassword) {
      toast.error("Please enter both passwords");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await authApi.post("/auth/reset-password-with-otp", {
        email: form.email.toLowerCase().trim(),
        otp: form.otp,
        newPassword: form.newPassword,
        adminType: adminType,
      });

      toast.success("Password reset successfully!");
      setTimeout(() => {
        navigate(loginPath);
      }, 1000);
    } catch (err) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ email: "", otp: "", newPassword: "", confirmPassword: "" });
    setStep("email");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme Toggle */}
      <button
        onClick={() => {
          const current = localStorage.getItem("theme") || "dark";
          const next = current === "dark" ? "light" : "dark";
          localStorage.setItem("theme", next);
          document.documentElement.classList.toggle("dark", next === "dark");
        }}
        className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-primary-500/50 transition-all duration-200"
      >
        <Sun className="w-4 h-4 hidden dark:block" />
        <Moon className="w-4 h-4 block dark:hidden" />
      </button>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary-400/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4"
          >
            <Lock className="w-8 h-8 text-primary-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Reset Password</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {adminType === 'support' 
              ? "Enter your support account registered email"
              : "Enter your admin account registered email"}
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/20">
          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === "email" && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder=""
                      className="input pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(loginPath)}
                  className="flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors w-full py-2 rounded-lg hover:bg-[var(--bg-card)]"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </button>
              </motion.form>
            )}

            {/* Step 2: OTP & Password Reset */}
            {step === "otp" && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handlePasswordReset}
                className="space-y-4"
              >
                {/* Info */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary-400">OTP Sent</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Check your email for the verification code
                    </p>
                  </div>
                </div>

                {/* OTP */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    name="otp"
                    value={form.otp}
                    onChange={handleChange}
                    placeholder="000000"
                    className="input text-center text-2xl font-mono tracking-[0.5em] py-3"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {loading ? "Resetting..." : "Reset Password"}
                </button>

                {/* Back */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors w-full py-2 rounded-lg hover:bg-[var(--bg-card)]"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Email
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Help */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Remember your password?{" "}
          <a
            href={loginPath}
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Sign in here
          </a>
        </p>
      </motion.div>
    </div>
  );
}
