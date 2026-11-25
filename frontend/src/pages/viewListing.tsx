import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { Listing } from "../schemas/listingtype";
import type { Agent } from "../schemas/usertype";
import { api } from "../interceptors/api";
import axios from "axios";
import { ChevronLeft, ChevronRight, Eye, Heart, MapPin, MessageCircle, Phone, Share2, ShieldCheck, Video } from "lucide-react";
import { formatMoney, statusClass, statusLabel } from "../lib/format";
import { buildWhatsAppHref } from "../lib/contact";
import { getAgentRating, type AgentRatingSummary } from "../lib/reviews";
import { isSaved, toggleSaved } from "../lib/savedHomes";
import { recordListingContact, recordListingView } from "../lib/listingStats";
import { PublicFooter, PublicNav } from "../components/PublicNav";
import { useUser } from "../contexts/userContext";
import Avatar from "../components/Avatar";
import AgentReviews, { Stars } from "../components/AgentReviews";

type ViewListingProps = { uid?: string };

/**
 * Property Details — large gallery with thumbnails, price + location,
 * About This Property, Location, video tour, agent reviews, and a
 * sticky Contact Agent card. Live API data only — no static listings.
 * Opening a listing records one view; tapping WhatsApp / Call records
 * one contact, and both counts are shown to the customer.
 */
