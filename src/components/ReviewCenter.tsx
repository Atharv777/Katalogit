import { useState } from "react";
import { Check, X, Eye, CheckCheck, Sparkles } from "lucide-react";
import { Product, ProductStatus } from "../types";
interface Props {
  products: Product[];
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onView: (p: Product) => void;
}
export default function ReviewCenter({
  products,
  onApprove,
  onReject,
  onView,
}: Props) {
  const pending = products.filter((p) => p.status === ProductStatus.REVIEW);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function act(id: string, fn: Props["onApprove"]) {
    setBusy(id);
    setError("");
    try {
      await fn(id);
    } catch {
      setError("That change couldn’t be saved. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="studio-page">
      <header className="studio-topbar">
        <span>
          Workspace <span>/</span> Review queue
        </span>
        <span className="studio-status">
          <span className="status-dot" />
          {pending.length} awaiting review
        </span>
      </header>
      <main className="studio-content">
        <div className="dashboard-heading">
          <div>
            <p className="section-note">AI suggests. You decide.</p>
            <h1>Your eye for the final detail.</h1>
            <p>
              Check each listing, make it yours, and welcome it to the catalog.
            </p>
          </div>
          <span className="summary-icon sage">
            <CheckCheck size={23} />
          </span>
        </div>
        <div className="review-intro">
          <Sparkles size={18} />
          <p>
            Product details can need a little refinement. Open a listing to
            check its title, price, and attributes before approving.
          </p>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="review-list">
          {pending.map((p) => (
            <article key={p.id} className="review-row">
              <button
                className="review-image"
                onClick={() => onView(p)}
                aria-label={`View ${p.title}`}
              >
                {p.aiImageProduct || p.imageUrl ? <img src={p.aiImageProduct || p.imageUrl} alt={p.title} /> : <span className="review-image-empty">No photo yet</span>}
              </button>
              <div className="review-row-copy">
                <span className="product-category">
                  {p.category} / {p.sku}
                </span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <span className="review-price">
                  ₹{p.price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="review-row-actions">
                <button
                  className="button button-coral"
                  onClick={() => act(p.id, onApprove)}
                  disabled={busy !== null}
                >
                  <Check size={16} />
                  {busy === p.id ? "Saving…" : "Approve"}
                </button>
                <button
                  className="button button-outline"
                  onClick={() => onView(p)}
                >
                  <Eye size={16} /> View details
                </button>
                <button
                  className="review-reject"
                  onClick={() => act(p.id, onReject)}
                  disabled={busy !== null}
                >
                  <X size={13} /> Remove from queue
                </button>
              </div>
            </article>
          ))}
        </div>
        {pending.length === 0 && (
          <div className="catalog-empty">
            <CheckCheck size={38} />
            <h2>A little breathing room.</h2>
            <p>
              Your review queue is clear. New products will appear here when
              they’re ready for your attention.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
