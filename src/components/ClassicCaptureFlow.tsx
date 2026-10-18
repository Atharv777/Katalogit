import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { CATEGORIES, getCategory, type Category, type PhotoSlot } from "../../shared/categories";
import { dataUrlToBlob, fileToCompressedDataUrl, generateShot, writeListing } from "../lib/api";
import { createProduct } from "../lib/catalogService";
import { uploadImage } from "../lib/storage";
import { ProductStatus, type AiListing, type Product, type ProductImage } from "../types";
import PhoneCapture from "./PhoneCapture";
import { useLanguage } from "../lib/language";
import "./classic-capture.css";

type Stage = "capture" | "working" | "review" | "saved";
type Preview = { slot: PhotoSlot; image: string; finish: "ai" | "studio" };

const dataUrlFromBase64 = (base64: string) => {
  const mime = base64.startsWith("/9j/") ? "image/jpeg" : base64.startsWith("UklGR") ? "image/webp" : "image/png";
  return `data:${mime};base64,${base64}`;
};

function categoryFromListing(listing: AiListing): Category {
  const value = `${listing.category} ${listing.subcategory} ${listing.title} ${listing.visual?.subject ?? ""}`.toLowerCase();
  const exact = CATEGORIES.find((category) => value.includes(category.id) || value.includes(category.label.toLowerCase()));
  if (exact) return exact;
  const clues: Array<[string, RegExp]> = [
    ["bags", /bag|handbag|tote|backpack|wallet|purse|luggage|clutch/],
    ["footwear", /shoe|sneaker|sandal|boot|heel|slipper/],
    ["electronics", /headphone|earbud|speaker|watch|phone|charger|electronic|camera/],
    ["jewellery", /jewel|earring|ring|necklace|bracelet|pendant/],
    ["home", /lamp|vase|planter|decor|furniture|cushion|ceramic|home/],
    ["accessories", /belt|scarf|sunglass|eyewear|accessor/],
    ["apparel", /shirt|dress|kurta|saree|jacket|trouser|garment|clothing|fabric/],
  ];
  return getCategory(clues.find(([, pattern]) => pattern.test(value))?.[0] ?? "home");
}

