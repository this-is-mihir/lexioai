import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Shield, Loader2, Lock, Mail, KeyRound, Sun, Moon } from 'lucide-react'
import toast from "react-hot-toast";
import { authApi } from "../../api/axios";
import useAuthStore from "../../store/authStore";

export default function LoginPage() {
  // Dark mode apply karo
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  // Determine admin type from URL
  const getAdminTypeFromPath = () => {
    if (location.pathname.includes('/admin/')) return 'admin';
    if (location.pathname.includes('/support/')) return 'support';
    return 'admin';
  };

  const adminType = getAdminTypeFromPath();

  // Set page title based on admin type
  useEffect(() => {
    if (location.pathname.includes('/admin/')) {
      document.title = 'superadmin';
    } else if (location.pathname.includes('/support/')) {
      document.title = 'support staff';
    }
  }, [location.pathname]);

  const forgotPasswordPath = adminType === 'support' ? '/support/forgot-password' : '/admin/forgot-password';

  const [step, setStep] = useState("login"); // login | 2fa
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminId, setAdminId] = useState(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.post("/auth/login", {
        email: form.email,
        password: form.password,
        adminType: adminType,
      });

      const { data } = res.data;

      // 2FA required
      if (data.requires2FA) {
        setAdminId(data.adminId);
        setStep("2fa");
        toast.success("Enter your 2FA code");
        return;
      }

      // Login success - use detected admin type
      setAuth(data.admin, data.accessToken, adminType);

      if (data.requires2FASetup) {
        toast("Please setup 2FA immediately!", { icon: "⚠️" });
      } else {
        toast.success("Welcome back!");
      }

      navigate("/");
    } catch (err) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    if (!form.twoFactorCode) {
      toast.error("Please enter your 2FA code");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.post("/auth/login", {
        email: form.email,
        password: form.password,
        twoFactorCode: form.twoFactorCode,
        adminType: adminType,
      });

      const { data } = res.data;
      setAuth(data.admin, data.accessToken, adminType);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
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
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4"
          >
            <Shield className="w-8 h-8 text-primary-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {adminType === 'support' ? 'Support Portal' : 'Admin Panel'}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {step === "login"
              ? adminType === 'support' 
                ? "Sign in to your support account" 
                : "Sign in to your admin account"
              : "Enter your 2FA verification code"}
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/20">
          <AnimatePresence mode="wait">
            {step === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Email Address
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

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input pl-10 pr-10"
                      autoComplete="current-password"
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
                    <Shield className="w-4 h-4" />
                  )}
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                {/* Forgot password */}
                <p className="text-center text-xs text-[var(--text-muted)]">
                  Forgot password?{" "}
                  <a
                    href={forgotPasswordPath}
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Reset it here
                  </a>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handle2FA}
                className="space-y-4"
              >
                {/* 2FA info */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-primary-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary-400">
                      2FA Required
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Open your authenticator app and enter the 6-digit code
                    </p>
                  </div>
                </div>

                {/* 2FA Code */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-muted)]">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    name="twoFactorCode"
                    value={form.twoFactorCode}
                    onChange={handleChange}
                    placeholder="000000"
                    className="input text-center text-2xl font-mono tracking-[0.5em] py-3"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                {/* Back */}
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  ← Back to login
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Lexioai Admin Panel — Authorized Personnel Only
        </p>
      </motion.div>
    </div>
  );
}