export default function ViewListing({ uid }: ViewListingProps) {
  const params = useParams();
  const listingLid = uid ?? params.uid;
  const navigate = useNavigate();
  const { currentUser, loading: userLoading } = useUser();

  // Contacting an agent is for signed-in users only. A visitor tapping
  // WhatsApp or Call first goes to sign in (or sign up from there) and
  // comes back to this listing afterwards. Nothing is recorded until
  // a signed-in user actually contacts the agent.
  const signInNext = `/sign-in?next=${encodeURIComponent(`/listing-details/${listingLid}`)}`;
  const requireAuth = () => navigate(signInNext);

  const [listingData, setListingData] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agentData, setAgentData] = useState<Agent | null>(null);
  const [saved, setSaved] = useState(false);
  const [viewsCount, setViewsCount] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const images: { url: string; caption?: string }[] =
    listingData?.images?.map((i) => ({ url: i.image_url, caption: i.captions })) || [];
  const videos = listingData?.videos || [];

  const title = listingData?.title || "Property";
  const price = listingData?.price ?? 0;
  const currency = listingData?.currency || "NGN";
  const address = listingData?.address || "";
  const status = listingData?.status || "available";
  const description =
    listingData?.description ||
    "A beautiful home in a serene and secure estate. This property comes with modern fittings, spacious rooms, and 24/7 security.";

  const phoneNumber = (agentData?.phone_number || "").replace(/[^\d+]/g, "");
  // The WhatsApp message is prefilled with the house title, description
  // and price, so the agent knows which home the customer means.
  const whatsappHref = buildWhatsAppHref(
    agentData?.phone_number || "",
    agentData?.whatsapp_link,
    title,
    description,
    price,
    currency,
  );
  const [ratingSummary, setRatingSummary] = useState<AgentRatingSummary | null>(null);

  // An agent only ever sees their own listings: opening another
  // agent's listing sends them back to their own browse page.
  // Customers and admins may view any listing.
  const isOwner =
    !!currentUser && !!listingData && currentUser.uid === listingData.agent_id;
  const isAgentViewer =
    currentUser?.role === "agent" || currentUser?.role === "landlord";
  const blockedAgent =
    !userLoading && !!currentUser && isAgentViewer && !!listingData && !isOwner;

  useEffect(() => {
    if (blockedAgent) navigate("/dashboard/browse", { replace: true });
  }, [blockedAgent, navigate]);

  // Keep the saved state in sync with localStorage (shared with Dashboard).
  useEffect(() => {
    if (listingLid) setSaved(isSaved(listingLid));
  }, [listingLid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`list/a_listing/${listingLid}`);
        if (cancelled) return;
        setListingData(res?.data);
        setViewsCount(res?.data?.views_count ?? null);
        setContactCount(res?.data?.contact_count ?? null);
        // One view per browser session for this listing.
        if (listingLid) {
          const updated = await recordListingView(listingLid);
          if (updated != null) setViewsCount(updated);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || "Could not fetch this listing.");
        } else {
          setError("Server not reachable.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingLid]);

  const handleContact = async () => {
    if (!listingLid) return;
    if (!currentUser) {
      requireAuth();
      return;
    }
    const updated = await recordListingContact(listingLid);
    if (updated != null) setContactCount(updated);
    else setContactCount((c) => (c == null ? 1 : c + 1));
  };

  useEffect(() => {
    if (!listingData?.agent_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`user/agent_user/${listingData.agent_id}`);
        if (!cancelled) setAgentData(res?.data.agent);
        const summary = await getAgentRating(listingData.agent_id);
        if (!cancelled) setRatingSummary(summary);
      } catch {
        /* agent card simply hides contact buttons */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingData]);

  const goTo = (index: number) => {
    if (!images.length) return;
    const i = Math.max(0, Math.min(index, images.length - 1));
    setCurrentIndex(i);
    galleryRef.current?.scrollTo({ left: i * galleryRef.current.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!galleryRef.current) return;
    setCurrentIndex(Math.round(galleryRef.current.scrollLeft / galleryRef.current.clientWidth));
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.share({ title, text: `${title} — ${formatMoney(price, currency)}/year`, url });
    } catch {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    }
  };

  return (
    <div className="public-site">
      <PublicNav />
      <main style={{ flex: 1, background: "var(--page)", paddingBottom: 90 }}>
        <div className="container-x" style={{ paddingTop: 20 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ paddingLeft: 0, marginBottom: 12 }}
            onClick={() => navigate("/browse")}
          >
            <ChevronLeft size={18} /> Back to Browse Homes
          </button>

          {error && !listingData ? (
            <div className="card empty-state">
              <h3>Listing not found</h3>
              <p>{error}</p>
              <Link to="/browse" className="btn btn-primary">
                Browse homes
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>{title}</h1>
                  <p style={{ margin: 0, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    <MapPin size={15} /> {address}
                  </p>
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", display: "flex", alignItems: "center", gap: 16, fontSize: 13, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Eye size={15} /> {viewsCount ?? 0} view{(viewsCount ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <MessageCircle size={15} /> {contactCount ?? 0} {(contactCount ?? 0) === 1 ? "person has" : "people have"} contacted the agent
                    </span>
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (listingLid) setSaved(toggleSaved(listingLid));
                    }}
                    aria-label={saved ? "Remove from saved" : "Save this home"}
                    aria-pressed={saved}
                  >
                    <Heart size={18} fill={saved ? "#2563eb" : "none"} color={saved ? "#2563eb" : "currentColor"} />
                  </button>
                  <button className="icon-btn" onClick={share} aria-label="Share this listing">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <div className="detail-grid">
                <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
                  <div>
                    <div className="gallery-main">
                      <div
                        ref={galleryRef}
                        onScroll={onScroll}
                        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
                      >
                        {images.map((img, i) => (
                          <img
                            key={`${img.url}-${i}`}
                            src={img.url}
                            alt={`${title} — photo ${i + 1}`}
                            style={{ minWidth: "100%", scrollSnapAlign: "center" }}
                          />
                        ))}
                        {images.length === 0 && (
                          <div style={{ minWidth: "100%", height: 280, display: "grid", placeItems: "center", color: "#64748b" }}>
                            No photos yet
                          </div>
                        )}
                      </div>
                      <span className={`pill ${statusClass(status)}`}>
                        <span className="dot" />
                        {statusLabel(status)}
                      </span>
                      {images.length > 1 && (
                        <>
                          <button className="gallery-nav prev" onClick={() => goTo(currentIndex - 1)} aria-label="Previous photo">
                            <ChevronLeft size={20} />
                          </button>
                          <button className="gallery-nav next" onClick={() => goTo(currentIndex + 1)} aria-label="Next photo">
                            <ChevronRight size={20} />
                          </button>
                          <span className="gallery-counter">
                            {currentIndex + 1} / {images.length}
                          </span>
                        </>
                      )}
                    </div>
                    {images.length > 1 && (
                      <div className="thumb-row" style={{ marginTop: 12 }}>
                        {images.map((img, i) => (
                          <img
                            key={`${img.url}-t-${i}`}
                            src={img.url}
                            alt=""
                            className={currentIndex === i ? "active" : ""}
                            onClick={() => goTo(i)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {videos.length > 0 && (
                    <section className="card detail-section">
                      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Video size={19} /> Video tour
                      </h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {videos.map((v) => (
                          <video
                            key={v.video_id}
                            src={v.video_url}
                            controls
                            playsInline
                            preload="metadata"
                            style={{ width: "100%", borderRadius: 14, background: "#000" }}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
                        Short clips from the agent — up to 30 seconds each.
                      </p>
                    </section>
                  )}

                  {listingData && (
                    <AgentReviews
                      agentId={listingData.agent_id}
                      agentName={agentData?.fullname || "this agent"}
                    />
                  )}

                  <section className="card detail-section">
                    <h2>About This Property</h2>
                    <p>{description}</p>
                    <div style={{ marginTop: 16 }}>
                      <div className="kv-row">
                        <ShieldCheck size={17} />
                        <span>
                          Status: <b style={{ textTransform: "capitalize" }}>{statusLabel(status)}</b>
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="card detail-section">
                    <h2>Location</h2>
                    <div className="kv-row">
                      <MapPin size={17} />
                      <span>
                        Address: <b>{address || "—"}</b>
                      </span>
                    </div>
                    <div className="kv-row">
                      <MapPin size={17} />
                      <span>
                        Location: <b>{address || "—"}</b>
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        border: "2px dashed #bfdbfe",
                        background: "#eff6ff",
                        borderRadius: 14,
                        minHeight: 140,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        color: "#64748b",
                        fontSize: 13,
                      }}
                    >
                      <MapPin size={22} />
                      Map preview coming soon
                    </div>
                  </section>
                </div>

                <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <section className="card detail-section">
                    <div style={{ font: "800 26px Manrope", color: "#0f2040" }}>
                      {formatMoney(price, currency)} <small style={{ font: "600 13px 'DM Sans'", color: "#64748b" }}>/ year</small>
                    </div>
                    {isOwner ? (
                      <>
                        <p style={{ fontSize: 13.5, color: "#64748b", marginTop: 6 }}>
                          This is your listing. Customers see the contact
                          buttons here — you don&apos;t contact yourself.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-block btn-lg"
                            onClick={() => navigate(`/listings?edit=${listingLid}`)}
                          >
                            Edit this listing
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-block btn-lg"
                            onClick={() => navigate("/listings")}
                          >
                            Manage my listings
                          </button>
                        </div>
                      </>
                    ) : (
                    <>
                    <p style={{ fontSize: 13.5, color: "#64748b", marginTop: 6 }}>
                      Contact the listing agent directly to ask questions or arrange a viewing. No payments are made on Housify.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                      {!currentUser && (
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                          Sign in or create an account to contact the agent.
                        </p>
                      )}
                      {whatsappHref ? (
                        currentUser ? (
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block btn-lg" onClick={handleContact}>
                            <MessageCircle size={17} /> Chat on WhatsApp
                          </a>
                        ) : (
                          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={requireAuth}>
                            <MessageCircle size={17} /> Chat on WhatsApp
                          </button>
                        )
                      ) : (
                        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => navigate(signInNext)}>
                          Contact Agent
                        </button>
                      )}
                      {phoneNumber ? (
                        currentUser ? (
                          <a href={`tel:${phoneNumber}`} className="btn btn-outline btn-block btn-lg" onClick={handleContact}>
                            <Phone size={16} /> Call agent
                          </a>
                        ) : (
                          <button type="button" className="btn btn-outline btn-block btn-lg" onClick={requireAuth}>
                            <Phone size={16} /> Call agent
                          </button>
                        )
                      ) : null}
                      {!whatsappHref && !phoneNumber && (
                        <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                          The agent has not added contact details yet.
                        </p>
                      )}
                      <p style={{ fontSize: 12.5, color: "#64748b", margin: 0 }}>
                        Housify only connects you with the agent. Your safety
                        is your own responsibility: verify the agent, view
                        the home before paying anything, and meet in a safe
                        place. See our{" "}
                        <Link to="/terms" style={{ color: "#2563eb" }}>Terms of Service</Link>.
                      </p>
                    </div>
                    </>
                    )}
                  </section>

                  {agentData && (
                    <section className="card detail-section">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar name={agentData.fullname} src={agentData.profile_image} size={48} radius={12} />
                        <div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>Listed by</div>
                          <b style={{ color: "#0f2040" }}>{agentData.fullname}</b>
                          <div style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>
                            {agentData.role || "Agent"}
                            {agentData.is_verified ? " · Verified" : ""}
                          </div>
                          {ratingSummary?.rating != null ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <Stars value={ratingSummary.rating} />
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                                {ratingSummary.rating.toFixed(1)}
                              </span>
                              <span style={{ fontSize: 12, color: "#64748b" }}>
                                ({ratingSummary.review_count} review{ratingSummary.review_count === 1 ? "" : "s"})
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>No reviews yet</div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile sticky CTA */}
      {listingData && !blockedAgent && (
        <div className="sticky-cta">
          <div>
            <div className="price">
              {formatMoney(price, currency)} <small>/ year</small>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{address}</div>
          </div>
          {isOwner ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/listings?edit=${listingLid}`)}
            >
              Edit listing
            </button>
          ) : whatsappHref ? (
            currentUser ? (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary" onClick={handleContact}>
                Contact Agent
              </a>
            ) : (
              <button type="button" className="btn btn-primary" onClick={requireAuth}>
                Contact Agent
              </button>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => navigate(signInNext)}>
              Contact Agent
            </button>
          )}
        </div>
      )}
      <PublicFooter />
    </div>
  );
}
