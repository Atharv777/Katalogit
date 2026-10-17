/**
 * AI layer — runs on the server so API keys never reach the browser.
 *
 * Two jobs:
 *   1. `generateListing`  — seller's free text -> strict JSON listing.
 *   2. `generateImage`    — one captured photo + a category/slot prompt ->
 *      a catalogue-ready image.
 *
 * Two providers behind one interface:
 *   - Gemini (Google AI Studio key) — preferred when GEMINI_API_KEY (or
 *     GOOGLE_API_KEY) is set; this is the free-tier path.
 *   - OpenRouter — used when only OPENROUTER_API_KEY is set.
 *
 * Ported from KatalogitAI's Vertex pipeline (backend/src/ai-text.js +
 * backend/src/ai-fallback.js): the same defensive parsing, the same
 * prompt-injection stripping, the same `{ok, data|error}` failure discipline.
 */

import { NEGATIVE_DIRECTIVES } from "../shared/categories.js";
import sharp from "sharp";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/edits";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

export type Provider = "gemini" | "openrouter" | "pollinations" | "openai" | "cloudflare";

const geminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

/**
 * Providers that failed with a permanent-looking error this session. Keeps the
 * demo fast (no re-probing a denied key) and makes the status readout honest.
 */
const down = new Set<Provider>();
const imageDown = new Set<Provider>();

/**
 * Preferred provider for the status readout. Generation itself degrades
 * gracefully: Gemini -> OpenRouter -> Pollinations, so a demo never dead-ends.
 */
export const provider = (): Provider => {
  if (geminiKey() && !down.has("gemini")) return "gemini";
  if (process.env.OPENROUTER_API_KEY && !down.has("openrouter")) return "openrouter";
  return "pollinations";
};

/** Remember a provider failure when retrying it soon is pointless. */
const markDown = (name: Provider, error: unknown) => {
  if (name === "pollinations") return;
  const permanent =
    (error instanceof UpstreamError && [401, 402, 403, 404, 429].includes(error.status)) ||
    /no credits|insufficient_quota|rejected the request|not available/i.test(String((error as Error)?.message ?? ""));
  if (permanent) down.add(name);
};

export const textModel = () =>
  provider() === "gemini"
    ? process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite"
    : provider() === "openrouter"
      ? process.env.OPENROUTER_TEXT_MODEL || "nvidia/nemotron-3.5-super-vl:free"
      : "pollinations/openai";

export const imageModel = () =>
  imageProvider() === "cloudflare"
    ? CLOUDFLARE_IMAGE_MODEL
    : imageProvider() === "gemini"
    ? process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image"
    : imageProvider() === "openrouter"
      ? process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-lite-image"
      : null;

export const aiConfigured = () => Boolean(geminiKey() || process.env.OPENROUTER_API_KEY);
export const imageProvider = (): "cloudflare" | "openai" | "gemini" | "openrouter" | null =>
  process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && !imageDown.has("cloudflare")
    ? "cloudflare"
    : geminiKey() && !imageDown.has("gemini")
    ? "gemini"
    : process.env.OPENAI_API_KEY && !imageDown.has("openai")
      ? "openai"
      : process.env.OPENROUTER_API_KEY && !imageDown.has("openrouter")
        ? "openrouter"
        : null;
export const preferredImageModel = () =>
  imageProvider() === "openai"
    ? process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare"
    : imageProvider() ? imageModel() : null;

/**
 * Strip characters and instruction-like keywords from seller text before it is
 * ever placed inside a prompt. A seller must not be able to talk their way past
 * the prompt into a generation we would be liable for.
 */
const INJECTION =
  /\b(ignore|disregard|system|override|bypass|jailbreak|reveal|instructions?|prompt|developer|assistant)\b|(ignore|forget|disregard)\s+(all|any|previous)|previous\s+(instructions?|messages?|prompts?)|follow\s+these|new\s+instructions?|output\s+only/gi;

