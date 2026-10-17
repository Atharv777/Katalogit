/**
 * Firebase Storage helpers.
 *
 * Everything a seller captures, and everything the generator produces, is
 * written under `users/{uid}/products/{productId}/…` so the Storage security
 * rules can scope reads and writes to the owning account.
 */

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { blobToDataUrl, isPrototype } from "./prototype";

const safeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "item";

export async function uploadImage(args: {
  uid: string;
  productId: string;
  folder: "source" | "generated";
  name: string;
  blob: Blob;
  contentType?: string;
}): Promise<string> {
  if (isPrototype(args.uid)) return blobToDataUrl(args.blob);

  const path =
    `users/${args.uid}/products/${safeSegment(args.productId)}` +
    `/${args.folder}/${safeSegment(args.name)}.jpg`;

  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, args.blob, {
    contentType: args.contentType || "image/jpeg",
    cacheControl: "public,max-age=31536000,immutable",
  });
  return getDownloadURL(objectRef);
}