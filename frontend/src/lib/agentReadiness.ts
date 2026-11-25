/**
 * What an agent still owes before they can publish a listing: contact
 * details (a phone number) set in Settings. The verification selfie is
 * optional — it is no longer required. The backend enforces the same
 * gate.
 */
export type AgentRequirement = "phone_number";

export function missingAgentRequirements(user: {
  role?: string | null;
  phone_number?: string | null;
  verification_photo_url?: string | null;
} | null | undefined): AgentRequirement[] {
  if (!user) return [];
  const role = (user.role || "").toLowerCase();
  if (role !== "agent" && role !== "landlord") return [];
  const missing: AgentRequirement[] = [];
  if (!user.phone_number?.trim()) missing.push("phone_number");
  return missing;
}

export function isAgentLike(user: { role?: string | null } | null | undefined): boolean {
  const role = (user?.role || "").toLowerCase();
  return role === "agent" || role === "landlord";
}
