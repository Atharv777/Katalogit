/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product } from '../types';
import {
  createPrototypeProduct,
  deletePrototypeProduct,
  isPrototype,
  subscribeToPrototype,
  updatePrototypeProduct,
} from './prototype';

/**
 * Opens a real-time listener on `users/{uid}/products`, ordered by
 * `createdAt` descending and capped at 100 documents.
 *
 * @returns An `Unsubscribe` function — call it to detach the listener.
 */
export function subscribeToProducts(
  uid: string,
  onUpdate: (products: Product[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (isPrototype(uid)) return subscribeToPrototype(onUpdate);

  const colRef = collection(db, 'users', uid, 'products');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const products: Product[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Product, 'id'>),
      }));
      onUpdate(products);
    },
    (error) => {
      onError(error);
    }
  );
}

/**
 * Writes a new product document to `users/{uid}/products`.
 *
 * Strips the client-side `id` field (Firestore assigns its own document ID)
 * and stamps the `uid` onto the document data before writing.
 *
 * Validates: Requirements 2.1
 */
export async function addProduct(uid: string, product: Product): Promise<void> {
  if (isPrototype(uid)) return createPrototypeProduct(product);

  // Destructure out the client-only `id`; spread the rest into `data`
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...data } = product;

  // Stamp ownership — overrides any uid that may already be on the object
  data.uid = uid;

  // Firestore rejects undefined field values — strip them before writing.
  // Optional fields like aiImageProduct/aiImageLifestyle may be undefined
  // when AI generation is still in progress or failed.
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as typeof data;

  const colRef = collection(db, 'users', uid, 'products');
  await addDoc(colRef, cleanData);
}

/**
 * Writes a product under a client-generated document id.
 *
 * The add flow mints the id BEFORE uploading photos so every Storage object
 * under `users/{uid}/products/{productId}/…` already matches the document that
 * will own it — no orphan files, no second rename pass.
 *
 * Stamps `uid`, strips undefined values (Firestore rejects them), and writes
 * with `merge: true` so a retried save never fails on an existing id.
 */
export async function createProduct(uid: string, product: Product): Promise<void> {
  if (isPrototype(uid)) return createPrototypeProduct(product);

  const { id, ...data } = product;
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  const docRef = doc(db, 'users', uid, 'products', id);
  await setDoc(
    docRef,
    { ...cleanData, uid, createdAt: product.createdAt, id },
    { merge: true },
  );
}

/**
 * Hard-deletes a product document from `users/{uid}/products/{productId}`.
 *
 * Validates: Requirements 2.5
 */
export async function deleteProduct(uid: string, productId: string): Promise<void> {
  if (isPrototype(uid)) return deletePrototypeProduct(productId);

  const docRef = doc(db, 'users', uid, 'products', productId);
  await deleteDoc(docRef);
}

/**
 * Performs a partial update (patch) on a product document at
 * `users/{uid}/products/{productId}`.
 *
 * Guards:
 * - Throws if `patch` contains `createdAt` (immutable field).
 * - Throws if `patch.status` is present and is not one of
 *   `{ 'active', 'draft', 'review' }`.
 *
 * Validates: Requirements 2.2, 2.3, 2.4
 */
export async function updateProduct(
  uid: string,
  productId: string,
  patch: Partial<Product>
): Promise<void> {
  // Guard: createdAt is immutable — never allow it in a patch
  if ('createdAt' in patch) {
    throw new Error('updateProduct: patch must not contain the createdAt field');
  }

  // Guard: if status is provided, it must be a valid value
  const validStatuses = new Set(['active', 'draft', 'review']);
  if ('status' in patch && !validStatuses.has(patch.status as string)) {
    throw new Error(
      `updateProduct: invalid status "${patch.status}". Must be one of 'active', 'draft', 'review'`
    );
  }

  if (isPrototype(uid)) return updatePrototypeProduct(productId, patch);

  const docRef = doc(db, 'users', uid, 'products', productId);
  await updateDoc(docRef, patch as Record<string, unknown>);
}
