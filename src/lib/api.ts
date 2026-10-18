/**
 * Typed client for the server-side AI routes. The OpenRouter key lives on the
 * server; the browser only ever sees these endpoints.
 */

import type { AiListing, AiStatus } from "../types";
import type { Language } from "./language";

async function readJson<T>(res: Response): Promise<T> {
  let body: { ok?: boolean; data?: T; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error("The server sent something unreadable. Try again.");
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.error || "That request did not go through.");
  }
  return body.data as T;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch("/api/ai/status");
  return readJson<AiStatus>(res);
}

export async function writeListing(input: {
  category: string;
  notes: string;
  slots: string[];
  image: string;
  language?: Language;
}): Promise<AiListing> {
  const res = await fetch("/api/ai/listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ listing: AiListing }>(res);
  return data.listing;
}

export async function generateShot(input: {
  category: string;
  slot: string;
  image: string;
  title: string;
  material?: string;
  colors?: string[];
  notes?: string;
  visual?: AiListing["visual"];
}): Promise<{ slot: string; aspect: string; imageBase64: string; prompt: string }> {
  const res = await fetch("/api/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson(res);
}

/** Downscale in the browser so the server never receives a 12MP phone photo. */
export async function fileToCompressedDataUrl(
  file: Blob,
  maxEdge = 1280,
  quality = 0.86,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}

/** Strip the data-url prefix so the bytes can go to Storage as a Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("That image data is not readable.");
  const bytes = atob(match[2]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: match[1] });
}
