/**
 * Google sign-in / sign-up helpers.
 *
 * Housify rule: a first-time Google user must choose a role — Customer
 * or Agent — BEFORE leaving for Google. The chosen role is:
 *  1. sent to the backend as a query param on the OAuth redirect, and
 *  2. saved in sessionStorage so the app can recover it after Google
 *     redirects back (in case the backend ignores the param).
 *
 * Backend contract (see README):
 *   GET {API_BASE}/auth/login/google?remember_me=true&role=client&flow=signup
 *   - `role` is `client` (Customer) or `agent` (Agent)
 *   - `flow` is `signup` or `signin`
 * After Google, if the user still has no role, the app sends them to
 * /complete-profile, which saves the role with
 *   PATCH /user/update_details/{email}  { role }
 */

export type Role = "client" | "agent";
export type GoogleFlow = "signup" | "signin";

export const ROLES: { value: Role; label: string; short: string; blurb: string }[] = [
  {
    value: "client",
    label: "Customer",
    short: "Client",
    blurb: "I'm looking for a home to rent.",
  },
  {
    value: "agent",
    label: "Agent",
    short: "Agent",
    blurb: "I list homes for rent.",
  },
];

export function roleLabel(role: string | null | undefined): string {
  if (role === "agent" || role === "landlord") return "Agent";
  if (role === "client") return "Customer";
  return role || "";
}

export function getApiBase(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1.0/").replace(/\/$/, "");
  return base;
}

const PENDING_ROLE_KEY = "housify_pending_role";
const PENDING_FLOW_KEY = "housify_google_flow";

export function savePendingGoogleRole(role: Role, flow: GoogleFlow) {
  try {
    sessionStorage.setItem(PENDING_ROLE_KEY, role);
    sessionStorage.setItem(PENDING_FLOW_KEY, flow);
  } catch {
    /* storage unavailable — the role query param still travels with the redirect */
  }
}

export function readPendingGoogleRole(): { role: Role | null; flow: GoogleFlow | null } {
  try {
    const role = sessionStorage.getItem(PENDING_ROLE_KEY) as Role | null;
    const flow = sessionStorage.getItem(PENDING_FLOW_KEY) as GoogleFlow | null;
    return {
      role: role === "client" || role === "agent" ? role : null,
      flow: flow === "signup" || flow === "signin" ? flow : null,
    };
  } catch {
    return { role: null, flow: null };
  }
}

export function clearPendingGoogleRole() {
  try {
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_FLOW_KEY);
  } catch {
    /* ignore */
  }
}

export function buildGoogleLoginUrl(role: Role, rememberMe: boolean, flow: GoogleFlow): string {
  const params = new URLSearchParams({
    remember_me: String(rememberMe),
    role,
    flow,
  });
  return `${getApiBase()}/auth/login/google?${params.toString()}`;
}

/** Redirect to Google. Call only after a role has been chosen. */
export function startGoogleAuth(role: Role, rememberMe: boolean, flow: GoogleFlow) {
  savePendingGoogleRole(role, flow);
  window.location.href = buildGoogleLoginUrl(role, rememberMe, flow);
}
