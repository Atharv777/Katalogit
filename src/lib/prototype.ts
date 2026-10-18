/**
 * Prototype session — a local, no-signup studio for demos.
 *
 * Products live in IndexedDB and photos become data URLs, so the whole
 * capture -> generate -> save loop runs with no account, no Firebase and no
 * backend. Sign in (or append `?auth=1`) to use the real Firestore path.
 */

import type { User } from "firebase/auth";
import type { Product } from "../types";

export const PROTOTYPE_UID = "prototype-local";
const KEY = "katalogit:prototype:products";
const EVENT = "katalogit:prototype";
const DB_NAME = "katalogit-prototype";
const STORE = "products";
const MIGRATED = "katalogit:prototype:indexeddb-migrated";

export const isPrototype = (uid: string) => uid === PROTOTYPE_UID;

export const prototypeUser = (shopName = "Your shop") =>
  ({
    uid: PROTOTYPE_UID,
    displayName: shopName,
    email: null,
    photoURL: null,
  }) as unknown as User;

const readLegacy = (): Product[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
};

const changed = () => {
  window.dispatchEvent(new Event(EVENT));
};

let databasePromise: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function migrate(db: IDBDatabase) {
  if (localStorage.getItem(MIGRATED)) return;
  const legacy = readLegacy();
  if (legacy.length) {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    for (const product of legacy) store.put(product);
    await completed(transaction);
  }
  localStorage.setItem(MIGRATED, "true");
}

async function read(): Promise<Product[]> {
  try {
    const db = await database();
    await migrate(db);
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    const products = await new Promise<Product[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Product[]);
      request.onerror = () => reject(request.error);
    });
    return products;
  } catch {
    return readLegacy();
  }
}

async function put(product: Product) {
  try {
    const db = await database();
    await migrate(db);
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(product);
    await completed(transaction);
  } catch {
    const products = [product, ...readLegacy().filter((item) => item.id !== product.id)];
    localStorage.setItem(KEY, JSON.stringify(products));
  }
  changed();
}

const ordered = (products: Product[]) =>
  [...products].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

export function subscribeToPrototype(onUpdate: (products: Product[]) => void) {
  let active = true;
  let generation = 0;
  const emit = () => {
    const current = ++generation;
    void read().then((products) => {
      if (active && current === generation) onUpdate(ordered(products));
    });
  };
  emit();
  window.addEventListener(EVENT, emit);
  window.addEventListener("storage", emit);
  return () => {
    active = false;
    window.removeEventListener(EVENT, emit);
    window.removeEventListener("storage", emit);
  };
}

export async function createPrototypeProduct(product: Product) {
  await put(product);
}

export async function deletePrototypeProduct(id: string) {
  try {
    const db = await database();
    await migrate(db);
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);
    await completed(transaction);
  } catch {
    localStorage.setItem(KEY, JSON.stringify(readLegacy().filter((product) => product.id !== id)));
  }
  changed();
}

export async function updatePrototypeProduct(id: string, patch: Partial<Product>) {
  const existing = (await read()).find((item) => item.id === id);
  if (!existing) throw new Error("Product not found.");
  await put({ ...existing, ...patch });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(blob);
  });
}
