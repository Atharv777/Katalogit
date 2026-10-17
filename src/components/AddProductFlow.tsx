import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  getCategory,
  type Category,
  type PhotoSlot,
} from "@/shared/categories";
import {
  dataUrlToBlob,
  fetchAiStatus,
  fileToCompressedDataUrl,
  generateShot,
  writeListing,
} from "../lib/api";
import { uploadImage } from "../lib/storage";
import { createStudioFallback } from "../lib/studioImage";
import { createProduct } from "../lib/catalogService";
import { ProductStatus, type AiListing, type Product, type ProductImage } from "../types";
import PhoneCapture from "./PhoneCapture";

type Step = "category" | "photos" | "notes" | "generate" | "review";

/** Providers return mixed formats; trust the magic bytes, not a fixed mime. */
const shotDataUrl = (base64: string) => {
  const mime = base64.startsWith("/9j/")
    ? "image/jpeg"
    : base64.startsWith("UklGR")
      ? "image/webp"
      : "image/png";
  return `data:${mime};base64,${base64}`;
};

type Captured = {
  slotId: string;
  dataUrl: string;
};

type Shot = {
  slotId: string;
  label: string;
  generatedDataUrl?: string;
  generatedUrl?: string;
  sourceUrl?: string;
  state: "queued" | "running" | "done" | "failed";
  error?: string;
  finish?: "ai" | "studio";
};

const STEPS: { id: Step; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "photos", label: "Photos" },
  { id: "notes", label: "Details" },
  { id: "generate", label: "Generate" },
  { id: "review", label: "Save" },
];

function inferCategory(text: string): Category | null {
  const input = text.toLowerCase();
  const patterns: Record<string, RegExp> = {
    bags: /\bbag|handbag|tote|backpack|wallet|luggage|purse|clutch/,
    footwear: /shoe|sneaker|sandal|boot|heel|slipper|footwear/,
    electronics: /headphone|earbud|speaker|watch|phone|device|electronic|charger/,
    jewellery: /jewel|earring|ring|necklace|bracelet|pendant|jhumka/,
    home: /lamp|vase|planter|decor|furniture|cushion|ceramic|homeware/,
    accessories: /belt|scarf|sunglass|eyewear|accessor/,
    apparel: /garment|shirt|dress|kurta|saree|jacket|trouser|clothing|apparel|fabric/,
  };
  const id = Object.keys(patterns).find((key) => patterns[key].test(input));
  return CATEGORIES.find((item) => item.id === id) ?? null;
}

