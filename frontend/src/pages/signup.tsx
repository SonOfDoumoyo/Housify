import axios from "axios";
import { useEffect, useState } from "react";
import { api } from "../interceptors/api";
import { useSignup } from "../contexts/signupContext";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Circle, Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import RolePicker from "../components/RolePicker";
import GoogleButton from "../components/GoogleButton";
import type { Role } from "../lib/googleAuth";

type Step = 1 | 2 | 3;

type FormErrors = {
  role: string;
  fullname: string;
  phone_number: string;
  email: string;
  password: string;
  confirmpassword: string;
};

const EMPTY_ERRORS: FormErrors = {
  role: "",
  fullname: "",
  phone_number: "",
  email: "",
  password: "",
  confirmpassword: "",
};

/** Nigerian phone: 0 + 10 digits, or +234 + 10 digits (spaces ignored). */
function validPhone(raw: string): boolean {
  const v = raw.replace(/[\s-]/g, "");
  return /^(\+234\d{10}|0\d{10})$/.test(v);
}

function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`req-item ${met ? "met" : ""}`}>
      {met ? <Check size={15} strokeWidth={3} /> : <Circle size={14} />}
      <span>{text}</span>
    </div>
  );
}

/**
 * Create Account — 3 steps: Details → Security → Review.
 * Role is chosen in step 1 and is REQUIRED before "Sign up with Google":
 * first-time Google users must say whether they are a Customer or an Agent.
 */