export function promptSafe(text: unknown, max = 160): string {
  const clean = String(text ?? "")
    .replace(/[()[\]{}:,/\\'"<>;|*~`#]/g, " ")
    .replace(INJECTION, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return clean.length < 2 ? "" : clean;
}

/** Remove control chars and every tag; cap the length. */
export const cleanText = (value: unknown, max: number): string =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const cleanOpt = (value: unknown, max: number) =>
  value === undefined || value === null || value === "" ? "" : cleanText(value, max);

function stringList(value: unknown, itemMax: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value.slice(0, maxItems)) {
    if (typeof item !== "string" || item.trim().length > itemMax) continue;
    const cleaned = cleanOpt(item, itemMax);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  }
  return out;
}

const finiteNumber = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};

export const LISTING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "seoDescription",
    "price",
    "category",
    "subcategory",
    "tags",
    "attributes",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    seoDescription: { type: "string" },
    price: { type: "number" },
    category: { type: "string" },
    subcategory: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    attributes: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
} as const;

/**
 * Parse the model's reply into the exact shape the catalogue stores. Unknown
 * keys are dropped, every string is cleaned and capped, every list is capped.
 */
export function parseListing(raw: unknown, fallbackCategory: string): {
  title: string;
  description: string;
  seoDescription: string;
  price: number;
  category: string;
  subcategory: string;
  tags: string[];
  attributes: Record<string, string>;
} {
  const source = (raw ?? {}) as Record<string, unknown>;

  const title = cleanOpt(source.title, 120);
  if (!title) throw new Error("The model returned no title.");

  const attributes: Record<string, string> = {};
  if (source.attributes && typeof source.attributes === "object" && !Array.isArray(source.attributes)) {
    for (const [key, value] of Object.entries(source.attributes as Record<string, unknown>)) {
      const k = cleanOpt(key, 30);
      const v = cleanOpt(value, 80);
      if (k && v) attributes[k] = v;
      if (Object.keys(attributes).length >= 14) break;
    }
  }

  return {
    title,
    description: cleanOpt(source.description, 700) || title,
    seoDescription: cleanOpt(source.seoDescription, 300),
    price: Math.max(1, finiteNumber(source.price, 0)),
    category: cleanOpt(source.category, 40) || fallbackCategory,
    subcategory: cleanOpt(source.subcategory, 60),
    tags: stringList(source.tags, 32, 10),
    attributes,
  };
}

