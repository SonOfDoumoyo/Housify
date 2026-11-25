import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  getAgentReviews,
  submitReview,
  updateReview,
  type AgentReview,
} from "../lib/reviews";
import { useUser } from "../contexts/userContext";

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span
      style={{ display: "inline-flex", gap: 2, alignItems: "center" }}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(value) ? "#f59e0b" : "none"}
          color={n <= Math.round(value) ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
    </span>
  );
}

/**
 * Reviews of the listing's agent, with a form for signed-in customers.
 * Customers rate the agent 1–5 stars and may leave a comment; one
 * review per customer per agent (editing replaces their own review).
 */
export default function AgentReviews({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { currentUser } = useUser();
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const isCustomer = currentUser?.role === "client";
  const myReview = currentUser ? reviews.find((r) => r.reviewer_id === currentUser.uid) : undefined;
  const isOwner = currentUser?.uid === agentId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getAgentReviews(agentId);
      if (!cancelled) setReviews(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || "");
    }
  }, [myReview]);

  const save = async () => {
    if (!rating) {
      setNotice("Pick a star rating first.");
      return;
    }
    setSaving(true);
    setNotice("");
    if (myReview) {
      const ok = await updateReview(myReview.review_id, rating, comment.trim());
      if (ok) {
        setReviews((rows) =>
          rows.map((r) => (r.review_id === myReview.review_id ? { ...r, rating, comment: comment.trim() || null } : r)),
        );
        setNotice("Review updated.");
      } else {
        setNotice("Could not save the review. Try again.");
      }
    } else {
      const result = await submitReview(agentId, rating, comment.trim());
      if (result.ok) {
        const rows = await getAgentReviews(agentId);
        setReviews(rows);
        setNotice("Thanks — your review is live.");
      } else {
        setNotice(result.message || "Could not save the review. Try again.");
      }
    }
    setSaving(false);
  };

  return (
    <section className="card detail-section" aria-label={`Reviews of ${agentName}`}>
      <h2>Agent reviews</h2>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
        {reviews.length === 0
          ? `${agentName} has no reviews yet.`
          : `${reviews.length} review${reviews.length === 1 ? "" : "s"} of ${agentName}.`}
      </p>

      {reviews.map((review) => (
        <div key={review.review_id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Stars value={review.rating} />
            <b style={{ fontSize: 13.5 }}>{review.reviewer_name || "Customer"}</b>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {review.comment && <p style={{ margin: "6px 0 0", fontSize: 14 }}>{review.comment}</p>}
        </div>
      ))}

      {isCustomer && !isOwner && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 4 }}>
          <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>
            {myReview ? "Your review" : `Rate ${agentName}`}
          </h3>
          <div style={{ display: "flex", gap: 4 }} role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                style={{ background: "none", border: 0, padding: 2, cursor: "pointer" }}
              >
                <Star
                  size={26}
                  fill={(hover || rating) >= n ? "#f59e0b" : "none"}
                  color={(hover || rating) >= n ? "#f59e0b" : "#cbd5e1"}
                />
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={3}
            placeholder="How was dealing with this agent?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginTop: 10, width: "100%", resize: "vertical" }}
            aria-label="Review comment"
          />
          {notice && <p style={{ fontSize: 13, color: notice.startsWith("Thanks") || notice.startsWith("Review updated") ? "#16a34a" : "#dc2626", margin: "8px 0 0" }}>{notice}</p>}
          <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : myReview ? "Update review" : "Submit review"}
          </button>
        </div>
      )}
      {!currentUser && (
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          Sign in to rate this agent.
        </p>
      )}
    </section>
  );
}