export default function ClassicCaptureFlow({ uid, onClose, onSaved }: {
  uid: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language, t } = useLanguage();
  const [stage, setStage] = useState<Stage>("capture");
  const [cameraState, setCameraState] = useState<"opening" | "ready" | "unavailable">("opening");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [image, setImage] = useState("");
  const [listing, setListing] = useState<AiListing | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [workingText, setWorkingText] = useState("Reading the product photo…");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(true);
  const productId = useRef(`p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    if (stage !== "capture") return;
    let active = true;
    setCameraState("opening");
    const open = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (active) setCameraState("ready");
      } catch {
        if (active) setCameraState("unavailable");
      }
    };
    void open();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stage, cameraAttempt]);

  const processPhoto = async (file: Blob) => {
    setStage("working");
    setError("");
    setPreviews([]);
    let analysisComplete = false;
    try {
      const source = await fileToCompressedDataUrl(file);
      if (!activeRef.current) return;
      setImage(source);
      setWorkingText("Reading the product photo…");
      const analyzed = await writeListing({ category: "auto", notes: "", slots: [], image: source, language });
      if (!activeRef.current) return;
      const identifiedCategory = categoryFromListing(analyzed);
      setListing(analyzed);
      analysisComplete = true;
      setCategory(identifiedCategory);
      const heroSlot = identifiedCategory.slots[0];
      setWorkingText("Creating your catalogue previews…");
      const makePreview = async (slot: PhotoSlot): Promise<Preview> => {
        const result = await generateShot({
          category: identifiedCategory.id,
          slot: slot.id,
          image: source,
          title: analyzed.title,
          material: analyzed.visual?.material || analyzed.attributes.Material || "",
          colors: analyzed.visual?.colors ? [analyzed.visual.colors] : [],
          visual: analyzed.visual,
        });
        return { slot, image: dataUrlFromBase64(result.imageBase64), finish: "ai" };
      };
      // Require one real AI image before review or save. Never substitute the
      // captured photo when an image provider is unavailable.
      const hero = await makePreview(heroSlot);
      if (!activeRef.current) return;
      setPreviews([hero]);
      setStage("review");
    } catch (cause) {
      if (!activeRef.current) return;
      setError(analysisComplete ? "AI image generation is unavailable right now. Your original photo was not saved as an AI image. Please try again." : cause instanceof Error ? cause.message : "The photo could not be analyzed. Try again.");
      setStage("working");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) { setError("Camera is starting. Try again in a moment."); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) void processPhoto(blob);
      else setError("Could not capture that frame. Try again.");
    }, "image/jpeg", 0.86);
  };

  const reset = () => {
    setStage("capture"); setImage(""); setListing(null); setCategory(null); setPreviews([]); setError(""); setPhoneOpen(false);
    productId.current = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  };

  const save = async () => {
    if (!listing || !category || !image || !previews.some((preview) => preview.finish === "ai") || saving) return;
    setSaving(true); setError("");
    try {
      const images: ProductImage[] = [];
      const sourceBlob = dataUrlToBlob(image);
      const sourceUrl = await uploadImage({ uid, productId: productId.current, folder: "source", name: "original", blob: sourceBlob, contentType: sourceBlob.type });
      for (const preview of previews) {
        const blob = dataUrlToBlob(preview.image);
        const generatedUrl = await uploadImage({ uid, productId: productId.current, folder: "generated", name: preview.slot.id, blob, contentType: blob.type });
        images.push({ slot: preview.slot.id, label: preview.slot.label, sourceUrl, generatedUrl, finish: preview.finish });
      }
      const product: Product = {
        id: productId.current,
        sku: `${category.id.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
        title: listing.title,
        category: listing.category || category.label,
        subcategory: listing.subcategory || category.label,
        description: listing.description,
        seoDescription: listing.seoDescription,
        attributes: listing.attributes,
        price: listing.price,
        tags: listing.tags,
        status: ProductStatus.REVIEW,
        imageUrl: images[0].generatedUrl!,
        aiImageProduct: images[0].generatedUrl!,
        images,
        createdAt: Date.now(),
      };
      await createProduct(uid, product);
      if (activeRef.current) setStage("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The product could not be saved.");
    } finally {
      if (activeRef.current) setSaving(false);
    }
  };

  return (
    <div className="classic-overlay">
      <div className="classic-backdrop" onClick={onClose} />
      <div className="classic-card" role="dialog" aria-modal="true" aria-label="Add product">
        {stage === "capture" && (
          <div className="classic-capture">
            <header className="classic-header"><button onClick={onClose} aria-label="Close"><X size={23} /></button><strong>{t("Add Product")}</strong><span /></header>
            <div className="classic-viewfinder">
              <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" />
              <div className="classic-guide"><span>ALIGN PRODUCT</span></div>
              {cameraState !== "ready" && <div className="classic-camera-message">{cameraState === "opening" ? <Loader2 className="spin" size={23} /> : <Camera size={23} />}<p>{t(cameraState === "opening" ? "Opening camera…" : "Camera unavailable. Upload a photo or try again.")}</p>{cameraState === "unavailable" && <button onClick={() => setCameraAttempt((n) => n + 1)}>{t("Try camera again")}</button>}</div>}
            </div>
            <div className="classic-camera-actions">
              <button className="classic-upload" onClick={() => uploadRef.current?.click()}><Upload size={16} /> {t("or upload photo")}</button>
              <button className="classic-shutter" onClick={capture} disabled={cameraState !== "ready"} aria-label="Capture product photo"><span /></button>
              <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void processPhoto(file); event.target.value = ""; }} />
            </div>
            {error && <p className="classic-capture-error" role="alert">{error}</p>}
            <div className="classic-phone-area"><div className="classic-divider"><span>{t("OR USE YOUR PHONE")}</span></div><button className="classic-phone-button" onClick={() => setPhoneOpen(true)}>{t("Open phone upload")} <ArrowRight size={16} /></button></div>
          </div>
        )}

        {stage === "working" && (
          <div className="classic-working">
            <button className="classic-close" onClick={onClose} aria-label="Close"><X size={21} /></button>
            {image && <img src={image} alt="Captured product" />}
            {!error && <Loader2 className="spin classic-working-spinner" size={42} />}
            <h2>{t(error ? "We couldn't finish that photo" : "AI is working")}</h2>
            <p>{t(error || workingText)}</p>
            {error && <div className="classic-working-actions"><button onClick={reset}><Camera size={16} /> {t("Retake photo")}</button>{image && <button onClick={() => void processPhoto(dataUrlToBlob(image))}><RefreshCw size={16} /> {t("Try again")}</button>}</div>}
          </div>
        )}

        {stage === "review" && listing && (
          <div className="classic-review">
            <header className="classic-review-header"><div><h2>{t("Review AI Suggestions")}</h2><p>{t("Generated from your product photo")}</p></div><button onClick={onClose} aria-label="Close"><X size={21} /></button></header>
            <div className="classic-review-body">
              <aside className="classic-review-gallery">
                <div className="classic-gallery-label classic-ai-label"><i /> {t("AI PREVIEWS GENERATED")}</div>
                <div className="classic-previews">{previews.map((preview, index) => <div key={preview.slot.id}><span>{t(index === 0 ? "PRODUCT SHOT" : "LIFESTYLE PREVIEW")}</span><figure><img src={preview.image} alt={`${preview.slot.label} preview`} /></figure><small>AI EDIT</small></div>)}</div>
                <div className="classic-gallery-label classic-source-label">{t("CAPTURED PHOTO")}</div>
                <div className="classic-original"><img src={image} alt="Original product" /><span>ORIGINAL</span></div>
              </aside>
              <div className="classic-review-copy">
                <div><span>{t("PRODUCT TITLE")}</span><strong>{listing.title}</strong></div>
                <div className="classic-copy-grid"><div><span>{t("CATEGORY")}</span><strong>{listing.category}</strong></div><div><span>{t("PRICE")}</span><strong>₹{listing.price.toLocaleString("en-IN")}</strong></div></div>
                <div><span>{t("DESCRIPTION")}</span><p>{listing.description}</p></div>
                {Object.keys(listing.attributes).length > 0 && <div><span>{t("ATTRIBUTES")}</span><dl>{Object.entries(listing.attributes).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></div>}
                {listing.tags.length > 0 && <div><span>{t("SEARCH TAGS")}</span><p>{listing.tags.join(" · ")}</p></div>}
              </div>
            </div>
            {error && <p className="classic-save-error" role="alert">{error}</p>}
            <footer className="classic-review-footer"><button onClick={reset} disabled={saving}>{t("Retake")}</button><button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <Check size={17} />} {t(saving ? "Saving…" : "Submit for Review")}</button></footer>
          </div>
        )}

        {stage === "saved" && <div className="classic-saved"><div><Check size={34} /></div><h2>{t("Submitted for Review")}</h2><p>{listing?.title} is ready in your review queue.</p><button onClick={() => { onSaved(); onClose(); }}>{t("Back to catalogue")} <ArrowRight size={17} /></button><button className="classic-add-another" onClick={reset}>{t("Add another product")}</button></div>}
      </div>
      {phoneOpen && stage === "capture" && <div className="classic-phone-dialog-backdrop" onClick={() => setPhoneOpen(false)}><div className="classic-phone-dialog" role="dialog" aria-modal="true" aria-label="Upload from phone" onClick={(event) => event.stopPropagation()}><button className="classic-phone-close" aria-label="Close phone upload" onClick={() => setPhoneOpen(false)}><X size={20} /></button><PhoneCapture onImageReceived={(received) => { setPhoneOpen(false); void processPhoto(dataUrlToBlob(received)); }} /></div></div>}
    </div>
  );
}