export function buildListingPrompt(args: {
  notes: string;
  category: string;
  categoryLabel: string;
  extraFields: string[];
  slotLabels: string[];
}): string {
  const notes = promptSafe(args.notes, 1200);
  const category = promptSafe(args.categoryLabel, 40);
  const extras = args.extraFields.join(", ");

  return [
    "You are the listing writer for Katalogit, an Indian retail catalogue tool.",
    "A shop owner typed free-form notes about one product. Convert them into a single structured product listing.",
    "",
    "Rules:",
    "- title: max 110 characters, specific, searchable, no hype, no ALL CAPS, no emojis, no brand names you were not given.",
    "- description: 3-4 sentences. What it is, then material and feel, then who it is for and when.",
    "- seoDescription: one sentence under 160 characters written for a search result snippet.",
    "- price: realistic INR retail price for a small Indian shop. If the notes imply no price, infer one from the category and quality described.",
    "- category / subcategory: the specific type within the shop's category.",
    "- tags: 5-10 lowercase search phrases a real buyer would type.",
    `- attributes: the seller's own facts, tidied into labelled pairs.${extras ? ` Useful labels here include: ${extras}.` : ""}`,
    "",
    `Shop category: ${category}`,
    `Photos the seller captured: ${args.slotLabels.join(", ") || "none"}`,
    "",
    "Seller notes:",
    notes || "(the seller wrote nothing — infer carefully from the category and the photos)",
    "",
    "Respond with the JSON object only.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** An upstream rejection we may want to inspect before deciding how to react. */
class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: string,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/*  OpenRouter                                                         */
/* ------------------------------------------------------------------ */

async function callOpenRouter(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The AI service is not configured.");

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Katalogit AI",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("The AI service could not be reached.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 402) {
      throw new Error(
        "The AI account has no credits. Add credits at openrouter.ai/settings/credits.",
      );
    }
    if (res.status === 429) throw new Error("The AI service is busy. Try again shortly.");
    if (res.status === 401 || res.status === 403) {
      console.error("[ai] OpenRouter rejected the key:", res.status, detail.slice(0, 300));
      throw new Error("The AI service rejected the request. Check OPENROUTER_API_KEY.");
    }
    console.error("[ai] OpenRouter error:", res.status, detail.slice(0, 300));
    throw new Error("The AI service could not complete that request.");
  }

  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Pull the assistant message out of an OpenRouter chat completion. */
function readMessage(payload: Record<string, unknown>): Record<string, unknown> {
  const choices = payload.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (!message) throw new Error("The AI service returned nothing usable.");
  return message;
}

/** Tolerate code fences and surrounding prose around the JSON object. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The AI service did not return JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Pull image bytes out of whichever field the model used. */
function readImageB64(message: Record<string, unknown>): string {
  const images = message.images as Array<{ image_url?: { url?: string } }> | undefined;
  if (Array.isArray(images)) {
    for (const entry of images) {
      const url = entry?.image_url?.url;
      if (typeof url === "string" && url.includes("base64,")) {
        return url.slice(url.indexOf("base64,") + 7);
      }
    }
  }

  const content = message.content;
  const scan = (value: unknown): string | null => {
    if (typeof value === "string") {
      const match = value.match(/data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)/i);
      return match ? match[1] : null;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = scan(item);
        if (found) return found;
      }
    }
    return null;
  };
  const fromContent = scan(content);
  if (fromContent) return fromContent;

  throw new Error("The AI service returned no image.");
}

async function openrouterListing(args: Parameters<typeof buildListingPrompt>[0]): Promise<unknown> {
  const payload = await callOpenRouter(
    {
      model: process.env.OPENROUTER_TEXT_MODEL || "nvidia/nemotron-3.5-super-vl:free",
      messages: [{ role: "user", content: buildListingPrompt(args) }],
      temperature: 0.5,
      max_tokens: 1400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_listing",
          strict: true,
          schema: LISTING_SCHEMA,
        },
      },
    },
    60_000,
  );

  const message = readMessage(payload);
  const content = typeof message.content === "string" ? message.content : "";
  if (!content) throw new Error("The AI service returned an empty listing.");

  return extractJson(content);
}

