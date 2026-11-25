import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { api } from "../interceptors/api";
import { useUser } from "../contexts/userContext";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Avatar from "../components/Avatar";
import RolePicker from "../components/RolePicker";
import { clearPendingGoogleRole, readPendingGoogleRole, roleLabel, type Role } from "../lib/googleAuth";

/**
 * Complete Profile — the safety net for first-time Google users.
 *
 * Google returns the user to Housify without a role when:
 *  - the backend ignored the `role` query param, or
 *  - the user signed in with Google from a link that had no role.
 * This page asks exactly one question — Customer or Agent? — saves it,
 * and only then lets the user into the dashboard.
 *
 * Save order (first success wins):
 *  1. PATCH /user/update_details/{email}  { role }   (same endpoint
 *     Settings already uses for profile updates)
 *  2. POST  /auth/complete-profile       { role }   (if the backend
 *     provides a dedicated Google onboarding endpoint)
 */
export default function CompleteProfile() {
  const { currentUser, fetchUser, loading } = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState<Role | "">("");
  const [roleError, setRoleError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [triedFetch, setTriedFetch] = useState(false);

  // This page is public, so the provider does not auto-fetch the user.
  // Fetch here: a fresh Google redirect lands with a session cookie but
  // no user in state yet.
  useEffect(() => {
    let cancelled = false;
    void fetchUser().finally(() => {
      if (!cancelled) setTriedFetch(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-select the role chosen before Google, or one the backend passed back.
  useEffect(() => {
    const pending = readPendingGoogleRole();
    const fromQuery = params.get("role");
    if (fromQuery === "client" || fromQuery === "agent") setRole(fromQuery);
    else if (pending.role) setRole(pending.role);
  }, [params]);

  // If the account already has a role, there is nothing to complete.
  // Wait until the fetch above has settled before bouncing to sign-in.
  useEffect(() => {
    if (!triedFetch || loading) return;
    if (currentUser?.role) navigate("/dashboard", { replace: true });
    else if (!currentUser) navigate("/sign-in", { replace: true });
  }, [triedFetch, loading, currentUser, navigate]);

  const saveRole = async (chosen: Role): Promise<boolean> => {
    const email = currentUser?.email || "";
    const attempts: Array<() => Promise<unknown>> = [
      () => api.patch(`user/update_details/${encodeURIComponent(email)}`, { role: chosen }),
      () => api.post(`/auth/complete-profile`, { role: chosen }),
    ];
    let lastError: unknown = null;
    for (const attempt of attempts) {
      try {
        await attempt();
        return true;
      } catch (err) {
        lastError = err;
      }
    }
    if (axios.isAxiosError(lastError)) {
      setError(lastError.response?.data?.detail || "Could not save your role. Please try again.");
    } else {
      setError("Server not reachable. Please try again.");
    }
    return false;
  };

  const handleConfirm = async () => {
    if (role !== "client" && role !== "agent") {
      setRoleError("Please choose Customer or Agent to continue.");
      return;
    }
    setSaving(true);
    setError("");
    const ok = await saveRole(role);
    setSaving(false);
    if (!ok) return;
    clearPendingGoogleRole();
    setDone(true);
    await fetchUser();
    navigate("/dashboard", { replace: true });
  };

  if (loading || !triedFetch || !currentUser) {
    return (
      <AuthLayout title="One last step" subtitle="Setting up your account…">
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#64748b", padding: "24px 0" }}>
          <Loader2 size={20} className="animate-spin" />
          Loading your account…
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="One last step"
      subtitle={`Welcome, ${currentUser.fullname?.split(" ")[0] || "there"} — tell us how you'll use Housify so we can show you the right dashboard.`}
    >
      {done && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Role saved. Taking you to your dashboard…</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#f8fafc",
            border: "1px solid #e5eaf3",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <Avatar name={currentUser.fullname} src={currentUser.profile_image} size={44} />
          <div style={{ minWidth: 0 }}>
            <b style={{ color: "#0f2040", display: "block", fontSize: 14.5 }}>{currentUser.fullname}</b>
            <span style={{ fontSize: 13, color: "#64748b", wordBreak: "break-all" }}>{currentUser.email}</span>
          </div>
        </div>

        <RolePicker
          value={role}
          onChange={(r) => {
            setRole(r);
            setRoleError("");
          }}
          error={roleError}
          idPrefix="complete-role"
        />

        {role && (
          <div className="alert alert-info" style={{ marginBottom: 0 }}>
            <span>
              You&apos;ll continue as <b>{roleLabel(role)}</b>.{" "}
              {role === "agent"
                ? "You'll be able to list properties and manage enquiries."
                : "You'll be able to browse homes and contact agents."}
            </span>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block btn-lg" disabled={saving} onClick={handleConfirm}>
          {saving ? "Saving…" : "Continue to my dashboard"}
        </button>
        <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0, textAlign: "center" }}>
          You can change this later from Settings.
        </p>
      </div>
    </AuthLayout>
  );
}
