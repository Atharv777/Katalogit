import type { Product } from "../types";

/** A source or local studio finish must never be labelled as an AI catalogue image. */
export function catalogImage(product: Product): string | null {
  const generated = product.images?.find((image) => image.finish !== "studio" && image.generatedUrl)?.generatedUrl;
  if (generated) return generated;
  if (product.aiImageProduct) return product.aiImageProduct;
  if (product.images?.some((image) => image.finish === "studio" || image.sourceUrl)) return null;
  return product.imageUrl || null;
}

export function canRegenerateImage(product: Product): boolean {
  return !product.isDemo && !catalogImage(product) && Boolean(product.images?.some((image) => image.sourceUrl));
}