async function openrouterImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
  seed?: number;
}): Promise<string> {
  const parts: Array<Record<string, unknown>> = [];

  if (args.sourceImage?.dataUrl) {
    const match = args.sourceImage.dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (match) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${match[1]};base64,${match[2].replace(/\s+/g, "")}` },
      });
    }
  }
  parts.push({ type: "text", text: args.prompt });

  const payload = await callOpenRouter(
    {
      model: process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-lite-image",
      modalities: ["image", "text"],
      messages: [{ role: "user", content: parts }],
      temperature: 0.9,
      max_tokens: 2048,
      seed: args.seed,
      ...(args.aspect && args.aspect !== "1:1" ? { image_config: { aspect_ratio: args.aspect } } : {}),
    },
    180_000,
  );

  return readImageB64(readMessage(payload));
}

/* ------------------------------------------------------------------ */
/*  Gemini (Google AI Studio / Generative Language API)                */
/* ------------------------------------------------------------------ */

/** Short, human-readable slice of a Google error payload. */
function geminiErrorBrief(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    const message = parsed.error?.message;
    if (message) return message.split("\n")[0].slice(0, 160);
  } catch {
    /* not JSON — fall through */
  }
  return detail.slice(0, 160);
}

async function callGemini(
  model: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const key = geminiKey();
  if (!key) throw new Error("The AI service is not configured.");

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("The AI service could not be reached.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      console.error("[ai] Gemini rejected the key:", res.status, detail.slice(0, 300));
      throw new UpstreamError(
        "The AI service rejected the request. Check GEMINI_API_KEY.",
        res.status,
        detail,
      );
    }
    if (res.status === 429) {
      throw new UpstreamError(
        "The AI service is busy or today's free quota is used up. Try again shortly.",
        res.status,
        detail,
      );
    }
    console.error("[ai] Gemini error:", res.status, detail.slice(0, 300));
    throw new UpstreamError(
      `The AI service could not complete that request: ${geminiErrorBrief(detail)}`,
      res.status,
      detail,
    );
  }

  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

const geminiCandidates = (payload: Record<string, unknown>) =>
  (payload.candidates as Array<Record<string, unknown>> | undefined) ?? [];

/** Explain a safety block instead of surfacing a bare failure. */
function assertNotBlocked(payload: Record<string, unknown>): void {
  const feedback = payload.promptFeedback as { blockReason?: string } | undefined;
  const finish = geminiCandidates(payload)[0]?.finishReason;
  if (feedback?.blockReason || finish === "SAFETY" || finish === "PROHIBITED_CONTENT") {
    throw new Error("The AI service blocked that request. Rephrase the notes and try again.");
  }
}

function geminiParts(payload: Record<string, unknown>, candidateIndex = 0): GeminiPart[] {
  const candidate = geminiCandidates(payload)[candidateIndex];
  return (candidate?.content as { parts?: GeminiPart[] } | undefined)?.parts ?? [];
}

function readGeminiText(payload: Record<string, unknown>): string {
  assertNotBlocked(payload);
  return geminiParts(payload)
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function readGeminiImage(payload: Record<string, unknown>): string {
  assertNotBlocked(payload);
  for (const candidate of geminiCandidates(payload)) {
    const parts = (candidate.content as { parts?: GeminiPart[] } | undefined)?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data ?? part.inline_data?.data;
      if (typeof data === "string" && data.length > 32) return data;
    }
  }
  throw new Error("The AI service returned no image.");
}

async function geminiListing(args: Parameters<typeof buildListingPrompt>[0]): Promise<unknown> {
  const payload = await callGemini(
    process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite",
    {
      contents: [{ role: "user", parts: [{ text: buildListingPrompt(args) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 1600,
      },
    },
    60_000,
  );

  const text = readGeminiText(payload);
  if (!text) throw new Error("The AI service returned an empty listing.");
  return extractJson(text);
}

async function geminiImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
  seed?: number;
}): Promise<string> {
  const parts: Array<Record<string, unknown>> = [{ text: args.prompt }];

  if (args.sourceImage?.dataUrl) {
    const match = args.sourceImage.dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2].replace(/\s+/g, "") } });
    }
  }

  const generationConfig: Record<string, unknown> = { responseModalities: ["TEXT", "IMAGE"] };
  if (args.aspect && args.aspect !== "1:1") {
    generationConfig.imageConfig = { aspectRatio: args.aspect };
  }

  const body = { contents: [{ role: "user", parts }], generationConfig };

  try {
    return readGeminiImage(await callGemini(process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image", body, 180_000));
  } catch (error) {
    // Older image models reject imageConfig — retry once without it.
    if (
      error instanceof UpstreamError &&
      error.status === 400 &&
      /aspect|image[_ ]?config/i.test(error.detail)
    ) {
      delete generationConfig.imageConfig;
      return readGeminiImage(await callGemini(process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image", body, 180_000));
    }
    throw error;
  }
}

/** FLUX.2 Klein edits the uploaded product photo through Cloudflare's multipart API. */
async function cloudflareImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
}): Promise<string> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  const source = args.sourceImage?.dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!/^[a-f0-9]{32}$/i.test(account) || !token || !source) {
    throw new Error("Cloudflare image editing needs a valid account, token, and product photo.");
  }

  // Cloudflare requires every reference image to be smaller than 512 x 512.
  const resized = await sharp(Buffer.from(source[1].replace(/\s+/g, ""), "base64"))
    .rotate()
    .resize({ width: 500, height: 500, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toBuffer();
  const sizes: Record<string, [number, number]> = {
    "1:1": [1024, 1024], "2:3": [768, 1152], "3:2": [1152, 768], "4:5": [896, 1120],
  };
  const [width, height] = sizes[args.aspect ?? "1:1"] ?? sizes["1:1"];
  const form = new FormData();
  form.append("prompt", args.prompt.slice(0, 2048));
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("input_image_0", new Blob([new Uint8Array(resized)], { type: "image/jpeg" }), "product.jpg");

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ code?: number; message?: string }>;
    result?: { image?: string };
  };
  if (!response.ok || payload.success === false) {
    const reason = payload.errors?.[0]?.message || `HTTP ${response.status}`;
    throw new UpstreamError(`Cloudflare image edit unavailable: ${String(reason).slice(0, 160)}`, response.status, String(reason));
  }
  const image = payload.result?.image;
  if (!image) throw new Error("Cloudflare returned no edited image.");
  return image.replace(/^data:image\/[^;]+;base64,/, "");
}

/** Analyze the actual uploaded photograph before writing copy or directing edits. */
export async function analyzeProduct(args: {
  image: string;
  category: string;
  categoryLabel: string;
  notes: string;
  slotLabels: string[];
}) {
  const prompt = [
    "You are a meticulous retail product photo analyst. Inspect the attached photograph. The image is the source of truth; seller notes may supplement but must never override a visible fact.",
    "Return ONLY a JSON object with title, description, seoDescription, price, category, subcategory, tags, attributes, visual.",
    "Choose the closest category from apparel, footwear, electronics, bags, home, jewellery, accessories. Infer every field from the photo without asking the seller. If a detail is not visible, leave that attribute out rather than inventing it.",
    "The visual object must contain subject, colors, material, pattern, distinctiveFeatures (array), visibleText, uncertainty. State only what is actually visible. If material, hidden sides or text cannot be determined, say unknown. Never invent a logo, label, size, reverse side or component.",
    "Write concise merchant-ready listing copy. Use INR for price; if no price is supplied, make a clearly editable reasonable suggestion.",
    `Category guidance: ${promptSafe(args.categoryLabel, 60)}. Captured angle: ${args.slotLabels.map((s) => promptSafe(s, 40)).join(", ") || "unknown"}. If no category was selected, identify the category from the image.`,
    `Seller notes: ${promptSafe(args.notes, 1200) || "none"}.`,
  ].join("\n");
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(args.image);
  if (!match) throw new Error("The photo could not be read.");

  let raw: unknown;
  if (geminiKey() && !down.has("gemini")) {
    try {
      const payload = await callGemini(
        process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite",
        {
          contents: [{ role: "user", parts: [
            { text: prompt },
            { inlineData: { mimeType: match[1], data: match[2].replace(/\s+/g, "") } },
          ] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1800 },
        },
        60_000,
      );
      raw = extractJson(readGeminiText(payload));
    } catch (error) {
      markDown("gemini", error);
      console.warn("[ai/analysis] Gemini failed:", (error as Error)?.message);
      if (!process.env.OPENROUTER_API_KEY) throw error;
    }
  }
  if (!raw && process.env.OPENROUTER_API_KEY) {
    const payload = await callOpenRouter({
      model: process.env.OPENROUTER_TEXT_MODEL || "google/gemini-2.5-flash",
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: args.image } },
      ] }],
      temperature: 0.2,
      max_tokens: 1800,
    }, 60_000);
    const message = readMessage(payload);
    raw = extractJson(typeof message.content === "string" ? message.content : "");
  }
  if (!raw) throw new Error("Photo analysis needs a Gemini or OpenRouter key.");

  const listing = parseListing(raw, args.category);
  const visual = (raw as { visual?: Record<string, unknown> }).visual ?? {};
  return {
    ...listing,
    visual: {
      subject: cleanText(visual.subject, 100),
      colors: cleanText(visual.colors, 120),
      material: cleanText(visual.material, 120),
      pattern: cleanText(visual.pattern, 120),
      distinctiveFeatures: stringList(visual.distinctiveFeatures, 100, 8),
      visibleText: cleanText(visual.visibleText, 100),
      uncertainty: cleanText(visual.uncertainty, 160),
    },
  };
}

export async function generateSocialCopy(args: { title: string; description: string; category: string; platform: string; angle: string }) {
  const prompt = [
    "You write social media captions for a small Indian retail shop. Use only the product facts below. No invented discounts, materials, stock claims, or guarantees.",
    "Return JSON with caption (one warm, specific paragraph under 240 characters) and hashtags (array of 4-6 relevant lowercase hashtags).",
    `Platform: ${promptSafe(args.platform, 30)}. Post angle: ${promptSafe(args.angle, 40)}.`,
    `Product: ${promptSafe(args.title, 120)}. Category: ${promptSafe(args.category, 60)}. Description: ${promptSafe(args.description, 500)}.`,
  ].join("\n");
  let raw: unknown;
  if (geminiKey() && !down.has("gemini")) {
    try {
      const response = await callGemini(process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite", {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 450 },
      }, 45_000);
      raw = extractJson(readGeminiText(response));
    } catch (error) {
      markDown("gemini", error);
      if (!process.env.OPENROUTER_API_KEY) throw error;
    }
  }
  if (!raw && process.env.OPENROUTER_API_KEY) {
    const response = await callOpenRouter({
      model: process.env.OPENROUTER_TEXT_MODEL || "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 450,
    }, 45_000);
    raw = extractJson(String(readMessage(response).content ?? ""));
  }
  if (!raw) throw new Error("Social copy is unavailable right now.");
  const result = raw as { caption?: unknown; hashtags?: unknown };
  return {
    caption: cleanText(result.caption, 240),
    hashtags: stringList(result.hashtags, 30, 6).map((tag) => `#${tag.replace(/^#/, "").replace(/[^a-zA-Z0-9_]/g, "")}`).filter((tag) => tag.length > 1),
  };
}

