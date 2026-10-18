/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { handleFirestoreError, OperationType, signOut } from "./lib/firebase";
import {
  subscribeToProducts,
  deleteProduct,
  updateProduct,
} from "./lib/catalogService";
import { Product, ProductStatus } from "./types";
import Dashboard from "./components/Dashboard";
import ExportCatalog from "./components/ExportCatalog";
import Navigation from "./components/Navigation";
import ProductDetails from "./components/ProductDetails";
import ReviewCenter from "./components/ReviewCenter";
import SocialAgent from "./components/SocialAgent";
import WebsiteBuilder from "./components/WebsiteBuilder";
import Walkthrough from "./components/Walkthrough";
import { AnimatePresence } from "motion/react";
import { isPrototype } from "./lib/prototype";
import { SHOWCASE_PRODUCTS } from "./lib/showcase";
import { dataUrlToBlob, fileToCompressedDataUrl, generateShot } from "./lib/api";
import { uploadImage } from "./lib/storage";
import { CATEGORIES } from "../shared/categories";
import { catalogImage } from "./lib/catalogImage";
import type { ShopProfile } from "./lib/shopProfile";
import "./studio-tools.css";

const AddProductFlow = lazy(() => import("./components/ClassicCaptureFlow"));

export default function CatalogApp({
  user,
  shopProfile,
  onHome,
}: {
  user: User;
  shopProfile: ShopProfile;
  onHome: () => void;
}) {
  const [currentView, setCurrentView] = useState(() => {
    const requested = sessionStorage.getItem("katalogit:open:view");
    sessionStorage.removeItem("katalogit:open:view");
    return requested === "social" || requested === "website" ? requested : "dashboard";
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(() => location.hash === "#/demo");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true",
  );

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      root.style.setProperty("background-color", "rgb(3 7 18)", "important");
      document.body.style.setProperty(
        "background-color",
        "rgb(3 7 18)",
        "important",
      );
    } else {
      root.classList.remove("dark");
      root.style.removeProperty("background-color");
      document.body.style.removeProperty("background-color");
    }
    localStorage.setItem("darkMode", String(darkMode));
    return () => {
      root.classList.remove("dark");
      root.style.removeProperty("background-color");
      document.body.style.removeProperty("background-color");
    };
  }, [darkMode]);

  // ── live subscription to the signed-in seller's catalogue ──────────────────
  useEffect(() => {
    const uid = user.uid;
    setLoading(true);

    const handleSubscriptionError = (error: Error & { code?: string }) => {
      setLoading(false);
      if (error.code === "permission-denied") {
        setProducts([]);
      } else {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${uid}/products`,
        );
      }
    };

    const unsubscribe = subscribeToProducts(
      uid,
      (incoming) => {
        setProducts(incoming);
        setLoading(false);
      },
      handleSubscriptionError,
    );

    const timer = setTimeout(() => setLoading(false), 6000);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [user.uid]);

  const handleLogout = () => {
    if (isPrototype(user.uid)) {
      onHome();
      return;
    }
    signOut();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await deleteProduct(user.uid, id);
      setSelectedProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/products/${id}`);
    }
  };

  const handleApproveProduct = async (id: string) => {
    try {
      await updateProduct(user.uid, id, { status: ProductStatus.ACTIVE });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/products/${id}`);
    }
  };

  const handleRejectProduct = async (id: string) => {
    if (!window.confirm("Remove this product from the catalogue?")) return;
    try {
      await deleteProduct(user.uid, id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/products/${id}`);
    }
  };

  const regenerateProductImage = async (product: Product) => {
    const source = product.images?.find((shot) => shot.sourceUrl)?.sourceUrl;
    if (!source) throw new Error("The original photo is missing. Add this product again with a photo.");
    const image = source.startsWith("data:")
      ? source
      : await fileToCompressedDataUrl(await (await fetch(source)).blob());
    const category = CATEGORIES.find((item) =>
      `${product.category} ${product.subcategory}`.toLowerCase().includes(item.id),
    ) ?? CATEGORIES[0];
    const slot = category.slots[0];
    const result = await generateShot({
      category: category.id,
      slot: slot.id,
      image,
      title: product.title,
      material: product.attributes.Material || "",
      colors: product.attributes.Color ? [product.attributes.Color] : [],
    });
    const mime = result.imageBase64.startsWith("/9j/") ? "image/jpeg" : "image/png";
    const blob = dataUrlToBlob(`data:${mime};base64,${result.imageBase64}`);
    const generatedUrl = await uploadImage({ uid: user.uid, productId: product.id, folder: "generated", name: slot.id, blob, contentType: blob.type });
    const images = [{ slot: slot.id, label: slot.label, sourceUrl: source, generatedUrl, finish: "ai" as const }];
    const patch = { imageUrl: generatedUrl, aiImageProduct: generatedUrl, images };
    await updateProduct(user.uid, product.id, patch);
    setSelectedProduct({ ...product, ...patch });
  };

  const visibleProducts = isPrototype(user.uid)
    ? [...SHOWCASE_PRODUCTS, ...products.filter((product) => !SHOWCASE_PRODUCTS.some((example) => example.id === product.id))]
    : products;
  const shared = {
    products: visibleProducts,
    onAddClick: () => setIsAddModalOpen(true),
    onSocialClick: () => setCurrentView("social"),
    onProductClick: setSelectedProduct,
    onReviewClick: () => setCurrentView("review"),
    user,
    onLogout: handleLogout,
    shopProfile,
  };
  const closeTour = () => setTourOpen(false);

  return (
    <div className="workspace flex flex-col md:flex-row min-h-screen bg-gray-50/50 dark:bg-gray-950">
      <Navigation
        onHome={onHome}
        onTour={() => setTourOpen(true)}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === "add") setIsAddModalOpen(true);
          else setCurrentView(view);
        }}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((previous) => !previous)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="workspace-main flex-1 min-w-0">
        {loading ? (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-950">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-6 font-bold uppercase tracking-widest">
              Loading your catalogue
            </p>
          </div>
        ) : currentView === "social" ? (
          <SocialAgent products={visibleProducts.filter((product) => !!catalogImage(product))} />
        ) : currentView === "website" ? (
          <WebsiteBuilder products={visibleProducts.filter((product) => !!catalogImage(product))} shopName={shopProfile.name} />
        ) : currentView === "review" ? (
          <ReviewCenter
            products={products}
            onApprove={handleApproveProduct}
            onReject={handleRejectProduct}
            onView={setSelectedProduct}
          />
        ) : currentView === "export" ? (
          <ExportCatalog products={products} />
        ) : (
          <Dashboard {...shared} />
        )}
      </div>

      {isAddModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[90] transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />
          <Suspense
            fallback={<div className="setup-dialog">Opening the capture flow…</div>}
          >
            <AddProductFlow
              uid={user.uid}
              onClose={() => setIsAddModalOpen(false)}
              onSaved={() => setIsAddModalOpen(false)}
            />
          </Suspense>
        </>
      )}

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onDelete={selectedProduct.isDemo ? undefined : handleDeleteProduct}
            onRegenerate={selectedProduct.isDemo ? undefined : regenerateProductImage}
          />
        )}
      </AnimatePresence>
      {tourOpen && <Walkthrough onClose={closeTour} onNavigate={setCurrentView} />}
    </div>
  );
}