export default function SignUp() {
  const { signUpData, setSignUpData } = useSignup();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<FormErrors>(EMPTY_ERRORS);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("remember_me") || "false");
    } catch {
      return false;
    }
  });

  const role = (signUpData.role === "client" || signUpData.role === "agent" ? signUpData.role : "") as Role | "";

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "confirmpassword") {
      setConfirmPassword(value);
    } else {
      setSignUpData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const handleRoleSelect = (r: Role) => {
    setSignUpData((prev) => ({ ...prev, role: r }));
    setFormError((prev) => ({ ...prev, role: "" }));
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

  const validateStep1 = (): boolean => {
    const errors = { ...EMPTY_ERRORS };
    if (!signUpData.role) errors.role = "Please select Customer or Agent.";
    if (!signUpData.fullname.trim()) errors.fullname = "Full name is required.";
    else if (!/^[A-Za-z\s.'-]+$/.test(signUpData.fullname.trim()))
      errors.fullname = "Full name can only contain letters and spaces.";
    else if (signUpData.fullname.trim().length < 2)
      errors.fullname = "Full name must be at least 2 characters.";
    if (!signUpData.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpData.email.trim()))
      errors.email = "Please enter a valid email address.";
    if (!signUpData.phone_number.trim()) errors.phone_number = "Phone number is required.";
    else if (!validPhone(signUpData.phone_number))
      errors.phone_number = "Enter a valid Nigerian number, e.g. 0803 123 4567.";
    setFormError(errors);
    return Object.values(errors).every((v) => v === "");
  };

  const checks = {
    length: signUpData.password.length >= 8,
    upperCase: /[A-Z]/.test(signUpData.password),
    lowerCase: /[a-z]/.test(signUpData.password),
    number: /\d/.test(signUpData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(signUpData.password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const passwordsMatch = confirmPassword.length > 0 && signUpData.password === confirmPassword;
  const strength =
    score <= 2
      ? { text: "Weak", color: "#dc2626", width: "25%" }
      : score === 3
        ? { text: "Good", color: "#d97706", width: "50%" }
        : score === 4
          ? { text: "Strong", color: "#2563eb", width: "75%" }
          : { text: "Very strong", color: "#15803d", width: "100%" };

  const validateStep2 = (): boolean => {
    const errors = { ...EMPTY_ERRORS };
    if (!signUpData.password) errors.password = "Password is required.";
    else if (signUpData.password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!confirmPassword) errors.confirmpassword = "Please confirm your password.";
    else if (signUpData.password !== confirmPassword) errors.confirmpassword = "Passwords do not match.";
    setFormError(errors);
    if (errors.password || errors.confirmpassword) {
      setError(errors.confirmpassword || errors.password);
      return false;
    }
    return true;
  };

  const handleCreateAccount = async (): Promise<boolean> => {
    setSubmitting(true);
    try {
      await api.post(`/auth/signup`, signUpData);
      return true;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail || err.response?.data?.message;
        console.log(detail)
        console.log(err.response.data)
        setError(typeof err.response?.data === "string" ? err.response.data : detail || "Sign up failed. Please try again.");
      } else {
        setError("Server not reachable. Please check your connection and try again.");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Details" },
    { n: 2, label: "Security" },
    { n: 3, label: "Review" },
  ];

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Housify and start your housing journey."
      footer={
        <p style={{ textAlign: "center", fontSize: 14, color: "#64748b", margin: 0 }}>
          Already have a Housify account?{" "}
          <Link to="/sign-in" style={{ color: "#2563eb", fontWeight: 700 }}>
            Log in
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

      <div className="stepper" aria-label={`Step ${step} of 3`}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: "contents" }}>
            <div className={`step ${step === s.n ? "active" : ""} ${step > s.n ? "done" : ""}`}>
              <span className="step-dot">{step > s.n ? <Check size={13} strokeWidth={3.5} /> : s.n}</span>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={`step-line ${step > s.n ? "done" : ""}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (validateStep1()) setStep(2);
          }}
          noValidate
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <RolePicker value={role} onChange={handleRoleSelect} error={formError.role} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="fullname">Full name</label>
                <input
                  id="fullname"
                  className={`input ${formError.fullname ? "input-error" : ""}`}
                  type="text"
                  name="fullname"
                  autoComplete="name"
                  value={signUpData.fullname}
                  placeholder="e.g. Kudos Ajao"
                  onChange={handleChange}
                />
                {formError.fullname && <p className="field-error">{formError.fullname}</p>}
              </div>
              <div>
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className={`input ${formError.email ? "input-error" : ""}`}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={signUpData.email}
                  placeholder="you@gmail.com"
                  onChange={handleChange}
                />
                {formError.email && <p className="field-error">{formError.email}</p>}
              </div>
              <div>
                <label className="field-label" htmlFor="phone_number">Phone</label>
                <input
                  id="phone_number"
                  className={`input ${formError.phone_number ? "input-error" : ""}`}
                  type="tel"
                  name="phone_number"
                  autoComplete="tel"
                  value={signUpData.phone_number}
                  placeholder="0803 123 4567"
                  onChange={handleChange}
                />
                {formError.phone_number && <p className="field-error">{formError.phone_number}</p>}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Continue
            </button>

            <div className="auth-divider">or with Google</div>
            <GoogleButton
              role={role}
              rememberMe={rememberMe}
              flow="signup"
              label="Sign up with Google"
              onMissingRole={() => setFormError((p) => ({ ...p, role: "Please select Customer or Agent first." }))}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" checked={rememberMe} onChange={handleRememberMe} style={{ accentColor: "#2563eb", width: 16, height: 16 }} />
              Remember me
            </label>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (validateStep2()) setStep(3);
          }}
          noValidate
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Create a strong password to protect your account and personal information.
            </p>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className={`input ${formError.password ? "input-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={signUpData.password}
                  placeholder="Create a password"
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
              {formError.password && <p className="field-error">{formError.password}</p>}
              {signUpData.password && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: "#64748b" }}>Password strength</span>
                    <span style={{ color: strength.color }}>{strength.text}</span>
                  </div>
                  <div className="strength-track">
                    <div className="strength-fill" style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <div className="req-list">
                    <Requirement met={checks.length} text="At least 8 characters" />
                    <Requirement met={checks.upperCase} text="One uppercase letter" />
                    <Requirement met={checks.lowerCase} text="One lowercase letter" />
                    <Requirement met={checks.number} text="One number" />
                    <Requirement met={checks.special} text="One special character" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="confirmpassword">Confirm password</label>
              <input
                id="confirmpassword"
                className={`input ${formError.confirmpassword ? "input-error" : ""}`}
                type={showPassword ? "text" : "password"}
                name="confirmpassword"
                autoComplete="new-password"
                value={confirmPassword}
                placeholder="Confirm password"
                onChange={handleChange}
              />
              {formError.confirmpassword && <p className="field-error">{formError.confirmpassword}</p>}
              {confirmPassword && (
                <p style={{ margin: "8px 0 0", fontSize: 13.5, fontWeight: 600, color: passwordsMatch ? "#15803d" : "#dc2626" }}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-outline" style={{ flex: "0 0 96px" }} onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Review your details before continuing.
          </p>
          <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 0, border: "1px solid #e5eaf3", borderRadius: 14, overflow: "hidden" }}>
            {[
              { label: "Full name", value: signUpData.fullname },
              { label: "Email", value: signUpData.email },
              { label: "Phone", value: signUpData.phone_number },
              { label: "Signing up as", value: role === "agent" ? "Agent" : "Customer" },
            ].map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 16px",
                  background: i % 2 === 0 ? "#f8fafc" : "#fff",
                  fontSize: 14,
                }}
              >
                <dt style={{ color: "#64748b", fontWeight: 600 }}>{row.label}</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: "#0f2040", textAlign: "right", wordBreak: "break-word" }}>
                  {row.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setStep(1)}>
            Edit details
          </button>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "#64748b", cursor: "pointer", lineHeight: 1.55 }}>
            <input type="checkbox" checked={rememberMe} onChange={handleRememberMe} style={{ accentColor: "#2563eb", width: 16, height: 16, marginTop: 2 }} />
            <span>
              By clicking “Create Account”, you agree to Housify&apos;s{" "}
              <Link to="/terms" style={{ color: "#2563eb" }}><u>Terms of Service</u></Link> and{" "}
              <Link to="/terms" style={{ color: "#2563eb" }}><u>Privacy Policy</u></Link>.
            </span>
          </label>
          {role === "agent" && (
            <p style={{ fontSize: 13.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 12px", margin: 0 }}>
              As an agent, you&apos;ll add your contact details (phone
              number) in Settings before you can publish a listing, so
              customers can reach you. You can also add a photo of
              yourself there — it becomes your profile picture, so
              customers know who they are dealing with.
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ flex: "0 0 96px" }} onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              disabled={submitting}
              onClick={async () => {
                const ok = await handleCreateAccount();
                if (ok) navigate("/verify-email");
              }}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
