import { useState } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useUser } from "../contexts/userContext";
import { Building2, House, LayoutDashboard, Menu, Search, Settings, ShieldCheck, X } from "lucide-react";
import { roleLabel } from "../lib/googleAuth";
import Avatar from "../components/Avatar";
import ThemeToggle from "../components/ThemeToggle";

export default function Layout() {
  const { currentUser, loading } = useUser();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--page)", color: "var(--muted)", fontWeight: 600 }}>
        Loading Housify…
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  // First-time Google users arrive without a role — send them to pick one
  // before they see any dashboard.
  if (!currentUser.role) return <Navigate to="/complete-profile" replace />;

  const isAgent = currentUser.role === "agent" || currentUser.role === "landlord";
  const isAdmin = currentUser.role === "admin";
  const links = [
    { to: "/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
    { to: "/dashboard/browse", label: "Browse Homes", short: "Browse", icon: Search },
    ...(isAgent ? [{ to: "/listings", label: "My Listings", short: "Listings", icon: Building2 }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", short: "Admin", icon: ShieldCheck }] : []),
    { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
  ];
  const isActive = (to: string) =>
    to === "/dashboard/browse"
      ? location.pathname === "/dashboard/browse" || location.pathname.startsWith("/listing-details")
      : location.pathname === to;

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <House size={20} />
          </span>
          <span>housi<em style={{ color: "#93c5fd" }}>fy</em></span>
        </Link>
        <p className="sidebar-label">WORKSPACE</p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className={isActive(to) ? "side-link active" : "side-link"}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <Avatar name={currentUser?.fullname} src={currentUser?.profile_image} size={36} />
            <div>
              <b>{currentUser?.fullname || "Housify user"}</b>
              <small>{roleLabel(currentUser?.role) || "Member"}</small>
            </div>
          </div>
          <Link to="/" className="side-link" onClick={() => setOpen(false)}>
            <House size={18} /> View website
          </Link>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="icon-btn app-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <span className="topbar-kicker">HOUSIFY WORKSPACE</span>
            <h1>{isAgent ? "Agent portal" : "Customer portal"}</h1>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <span className="online-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
            <span className="who">Signed in as {currentUser?.fullname || "User"}</span>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — thumb-friendly, always visible on phones */}
      <nav className="mobile-bottom-nav" aria-label="Workspace">
        {links.slice(0, 4).map(({ to, short, icon: Icon }) => (
          <Link key={to} to={to} className={isActive(to) ? "active" : ""}>
            <Icon size={19} />
            {short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