const openAiSize: Record<string, string> = {
  "1:1": "1024x1024", "2:3": "1024x1536", "3:2": "1536x1024", "4:5": "1024x1280",
};

/** Image edit, rather than text-only generation, keeps the real item in frame. */
async function openaiImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !args.sourceImage?.dataUrl) throw new Error("A source photo and OpenAI key are required.");
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare",
      images: [{ image_url: args.sourceImage.dataUrl }],
      prompt: args.prompt,
      size: openAiSize[args.aspect ?? "1:1"] ?? openAiSize["1:1"],
      quality: process.env.OPENAI_IMAGE_QUALITY || "low",
      output_format: "jpeg",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const reason = body.error?.code || body.error?.message || `HTTP ${response.status}`;
    throw new UpstreamError(`OpenAI image edit unavailable: ${String(reason).slice(0, 160)}`, response.status, String(reason));
  }
  const data = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const image = data.data?.[0]?.b64_json;
  if (!image) throw new Error("OpenAI returned no edited image.");
  return image;
}

/* ------------------------------------------------------------------ */
/*  Pollinations (keyless free tier — demo fallback)                   */
/* ------------------------------------------------------------------ */

const POLLINATIONS_TEXT = "https://text.pollinations.ai/openai";
const POLLINATIONS_IMAGE = "https://image.pollinations.ai/prompt";

