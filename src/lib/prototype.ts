/**
 * Prototype session — a local, no-signup studio for demos.
 *
 * Products live in localStorage and photos become data URLs, so the whole
 * capture -> generate -> save loop runs with no account, no Firebase and no
 * backend. Sign in (or append `?auth=1`) to use the real Firestore path.
 */

import type { User } from "firebase/auth";
import type { Product } from "../types";

export const PROTOTYPE_UID = "prototype-local";
const KEY = "katalogit:prototype:products";
const EVENT = "katalogit:prototype";
const IMAGE_RESET_KEY = "katalogit:prototype:images-cleared:v1";

export const isPrototype = (uid: string) => uid === PROTOTYPE_UID;

export const prototypeUser = (shopName = "Your shop") =>
  ({
    uid: PROTOTYPE_UID,
    displayName: shopName,
    email: null,
    photoURL: null,
  }) as unknown as User;

const read = (): Product[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
};

const write = (products: Product[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(products));
  } catch {
    /* quota — the demo keeps working for this session */
  }
  window.dispatchEvent(new Event(EVENT));
};

const ordered = (products: Product[]) =>
  [...products].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

export function subscribeToPrototype(onUpdate: (products: Product[]) => void) {
  // Clear images saved by the earlier demo once. New captures keep their photos.
  try {
    if (!localStorage.getItem(IMAGE_RESET_KEY)) {
      const cleaned = read().map(({ images: _images, aiImageProduct: _product, aiImageLifestyle: _lifestyle, ...product }) => ({ ...product, imageUrl: "" }));
      localStorage.setItem(KEY, JSON.stringify(cleaned));
      localStorage.setItem(IMAGE_RESET_KEY, "true");
    }
  } catch {
    /* Keep the catalogue usable when local storage is unavailable. */
  }
  const emit = () => onUpdate(ordered(read()));
  emit();
  window.addEventListener(EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    window.removeEventListener(EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}

export async function createPrototypeProduct(product: Product) {
  write([product, ...read().filter((item) => item.id !== product.id)]);
}

export async function deletePrototypeProduct(id: string) {
  write(read().filter((item) => item.id !== id));
}

export async function updatePrototypeProduct(id: string, patch: Partial<Product>) {
  write(read().map((item) => (item.id === id ? { ...item, ...patch } : item)));
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(blob);
  });
}
