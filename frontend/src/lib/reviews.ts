import { api } from "../interceptors/api";

export type AgentReview = {
  review_id: string;
  agent_id: string;
  reviewer_id: string;
  reviewer_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentRatingSummary = {
  agent_id: string;
  average_rating: number | null;
  review_count: number;
  stale_listings_count: number;
  rating_penalty: number;
  rating: number | null;
};

export async function getAgentRating(agentId: string): Promise<AgentRatingSummary | null> {
  try {
    const res = await api.get(`/reviews/agent/${agentId}/summary`);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

export async function getAgentReviews(agentId: string): Promise<AgentReview[]> {
  try {
    const res = await api.get(`/reviews/agent/${agentId}`);
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function submitReview(
  agentId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; status?: number; message?: string }> {
  try {
    await api.post("/reviews", { agent_id: agentId, rating, comment: comment || undefined });
    return { ok: true };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    return {
      ok: false,
      status,
      message:
        status === 409
          ? "You have already reviewed this agent."
          : "Could not save the review. Try again.",
    };
  }
}

export async function updateReview(
  reviewId: string,
  rating: number,
  comment: string,
): Promise<boolean> {
  try {
    await api.patch(`/reviews/${reviewId}`, { rating, comment });
    return true;
  } catch {
    return false;
  }
}

/** A listing is stale when its status has gone un-updated for 30+ days. */
export const STALE_AFTER_DAYS = 30;
const STALE_STATUSES = new Set(["available", "partially_occupied", "coming_soon"]);

export function isListingStale(listing: {
  status?: string | null;
  status_updated_at?: string | null;
  uploaded_at?: string | null;
}): boolean {
  const status = (listing.status || "").toLowerCase();
  if (!STALE_STATUSES.has(status)) return false;
  const ref = listing.status_updated_at || listing.uploaded_at;
  if (!ref) return false;
  const updated = new Date(ref).getTime();
  if (!Number.isFinite(updated)) return false;
  return Date.now() - updated > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}
