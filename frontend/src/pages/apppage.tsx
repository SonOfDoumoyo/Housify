import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, House, MapPin, Search, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../interceptors/api";
import { useUser } from "../contexts/userContext";
import type { Listing } from "../schemas/listingtype";
import heroImage from "../assets/housify-hero.png";
import ListingCard from "../components/ListingCard";
import { PublicFooter, PublicNav } from "../components/PublicNav";
import { formatMoney } from "../lib/format";

export function CreateButton({ name, type, link }: { name: string; type?: number; link?: string }) {
  return (
    <Link className={`btn ${type === 1 ? "btn-outline" : "btn-primary"}`} to={link || "/sign-in"}>
      {name}
      {type !== 1 && <ArrowRight size={16} />}
    </Link>
  );
}

export default function AppPage() {
  const [location, setLocation] = useState("");
  const [homes, setHomes] = useState<Listing[]>([]);
  const [homesLoading, setHomesLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useUser();

  // Production: featured homes come from the live API only — no static listings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/list/all_listings");
        if (!cancelled) setHomes(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!cancelled) setHomes([]);
      } finally {
        if (!cancelled) setHomesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The landing page is for visitors only: a signed-in user is sent
  // straight to their dashboard and cannot come back here until they
  // sign out. This return sits AFTER every hook: returning earlier
  // would change the hook count once the session loads and crash
  // React (error #300).
  if (currentUser) return <Navigate to="/dashboard" replace />;

  const goSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate(location.trim() ? `/browse?q=${encodeURIComponent(location.trim())}` : "/browse");
  };

  const featured = homes.filter((h) => h.images?.length > 0).slice(0, 3);
  const floatHome = featured[0];

  return (
    <div className="public-site">
      <PublicNav />

      <main style={{ flex: 1 }}>
        {/* Hero — headline left, house photo right */}
        <section className="hero" id="home">
          <div className="hero-inner">
            <div>
              <span className="eyebrow" style={{ color: "#93c5fd" }}>
                Rent smarter. Live better.
              </span>
              <h1>
                Find Your Perfect Rental <em>with Housify</em>
              </h1>
              <p className="lead">
                Discover quality rental homes from trusted landlords and agents, all in one place.
              </p>
              <form className="hero-search" onSubmit={goSearch}>
                <label className="search-field">
                  <MapPin size={18} />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Search by location… e.g. Lekki"
                    aria-label="Search by location"
                  />
                </label>
                <button type="submit" className="btn btn-primary">
                  <Search size={16} /> Search
                </button>
              </form>
              <div className="hero-points">
                <span>
                  <ShieldCheck size={16} /> Verified agents
                </span>
                <span>
                  <Clock3 size={16} /> Real photos &amp; short video tours
                </span>
                <span>
                  <Zap size={16} /> Easy enquiries
                </span>
              </div>
            </div>
            <div className="hero-media">
              <img src={heroImage.src} alt="Modern rental home at dusk" />
              {floatHome && (
                <div className="hero-float">
                  <span className="trust-icon" style={{ width: 38, height: 38 }}>
                    <House size={18} />
                  </span>
                  <div>
                    <b>{floatHome.title}</b>
                    <small>
                      {floatHome.address} · {formatMoney(floatHome.price, floatHome.currency)} / year
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="trust-strip container-x" style={{ maxWidth: 1200 }}>
          <div className="trust-item">
            <span className="trust-icon">
              <House size={19} />
            </span>
            <div>
              <b>Browse Listings</b>
              <p>Find homes in your preferred location.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <b>Trusted Agents</b>
              <p>Work with verified agents and landlords.</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">
              <Zap size={19} />
            </span>
            <div>
              <b>Easy Enquiries</b>
              <p>Get in touch with ease.</p>
            </div>
          </div>
        </section>

        {/* Featured listings — live data only */}
        <section className="section container-x" id="homes">
          <div className="section-head">
            <div>
              <span className="eyebrow">Top rental properties, handpicked for you</span>
              <h2>Featured Listings</h2>
              <p>Quality homes across Lagos — see the price, location and availability at a glance.</p>
            </div>
            <Link to="/sign-in" className="text-link">
              See all <ArrowRight size={16} />
            </Link>
          </div>
          {homesLoading ? (
            <div className="home-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card" style={{ height: 320, background: "var(--surface-muted)", border: "none" }} />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">
                <House size={26} />
              </div>
              <h3>No homes listed yet</h3>
              <p>Be the first to list a home — or check back soon for new rentals.</p>
              <Link to="/create-account" className="btn btn-primary">
                List a property
              </Link>
            </div>
          ) : (
            <div className="home-grid">
              {featured.map((home) => (
                <ListingCard
                  key={home.listing_id}
                  listing={{
                    listing_id: home.listing_id,
                    title: home.title,
                    address: home.address,
                    price: home.price,
                    currency: home.currency,
                    status: home.status,
                    image_url: home.images?.[0]?.image_url,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Agent CTA */}
        <section className="container-x" id="about" style={{ paddingBottom: 8 }}>
          <div className="agent-banner">
            <span className="eyebrow">For agents &amp; landlords</span>
            <h2>
              Have a property
              <br />
              to rent out?
            </h2>
            <p>
              List your property on Housify and reach renters who are already looking in your area.
            </p>
            <Link to="/create-account" className="btn btn-white">
              Join as an Agent <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="section container-x" id="how" style={{ paddingTop: 24 }}>
          <div className="section-head" style={{ justifyContent: "center", textAlign: "center" }}>
            <div style={{ marginInline: "auto" }}>
              <span className="eyebrow">Simple by design</span>
              <h2>Find a home in three steps</h2>
              <p style={{ marginInline: "auto" }}>
                A straightforward way to move from searching to contacting an agent.
              </p>
            </div>
          </div>
          <div className="steps-grid">
            <div className="card step-card">
              <span className="step-num">01</span>
              <h3>Explore</h3>
              <p>Browse rental listings and review their details, images and location.</p>
            </div>
            <div className="card step-card">
              <span className="step-num">02</span>
              <h3>Compare</h3>
              <p>Check the property status, photos and price before you reach out.</p>
            </div>
            <div className="card step-card">
              <span className="step-num">03</span>
              <h3>Connect</h3>
              <p>Open a property and use the agent&apos;s contact details to make an enquiry.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--muted)" }}>
              <ShieldCheck size={16} /> Verified agents, real photos
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--muted)" }}>
              <ShieldCheck size={16} /> No payments are made on Housify
            </span>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
