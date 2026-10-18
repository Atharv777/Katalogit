/**
 * AI routes for the catalogue flow.
 *
 *   POST /api/ai/listing  free text + category -> structured listing JSON
 *   POST /api/ai/image    one photo + slot prompt -> generated catalogue image
 *   GET  /api/ai/status   what is configured, so the UI can explain itself
 *
 * These are mounted ahead of the Vite middleware in server.ts.
 */

import { Router, type Request, type Response } from "express";
import {
  aiConfigured,
  analyzeProduct,
  generateImage,
  generateSocialCopy,
  imageProvider,
  preferredImageModel,
  promptSafe,
  provider,
  textModel,
} from "./ai.js";
import {
  CATEGORY_IDS,
  buildImagePrompt,
  getCategory,
} from "../shared/categories.js";

export const aiRouter = Router();

const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ ok: false, error: message });

/** Slots are attacker-supplied — only ever resolve them through the catalogue. */
function resolveSlot(categoryId: string, slotId: string) {
  const category = getCategory(categoryId);
  const slot = category.slots.find((s) => s.id === slotId) ?? category.slots[0];
  return { category, slot };
}

/** Accepts either a data URL or a bare base64 payload; caps the size. */
function normaliseImage(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const trimmed = value.trim();
  const dataUrl = /^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(trimmed);
  if (dataUrl) {
    if (dataUrl[2].length > 9_000_000) return undefined;
    return trimmed;
  }
  const bare = /^[A-Za-z0-9+/=\s]+$/.test(trimmed);
  if (bare && trimmed.length < 9_000_000) {
    return `data:image/jpeg;base64,${trimmed.replace(/\s+/g, "")}`;
  }
  return undefined;
}

/** FNV-1a — a stable seed per product+slot so re-runs are comparable. */
const fnv1a = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

aiRouter.get("/status", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      configured: aiConfigured(),
      provider: aiConfigured() ? provider() : null,
      textModel: aiConfigured() ? textModel() : null,
      imageModel: preferredImageModel(),
      imageProvider: imageProvider(),
    },
  });
});

/**
 * Turn the seller's free text into the structured listing the catalogue stores.
 * This is the only place seller text becomes model input.
 */
aiRouter.post("/listing", async (req: Request, res: Response) => {
  if (!aiConfigured()) {
    return fail(res, 503, "The AI service is not configured on this server.");
  }

  const body = req.body ?? {};
  const autoCategory = body.category === "auto";
  const categoryId = CATEGORY_IDS.includes(body.category) ? body.category : CATEGORY_IDS[0];
  const category = autoCategory ? null : getCategory(categoryId);
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";
  const image = normaliseImage(body.image);
  const language = body.language === "hi" ? "Hindi" : body.language === "ta" ? "Tamil" : "English";
  if (!image) return fail(res, 400, "Add a product photo before analysis.");

  try {
    const listing = await analyzeProduct({
      image,
      notes,
      category: category?.id ?? "product",
      categoryLabel: category?.label ?? "Unspecified — identify the product from the photo",
      slotLabels: category && Array.isArray(body.slots)
        ? body.slots
            .map((id: unknown) => category.slots.find((s) => s.id === id)?.label)
            .filter(Boolean)
        : [],
      language,
    });
    return res.json({ ok: true, data: { listing } });
  } catch (error) {
    console.error("[ai/listing]", error);
    return fail(res, 502, error instanceof Error ? error.message : "The listing could not be written.");
  }
});

/**
 * Generate one catalogue image for one captured photo + one slot. The UI calls
 * this once per slot and shows each result as it lands.
 */
