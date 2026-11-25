import { useState } from "react";
import axios from "axios";
import { api } from "../interceptors/api";
import { useSignup } from "../contexts/signupContext";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

export default function Verify() {
  const [changeEmail, setChangeEmail] = useState(false);
  const [email, setEmail] = useState("");
  const { signUpData, setSignUpData } = useSignup();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleUpdateEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.patch(`user/update_details/${signUpData.email}`, { email: email.trim() });
      if (res.status === 200) {
        setSignUpData((prev) => ({ ...prev, email: email.trim() }));
        setMessage(`Verification email will now go to ${email.trim()}.`);
        setChangeEmail(false);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail || "Email could not be updated.");
      else setError("Server not reachable.");
    } finally {
      setBusy(false);
    }
  };

  const handleResendEmail = async () => {
    setBusy(true);
    setError("");
    try {
      await api.get(`auth/resend_verification/${signUpData.email}/${signUpData.fullname}`);
      setMessage("Verification email resent. Check your inbox (and spam folder).");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail || "Email could not be resent.");
      else setError("Server not reachable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent a verification link to activate your account."
    >
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{message}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#f8fafc", border: "1px solid #e5eaf3", borderRadius: 14, padding: "14px" }}>
          <span className="trust-icon" style={{ flexShrink: 0 }}>
            <Mail size={19} />
          </span>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#334155" }}>
            We&apos;ve sent a verification link to{" "}
            <b style={{ color: "#15803d", wordBreak: "break-all" }}>{signUpData.email || "your email"}</b>.
            <br />
            Please click the link in your inbox to activate your account.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={handleResendEmail}>
            {busy ? "Sending…" : "Resend email"}
          </button>
          <button type="button" className="btn btn-outline btn-block" onClick={() => setChangeEmail(true)}>
            Change email
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, textAlign: "center" }}>
          Didn&apos;t get it? Check spam, then try resending.
        </p>
      </div>

      {changeEmail && (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Change email">
          <div className="modal-card">
            <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Change email</h2>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 18px" }}>
              Enter the email you&apos;d like to use.
            </p>
            <label className="field-label" htmlFor="new-email">Email</label>
            <input
              id="new-email"
              className="input"
              type="email"
              value={email}
              placeholder="you@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={busy} onClick={handleUpdateEmail}>
                Save
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setChangeEmail(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
