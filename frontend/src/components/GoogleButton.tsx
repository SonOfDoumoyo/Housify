import { Info } from "lucide-react";
import { startGoogleAuth, type GoogleFlow, type Role } from "../lib/googleAuth";

/** Inline Google "G" — no external image to fail offline. */
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

type GoogleButtonProps = {
  role: Role | "";
  rememberMe: boolean;
  flow: GoogleFlow;
  label?: string;
  onMissingRole?: () => void;
};

/**
 * Google button that cannot be used until a role is chosen.
 * First-time Google users must pick Customer or Agent first — the
 * role travels with the OAuth redirect (query param + sessionStorage).
 */
export default function GoogleButton({ role, rememberMe, flow, label, onMissingRole }: GoogleButtonProps) {
  const ready = role === "client" || role === "agent";
  return (
    <div>
      <button
        type="button"
        className="google-btn"
        disabled={!ready}
        aria-disabled={!ready}
        onClick={() => {
          if (!ready) {
            onMissingRole?.();
            return;
          }
          startGoogleAuth(role, rememberMe, flow);
        }}
      >
        <GoogleG />
        {label || (flow === "signup" ? "Sign up with Google" : "Continue with Google")}
      </button>
      {!ready && (
        <p className="role-hint">
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Choose <strong>Customer</strong> or <strong>Agent</strong> above first — we need to know
            how you&apos;ll use Housify before creating your Google account.
          </span>
        </p>
      )}
    </div>
  );
}
