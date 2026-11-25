import { useEffect, useState } from "react";
import { api } from "../interceptors/api";
import BrowseGrid from "../components/BrowseGrid";
import type { CardListing } from "../components/ListingCard";
import { useUserPage } from "../hooks/useUser";
import { isAgentLike } from "../lib/agentReadiness";
import type { Listing } from "../schemas/listingtype";

function toCard(l: Listing): CardListing {
  return {
    listing_id: l.listing_id,
    title: l.title,
    address: l.address || l.location,
    price: l.price,
    currency: l.currency,
    status: l.status,
    image_url: l.images?.[0]?.image_url,
    views_count: l.views_count,
    contact_count: l.contact_count,
  };
}

/**
 * Browse Homes inside the signed-in workspace — the same grid as the
 * public page, but it never leaves the dashboard and never logs the
 * user out. Agents only ever see their own listings here; customers
 * and admins see every listing.
 */
export default function DashboardBrowse() {
  const { currentUser } = useUserPage();
  const [listings, setListings] = useState<CardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const res = await api.get("/list/all_listings");
        const rows: Listing[] = Array.isArray(res?.data) ? res.data : [];
        const visible = isAgentLike(currentUser)
          ? rows.filter((l) => l.agent_id === currentUser?.uid)
          : rows;
        if (!cancelled) setListings(visible.map(toCard));
      } catch {
        if (!cancelled) {
          setListings([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, currentUser]);

  return (
    <BrowseGrid
      listings={listings}
      loading={loading}
      loadError={loadError}
      onRetry={() => setReloadKey((k) => k + 1)}
      heading={isAgentLike(currentUser) ? "My Homes" : "Browse Homes"}
      subheading={
        isAgentLike(currentUser)
          ? "Only your own listings appear here — other agents' homes are hidden from you."
          : "Find the perfect rental property for you."
      }
    />
  );
}
