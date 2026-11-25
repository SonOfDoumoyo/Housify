import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Home, Search } from "lucide-react";
import ListingCard, { type CardListing } from "./ListingCard";

const PAGE_SIZE = 6;
type StatusFilter = "all" | "available" | "partially_occupied" | "occupied";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "partially_occupied", label: "Partially Occupied" },
  { value: "occupied", label: "Occupied" },
];

export type BrowseGridProps = {
  listings: CardListing[];
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  /** When set, the grid is a public preview: at most this many homes,
   *  no pagination, and a sign-in call to action to see the rest. */
  previewLimit?: number;
  heading?: string;
  subheading?: string;
};

/**
 * The Browse Homes grid from the mockup: search by location, status
 * pills, cards, client-side pagination. Live API data only.
 * Agents browsing inside the dashboard only ever receive their own
 * listings (the caller filters); visitors only get a preview.
 */
export default function BrowseGrid({
  listings,
  loading,
  loadError,
  onRetry,
  previewLimit,
  heading = "Browse Homes",
  subheading = "Find the perfect rental property for you.",
}: BrowseGridProps) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState<StatusFilter>(
    (params.get("status") as StatusFilter) || "all",
  );
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || (l.status || "available") === status;
      return matchesQuery && matchesStatus;
    });
  }, [listings, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = previewLimit
    ? filtered.slice(0, previewLimit)
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const applyQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    const next = new URLSearchParams(params);
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>{heading}</h1>
      <p style={{ margin: "0 0 22px", color: "#64748b" }}>{subheading}</p>

      <form
        className="search-bar"
        onSubmit={(e) => e.preventDefault()}
        style={{ marginBottom: 16 }}
      >
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => applyQuery(e.target.value)}
          placeholder="Search by location… e.g. Lekki, Yaba"
          aria-label="Search by location"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2040" }}>Status:</span>
        <div className="filter-row" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              className={`chip ${status === f.value ? "active" : ""}`}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
          {previewLimit && filtered.length > previewLimit
            ? `Showing ${visible.length} of ${filtered.length} homes`
            : `${filtered.length} home${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {loading ? (
        <div className="home-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 320, background: "var(--surface-muted)", border: "none" }} />
          ))}
        </div>
      ) : loadError ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Home size={26} />
          </div>
          <h3>Couldn&apos;t load homes</h3>
          <p>Check your connection and try again.</p>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Home size={26} />
          </div>
          <h3>{listings.length === 0 ? "No homes listed yet" : "No homes match that search"}</h3>
          <p>
            {listings.length === 0
              ? "Homes listed by agents will appear here."
              : "Try a different location or clear the status filter."}
          </p>
          {listings.length === 0 ? (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Refresh
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="home-grid">
            {visible.map((l) => (
              <ListingCard key={l.listing_id} listing={l} />
            ))}
          </div>
          {previewLimit && filtered.length > previewLimit && (
            <div className="card" style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: "18px 20px" }}>
              <div>
                <b style={{ fontSize: 16 }}>Want to see all {filtered.length} homes?</b>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
                  Sign in to browse every listing and contact the agents.
                </p>
              </div>
              <Link to="/sign-in" className="btn btn-primary">
                See all homes <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {!previewLimit && pageCount > 1 && (
            <div className="pager">
              <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  className={safePage === i + 1 ? "active" : ""}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={safePage === pageCount}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
