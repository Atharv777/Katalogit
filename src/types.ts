/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  REVIEW = 'review',
}

/** One captured photo + whatever the generator made from it. */
export interface ProductImage {
  /** Slot id from the category definition, e.g. "front", "sole", "interior". */
  slot: string;
  label: string;
  /** Firebase Storage URL of the seller's original photo. */
  sourceUrl?: string;
  /** Firebase Storage URL of the generated catalogue shot. */
  generatedUrl?: string;
  /** Whether this was an AI edit or a local photo finish. */
  finish?: "ai" | "studio";
  /** True once the source photo has been captured but not yet generated. */
  pending?: boolean;
}

export interface ProductAttributes {
  [key: string]: string;
}

export interface Product {
  id: string;
  /** Read-only sample visible in the prototype catalog; never persisted. */
  isDemo?: boolean;
  uid?: string;
  sku: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  /** Search-snippet copy written by the listing pass. */
  seoDescription?: string;
  attributes: ProductAttributes;
  price: number;
  tags: string[];
  status: ProductStatus;
  /** Primary catalogue image — the generated front shot when one exists. */
  imageUrl: string;
  /** Every captured + generated shot, keyed by slot. */
  images?: ProductImage[];
  aiImageProduct?: string;
  aiImageLifestyle?: string;
  embedding?: number[];
  createdAt: number;
}

export interface CatalogStats {
  totalSKUs: number;
  categories: number;
  pendingReview: number;
}

export interface DuplicateCheckResult {
  match: boolean;
  confidence: number;
  matchedSku?: string;
  matchedProductName?: string;
}

/** What the listing endpoint returns. */
export interface AiListing {
  title: string;
  description: string;
  seoDescription: string;
  price: number;
  category: string;
  subcategory: string;
  tags: string[];
  attributes: Record<string, string>;
  visual?: {
    subject: string;
    colors: string;
    material: string;
    pattern: string;
    distinctiveFeatures: string[];
    visibleText: string;
    uncertainty: string;
  };
}

export interface AiStatus {
  configured: boolean;
  provider: "gemini" | "openrouter" | "pollinations" | null;
  textModel: string | null;
  imageModel: string | null;
  imageProvider?: "cloudflare" | "openai" | "gemini" | "openrouter" | null;
}
