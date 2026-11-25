import { useState } from "react";

const PALETTE = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#e0e7ff", fg: "#4338ca" },
  { bg: "#cffafe", fg: "#0e7490" },
];

function initials(name: string): string {
  const parts = (name || "H").trim().split(/\s+/);
  const first = parts[0]?.[0] || "H";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name || "H") hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Profile photo with an initials fallback — never a broken image icon.
 * When the user has no photo (or it fails to load), their initials show
 * in a soft coloured circle instead of an external placeholder service.
 */
export default function Avatar({
  name,
  src,
  size = 36,
  radius,
  style,
}: {
  name?: string;
  src?: string | null;
  size?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const color = colorFor(name || "");
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius ?? size / 2,
    objectFit: "cover",
    flexShrink: 0,
    ...style,
  };
  if (src && !failed) {
    return <img src={src} alt={name || "Profile"} style={common} onError={() => setFailed(true)} />;
  }
  return (
    <span
      aria-label={name || "Profile"}
      style={{
        ...common,
        display: "inline-grid",
        placeItems: "center",
        background: color.bg,
        color: color.fg,
        fontWeight: 800,
        fontSize: Math.max(11, size * 0.38),
      }}
    >
      {initials(name || "")}
    </span>
  );
}
