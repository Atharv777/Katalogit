/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

// Use the environment variable injected by the platform
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing. AI features will not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const MODELS = {
  FLASH: 'gemini-2.5-flash',
  EMBEDDING: 'gemini-embedding-2-preview',
};

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert retail catalog AI for Indian fashion and lifestyle.
Analyze the provided image with extreme precision and objective observation.
1. Identify the exact product category (e.g., Saree, Kurta, Shoes, Bag).
2. Do NOT default to "Saree" or "Ethnic Wear" unless the image clearly shows it.
3. Extract merchant-ready details based strictly on what is visible.

Return ONLY a valid JSON object:
{
  "title": "A concise, professional product title",
  "category": "One of [Sarees, Kurtas & Suits, Menswear, Jewellery, Footwear, Home Decor, Beauty, Bags, Kids, Accessories]",
  "subcategory": "Specific type (e.g., Silk Saree, Casual Shirt)",
  "description": "3 sentences. First: What it is. Second: Material and feel. Third: Ideal vibe or use.",
  "attributes": {
    "Color": "Dominant color names",
    "Material": "Identified fabric or material",
    "Pattern": "Visual pattern (e.g., Floral, Solid, Checked)",
    "Fit": "Fit type (e.g., Slim, Regular, Anarkali)",
    "Occasion": "Ideal setting (e.g., Casual, Festive, Formal)",
    "Gender": "Target gender (Men/Women/Unisex)",
    "Size_type": "Likely size standard (e.g. S-M-L-XL)"
  },
  "suggested_price_inr": 1999,
  "tags": ["5-6 relevant search tags"],
  "sku_suffix": "4-6 letter uppercase abbreviation (e.g. SLKSAR, TSHRT, LEATHR)"
}`;

export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    category: { type: Type.STRING },
    subcategory: { type: Type.STRING },
    description: { type: Type.STRING },
    attributes: {
      type: Type.OBJECT,
      properties: {
        Color: { type: Type.STRING },
        Material: { type: Type.STRING },
        Pattern: { type: Type.STRING },
        Fit: { type: Type.STRING },
        Occasion: { type: Type.STRING },
        Gender: { type: Type.STRING },
        Size_type: { type: Type.STRING },
      },
    },
    suggested_price_inr: { type: Type.NUMBER },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    sku_suffix: { type: Type.STRING },
  },
  required: ["title", "category", "subcategory", "description", "attributes", "suggested_price_inr", "tags", "sku_suffix"],
};

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}
