import { useEffect, useRef } from "react";
import { X, Trash2, Edit2, Tag, Package } from "lucide-react";
import { Product } from "../types";
interface Props {
  product: Product;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (p: Product) => void;
}
export default function ProductDetails({
  product,
  onClose,
  onDelete,
  onEdit,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
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
          {product.isDemo && product.images?.[0]?.sourceUrl && <div className="detail-demo-source"><strong>Photo taken</strong><img src={product.images[0].sourceUrl} alt="Original product photo" /></div>}
          {product.isDemo && product.images?.[0]?.sourceUrl && <div className="detail-demo-step">Catalogue image made with FLUX</div>}
          <div className="detail-main-image">
            {product.aiImageProduct || product.imageUrl ? <img src={product.aiImageProduct || product.imageUrl} alt={product.title} /> : <div className="detail-image-empty"><Package size={42} /><span>Add a photo to bring this product to life</span></div>}
            <span className={`product-status status-${product.status}`}>
              <i />
              {product.status}
            </span>
          </div>
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
        </div>
      </div>
    </dialog>
  );
}