export default function AddProductFlow({
  uid,
  onClose,
  onSaved,
}: {
  uid: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>("category");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Record<string, Captured>>({});
  const [notes, setNotes] = useState("");
  const [listing, setListing] = useState<AiListing | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [quickPhoto, setQuickPhoto] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [cameraState, setCameraState] = useState<"opening" | "ready" | "unavailable">("opening");
  const [cameraMessage, setCameraMessage] = useState("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const quickInput = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const draftId = useRef(`p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const cancelled = useRef(false);

  const category: Category | null = categoryId ? getCategory(categoryId) : null;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    // StrictMode mounts twice in dev: the first cleanup flips this ref, so it
    // must be reset on every mount or the image workers abort immediately.
    cancelled.current = false;
    fetchAiStatus()
      .then((status) => setAiReady(status.configured))
      .catch(() => setAiReady(false));
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Open the live camera on the capture step, like the original catalog flow.
  // A stale permission response must never leave a camera running after exit.
  useEffect(() => {
    if (step !== "category" || recognizing) return;
    let active = true;
    setCameraState("opening");
    setCameraMessage("");

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unavailable");
        setCameraMessage("Camera is unavailable here. Choose a photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (active) setCameraState("ready");
      } catch {
        if (active) {
          setCameraState("unavailable");
          setCameraMessage("Camera access was blocked or no camera was found. You can upload a photo below.");
        }
      }
    };
    void openCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [step, recognizing, cameraAttempt]);

  const capturedCount = Object.keys(captured).length;
  const requiredSlots = useMemo(
    () => category?.slots.filter((s) => s.required) ?? [],
    [category],
  );
  const missingRequired = requiredSlots.filter((s) => !captured[s.id]).length;

  const patchShot = useCallback((slotId: string, patch: Partial<Shot>) => {
    setShots((current) =>
      current.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)),
    );
  }, []);

  /* ── step 1: category ────────────────────────────────────────────── */
  const chooseCategory = (id: string) => {
    setCategoryId(id);
    const selected = getCategory(id);
    setCaptured(quickPhoto ? { [selected.slots[0].id]: { slotId: selected.slots[0].id, dataUrl: quickPhoto } } : {});
    setError("");
    setStep("photos");
  };

  const startWithPhoto = async (file: File | undefined) => {
    if (!file) return;
    setRecognizing(true);
    setError("");
    setListing(null);
    try {
      const image = await fileToCompressedDataUrl(file);
      setQuickPhoto(image);
      const analyzed = await writeListing({ category: "auto", notes: "", slots: [], image });
      const found = inferCategory(`${analyzed.category} ${analyzed.subcategory} ${analyzed.visual?.subject ?? ""}`);
      if (!found) {
        setError("Photo read successfully. Pick the closest category below to continue.");
        return;
      }
      setListing(analyzed);
      setCategoryId(found.id);
      setCaptured({ [found.slots[0].id]: { slotId: found.slots[0].id, dataUrl: image } });
      setStep("photos");
    } catch {
      setError("Could not identify the product automatically. Pick a category below; your photo is saved for the next step.");
    } finally {
      setRecognizing(false);
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("The camera is still starting. Try the shutter again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) void startWithPhoto(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
      else setError("Could not capture that frame. Try again or upload a photo.");
    }, "image/jpeg", 0.86);
  };

  /* ── step 2: photos ──────────────────────────────────────────────── */
  const takePhoto = async (slot: PhotoSlot, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setCaptured((current) => ({ ...current, [slot.id]: { slotId: slot.id, dataUrl } }));
    } catch {
      setError("That photo could not be read. Try another one.");
    }
  };

  /* ── step 3 + 4: listing then images ─────────────────────────────── */
  const runGenerate = async () => {
    if (!category || capturedCount === 0) {
      setError("Add a product photo first so the AI can inspect the real item.");
      return;
    }
    setError("");
    const shouldAnalyze = !listing || Boolean(notes.trim());
    if (shouldAnalyze) setListing(null);
    setShots(
      category.slots
        .filter((slot) => captured[slot.id])
        .map((slot) => ({ slotId: slot.id, label: slot.label, sourceUrl: captured[slot.id].dataUrl, state: "queued" })),
    );
    setStep("generate");

    let draft = listing;
    try {
      if (shouldAnalyze) {
        draft = await writeListing({
          category: category.id,
          notes,
          slots: category.slots.filter((s) => captured[s.id]).map((s) => s.id),
          image: captured[category.slots.find((s) => captured[s.id])!.id].dataUrl,
        });
      }
      setListing(draft);
    } catch (problem) {
      if (listing) {
        draft = listing;
        setListing(listing);
        setError("The notes could not be added automatically. Your photo-based listing is preserved; you can edit it before saving.");
      } else {
        setError(
          problem instanceof Error
            ? `${problem.message} You can still save the product and add the listing later.`
            : "The listing could not be written.",
        );
        setStep("review");
        return;
      }
    }

    if (aiReady === false) {
      setStep("review");
      return;
    }

    // Two at a time keeps the image lane polite without stalling the flow.
    const queue = category.slots.filter((slot) => captured[slot.id]);
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length && !cancelled.current) {
        const slot = queue[cursor++];
        patchShot(slot.id, { state: "running" });
        try {
          const result = await generateShot({
            category: category.id,
            slot: slot.id,
            image: captured[slot.id].dataUrl,
            title: draft?.title ?? "",
            material: draft?.attributes?.Material ?? draft?.attributes?.Fabric ?? "",
            colors: Object.entries(draft?.attributes ?? {})
              .filter(([key]) => /colou?r/i.test(key))
              .map(([, value]) => value),
            notes,
            visual: draft?.visual,
          });
          patchShot(slot.id, {
            state: "done",
            generatedDataUrl: shotDataUrl(result.imageBase64),
            finish: "ai",
          });
        } catch (problem) {
          try {
            const finished = await createStudioFallback(captured[slot.id].dataUrl, slot.aspect);
            patchShot(slot.id, { state: "done", generatedDataUrl: finished, finish: "studio" });
          } catch {
            patchShot(slot.id, {
              state: "failed",
              error: problem instanceof Error ? problem.message : "Generation failed.",
            });
          }
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setStep("review");
  };

  /* ── step 5: save ────────────────────────────────────────────────── */
  const save = async () => {
    if (!category || !listing) return;
    setSaving(true);
    setError("");

    try {
      const images: ProductImage[] = [];
      for (const shot of shots) {
        if (shot.generatedDataUrl && !shot.generatedUrl) {
          const url = await uploadImage({
            uid,
            productId: draftId.current,
            folder: "generated",
            name: shot.slotId,
            blob: dataUrlToBlob(shot.generatedDataUrl),
            contentType: dataUrlToBlob(shot.generatedDataUrl).type,
          });
          images.push({
            slot: shot.slotId,
            label: shot.label,
            generatedUrl: url,
            sourceUrl: undefined,
            finish: shot.finish,
          });
          patchShot(shot.slotId, { generatedUrl: url });
        } else if (shot.generatedUrl) {
          images.push({ slot: shot.slotId, label: shot.label, generatedUrl: shot.generatedUrl, finish: shot.finish });
        }
      }

      // Keep the originals too — the seller may want to re-render later.
      for (const [slotId, shot] of Object.entries(captured)) {
        const slot = category.slots.find((s) => s.id === slotId);
        const url = await uploadImage({
          uid,
          productId: draftId.current,
          folder: "source",
          name: slotId,
          blob: dataUrlToBlob(shot.dataUrl),
        });
        const entry = images.find((i) => i.slot === slotId);
        if (entry) entry.sourceUrl = url;
        else images.push({ slot: slotId, label: slot?.label ?? slotId, sourceUrl: url });
      }

      const primary =
        images.find((i) => i.generatedUrl)?.generatedUrl ??
        images.find((i) => i.sourceUrl)?.sourceUrl ??
        "";

      const product: Product = {
        id: draftId.current,
        sku: `KT-${String(listing.price).padStart(5, "0")}-${draftId.current.slice(-4).toUpperCase()}`,
        title: listing.title,
        category: listing.category || category.label,
        subcategory: listing.subcategory || category.label,
        description: listing.description,
        seoDescription: listing.seoDescription,
        attributes: listing.attributes,
        price: listing.price,
        tags: listing.tags,
        status: ProductStatus.REVIEW,
        imageUrl: primary,
        images,
        createdAt: Date.now(),
      };

      await createProduct(uid, product);
      setSaved(product.title);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "The product could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <>
      <div className="flow-scrim" onClick={onClose} />
      <div className="flow-shell">
        <div className="flow-done">
          <span className="flow-done-mark">
            <Check size={30} />
          </span>
          <h2>Saved to your catalogue</h2>
          <p>
            <strong>{saved}</strong> is in your review queue with{" "}
            {shots.filter((s) => s.state === "done").length} finished
            {shots.filter((s) => s.state === "done").length === 1 ? " shot" : " shots"}.
          </p>
          <div className="flow-done-actions">
            <button className="il-btn" onClick={() => { onSaved(); onClose(); }}>
              Back to catalogue
            </button>
            <button
              className="il-btn il-btn--brass"
              onClick={() => {
                setSaved(null);
                setStep("category");
                setCategoryId(null);
                setCaptured({});
                setNotes("");
                setListing(null);
                setQuickPhoto(null);
                setShots([]);
                draftId.current = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
              }}
            >
              Add another
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <div className="flow-scrim" onClick={onClose} />
    <div className="flow-shell">
      <header className="flow-topbar">
        <button className="flow-back" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <ol className="flow-steps">
          {STEPS.map((entry, index) => (
            <li
              key={entry.id}
              className={
                index === stepIndex ? "active" : index < stepIndex ? "done" : ""
              }
            >
              <span>{index + 1}</span>
              {entry.label}
            </li>
          ))}
        </ol>
      </header>

      <div className="flow-body">
        {error && (
          <p className="flow-error" role="alert">
            <CircleAlert size={16} />
            {error}
          </p>
        )}

        {step === "category" && (
          <section className="flow-pane">
            <span className="il-micro">Step one</span>
            <h2>Capture your product</h2>
            <p className="flow-sub">
              Take one clear photo. The vision model reads the real item and drafts your listing.
            </p>
            <div className="flow-camera">
              <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
              <div className="flow-camera-guide" aria-hidden="true" />
              {cameraState !== "ready" && (
                <div className="flow-camera-placeholder">
                  {cameraState === "opening" ? <Loader2 className="spin" size={26} /> : <Camera size={26} />}
                  <span>{cameraState === "opening" ? "Opening camera…" : cameraMessage}</span>
                  {cameraState === "unavailable" && <button className="il-btn" type="button" onClick={() => setCameraAttempt((attempt) => attempt + 1)}>Try camera again</button>}
                </div>
              )}
              {recognizing && <div className="flow-camera-reading"><Loader2 className="spin" size={24} /> Reading your product photo…</div>}
            </div>
            <div className="flow-camera-controls">
              <span>Place the whole product in the frame</span>
              <button className="flow-shutter" type="button" onClick={captureFromCamera} disabled={cameraState !== "ready" || recognizing} aria-label="Capture product photo"><span /></button>
              <button className="il-btn flow-upload" type="button" onClick={() => quickInput.current?.click()} disabled={recognizing}><ImagePlus size={17} /> Upload photo</button>
            </div>
            <button className="flow-phone-toggle" type="button" aria-expanded={phoneOpen} onClick={() => setPhoneOpen((open) => !open)}>
              Use your phone instead <ArrowRight size={16} />
            </button>
            {phoneOpen && !recognizing && <PhoneCapture onImageReceived={(image) => {
              setPhoneOpen(false);
              void startWithPhoto(new File([dataUrlToBlob(image)], "phone-capture.jpg", { type: "image/jpeg" }));
            }} />}
            <input
              ref={quickInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                void startWithPhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <p className="flow-sub">Or choose a category to add photos later:</p>
            <div className="flow-cats">
              {CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  className="flow-cat"
                  onClick={() => chooseCategory(entry.id)}
                >
                  <span className="flow-cat-head">
                    <strong>{entry.label}</strong>
                    <ArrowRight size={16} />
                  </span>
                  <span className="flow-cat-blurb">{entry.blurb}</span>
                  <span className="flow-cat-meta">
                    {entry.slots.filter((s) => s.required).length} required ·{" "}
                    {entry.slots.length} shots
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "photos" && category && (
          <section className="flow-pane">
            <span className="il-micro">Step two</span>
            <h2>Photograph your {category.label.toLowerCase()}</h2>
            <p className="flow-sub">
              {capturedCount} of {category.slots.length} captured
              {capturedCount === 0 && " · one clear photo is enough to start"}
              {capturedCount > 0 && missingRequired > 0 && " · extra angles improve the result"}
            </p>
            <div className="flow-slots">
              {category.slots.map((slot) => {
                const shot = captured[slot.id];
                return (
                  <div
                    key={slot.id}
                    className={`flow-slot ${shot ? "has-shot" : ""} ${slot.required ? "required" : ""}`}
                  >
                    <div className="flow-slot-media">
                      {shot ? (
                        <>
                          <img src={shot.dataUrl} alt={slot.label} />
                          <button
                            className="flow-slot-clear"
                            aria-label={`Remove ${slot.label}`}
                            onClick={() =>
                              setCaptured((c) => {
                                const next = { ...c };
                                delete next[slot.id];
                                return next;
                              })
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <Camera size={26} />
                      )}
                    </div>
                    <div className="flow-slot-copy">
                      <strong>
                        {slot.label}
                        {slot.required && <em>suggested</em>}
                      </strong>
                      <span>{slot.hint}</span>
                      <span className="flow-slot-spec">
                        {slot.aspect} · {slot.render}
                      </span>
                    </div>
                    <button
                      className="il-btn flow-slot-add"
                      onClick={() => fileInputs.current[slot.id]?.click()}
                    >
                      {shot ? "Retake" : "Add photo"}
                    </button>
                    <input
                      ref={(el) => {
                        fileInputs.current[slot.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={(e) => {
                        takePhoto(slot, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <footer className="flow-actions">
              <button
                className="il-btn il-btn--ghost"
                onClick={() => setStep("category")}
              >
                <ArrowLeft size={16} /> Change category
              </button>
              <button
                className="il-btn"
                disabled={capturedCount === 0}
                onClick={() => setStep("notes")}
              >
                Continue <ArrowRight size={16} />
              </button>
            </footer>
          </section>
        )}

        {step === "notes" && category && (
          <section className="flow-pane">
            <span className="il-micro">Step three</span>
            <h2>Tell it what you know</h2>
            <p className="flow-sub">
              Add anything the photo cannot show, such as price, size or exact
              material. Gemini will inspect your photo before drafting the
              listing, and the image editor will use that same photo as a reference.
            </p>
            <textarea
              className="flow-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={7}
              placeholder={
                category.id === "footwear"
                  ? "white canvas high tops, gum rubber sole, UK 5 to 11, unisex, worn two weeks and still crisp, ₹2,200"
                  : "cotton kurta, indigo block print, straight cut, sizes S to XL, for summer office, ₹1,499"
              }
            />
            <ul className="flow-hints">
              {category.extraFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            {aiReady === false && (
              <p className="flow-warn">
                <CircleAlert size={15} />
                Photo analysis is unavailable. You can still enter the listing
                manually and save the original photo.
              </p>
            )}
            <footer className="flow-actions">
              <button
                className="il-btn il-btn--ghost"
                onClick={() => setStep("photos")}
              >
                <ArrowLeft size={16} /> Back to photos
              </button>
              <button className="il-btn il-btn--brass" onClick={runGenerate}>
                {aiReady === false ? (
                  <>
                    <ImagePlus size={16} /> Write the listing
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Write it and shoot the set
                  </>
                )}
              </button>
            </footer>
          </section>
        )}

        {step === "generate" && (
          <section className="flow-pane">
            <span className="il-micro">Working</span>
            <h2>Reading your photo, then lighting the product</h2>
            <div className="flow-gen">
              {shots.map((shot) => (
                <div key={shot.slotId} className={`flow-gen-row ${shot.state}`}>
                  <span className="flow-gen-state">
                    {shot.state === "running" && <Loader2 className="spin" size={15} />}
                    {shot.state === "queued" && <span className="dot" />}
                    {shot.state === "done" && <Check size={15} />}
                    {shot.state === "failed" && <X size={15} />}
                  </span>
                  <strong>{shot.label}</strong>
                  <span className="flow-gen-note">
                    {shot.state === "queued" && "waiting"}
                    {shot.state === "running" && "generating…"}
                    {shot.state === "done" && (shot.finish === "studio" ? "studio finish ready" : "AI edit ready")}
                    {shot.state === "failed" && (shot.error ?? "failed")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === "review" && (
          <section className="flow-pane">
            <span className="il-micro">Step four</span>
            <h2>Check it before it ships</h2>
            {!listing ? (
              <p className="flow-sub">
                The listing pass did not finish. Fill the essentials below and
                save — you can regenerate the copy later.
              </p>
            ) : null}
            {shots.some((shot) => shot.finish === "studio") && (
              <p className="flow-warn">
                AI image editing is unavailable on the connected accounts. The studio finish keeps your original product photo intact.
              </p>
            )}

            <div className="flow-review">
              <div className="flow-gallery">
                {shots.map((shot) => (
                  <figure key={shot.slotId} className={`flow-tile ${shot.state}`}>
                    {shot.generatedDataUrl ? (
                      <img src={shot.generatedDataUrl} alt={shot.label} />
                    ) : shot.sourceUrl ? (
                      <img src={shot.sourceUrl} alt={shot.label} />
                    ) : (
                      <span>
                        {shot.state === "running" ? (
                          <Loader2 className="spin" size={18} />
                        ) : (
                          <ImagePlus size={18} />
                        )}
                      </span>
                    )}
                    <figcaption>{shot.label}{shot.finish === "studio" ? " · Studio finish" : shot.finish === "ai" ? " · AI edit" : ""}</figcaption>
                    {shot.state === "failed" && (
                      <button
                        className="flow-tile-retry"
                        onClick={() => {
                          const slot = category?.slots.find((s) => s.id === shot.slotId);
                          if (!slot || !captured[slot.id]) return;
                          patchShot(shot.slotId, { state: "running", error: undefined });
                          generateShot({
                            category: category!.id,
                            slot: slot.id,
                            image: captured[slot.id].dataUrl,
                            title: listing?.title ?? "",
                            material: listing?.attributes?.Material ?? "",
                            notes,
                            visual: listing?.visual,
                          })
                            .then((result) =>
                              patchShot(shot.slotId, {
                                state: "done",
                                generatedDataUrl: shotDataUrl(result.imageBase64),
                              }),
                            )
                            .catch((problem: unknown) =>
                              patchShot(shot.slotId, {
                                state: "failed",
                                error:
                                  problem instanceof Error
                                    ? problem.message
                                    : "Generation failed.",
                              }),
                            );
                        }}
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                    )}
                  </figure>
                ))}
              </div>

              <div className="flow-fields">
                {listing ? (
                  <>
                    {listing.visual && (
                      <p className="flow-sub">
                        Seen in your photo: {listing.visual.subject}
                        {listing.visual.colors ? ` · ${listing.visual.colors}` : ""}
                        {listing.visual.distinctiveFeatures.length
                          ? ` · ${listing.visual.distinctiveFeatures.join(", ")}` : ""}
                      </p>
                    )}
                    <label>
                      <span>Title</span>
                      <input
                        value={listing.title}
                        onChange={(e) => setListing({ ...listing, title: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Price (₹)</span>
                      <input
                        type="number"
                        min={1}
                        value={listing.price}
                        onChange={(e) =>
                          setListing({ ...listing, price: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>Description</span>
                      <textarea
                        rows={5}
                        value={listing.description}
                        onChange={(e) =>
                          setListing({ ...listing, description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>SEO description</span>
                      <textarea
                        rows={2}
                        value={listing.seoDescription}
                        onChange={(e) =>
                          setListing({ ...listing, seoDescription: e.target.value })
                        }
                      />
                    </label>
                    <div className="flow-attrs">
                      {Object.entries(listing.attributes).map(([key, value]) => (
                        <span key={key}>
                          <strong>{key}</strong>
                          {value}
                        </span>
                      ))}
                    </div>
                    <div className="flow-tags">
                      {listing.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <ManualFields
                    onChange={(next) => setListing(next)}
                    notes={notes}
                    categoryLabel={category?.label ?? ""}
                  />
                )}
              </div>
            </div>

            <footer className="flow-actions">
              <button className="il-btn il-btn--ghost" onClick={() => setStep("notes")}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="il-btn il-btn--brass"
                disabled={saving || !listing || !listing.title}
                onClick={save}
              >
                {saving ? (
                  <>
                    <Loader2 className="spin" size={16} /> Saving…
                  </>
                ) : (
                  <>
                    <Check size={16} /> Save to catalogue
                  </>
                )}
              </button>
            </footer>
          </section>
        )}
      </div>
    </div>
    </>
  );
}

function ManualFields({
  onChange,
  notes,
  categoryLabel,
}: {
  onChange: (listing: AiListing) => void;
  notes: string;
  categoryLabel: string;
}) {
  const [title, setTitle] = useState(notes.slice(0, 60) || "Untitled product");
  const [price, setPrice] = useState(999);
  const [description, setDescription] = useState(notes);

  useEffect(() => {
    onChange({
      title,
      price,
      description,
      seoDescription: description.slice(0, 160),
      category: categoryLabel,
      subcategory: categoryLabel,
      tags: [],
      attributes: {},
    });
  }, [title, price, description, categoryLabel]);

  return (
    <>
      <label>
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span>Price (₹)</span>
        <input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
    </>
  );
}
