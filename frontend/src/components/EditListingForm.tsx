import { useEffect, useState } from "react";
import { api } from "../interceptors/api";
import { CURRENCIES } from "../lib/format";
import { getAddresses, type AddressOption } from "../lib/addresses";
import type { Listing } from "../schemas/listingtype";
import type { Images } from "../schemas/imagestype";

/**
 * Edit one of the agent's own listings: title, description, area,
 * address, price, currency, and the caption of each photo. Only the
 * listing's owner (or an admin) can save — the backend enforces the
 * same ownership rule, so an agent can never edit another agent's
 * listing. New photos are added from the listing card, not here.
 */
export default function EditListingForm({
  listing,
  onSaved,
  onCancel,
}: {
  listing: Listing;
  onSaved: (updated: Listing) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [location, setLocation] = useState(listing.location);
  const [address, setAddress] = useState(listing.address);
  const [price, setPrice] = useState(String(listing.price));
  const [currency, setCurrency] = useState(listing.currency || "NGN");
  const [captions, setCaptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((listing.images || []).map((i: Images) => [i.image_id, i.captions || ""])),
  );
  const [areas, setAreas] = useState<AddressOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getAddresses();
      if (!cancelled) setAreas(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const areaOptions = areas.some((a) => a.name === location)
    ? areas
    : [{ id: `current-${location}`, name: location }, ...areas];

  const save = async () => {
    setError("");
    const priceValue = Number(price);
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    if (!description.trim()) {
      setError("A description is required.");
      return;
    }
    if (!address.trim()) {
      setError("An address is required.");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (title.trim() !== listing.title) payload.title = title.trim();
      if (description.trim() !== listing.description) payload.description = description.trim();
      if (location !== listing.location) payload.location = location;
      if (address.trim() !== listing.address) payload.address = address.trim();
      if (priceValue !== listing.price) payload.price = priceValue;
      if (currency !== (listing.currency || "NGN")) payload.currency = currency;
      if (Object.keys(payload).length > 0) {
        await api.patch(`/list/update_listing_info?listing_id=${listing.listing_id}`, payload);
      }
      for (const image of listing.images || []) {
        const next = captions[image.image_id] ?? "";
        if (next !== (image.captions || "")) {
          await api.patch(`/list/images/${image.image_id}`, { captions: next });
        }
      }
      const res = await api.get(`/list/a_listing/${listing.listing_id}`);
      onSaved(res?.data);
      setSaved(true);
    } catch {
      setError("Could not save those changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3 style={{ fontSize: 16, margin: 0 }}>Edit listing</h3>
      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert" style={{ background: "#ecfdf5", color: "#047857" }}>Changes saved.</div>}
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600 }}>
        Title
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Listing title" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600 }}>
        Description
        <textarea
          className="input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Listing description"
          style={{ resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600 }}>
        Area
        <select className="input" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Listing area">
          {areaOptions.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600 }}>
        Address
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Listing address" />
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, flex: 1 }}>
          Price / year
          <input
            className="input"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Listing price"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600 }}>
          Currency
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </label>
      </div>
      {(listing.images || []).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Photo captions</span>
          {(listing.images || []).map((image) => (
            <div key={image.image_id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img
                src={image.image_url}
                alt=""
                style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
              />
              <input
                className="input"
                value={captions[image.image_id] ?? ""}
                onChange={(e) => setCaptions((c) => ({ ...c, [image.image_id]: e.target.value }))}
                placeholder="Add a caption…"
                aria-label={`Caption for photo ${image.image_id}`}
                style={{ flex: 1 }}
              />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Done
        </button>
      </div>
    </div>
  );
}
