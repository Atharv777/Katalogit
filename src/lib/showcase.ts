import { ProductStatus, type Product } from "../types";

/** Team-provided examples for the no-sign-in demo. Never saved to a user's catalogue. */
export const SHOWCASE_PRODUCTS: Product[] = [
  {
    id: "showcase-blue-kurti",
    isDemo: true,
    sku: "EX-BLUE-01",
    title: "Blue Embroidered Kurti",
    category: "Apparel",
    subcategory: "Kurti",
    description: "White kurti with blue and dark floral embroidery around the neckline, matching sleeve details, and a fine embroidered hem.",
    attributes: { Color: "White and blue", Pattern: "Floral embroidery", Sleeves: "Three-quarter" },
    price: 0,
    tags: ["kurti", "embroidered", "floral"],
    status: ProductStatus.ACTIVE,
    imageUrl: "/examples/flux-kurti-catalog.jpg",
    images: [{ slot: "front", label: "Front view", sourceUrl: "/examples/source-kurti.jpg", generatedUrl: "/examples/flux-kurti-catalog.jpg", finish: "ai" }],
    aiImageProduct: "/examples/flux-kurti-catalog.jpg",
    aiImageLifestyle: "/examples/kurti-social.jpg",
    createdAt: 2,
  },
  {
    id: "showcase-ivory-kurti",
    isDemo: true,
    sku: "EX-IVORY-02",
    title: "Ivory Printed Kurti Set",
    category: "Apparel",
    subcategory: "Kurti set",
    description: "Ivory sleeveless kurti set with scattered floral and leaf motifs, shown on a model against a plain background.",
    attributes: { Color: "Ivory", Pattern: "Floral and leaf print", Style: "Sleeveless kurti set" },
    price: 0,
    tags: ["kurti", "printed", "ivory"],
    status: ProductStatus.ACTIVE,
    imageUrl: "/examples/model-kurti.jpg",
    createdAt: 1,
  },
];
