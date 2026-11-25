import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../interceptors/api";
import BrowseGrid from "../components/BrowseGrid";
import type { CardListing } from "../components/ListingCard";
import { PublicFooter, PublicNav } from "../components/PublicNav";
import { useUser } from "../contexts/userContext";
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

const PREVIEW_LIMIT = 3;

/**
 * Public Browse Homes — visitors only get a 3-home preview plus a
 * "See all homes" link to sign in. Signed-in users never see this
 * page: they browse inside the dashboard instead, so browsing never
 * drops them onto the public site or logs them out.
 */
export default function BrowseHomes() {
  const { currentUser } = useUser();
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
        if (!cancelled) setListings(rows.map(toCard));
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
  }, [reloadKey]);

  // Signed-in users browse inside their workspace, not here.
  // Redirect as soon as the user is known.
  if (currentUser) return <Navigate to="/dashboard/browse" replace />;

  return (
    <div className="public-site">
      <PublicNav />
      <main style={{ flex: 1, background: "#f6f8fc" }}>
        <div className="container-x" style={{ paddingTop: 32, paddingBottom: 56 }}>
          <BrowseGrid
            listings={listings}
            loading={loading}
            loadError={loadError}
            onRetry={() => setReloadKey((k) => k + 1)}
            previewLimit={PREVIEW_LIMIT}
          />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