async function pollinationsListing(
  args: Parameters<typeof buildListingPrompt>[0],
): Promise<unknown> {
  const res = await fetch(POLLINATIONS_TEXT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "user", content: buildListingPrompt(args) }],
      private: true,
    }),
    signal: AbortSignal.timeout(90_000),
  }).catch(() => null);

  if (!res || !res.ok) throw new Error("The AI service is busy. Try again shortly.");

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const choices = payload.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as { content?: string } | undefined;
  if (!message?.content) throw new Error("The AI service returned an empty listing.");

  return extractJson(message.content);
}

/** Map our slot ratios onto the largest square-ish frame each fits. */
const POLLINATIONS_SIZE: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "2:3": [832, 1216],
  "3:2": [1216, 832],
  "4:5": [864, 1080],
};

async function pollinationsImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
  seed?: number;
}): Promise<string> {
  const [width, height] = POLLINATIONS_SIZE[args.aspect ?? "1:1"] ?? POLLINATIONS_SIZE["1:1"];
  const url = new URL(`${POLLINATIONS_IMAGE}/${encodeURIComponent(args.prompt)}`);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("seed", String(args.seed ?? 7));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("model", "flux");

  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) }).catch(() => null);
  if (!res || !res.ok) throw new Error("The image service is busy. Try again shortly.");

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error("The image service returned an empty image.");

  return buffer.toString("base64");
}

