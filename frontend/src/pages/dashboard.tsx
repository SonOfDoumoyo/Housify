import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../interceptors/api";
import axios from "axios";
import { useUserPage } from "../hooks/useUser";
import type { Listing } from "../schemas/listingtype";
import { AlertCircle, Bookmark, Building2, Home, Inbox, Plus, Search } from "lucide-react";
import ListingCard from "../components/ListingCard";
import ListingStatusControl from "../components/ListingStatusControl";
import Avatar from "../components/Avatar";
import { firstName } from "../lib/format";
import { getSavedIds } from "../lib/savedHomes";
import { missingAgentRequirements } from "../lib/agentReadiness";
import { getAgentRating, isListingStale, type AgentRatingSummary } from "../lib/reviews";
import { Stars } from "../components/AgentReviews";

/**
 * Dashboard — two versions from the mockup:
 *  Customer: "Welcome back, Nimi" + Saved Homes / Homes available +
 *    Your Saved Homes + Top Picks.
 *  Agent: "Welcome back, Agent!" + Total Listings / Available +
 *    Your Listings + Add Listing.
 */
export default function Dashboard() {
  const { currentUser } = useUserPage();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedIds());

  const isAgent = currentUser?.role === "agent" || currentUser?.role === "landlord";
  // Agents only ever see their own listings — never another agent's.
  const visibleListings = useMemo(
    () => (isAgent ? listings.filter((l) => l.agent_id === currentUser?.uid) : listings),
    [listings, isAgent, currentUser],
  );
  // Local status overrides so a status change shows instantly without
  // refetching the user (the backend is the source of truth on reload).
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const myListings = (currentUser?.listed ?? []).map((l) => ({
    ...l,
    status: statusOverrides[l.listing_id] ?? l.status,
  }));
  const missingRequirements = missingAgentRequirements(currentUser);
  const staleListings = useMemo(() => myListings.filter(isListingStale), [myListings]);
  const totalViews = useMemo(
    () => myListings.reduce((sum, l) => sum + (l.views_count ?? 0), 0),
    [myListings],
  );
  const [ratingSummary, setRatingSummary] = useState<AgentRatingSummary | null>(null);

  useEffect(() => {
    if (!isAgent || !currentUser) return;
    let cancelled = false;
    (async () => {
      const summary = await getAgentRating(currentUser.uid);
      if (!cancelled) setRatingSummary(summary);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAgent, currentUser]);

  useEffect(() => {
    const onStorage = () => setSavedIds(getSavedIds());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser) return;
      try {
        const res = await api.get("/list/all_listings");
        if (!cancelled) setListings(Array.isArray(res?.data) ? res.data : []);
      } catch (err: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(err)) setError(err.response?.data?.detail || "Couldn't fetch homes.");
          else setError("Server not reachable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const available = useMemo(
    () => visibleListings.filter((l) => (l.status || "available") === "available"),
    [visibleListings],
  );
  const savedHomes = useMemo(
    () => visibleListings.filter((l) => savedIds.includes(l.listing_id)),
    [visibleListings, savedIds],
  );
  const topPicks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = visibleListings.filter((l) => l.images?.length > 0);
    if (!q) return pool.slice(0, 6);
    return pool.filter(
      (l) => l.title.toLowerCase().includes(q) || (l.address || "").toLowerCase().includes(q),
    );
  }, [visibleListings, search]);

  const myAvailable = myListings.filter((l) => (l.status || "available") === "available").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Welcome */}
      <section className="welcome-card">
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar name={currentUser?.fullname} src={currentUser?.profile_image} size={64} />
          <div style={{ minWidth: 0 }}>
            <h2>
              Welcome back, {firstName(currentUser?.fullname)} 👋
            </h2>
            <p>{isAgent ? "Manage your listings and enquiries." : "Find your next rental home."}</p>
          </div>
        </div>
        {!isAgent && (
          <form
            className="search-bar"
            style={{ marginTop: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              navigate(search.trim() ? `/dashboard/browse?q=${encodeURIComponent(search.trim())}` : "/dashboard/browse");
            }}
          >
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for homes…"
              aria-label="Search for homes"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        )}
      </section>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 0 }}>
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {isAgent && missingRequirements.length > 0 && (
        <div className="alert alert-warning" role="alert" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <AlertCircle size={17} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 200 }}>
            Before you can publish a listing, update your contact
            details (phone number) in Settings.
          </span>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/settings")}>
            Go to Settings
          </button>
        </div>
      )}

      {isAgent && staleListings.length > 0 && (
        <div className="alert alert-error" role="alert" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <AlertCircle size={17} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 200 }}>
            {staleListings.length} of your listing{staleListings.length === 1 ? "" : "s"} hasn&apos;t had
            its status updated in over 30 days. Update the status or your
            rating will reduce.
          </span>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/listings")}>
            Update statuses
          </button>
        </div>
      )}

      {isAgent && ratingSummary?.rating != null && (
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          Your rating: <Stars value={ratingSummary.rating} />
          <b>{ratingSummary.rating.toFixed(1)}</b>
          <span style={{ color: "var(--muted)" }}>
            ({ratingSummary.review_count} review{ratingSummary.review_count === 1 ? "" : "s"})
            {ratingSummary.rating_penalty > 0
              ? ` · reduced by ${ratingSummary.rating_penalty} until your listing statuses are updated`
              : ""}
          </span>
        </p>
      )}

      {/* Stats */}
      <section className="stat-grid" aria-label="Overview">
        {isAgent ? (
          <>
            <div className="card stat-card">
              <span className="stat-icon">
                <Building2 size={19} />
              </span>
              <b>{myListings.length}</b>
              <span>Total Listings</span>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <Home size={19} />
              </span>
              <b>{myAvailable}</b>
              <span>Available Listings</span>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <Inbox size={19} />
              </span>
              <b>{totalViews}</b>
              <span>Total views on your listings</span>
            </div>
            <div className="card stat-card" style={{ background: "#0f2040", borderColor: "#0f2040" }}>
              <span className="stat-icon" style={{ background: "#1e3a66", color: "#93c5fd" }}>
                <Plus size={19} />
              </span>
              <b style={{ color: "#fff", fontSize: 16 }}>Add a listing</b>
              <span style={{ color: "#94a3b8" }}>Publish a new rental home</span>
              <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate("/listing")}>
                + Add Listing
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card stat-card">
              <span className="stat-icon">
                <Bookmark size={19} />
              </span>
              <b>{savedHomes.length}</b>
              <span>Saved Homes</span>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <Home size={19} />
              </span>
              <b>{available.length}</b>
              <span>Homes Available</span>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <Building2 size={19} />
              </span>
              <b>{listings.length}</b>
              <span>Total Listings</span>
            </div>
            <div className="card stat-card" style={{ background: "#0f2040", borderColor: "#0f2040" }}>
              <span className="stat-icon" style={{ background: "#1e3a66", color: "#93c5fd" }}>
                <Search size={19} />
              </span>
              <b style={{ color: "#fff", fontSize: 16 }}>Keep exploring</b>
              <span style={{ color: "#94a3b8" }}>New homes are added often</span>
              <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate("/dashboard/browse")}>
                Browse homes
              </button>
            </div>
          </>
        )}
      </section>

      {/* Agent: my listings */}
      {isAgent && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>Your Listings</h2>
            <button type="button" className="text-link" onClick={() => navigate("/listings")}>
              View all →
            </button>
          </div>
          {myListings.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">
                <Building2 size={26} />
              </div>
              <h3>No listings yet</h3>
              <p>Add your first property and it will appear here.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate("/listing")}>
                + Add your first listing
              </button>
            </div>
          ) : (
            <div className="home-grid">
              {myListings.slice(0, 3).map((l) => (
                <div key={l.listing_id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ListingCard
                    listing={{
                      listing_id: l.listing_id,
                      title: l.title,
                      address: l.address,
                      price: l.price,
                      currency: l.currency,
                      status: l.status,
                      image_url: l.images?.[0]?.image_url,
                      views_count: l.views_count,
                      contact_count: l.contact_count,
                    }}
                  />
                  <div className="card" style={{ padding: "12px 14px" }}>
                    <ListingStatusControl
                      listingId={l.listing_id}
                      status={l.status}
                      onChanged={(next) => setStatusOverrides((o) => ({ ...o, [l.listing_id]: next }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Customer: saved homes */}
      {!isAgent && savedHomes.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>Your Saved Homes</h2>
            <button type="button" className="text-link" onClick={() => navigate("/dashboard/browse")}>
              View all →
            </button>
          </div>
          <div className="home-grid">
            {savedHomes.slice(0, 3).map((l) => (
              <ListingCard
                key={l.listing_id}
                listing={{
                  listing_id: l.listing_id,
                  title: l.title,
                  address: l.address,
                  price: l.price,
                  currency: l.currency,
                  status: l.status,
                  image_url: l.images?.[0]?.image_url,
                  views_count: l.views_count,
                  contact_count: l.contact_count,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Top picks / discover — customers only; agents see their own
          listings in Your Listings above and on Browse Homes. */}
      {!isAgent && (
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 19, margin: 0 }}>{isAgent ? "Discover rental properties" : "Top Picks"}</h2>
          <button type="button" className="text-link" onClick={() => navigate("/dashboard/browse")}>
            See all →
          </button>
        </div>
        {loading ? (
          <div className="home-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ height: 300, background: "#eef2f7", border: "none" }} />
            ))}
          </div>
        ) : topPicks.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">
              <Home size={26} />
            </div>
            <h3>No homes to show yet</h3>
            <p>{search ? "Nothing matches that search." : "Listings will appear here once they are published."}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate("/dashboard/browse")}>
              Browse homes
            </button>
          </div>
        ) : (
          <div className="home-grid">
            {topPicks.map((l) => (
              <ListingCard
                key={l.listing_id}
                listing={{
                  listing_id: l.listing_id,
                  title: l.title,
                  address: l.address,
                  price: l.price,
                  currency: l.currency,
                  status: l.status,
                  image_url: l.images?.[0]?.image_url,
                  views_count: l.views_count,
                  contact_count: l.contact_count,
                }}
              />
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
