import { BedDouble, Eye, MapPin, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatMoney, statusClass, statusLabel } from "../lib/format";

export type CardListing = {
  listing_id: string;
  title: string;
  address?: string;
  location?: string;
  price: number;
  currency?: string | null;
  status?: string;
  bedrooms?: number;
  image_url?: string;
  image?: string;
  views_count?: number;
  contact_count?: number;
};

export default function ListingCard({ listing }: { listing: CardListing }) {
  const navigate = useNavigate();
  const img = listing.image_url || listing.image;
  const place = listing.address || listing.location || "";
  return (
    <article
      className="home-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/listing-details/${listing.listing_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/listing-details/${listing.listing_id}`);
      }}
    >
      <div className="home-photo">
        {img ? (
          <img src={img} alt={listing.title} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13 }}>
            No photo yet
          </div>
        )}
        <span className={`pill ${statusClass(listing.status)}`}>
          <span className="dot" />
          {statusLabel(listing.status)}
        </span>
      </div>
      <div className="home-card-body">
        <h3>{listing.title}</h3>
        <p className="home-loc">
          <MapPin size={14} /> {place}
        </p>
        {listing.bedrooms ? (
          <p className="home-meta">
            <span>
              <BedDouble size={14} /> {listing.bedrooms} bedroom{listing.bedrooms > 1 ? "s" : ""}
            </span>
          </p>
        ) : null}
        <div className="home-foot">
          <strong>
            {formatMoney(listing.price, listing.currency)} <small>/ year</small>
          </strong>
          <span className="tag">Rental</span>
        </div>
        {(listing.views_count != null || listing.contact_count != null) && (
          <p className="home-meta" style={{ marginTop: 8 }}>
            <span>
              <Eye size={14} /> {listing.views_count ?? 0} views
            </span>
            <span>
              <MessageCircle size={14} /> {listing.contact_count ?? 0} enquiries
            </span>
          </p>
        )}
      </div>
    </article>
  );
}
