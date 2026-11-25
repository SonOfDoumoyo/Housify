import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { House } from "lucide-react";

/** Shared shell for Sign in / Sign up / Verify / Complete profile. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <House size={20} />
          </span>
          <span>housi<em>fy</em></span>
        </Link>
        <Link to="/browse" className="btn btn-ghost" style={{ fontSize: 13 }}>
          Browse homes
        </Link>
      </header>

      <main className="auth-wrap">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="sub">{subtitle}</p>
          {children}
          {footer && <div style={{ marginTop: 22 }}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}
