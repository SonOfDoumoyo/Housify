import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { api } from "../interceptors/api";

/** Canonical listing statuses. Displayed with underscores as spaces. */
export const LISTING_STATUSES = [
  { value: "available", label: "Available" },
  { value: "partially_occupied", label: "Partially Occupied" },
  { value: "occupied", label: "Occupied" },
  { value: "taken", label: "Taken" },
  { value: "paid_for", label: "Paid For" },
  { value: "rented_out", label: "Rented Out" },
  { value: "coming_soon", label: "Coming Soon" },
] as const;

export function statusDisplay(status: string | null | undefined): string {
  const found = LISTING_STATUSES.find((s) => s.value === (status || "").toLowerCase());
  if (found) return found.label;
  return (status || "available").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Status picker for an agent's own listing. Used on My Listings and the
 * agent dashboard. PATCHes /list/{id}/status and reports the new value.
 */
export default function ListingStatusControl({
  listingId,
  status,
  onChanged,
}: {
  listingId: string;
  status: string;
  onChanged?: (status: string) => void;
}) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const change = async (next: string) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    setError("");
    try {
      await api.patch(`/list/${listingId}/status`, { status: next });
      onChanged?.(next);
    } catch {
      setValue(prev);
      setError("Could not update status. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}
      >
        Status
        <span style={{ position: "relative", display: "inline-flex", flex: 1 }}>
          <select
            value={value}
            disabled={saving}
            onChange={(e) => void change(e.target.value)}
            aria-label="Change listing status"
            style={{
              appearance: "none",
              border: "1.5px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              borderRadius: 10,
              padding: "8px 28px 8px 10px",
              fontSize: 13,
              fontWeight: 700,
              width: "100%",
              cursor: "pointer",
            }}
          >
            {LISTING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}
          />
        </span>
        {saving ? <span style={{ fontWeight: 600 }}>Saving…</span> : <Check size={14} color="#16a34a" />}
      </label>
      {error && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</span>}
    </div>
  );
}