/* ------------------------------------------------------------------ */
/*  Dispatch                                                           */
/* ------------------------------------------------------------------ */

/** A provider that is unreachable, denied, out of quota or missing a model. */
export async function generateListing(args: {
  notes: string;
  category: string;
  categoryLabel: string;
  extraFields: string[];
  slotLabels: string[];
}) {
  const attempts: Array<{ name: string; run: () => Promise<unknown> }> = [];

  if (geminiKey()) attempts.push({ name: "gemini", run: () => geminiListing(args) });
  if (process.env.OPENROUTER_API_KEY) {
    attempts.push({ name: "openrouter", run: () => openrouterListing(args) });
  }
  attempts.push({ name: "pollinations", run: () => pollinationsListing(args) });

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return parseListing(await attempt.run(), args.category);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /blocked that request/i.test(error.message)) throw error;
      markDown(attempt.name as Provider, error);
      console.warn(`[ai/listing] ${attempt.name} failed:`, (error as Error)?.message);
    }
  }

  throw lastError ?? new Error("The listing could not be written.");
}

export async function generateImage(args: {
  prompt: string;
  sourceImage?: { dataUrl: string };
  aspect?: string;
  seed?: number;
}) {
  const attempts: Array<{ name: string; run: () => Promise<string> }> = [];

  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && !imageDown.has("cloudflare")) {
    attempts.push({ name: "cloudflare", run: () => cloudflareImage(args) });
  }
  if (geminiKey() && !imageDown.has("gemini")) attempts.push({ name: "gemini", run: () => geminiImage(args) });
  if (process.env.OPENAI_API_KEY && !imageDown.has("openai")) attempts.push({ name: "openai", run: () => openaiImage(args) });
  if (process.env.OPENROUTER_API_KEY && !imageDown.has("openrouter")) {
    attempts.push({ name: "openrouter", run: () => openrouterImage(args) });
  }
  // The keyless text-to-image service ignores the uploaded photo. Never use it
  // for a listing that claims to depict the seller's actual product.

  let lastError: unknown;
  let preferredError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt.run();
    } catch (error) {
      lastError = error;
      preferredError ??= error;
      if (error instanceof Error && /blocked that request/i.test(error.message)) throw error;
      if (
        (error instanceof UpstreamError && [401, 402, 403, 404, 429].includes(error.status)) ||
        /no credits|insufficient_quota|credit_balance_exhausted/i.test(String((error as Error)?.message ?? ""))
      ) imageDown.add(attempt.name as Provider);
      console.warn(`[ai/image] ${attempt.name} failed:`, (error as Error)?.message);
    }
  }

  throw preferredError ?? lastError ?? new Error("That image could not be generated.");
}

export { NEGATIVE_DIRECTIVES };
