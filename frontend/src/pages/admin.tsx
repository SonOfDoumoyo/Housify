import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Building2, Trash2, Users } from "lucide-react";
import { api } from "../interceptors/api";
import { useUser } from "../contexts/userContext";
import { formatMoney, statusLabel } from "../lib/format";
import type { Listing } from "../schemas/listingtype";
import type { User } from "../schemas/usertype";

type AdminUser = User & { listed?: Listing[] };

/**
 * Admin workspace — see all users, delete users, see all listings and
 * delete any listing. Only accounts with role "admin" may open it;
 * everyone else is sent back to the dashboard.
 */
export default function Admin() {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [confirmListingId, setConfirmListingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!currentUser) return;
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [u, l] = await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/listings"),
        ]);
        if (!cancelled) {
          setUsers(Array.isArray(u?.data) ? u.data : []);
          setListings(Array.isArray(l?.data) ? l.data : []);
        }
      } catch {
        if (!cancelled) setError("Could not load admin data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isAdmin, navigate]);

  const deleteUser = async (uid: string) => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/admin/users/${uid}`);
      setUsers((rows) => rows.filter((u) => u.uid !== uid));
      setListings((rows) => rows.filter((l) => l.agent_id !== uid));
      setConfirmUserId(null);
      setNotice("User deleted, along with their listings and reviews.");
    } catch {
      setError("Could not delete that user.");
    } finally {
      setBusy(false);
    }
  };

  const deleteListing = async (listingId: string) => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/admin/listings/${listingId}`);
      setListings((rows) => rows.filter((l) => l.listing_id !== listingId));
      setConfirmListingId(null);
      setNotice("Listing deleted.");
    } catch {
      setError("Could not delete that listing.");
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser || !isAdmin) return null;

  const agentName = (agentId: string) =>
    users.find((u) => u.uid === agentId)?.fullname || "Unknown agent";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Admin</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
          All users and all listings on Housify. Deleting a user also removes
          their listings and reviews.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={17} /> {error}
        </div>
      )}
      {notice && <div className="alert alert-success">{notice}</div>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <>
          <section className="card detail-section">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} /> Users ({users.length})
            </h2>
            {users.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No users yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: "8px 10px" }}>Name</th>
                      <th style={{ padding: "8px 10px" }}>Email</th>
                      <th style={{ padding: "8px 10px" }}>Role</th>
                      <th style={{ padding: "8px 10px" }}>Verified</th>
                      <th style={{ padding: "8px 10px" }}>Listings</th>
                      <th style={{ padding: "8px 10px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{u.fullname}</td>
                        <td style={{ padding: "8px 10px" }}>{u.email}</td>
                        <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{u.role}</td>
                        <td style={{ padding: "8px 10px" }}>{u.is_verified ? "Yes" : "No"}</td>
                        <td style={{ padding: "8px 10px" }}>{u.listed?.length ?? 0}</td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {u.uid !== currentUser.uid && u.role !== "admin" ? (
                            confirmUserId === u.uid ? (
                              <>
                                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteUser(u.uid)}>
                                  Confirm delete
                                </button>{" "}
                                <button type="button" className="btn btn-outline" onClick={() => setConfirmUserId(null)}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmUserId(u.uid)}>
                                <Trash2 size={14} /> Delete
                              </button>
                            )
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card detail-section">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} /> Listings ({listings.length})
            </h2>
            {listings.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No listings yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: "8px 10px" }}>Title</th>
                      <th style={{ padding: "8px 10px" }}>Agent</th>
                      <th style={{ padding: "8px 10px" }}>Status</th>
                      <th style={{ padding: "8px 10px" }}>Price</th>
                      <th style={{ padding: "8px 10px" }}>Views</th>
                      <th style={{ padding: "8px 10px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.listing_id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                          <button type="button" className="text-link" onClick={() => navigate(`/listing-details/${l.listing_id}`)}>
                            {l.title}
                          </button>
                        </td>
                        <td style={{ padding: "8px 10px" }}>{agentName(l.agent_id)}</td>
                        <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{statusLabel(l.status)}</td>
                        <td style={{ padding: "8px 10px" }}>{formatMoney(l.price, l.currency)}</td>
                        <td style={{ padding: "8px 10px" }}>{l.views_count ?? 0}</td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {confirmListingId === l.listing_id ? (
                            <>
                              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteListing(l.listing_id)}>
                                Confirm delete
                              </button>{" "}
                              <button type="button" className="btn btn-outline" onClick={() => setConfirmListingId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmListingId(l.listing_id)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
