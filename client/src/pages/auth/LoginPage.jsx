import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "../../api/axios";
import useAuthStore from "../../store/authStore";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import GoogleIcon from "../../components/ui/GoogleIcon";
import AppleIcon from "../../components/ui/AppleIcon";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 chars"),
  rememberMe: z.boolean().optional(),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setPendingVerification, isAuthenticated } = useAuthStore();
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const twoFactorInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const error = new URLSearchParams(location.search).get("error");
    if (error) {
      toast.error(error);
    }
  }, [location.search]);

  const onSubmit = async (values) => {
    try {
      const res = await authApi.post("/auth/login", values);
      const payload = res?.data?.data;

      if (payload?.requiresTwoFactor && payload?.twoFactorChallengeToken) {
        setTwoFactorChallenge({
          token: payload.twoFactorChallengeToken,
          email: payload.email || values.email,
        });
        toast.success("2FA code required to continue");
        return;
      }

      login({ user: payload?.user, token: payload?.accessToken });
      toast.success("Login successful");
      navigate("/");
    } catch (error) {
      const data = error?.response?.data;
      if (data?.data?.requiresVerification && data?.data?.userId) {
        setPendingVerification({
          userId: data.data.userId,
          email: values.email,
        });
        toast.success("OTP verification required");
        navigate("/verify-otp");
      } else if (error?.response) {
        // Handle login error via interceptor
      }
      // Axios interceptor handles general error toast
    }
  };

  const verifyTwoFactorLogin = async () => {
    if (!twoFactorChallenge?.token) {
      toast.error("2FA challenge expired. Please login again.");
      setTwoFactorChallenge(null);
      setTwoFactorCode("");
      return;
    }

    if (!twoFactorCode.trim()) {
      toast.error("Enter authenticator or backup code");
      return;
    }

    setTwoFactorLoading(true);
    try {
      const res = await authApi.post("/auth/login/verify-2fa", {
        challengeToken: twoFactorChallenge.token,
        token: twoFactorCode.trim(),
      });

      const payload = res?.data?.data;
      login({ user: payload?.user, token: payload?.accessToken });
      setTwoFactorChallenge(null);
      setTwoFactorCode("");
      toast.success("2FA verified, login successful");
      navigate("/");
    } catch {
      // toast handled in axios interceptor
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Welcome Back to Lexio"
      subtitle="Sign in to continue managing bots, analytics, and customer conversations."
      visualHeading="A support companion that adapts to how your team works."
      visualSubtext="Lexio helps your team answer faster, remember context, and run trustworthy support around the clock."
      footer={
        <div className="text-center text-sm text-[var(--text-muted)]">
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary-500">
            Create account
          </Link>
        </div>
      }
    >
      <div className="space-y-2">
        <button
          className="btn-secondary w-full justify-center"
          onClick={() => {
            const base = import.meta.env.VITE_API_URL || "";
            window.location.href = `${base}/api/v1/auth/google`;
          }}
        >
          <GoogleIcon /> Continue with Google
        </button>
        <button
          className="btn-secondary w-full justify-center opacity-70"
          disabled
        >
          <AppleIcon /> Continue with Apple (soon)
        </button>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or sign in with email
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {twoFactorChallenge ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm text-[var(--text-muted)]">
            2FA enabled account detected for{" "}
            <span className="font-semibold text-[var(--text)]">
              {twoFactorChallenge.email}
            </span>
            . Enter authenticator app code (ya backup code).
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--text)]">
              Authenticator / Backup Code
            </p>
            <div
              className="relative cursor-text rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-4"
              onClick={() => twoFactorInputRef.current?.focus()}
            >
              <input
                ref={twoFactorInputRef}
                value={twoFactorCode}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
                  setTwoFactorCode(cleaned);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyTwoFactorLogin();
                  }
                }}
                className="absolute inset-0 opacity-0"
                autoComplete="one-time-code"
              />
              <div className="grid grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const char = twoFactorCode[idx] || "";
                  const active = idx === twoFactorCode.length;
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="h-6 text-lg font-semibold tracking-wide text-[var(--text)]">
                        {char || " "}
                      </span>
                      <span
                        className={`mt-1 h-[2px] w-full rounded-full ${active ? "bg-primary-500" : "bg-[var(--border)]"}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              6-digit authenticator ya 6-char backup code enter karo.
            </p>
          </div>

          <Button
            className="w-full justify-center"
            onClick={verifyTwoFactorLogin}
            disabled={twoFactorLoading}
          >
            {twoFactorLoading ? "Verifying..." : "Verify 2FA & Sign In"}
          </Button>

          <Button
            className="w-full justify-center"
            variant="secondary"
            onClick={() => {
              setTwoFactorChallenge(null);
              setTwoFactorCode("");
            }}
            disabled={twoFactorLoading}
          >
            Back to login form
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("rememberMe")} />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold text-primary-500"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            className="w-full justify-center"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : "Sign In"}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
