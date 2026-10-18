import { useEffect, useRef, useState } from "react";
import { X, Trash2, Edit2, Tag, Package, Sparkles } from "lucide-react";
import { Product } from "../types";
import { canRegenerateImage, catalogImage } from "../lib/catalogImage";
import { useLanguage } from "../lib/language";
interface Props {
  product: Product;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (p: Product) => void;
  onRegenerate?: (p: Product) => Promise<void>;
}
export default function ProductDetails({
  product,
  onClose,
  onDelete,
  onEdit,
  onRegenerate,
}: Props) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      className="product-dialog"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="product-detail-title"
    >
      <div className="product-dialog-header">
        <span>
          <Tag size={15} />
          {product.sku}
        </span>
        <button
          className="icon-button"
          aria-label="Close product details"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="product-dialog-body">
        <div className="detail-images">
          {product.isDemo && product.images?.[0]?.sourceUrl && <div className="detail-demo-step">{t("Catalogue image made with FLUX")}</div>}
          <div className="detail-main-image">
            {catalogImage(product) ? <img src={catalogImage(product)!} alt={product.title} /> : <div className="detail-image-empty"><Package size={42} /><span>{t(canRegenerateImage(product) ? "AI image is not ready yet" : "Add a photo to bring this product to life")}</span></div>}
            <span className={`product-status status-${product.status}`}>
              <i />
              {product.status}
            </span>
          </div>
          {product.images?.[0]?.sourceUrl && <div className="detail-demo-source"><strong>{t("Photo taken")}</strong><img src={product.images[0].sourceUrl} alt="Original product photo" /></div>}
          {product.aiImageLifestyle && (
            <div className="detail-demo-social"><strong>{product.isDemo ? "Team's example social post" : "Lifestyle preview"}</strong><img className="detail-lifestyle" src={product.aiImageLifestyle} alt={`${product.title} social media post`} /></div>
          )}
        </div>
        <div className="detail-copy">
          <span className="section-note">
            {product.category} / {product.subcategory}
          </span>
          <h2 id="product-detail-title">{product.title}</h2>
          <strong className="detail-price">
            {product.price > 0 ? `₹${product.price.toLocaleString("en-IN")}` : "Price not set"}
          </strong>
          <p>{product.description}</p>
          <dl className="detail-attributes">
            {Object.entries(product.attributes)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replaceAll("_", " ")}</dt>
                  <dd>
                    {String(v).startsWith("#") ? (
                      <span className="detail-color">
                        <i style={{ background: String(v) }} />
                        Product color
                      </span>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="detail-tags">
            {product.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="detail-actions">
            {onRegenerate && canRegenerateImage(product) && <button className="button button-coral" disabled={regenerating} onClick={async () => { setRegenerating(true); setRegenerateError(""); try { await onRegenerate(product); } catch (error) { setRegenerateError(error instanceof Error ? error.message : "Could not make the AI image. Try again."); } finally { setRegenerating(false); } }}><Sparkles size={15} /> {t(regenerating ? "Generating AI image…" : "Try AI image again")}</button>}
            {onEdit && (
              <button
                className="button button-dark"
                onClick={() => onEdit(product)}
              >
                <Edit2 size={15} /> Edit product
              </button>
            )}
            {onDelete && (
              <button
                className="delete-button"
                onClick={() => onDelete(product.id)}
              >
                <Trash2 size={14} /> Delete product
              </button>
            )}
          </div>
          {regenerateError && <p className="form-error" role="alert">{regenerateError}</p>}
        </div>
      </div>
    </dialog>
  );
}
