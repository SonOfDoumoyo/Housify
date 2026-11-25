import { useEffect, useRef, useState } from "react";
import { useUserPage } from "../hooks/useUser";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import ListingCard from "../components/ListingCard";
import ListingStatusControl from "../components/ListingStatusControl";
import EditListingForm from "../components/EditListingForm";
import { api } from "../interceptors/api";
import { isListingStale } from "../lib/reviews";
import type { Listing } from "../schemas/listingtype";

export default function ListedHouses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useUserPage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setListings(currentUser?.listed ?? []);
  }, [currentUser]);

  // Deep link from a listing's own details page: ?edit=<id> opens the
  // edit form for that listing straight away.
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) setEditingId(editId);
  }, [searchParams]);

  const closeEditor = (listingId: string) => {
    setEditingId(null);
    if (searchParams.get("edit") === listingId) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  };

  const deleteListing = async (listingId: string) => {
    setDeleting(true);
    setPhotoError("");
    try {
      await api.delete(`/list/${listingId}`);
      setListings((rows) => rows.filter((r) => r.listing_id !== listingId));
      setConfirmDeleteId(null);
    } catch {
      setPhotoError("Could not delete that listing. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const addPhotos = async (listingId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const picked = Array.from(files).filter(
      (f) => allowed.includes(f.type) && f.size <= 10 * 1024 * 1024,
    );
    if (picked.length === 0) {
      setPhotoError("Choose JPEG, PNG or WebP photos under 10 MB.");
      return;
    }
    const fd = new FormData();
    picked.forEach((file) => {
      fd.append("images", file);
      fd.append("captions", "");
    });
    setPhotoError("");
    try {
      const res = await api.post(`/list/add_listing_images?listing_id=${listingId}`, fd);
      const added = Array.isArray(res?.data) ? res.data : [];
      setListings((rows) =>
        rows.map((r) =>
          r.listing_id === listingId ? { ...r, images: [...(r.images || []), ...added] } : r,
        ),
      );
    } catch {
      setPhotoError("Photos could not be added. Try again.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>My Listings</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            Manage the rental properties you have published. When a home is
            taken, set its status to Taken, Paid For or Rented Out.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate("/listing")}>
          <Plus size={16} /> Add Listing
        </button>
      </div>

      {photoError && <div className="alert alert-error">{photoError}</div>}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (photoTarget) void addPhotos(photoTarget, e.target.files);
          setPhotoTarget(null);
          e.target.value = "";
        }}
      />

      {listings.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Building2 size={26} />
          </div>
          <h3>No listings yet</h3>
          <p>Your rental properties will appear here after you publish them.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/listing")}>
            Add your first listing
          </button>
        </div>
      ) : (
        <div className="home-grid">
          {listings.map((listing) => {
            const stale = isListingStale(listing);
            return (
              <div key={listing.listing_id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ListingCard
                  listing={{
                    listing_id: listing.listing_id,
                    title: listing.title,
                    address: listing.address,
                    price: listing.price,
                    currency: listing.currency,
                    status: listing.status,
                    image_url: listing.images?.[0]?.image_url,
                    views_count: listing.views_count,
                    contact_count: listing.contact_count,
                  }}
                />
                <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <ListingStatusControl
                    listingId={listing.listing_id}
                    status={listing.status}
                    onChanged={(next) =>
                      setListings((rows) =>
                        rows.map((r) => (r.listing_id === listing.listing_id ? { ...r, status: next, status_updated_at: new Date().toISOString() } : r)),
                      )
                    }
                  />
                  {stale && (
                    <p style={{ margin: 0, fontSize: 12.5, color: "#b45309", fontWeight: 600 }}>
                      This listing&apos;s status hasn&apos;t been updated in over 30 days.
                      Update it, or your rating will reduce.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setEditingId(editingId === listing.listing_id ? null : listing.listing_id)}
                    >
                      <Pencil size={15} /> {editingId === listing.listing_id ? "Close editor" : "Edit listing"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setPhotoTarget(listing.listing_id);
                        photoInputRef.current?.click();
                      }}
                    >
                      <ImagePlus size={15} /> Add photos
                    </button>
                    {confirmDeleteId === listing.listing_id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={deleting}
                          onClick={() => void deleteListing(listing.listing_id)}
                        >
                          <Trash2 size={15} /> {deleting ? "Deleting…" : "Yes, delete this listing"}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>
                          Keep it
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        onClick={() => setConfirmDeleteId(listing.listing_id)}
                      >
                        <Trash2 size={15} /> Delete listing
                      </button>
                    )}
                  </div>
                  {editingId === listing.listing_id && (
                    <EditListingForm
                      listing={listing}
                      onSaved={(updated) =>
                        setListings((rows) =>
                          rows.map((r) => (r.listing_id === updated.listing_id ? updated : r)),
                        )
                      }
                      onCancel={() => closeEditor(listing.listing_id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
