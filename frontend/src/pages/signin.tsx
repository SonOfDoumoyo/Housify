import { useEffect, useState } from "react";
import { api } from "../interceptors/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useUser } from "../contexts/userContext";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import RolePicker from "../components/RolePicker";
import GoogleButton from "../components/GoogleButton";
import type { Role } from "../lib/googleAuth";

/**
 * Sign In.
 * Google: a first-time Google user is really signing up, so they must
 * pick Customer or Agent before leaving for Google — the same role
 * picker as on Sign up. Returning Google users already have a role
 * saved, so picking again just confirms which account type to create
 * if this Google account is new.
 */
export default function SignIn() {
  const { fetchUser } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Where to go after signing in. A public listing page sends visitors
  // here with ?next=/listing-details/<id> so they land back on the
  // listing after logging in. Only same-site relative paths are honored.
  const nextParam = searchParams.get("next") || "";
  const returnTo = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [role, setRole] = useState<Role | "">("");
  const [roleError, setRoleError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("remember_me") || "false");
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState({ email: "", password: "" });

  // Forgot password (bottom-sheet modal on mobile)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    setLoginError((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = { email: "", password: "" };
    if (!loginData.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email.trim()))
      errors.email = "Please enter a valid email address.";
    if (!loginData.password.trim()) errors.password = "Password is required.";
    else if (loginData.password.trim().length < 8)
      errors.password = "Password must be at least 8 characters.";
    setLoginError(errors);
    if (Object.values(errors).some((v) => v !== "")) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/auth/signin/${rememberMe}`, loginData);
      if (res.status === 200) {
        await fetchUser();
        navigate(returnTo);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Login failed. Check your email and password.");
      } else {
        setError("Server not reachable. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setError("Enter your registered email address first.");
      return;
    }
    setResetBusy(true);
    try {
      await api.post(`/auth/reset_password?email=${encodeURIComponent(resetEmail.trim())}`);
      setResetSent(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Reset email could not be sent.");
      } else {
        setError("Server not reachable.");
      }
    } finally {
      setResetBusy(false);
    }
  };

  const handleRememberMe = () => {
    const next = !rememberMe;
    setRememberMe(next);
    try {
      sessionStorage.setItem("remember_me", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Housify account."
      footer={
        <p style={{ textAlign: "center", fontSize: 14, color: "#64748b", margin: 0 }}>
          Don&apos;t have an account?{" "}
          <Link to="/create-account" style={{ color: "#2563eb", fontWeight: 700 }}>
            Create one free
          </Link>
        </p>
      }
    >
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 600, color: "#334155" }}>
            New to Housify, or signing in with Google for the first time?
          </p>
          <RolePicker
            value={role}
            onChange={(r) => {
              setRole(r);
              setRoleError("");
            }}
            error={roleError}
            idPrefix="signin-role"
          />
        </div>

        <GoogleButton
          role={role}
          rememberMe={rememberMe}
          flow="signin"
          label="Continue with Google"
          onMissingRole={() => setRoleError("Choose Customer or Agent first — first-time Google users need a role.")}
        />
      </div>

      <div className="auth-divider">or with email</div>

      <form onSubmit={handleLogin} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="field-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={`input ${loginError.email ? "input-error" : ""}`}
              type="email"
              name="email"
              autoComplete="email"
              value={loginData.email}
              placeholder="you@gmail.com"
              onChange={handleChange}
            />
            {loginError.email && <p className="field-error">{loginError.email}</p>}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="field-label" htmlFor="login-password">Password</label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(loginData.email);
                  setResetSent(false);
                  setResetOpen(true);
                }}
                style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 700, fontSize: 13, padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                className={`input ${loginError.password ? "input-error" : ""}`}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={loginData.password}
                placeholder="Enter your password"
                onChange={handleChange}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#64748b", display: "grid", placeItems: "center" }}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {loginError.password && <p className="field-error">{loginError.password}</p>}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#64748b", cursor: "pointer" }}>
            <input type="checkbox" checked={rememberMe} onChange={handleRememberMe} style={{ accentColor: "#2563eb", width: 16, height: 16 }} />
            Remember me
          </label>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      <p style={{ fontSize: 12.5, color: "#94a3b8", textAlign: "center", margin: "20px 0 0", lineHeight: 1.6 }}>
        By continuing you agree to Housify&apos;s{" "}
        <u style={{ cursor: "pointer" }}>Terms of Service</u> and <u style={{ cursor: "pointer" }}>Privacy Policy</u>.
      </p>

      {resetOpen && (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Reset password">
          <div className="modal-card">
            {!resetSent ? (
              <>
                <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Reset your password</h2>
                <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 18px" }}>
                  Enter your registered email address and we&apos;ll send you a reset link.
                </p>
                <label className="field-label" htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  className="input"
                  type="email"
                  value={resetEmail}
                  placeholder="you@gmail.com"
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={resetBusy} onClick={handlePasswordReset}>
                    {resetBusy ? "Sending…" : "Send reset link"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setResetOpen(false)}>
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <CheckCircle2 size={24} color="#15803d" />
                  <h2 style={{ fontSize: 22, margin: 0 }}>Check your email</h2>
                </div>
                <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 18px" }}>
                  A reset link was sent to <b style={{ color: "#0f2040" }}>{resetEmail}</b>. Didn&apos;t receive it?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={resetBusy} onClick={handlePasswordReset}>
                    Resend email
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setResetOpen(false);
                      setResetSent(false);
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