aiRouter.post("/image", async (req: Request, res: Response) => {
  if (!imageProvider()) {
    return fail(res, 503, "The AI service is not configured on this server.");
  }

  const body = req.body ?? {};
  const categoryId = CATEGORY_IDS.includes(body.category) ? body.category : CATEGORY_IDS[0];
  const { category, slot } = resolveSlot(categoryId, String(body.slot ?? ""));
  const sourceImage = normaliseImage(body.image);

  if (!sourceImage) {
    return fail(res, 400, "That photo could not be read. Try capturing it again.");
  }

  const title = promptSafe(body.title, 120);
  const material = promptSafe(body.material, 60);
  const colors = Array.isArray(body.colors)
    ? body.colors.map((c: unknown) => promptSafe(c, 30)).filter(Boolean).slice(0, 4)
    : [];
  const notes = promptSafe(body.notes, 200);
  const rawVisual = body.visual && typeof body.visual === "object" ? body.visual : {};
  const visual = [
    promptSafe(rawVisual.subject, 100),
    promptSafe(rawVisual.colors, 100),
    promptSafe(rawVisual.material, 100),
    promptSafe(rawVisual.pattern, 100),
    ...(Array.isArray(rawVisual.distinctiveFeatures)
      ? rawVisual.distinctiveFeatures.slice(0, 8).map((part: unknown) => promptSafe(part, 100))
      : []),
    promptSafe(rawVisual.visibleText, 100),
  ].filter(Boolean).join("; ");

  const prompt = buildImagePrompt({
    category,
    slot,
    title: title || "an unbranded retail product",
    material,
    colors,
    notes,
    visual,
  });

  try {
    const imageBase64 = await generateImage({
      prompt,
      sourceImage: { dataUrl: sourceImage },
      aspect: slot.aspect,
      seed: fnv1a(`${title}:${slot.id}`),
    });
    return res.json({
      ok: true,
      data: {
        slot: slot.id,
        aspect: slot.aspect,
        imageBase64,
        prompt,
      },
    });
  } catch (error) {
    console.error("[ai/image]", error);
    return fail(res, 502, error instanceof Error ? error.message : "That image could not be generated.");
  }
});

aiRouter.post("/social-copy", async (req: Request, res: Response) => {
  if (!aiConfigured()) return fail(res, 503, "The AI service is not configured on this server.");
  try {
    const body = req.body ?? {};
    const data = await generateSocialCopy({
      title: String(body.title ?? ""), description: String(body.description ?? ""),
      category: String(body.category ?? ""), platform: String(body.platform ?? "Instagram"),
      angle: String(body.angle ?? "Product spotlight"),
      language: body.language === "hi" ? "Hindi" : body.language === "ta" ? "Tamil" : "English",
    });
    return res.json({ ok: true, data });
  } catch (error) {
    return fail(res, 502, error instanceof Error ? error.message : "Could not write the post.");
  }
});

aiRouter.post("/social-image", async (req: Request, res: Response) => {
  if (!imageProvider()) return fail(res, 503, "Image editing is not configured on this server.");
  const sourceImage = normaliseImage(req.body?.image);
  if (!sourceImage) return fail(res, 400, "Choose a catalogue product with an image.");
  const title = promptSafe(req.body?.title, 120);
  const angle = promptSafe(req.body?.angle, 40);
  const visual = promptSafe(req.body?.visual, 180);
  const prompt = [
    "Create a polished social media campaign photograph by editing the attached source product image.",
    "The attached item is the exact product. Preserve its shape, colors, pattern, proportions and any visible details. Do not invent packaging or product features.",
    `Product: ${title}. Post angle: ${angle}. Visible facts: ${visual}.`,
    "Art direction: clean editorial set, soft directional light, ample negative space for overlaid copy. No text, price, logo or watermark in the generated image.",
  ].join(" ");
  try {
    const imageBase64 = await generateImage({ prompt, sourceImage: { dataUrl: sourceImage }, aspect: "4:5" });
    return res.json({ ok: true, data: { imageBase64 } });
  } catch (error) {
    return fail(res, 502, error instanceof Error ? error.message : "Could not create the campaign photo.");
  }
});
