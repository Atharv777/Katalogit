import { useState } from "react";
import {
  Search,
  Plus,
  ArrowUpRight,
  LayoutGrid,
  List,
  Sparkles,
  Package,
  ArrowRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";
import { Product, ProductStatus } from "../types";
import type { ShopProfile } from "../lib/shopProfile";
interface Props {
  products: Product[];
  onAddClick: () => void;
  onSocialClick: () => void;
  onProductClick: (p: Product) => void;
  onReviewClick: () => void;
  user: User | null;
  shopProfile: ShopProfile;
  onLogout?: () => void;
}
export default function Dashboard({
  products,
  onAddClick,
  onSocialClick,
  onProductClick,
  onReviewClick,
  user,
  shopProfile,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [list, setList] = useState(false);
  const [showExample, setShowExample] = useState(
    () => localStorage.getItem("katalogit:removed-example") !== "true",
  );
  const removeExample = () => {
    if (!window.confirm("Remove this example from your studio on this browser?")) return;
    localStorage.setItem("katalogit:removed-example", "true");
    setShowExample(false);
  };
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filtered = products.filter(
    (p) =>
      (p.title + " " + p.sku).toLowerCase().includes(search.toLowerCase()) &&
      (category === "All" || p.category === category) &&
      (status === "All" || p.status === status),
  );
  const pending = products.filter(
    (p) => p.status === ProductStatus.REVIEW,
  ).length;
  const savedCount = products.filter((product) => !product.isDemo).length;
  const showcase = products.find((product) => product.id === "showcase-blue-kurti");
  return (
    <div className="studio-page">
      <header className="studio-topbar">
        <span>
          {shopProfile.name} <span>/</span> Products
        </span>
        <span className="studio-status">
          <span className="status-dot" />
          {user ? "Ready to add products" : "Ready when you are"}
        </span>
      </header>
      <main className="studio-content">
        <div className="dashboard-heading">
          <div>
            <p className="section-note">Your shop in {shopProfile.location}</p>
            <h1>{shopProfile.name}'s products</h1>
            <p>Add a photo to create a listing. You can check every detail before you save it.</p>
          </div>
          <button className="button button-coral" data-tour="capture" onClick={onAddClick}>
            <Plus size={18} /> Add a product
          </button>
        </div>
        {showcase && showExample && <section className="showcase-story" aria-label="Product photo example">
          <button type="button" className="showcase-dismiss" aria-label="Remove product photo example" onClick={removeExample}><X size={15} /> Remove this example</button>
          <div className="showcase-story-copy"><span>See it in action</span><h2>One kurti, three ways to show it.</h2><p>Here is the photo we started with, the catalogue image made with FLUX, and a social post supplied by the team.</p><button className="button button-dark" onClick={onSocialClick}>View the example post <ArrowRight size={16} /></button></div>
          <div className="showcase-story-images"><figure><img src={showcase.images?.[0]?.sourceUrl} alt="Original photo of the embroidered kurti" /><figcaption>Photo taken</figcaption></figure><figure><img src={showcase.imageUrl} alt="FLUX catalogue image of the same kurti" /><figcaption>Catalogue result</figcaption></figure><figure><img src={showcase.aiImageLifestyle} alt="Example social post for the embroidered kurti" /><figcaption>Social post</figcaption></figure></div>
        </section>}
        <div className="dashboard-summary">
          <div>
            <span className="summary-icon coral">
              <Package size={20} />
            </span>
            <span>
                  <strong>{savedCount.toString().padStart(2, "0")}</strong>
              <small>Your products saved</small>
            </span>
          </div>
          <div>
            <span className="summary-icon lilac">
              <LayoutGrid size={20} />
            </span>
            <span>
              <strong>
                {Math.max(0, categories.length - 1)
                  .toString()
                  .padStart(2, "0")}
              </strong>
              <small>Categories</small>
            </span>
          </div>
          <button onClick={onReviewClick}>
            <span className="summary-icon sage">
              <Sparkles size={20} />
            </span>
            <span>
              <strong>{pending.toString().padStart(2, "0")}</strong>
              <small>Need review</small>
            </span>
            <ArrowUpRight size={19} />
          </button>
        </div>
        {pending > 0 && (
          <div className="review-nudge">
            <div>
              <span className="status-dot" />
              <strong>Your next great listing is nearly ready.</strong>
              <span>
                {pending} {pending === 1 ? "product needs" : "products need"}{" "}
                your final touch.
              </span>
            </div>
            <button onClick={onReviewClick}>
              Review products <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="catalog-toolbar" data-tour="catalog">
          <h2>
            All products <span>{products.length}</span>
          </h2>
          <div>
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search catalog"
                placeholder="Find something great…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="active">Active</option>
              <option value="review">In review</option>
              <option value="draft">Draft</option>
            </select>
            <div className="view-toggle">
              <button
                aria-label="Grid view"
                aria-pressed={!list}
                className={!list ? "active" : ""}
                onClick={() => setList(false)}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                aria-label="List view"
                aria-pressed={list}
                className={list ? "active" : ""}
                onClick={() => setList(true)}
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>
        <div className="category-tabs" aria-label="Category filters">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c === "All" ? "Everything" : c}
            </button>
          ))}
        </div>
        <div className={`catalog-grid ${list ? "catalog-list" : ""}`}>
          <AnimatePresence mode="popLayout">
            {filtered.map((product, i) => (
              <motion.button
                key={product.id}
                layout
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="catalog-card"
                onClick={() => onProductClick(product)}
              >
                <div className={`catalog-art art-tone-${i % 4}`}>
                  {product.imageUrl ? (
                    <img
                      src={
                        product.images?.find((shot) => shot.generatedUrl)?.generatedUrl ||
                        product.aiImageProduct ||
                        product.imageUrl
                      }
                      alt={product.title}
                      loading="lazy"
                    />
                  ) : (
                    <Package size={40} />
                  )}
                  {product.images && product.images.length > 1 && (
                    <span className="product-shots">
                      {product.images.length} shots
                    </span>
                  )}
                  <span className={`product-status status-${product.status}`}>
                    <i />
                    {product.status === ProductStatus.REVIEW
                      ? "In review"
                      : product.status}
                  </span>
                  {product.isDemo && <span className="catalog-demo-badge">Team example</span>}
                  <span className="product-open">
                    <ArrowUpRight size={20} />
                  </span>
                </div>
                <div className="catalog-card-info">
                  <span className="product-category">
                    {product.category} <span>{product.sku}</span>
                  </span>
                  <h3>{product.title}</h3>
                  <div>
                    <strong>{product.price > 0 ? `₹${product.price.toLocaleString("en-IN")}` : "Price not set"}</strong>
                    <span>
                      View product <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        {filtered.length === 0 && (
          <div className="catalog-empty">
            <Package size={36} />
            <h2>
              {products.length
                ? "Nothing matched that search."
                : "No products yet"}
            </h2>
            <p>
              {products.length
                ? "Try another name, category, or status."
                : "Take or upload a photo to create your first product listing."}
            </p>
            <button
              className="button button-dark"
              onClick={
                products.length
                  ? () => {
                      setSearch("");
                      setCategory("All");
                      setStatus("All");
                    }
                  : onAddClick
              }
            >
              {products.length ? "Clear filters" : "Add your first product"}
            </button>
          </div>
        )}
        <div className="catalog-end">
          <span>Thoughtfully organized. Ready for what’s next.</span>
          <Sparkles size={15} />
        </div>
      </main>
    </div>
  );
}
