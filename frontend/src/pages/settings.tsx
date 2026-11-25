import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/userContext";
import { useUserPage } from "../hooks/useUser";
import { useTheme } from "../contexts/themeContext";
import { api } from "../interceptors/api";
import axios from "axios";
import { AlertTriangle, Camera, Lock, LogOut, Moon, Palette, Sun, Trash2, UserRound } from "lucide-react";
import FileUploader from "../components/fileUploader";
import Avatar from "../components/Avatar";
import { isAgentLike } from "../lib/agentReadiness";

type Tab = "profile" | "appearance" | "security" | "danger";

const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Lock },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

/**
 * Settings — the single place for profile, appearance, security and account
 * actions (there is no separate profile page). The left nav is a fixed
 * 240px column and hover only changes background colour, so nothing
 * shifts or resizes while moving the mouse across it.
 */
export default function Settings() {
  const { currentUser, setCurrentUser } = useUser();
  const { currentUser: pageUser } = useUserPage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("profile");
  const [showUploader, setShowUploader] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone_number: "",
    whatsapp_link: "",
  });

  // Verification selfie (agents/landlords): a photo of yourself, stored
  // in Cloudflare and used as your profile picture. Optional — it is
  // not required to publish a listing.
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [selfieUploading, setSelfieUploading] = useState(false);

  const uploadSelfie = async () => {
    if (!selfieFile || !currentUser) return;
    setSelfieUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", selfieFile);
      const res = await api.post("user/verification-photo", fd);
      setCurrentUser(res?.data ?? currentUser);
      setSelfieFile(null);
      setSelfiePreview("");
      setMessage("Verification photo uploaded. It is now your profile picture.");
    } catch (err: unknown) {
      fail(err, "Verification photo not uploaded. Try again.");
    } finally {
      setSelfieUploading(false);
    }
  };

  // Fill the form once the user loads (and after a save refreshes it).
  useEffect(() => {
    if (!currentUser) return;
    setForm({
      fullname: currentUser.fullname || "",
      email: currentUser.email || "",
      phone_number: currentUser.phone_number || "",
      whatsapp_link: currentUser.whatsapp_link || "",
    });
    setDirty(false);
  }, [currentUser]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const fail = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) setError(err.response?.data?.detail || err.response?.data || fallback);
    else setError(fallback);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.patch(`user/update_details/${currentUser.email}`, form);
      setCurrentUser(res?.data ?? { ...currentUser, ...form });
      setDirty(false);
      setMessage("Profile updated.");
    } catch (err: unknown) {
      fail(err, "Profile not updated. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!currentUser?.email) return;
    setError("");
    try {
      await api.post(`/auth/reset_password?email=${encodeURIComponent(currentUser.email)}`);
      setMessage(`A password reset email was sent to ${currentUser.email}.`);
    } catch (err: unknown) {
      fail(err, "Reset email not sent.");
    }
  };

  const deactivate = async () => {
    if (!currentUser) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("status", "deactivated");
      await api.patch(`user/update_details/${currentUser.email}`, fd);
      setMessage("Account deactivated. Your profile and listings are hidden.");
    } catch (err: unknown) {
      fail(err, "Could not deactivate the account.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAllListings = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`list/delete_listings`);
      setMessage("All your listings were deleted.");
    } catch (err: unknown) {
      fail(err, "Could not delete listings.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`auth/delete_account`);
      setCurrentUser(null);
      navigate("/");
    } catch (err: unknown) {
      fail(err, "Could not delete the account.");
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await api.post("auth/logout");
    } catch {
      /* session already gone */
    }
    setCurrentUser(null);
    navigate("/sign-in");
  };

  const user = currentUser ?? pageUser;
  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Settings</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
          Your profile, appearance, security and account.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="settings-layout">
        <nav className="card settings-nav" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)} aria-current={tab === id ? "true" : undefined}>
              <Icon size={17} /> {label}
            </button>
          ))}
          <button type="button" className="danger" onClick={() => void signOut()}>
            <LogOut size={17} /> Sign out
          </button>
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {tab === "profile" && (
            <>
              <section className="card detail-section" style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 96, height: 96, marginInline: "auto" }}>
                  <Avatar
                    name={user.fullname}
                    src={user.profile_image}
                    size={96}
                    style={{ border: "2px solid var(--primary)" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    aria-label="Change profile photo"
                    onClick={() => setShowUploader((s) => !s)}
                    style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, padding: 0, borderRadius: "50%", display: "grid", placeItems: "center" }}
                  >
                    <Camera size={15} />
                  </button>
                </div>
                <h2 style={{ margin: "12px 0 2px", fontSize: 19 }}>{user.fullname}</h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, textTransform: "capitalize" }}>
                  {user.role || "Member"}
                  {user.is_verified ? " · Verified" : ""}
                </p>
                {showUploader && (
                  <div style={{ marginTop: 16 }}>
                    <FileUploader />
                  </div>
                )}
              </section>

              {isAgentLike(user) && (
                <section className="card detail-section">
                  <h2>Verification photo <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>(optional)</span></h2>
                  <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                    Take a clear photo of yourself. It is stored securely and
                    becomes your profile picture, so customers know who they
                    are dealing with. This is optional — you don&apos;t need
                    it to publish a listing.
                  </p>
                  {user.verification_photo_url ? (
                    <p style={{ fontSize: 13.5, color: "#16a34a", fontWeight: 600, marginTop: 12 }}>
                      ✓ Verification photo uploaded.
                    </p>
                  ) : (
                    <p style={{ fontSize: 13.5, color: "#64748b", fontWeight: 600, marginTop: 12 }}>
                      No verification photo yet — optional, but it helps customers trust you.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Choose a photo of yourself"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setSelfieFile(file);
                        setSelfiePreview(file ? URL.createObjectURL(file) : "");
                      }}
                    />
                    {selfiePreview && (
                      <img src={selfiePreview} alt="Verification photo preview" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12 }} />
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!selfieFile || selfieUploading}
                      onClick={() => void uploadSelfie()}
                    >
                      {selfieUploading ? "Uploading…" : "Upload verification photo"}
                    </button>
                  </div>
                </section>
              )}

              <section className="card detail-section">
                <h2>Profile information</h2>
                <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                  Update your public profile and contact details.
                  {isAgentLike(user) ? " Your phone number is required before you can publish a listing." : ""}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }} className="settings-form-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      className="input"
                      value={form.fullname}
                      onChange={(e) => { setForm({ ...form, fullname: e.target.value }); setDirty(true); }}
                    />
                  </label>
                  <label className="field">
                    <span>Email address</span>
                    <input
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); setDirty(true); }}
                    />
                  </label>
                  <label className="field">
                    <span>Phone number</span>
                    <input
                      className="input"
                      value={form.phone_number}
                      onChange={(e) => { setForm({ ...form, phone_number: e.target.value }); setDirty(true); }}
                    />
                  </label>
                  <label className="field">
                    <span>WhatsApp link</span>
                    <input
                      className="input"
                      placeholder="https://wa.me/2348..."
                      value={form.whatsapp_link}
                      onChange={(e) => { setForm({ ...form, whatsapp_link: e.target.value }); setDirty(true); }}
                    />
                  </label>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={() => void saveProfile()}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </section>
            </>
          )}

          {tab === "appearance" && (
            <section className="card detail-section">
              <h2>Appearance</h2>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                Choose how Housify looks. Your choice is saved on this device.
              </p>
              <div className="theme-choice" style={{ marginTop: 16 }}>
                <button type="button" className={theme === "light" ? "active" : ""} onClick={() => { if (theme !== "light") toggleTheme(); }}>
                  <Sun size={18} /> Light mode
                </button>
                <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => { if (theme !== "dark") toggleTheme(); }}>
                  <Moon size={18} /> Dark mode
                </button>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "14px 0 0" }}>
                You can also switch anytime from the sun / moon button in the top bar.
              </p>
            </section>
          )}

          {tab === "security" && (
            <section className="card detail-section">
              <h2>Change password</h2>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                We&apos;ll email {user.email} a link to reset your password.
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => void resetPassword()}>
                Email me a reset link
              </button>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>Active sessions</h3>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Session management is coming soon.</p>
              </div>
            </section>
          )}

          {tab === "danger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="alert alert-error" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <AlertTriangle size={18} /> Actions in this section are irreversible. Please proceed with care.
              </div>
              <section className="card detail-section">
                <h2>Deactivate account</h2>
                <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                  Temporarily hide your profile and listings. You can reactivate at any time.
                </p>
                <button type="button" className="btn btn-danger-outline" style={{ marginTop: 12 }} disabled={busy} onClick={() => void deactivate()}>
                  Deactivate
                </button>
              </section>
              <section className="card detail-section">
                <h2>Delete all listings</h2>
                <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                  Permanently remove all your property listings. This cannot be undone.
                </p>
                <button type="button" className="btn btn-danger-outline" style={{ marginTop: 12 }} disabled={busy} onClick={() => void deleteAllListings()}>
                  Delete all listings
                </button>
              </section>
              <section className="card detail-section">
                <h2>Delete account</h2>
                <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
                  Permanently delete your Housify account and all associated data. This action cannot be reversed.
                </p>
                <button type="button" className="btn btn-danger" style={{ marginTop: 12 }} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={16} /> Delete my account
                </button>
              </section>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <h2 id="delete-account-title" style={{ marginTop: 0 }}>Delete account?</h2>
            <p style={{ color: "var(--muted)" }}>
              This will permanently erase your account and all its data. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteAccount()}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
