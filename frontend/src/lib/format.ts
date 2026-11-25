export function formatNaira(value: number | string | null | undefined): string {
  return formatMoney(value, "NGN");
}

export const CURRENCIES = [
  { code: "NGN", label: "NGN (₦)", symbol: "₦" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "GHS", label: "GHS (₵)", symbol: "₵" },
  { code: "KES", label: "KES (KSh)", symbol: "KSh" },
  { code: "ZAR", label: "ZAR (R)", symbol: "R" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
] as const;

/** Price in the listing's own currency, so Housify works in any region. */
export function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const code = (currency || "NGN").toUpperCase();
  const found = CURRENCIES.find((c) => c.code === code);
  const symbol = found ? found.symbol : `${code} `;
  return `${symbol}${n.toLocaleString("en-US")}`;
}

export function statusLabel(status: string | null | undefined): string {
  return (status || "available").replaceAll("_", " ");
}

export function statusClass(status: string | null | undefined): string {
  const s = (status || "available").toLowerCase();
  if (s === "available") return "pill-available";
  if (s === "partially_occupied") return "pill-partially_occupied";
  return "pill-occupied";
}

export function firstName(fullname: string | null | undefined): string {
  return (fullname || "there").trim().split(/\s+/)[0] || "there";
}
