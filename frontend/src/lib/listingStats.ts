import { api } from "../interceptors/api";

/** Record one view of a listing. Session-guarded so refreshes don't inflate it. */
export async function recordListingView(listingId: string): Promise<number | null> {
  try {
    const key = `housify_viewed_${listingId}`;
    if (sessionStorage.getItem(key)) return null;
    sessionStorage.setItem(key, "1");
    const res = await api.post(`/list/${listingId}/view`);
    return res?.data?.views_count ?? null;
  } catch {
    return null; // counters are best-effort; never block the page
  }
}

/** Record that the customer contacted the agent for a listing. */
export async function recordListingContact(listingId: string): Promise<number | null> {
  try {
    const res = await api.post(`/list/${listingId}/contact`);
    return res?.data?.contact_count ?? null;
  } catch {
    return null;
  }
}
