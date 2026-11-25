import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, House, LogOut, Menu, X } from "lucide-react";
import { useUser } from "../contexts/userContext";
import { api } from "../interceptors/api";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { to: "/", label: "Home", match: (p: string) => p === "/" },
  { to: "/browse", label: "Browse Homes", match: (p: string) => p === "/browse" || p.startsWith("/listing-details") },
  { to: "/#how", label: "How it works", match: () => false },
  { to: "/#about", label: "About", match: () => false },
  { to: "/#contact", label: "Contact", match: () => false },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { currentUser, setCurrentUser } = useUser();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await api.post("auth/logout");
    } catch {
      /* session already gone — still clear local state */
    }
    setCurrentUser(null);
    setOpen(false);
    // After signing out the user lands on the sign-in page, not the
    // public landing page.
    navigate("/sign-in");
  };

  return (
    <header className="public-nav">
      <div className="container-x public-nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <House size={20} />
          </span>
          <span>housi<em>fy</em></span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={l.match(pathname) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          {currentUser ? (
            <>
              <Link to="/dashboard" className="btn btn-primary nav-dashboard-btn">
                Dashboard <ArrowRight size={15} />
              </Link>
              <Link to="/dashboard" aria-label="Go to your dashboard">
                <Avatar name={currentUser.fullname} src={currentUser.profile_image} size={36} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="nav-signin-link" style={{ fontWeight: 700, fontSize: 14, color: "#263653", whiteSpace: "nowrap" }}>
                Sign in
              </Link>
              <Link to="/create-account" className="btn btn-primary">
                Get started <ArrowRight size={15} />
              </Link>
            </>
          )}
          <button
            className="mobile-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <nav className={`mobile-nav ${open ? "open" : ""}`} aria-label="Mobile">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        {currentUser ? (
          <>
            <Link to="/dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <button
              type="button"
              onClick={signOut}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px", border: 0, background: "transparent", fontWeight: 600, color: "#dc2626", textAlign: "left", borderRadius: 10 }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <Link to="/sign-in" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer" id="contact">
      <div className="container-x public-footer-inner">
        <div>
          <Link to="/" className="brand">
            <span className="brand-mark">
              <House size={20} />
            </span>
            <span>housi<em>fy</em></span>
          </Link>
          <p style={{ marginTop: 12, maxWidth: 300 }}>Rent smarter. Live better. Quality rental homes from trusted landlords and agents, all in one place.</p>
          <p style={{ marginTop: 8 }}>A StreixCorp product.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <nav>
            <Link to="/browse">Browse homes</Link>
            <Link to="/#how">How it works</Link>
            <Link to="/#about">About</Link>
          </nav>
        </div>
        <div>
          <h4>For agents</h4>
          <nav>
            <Link to="/create-account">Create an agent account</Link>
            <Link to="/sign-in">Agent sign in</Link>
          </nav>
        </div>
        <div>
          <h4>Your account</h4>
          <nav>
            <Link to="/sign-in">Sign in</Link>
            <Link to="/create-account">Get started</Link>
            <Link to="/dashboard">Dashboard</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Housify by StreixCorp. All rights reserved.</span>
          <Link to="/terms">Privacy Policy · Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
