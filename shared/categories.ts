/**
 * Category system — single source of truth for BOTH the browser and the API.
 *
 * The old flow used one prompt for everything, so every category came back as
 * apparel. Each category here carries its own subject, studio style, and set of
 * photo slots the seller must actually capture, so the generator knows what it
 * is looking at and what it is being asked to produce.
 */

export type AspectRatio = "1:1" | "2:3" | "3:2" | "4:5";

export type PhotoSlot = {
  id: string;
  label: string;
  hint: string;
  required: boolean;
  aspect: AspectRatio;
  /** Camera/staging directive appended to the generation prompt. */
  render: string;
};

export type Category = {
  id: string;
  label: string;
  blurb: string;
  /** What the item physically is — drives noun choice in every prompt. */
  subject: string;
  /** How this category should be lit and staged. */
  studio: string;
  /** Background instruction for generated shots. */
  backdrop: string;
  /** Fields the seller is asked about beyond the always-on basics. */
  extraFields: string[];
  slots: PhotoSlot[];
};

export const CATEGORIES: Category[] = [
  {
    id: "apparel",
    label: "Apparel & Ethnic wear",
    blurb: "Kurtis, sarees, shirts, jeans, dresses, jackets.",
    subject:
      "the garment worn by an Indian fashion model, the garment being the clear hero of the frame",
    studio:
      "high-end fashion e-commerce photography, three-point softbox lighting, gentle rim light separating the fabric from the background",
    backdrop: "seamless warm bone-white studio sweep",
    extraFields: ["Size range (e.g. S-M-L-XL)", "Fabric & lining", "Sleeve / neckline"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Garment flat, front side up, full length, no folds",
        required: true,
        aspect: "2:3",
        render:
          "full-frontal view of the garment, worn naturally, arms slightly away from the body so the silhouette reads clearly",
      },
      {
        id: "back",
        label: "Back",
        hint: "Garment flat, back side up, show the full back panel",
        required: true,
        aspect: "2:3",
        render:
          "full rear view of the same garment, showing the complete back panel, seams and any back print or border",
      },
      {
        id: "side",
        label: "Side",
        hint: "Side profile so the drape and fit are visible",
        required: true,
        aspect: "2:3",
        render:
          "clean side profile view emphasising the drape, fall and fit of the fabric on the body",
      },
      {
        id: "detail",
        label: "Detail",
        hint: "Close-up of the print, embroidery, weave or border",
        required: true,
        aspect: "1:1",
        render:
          "tight macro detail shot of the most interesting craftsmanship — print, embroidery, weave, border or stitching",
      },
      {
        id: "worn",
        label: "Lifestyle",
        hint: "Worn in a real setting",
        required: false,
        aspect: "3:2",
        render:
          "editorial lifestyle photograph of the garment being worn naturally in a warm Indian setting, shallow depth of field",
      },
    ],
  },
  {
    id: "footwear",
    label: "Footwear",
    blurb: "Sneakers, sandals, heels, loafers, boots.",
    subject:
      "the footwear, a single shoe as the hero, rendered as a premium footwear product shot",
    studio:
      "hard-crisp sneaker and footwear product photography, crisp specular highlights on the sole unit, controlled studio reflections",
    backdrop: "seamless light grey studio sweep with a soft grounded contact shadow",
    extraFields: ["UK/IN sizing", "Upper material", "Sole type", "Heel height"],
    slots: [
      {
        id: "side",
        label: "Side profile",
        hint: "One shoe, side on, whole silhouette visible",
        required: true,
        aspect: "1:1",
        render:
          "perfect side profile of a single shoe, showing the full last shape, topline and midsole",
      },
      {
        id: "three_quarter",
        label: "Three-quarter",
        hint: "Angled front view, toe toward camera",
        required: true,
        aspect: "1:1",
        render:
          "three-quarter front angle of a single shoe, toe pointing toward camera, laces and tongue visible",
      },
      {
        id: "sole",
        label: "Sole",
        hint: "Flip the shoe over — tread pattern visible",
        required: true,
        aspect: "1:1",
        render:
          "sole facing the camera, shot straight on from below, the entire tread pattern and heel clearly legible",
      },
      {
        id: "heel",
        label: "Heel & back",
        hint: "Back of the shoe — heel counter and pull tab",
        required: false,
        aspect: "1:1",
        render:
          "rear three-quarter view emphasising the heel counter, back seam and any pull tab or branding",
      },
      {
        id: "pair",
        label: "The pair",
        hint: "Both shoes together, angled",
        required: true,
        aspect: "1:1",
        render:
          "both shoes of the pair arranged at a dynamic angle, the pair clearly matching, premium footwear campaign styling",
      },
      {
        id: "worn",
        label: "On foot",
        hint: "Worn, walking shot",
        required: false,
        aspect: "3:2",
        render:
          "on-foot lifestyle shot mid-stride, natural motion, urban or studio floor, shallow depth of field",
      },
    ],
  },
  {
    id: "electronics",
    label: "Electronics",
    blurb: "Audio, wearables, small appliances, accessories.",
    subject:
      "the electronic device itself, floating-free on a plinth, industrial design rendered with precision",
    studio:
      "premium technology product photography, soft gradient lighting, crisp edge definition, subtle screen glow, controlled reflections on glossy surfaces",
    backdrop: "seamless deep slate-grey studio gradient",
    extraFields: ["Brand & model", "Warranty", "Battery / power", "Ports & connectivity"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Device facing camera, controls visible",
        required: true,
        aspect: "4:5",
        render:
          "straight-on front view of the device, every control, button and indicator legible",
      },
      {
        id: "three_quarter",
        label: "Three-quarter",
        hint: "Angled view showing depth",
        required: true,
        aspect: "4:5",
        render:
          "three-quarter hero angle of the device showing its depth, curved surfaces and side profile",
      },
      {
        id: "back",
        label: "Back",
        hint: "Reverse side, ports and label visible",
        required: true,
        aspect: "4:5",
        render:
          "rear view of the device showing ports, jack, charging contacts and any printed label or regulatory markings",
      },
      {
        id: "ports",
        label: "Ports close-up",
        hint: "Tight shot of the ports / jack / buttons",
        required: false,
        aspect: "1:1",
        render:
          "macro close-up of the connectivity ports and physical buttons, pin-level detail",
      },
      {
        id: "inuse",
        label: "In use",
        hint: "Being used by a person",
        required: false,
        aspect: "3:2",
        render:
          "lifestyle shot of the device being used naturally by a person, believable modern environment, bokeh background",
      },
    ],
  },
  {
    id: "bags",
    label: "Bags & luggage",
    blurb: "Totes, backpacks, clutches, wallets, luggage.",
    subject:
      "the bag as a structured luxury accessory, holding its engineered shape without a person in frame",
    studio:
      "luxury accessory product photography, sculptural lighting raking across the material to reveal grain and edge paint",
    backdrop: "seamless pale stone studio backdrop",
    extraFields: ["Dimensions (H×W×D)", "Lining material", "Hardware finish", "Capacity"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Bag facing camera, closed, straight",
        required: true,
        aspect: "4:5",
        render:
          "straight-on front view of the bag, closed, every panel and closure visible, holding its structured shape",
      },
      {
        id: "back",
        label: "Back",
        hint: "Back panel, straps or handle attachment",
        required: true,
        aspect: "4:5",
        render:
          "rear view of the bag showing the back panel, strap anchors or handle attachments",
      },
      {
        id: "side",
        label: "Gusset / side",
        hint: "Side panel so the depth reads",
        required: true,
        aspect: "4:5",
        render:
          "side gusset view emphasising the bag's depth and how the panels meet at the seams",
      },
      {
        id: "interior",
        label: "Interior",
        hint: "Open bag, lining and pockets visible",
        required: true,
        aspect: "4:5",
        render:
          "bag opened wide to reveal the lining material, internal pockets and compartment layout",
      },
      {
        id: "hardware",
        label: "Hardware detail",
        hint: "Clasp, zip or rivet close-up",
        required: false,
        aspect: "1:1",
        render:
          "macro detail of the hardware — clasp, zip pull, rivets or buckle — showing the finish and construction",
      },
      {
        id: "styled",
        label: "Styled",
        hint: "Carried by a person",
        required: false,
        aspect: "3:2",
        render:
          "editorial shot of the bag being carried naturally on a person, styled street or studio, shallow depth of field",
      },
    ],
  },
  {
    id: "home",
    label: "Home & living",
    blurb: "Ceramics, lamps, textiles, decor, furniture.",
    subject:
      "the homeware object as a considered design piece, its material and craftsmanship as the subject",
    studio:
      "warm interior-still-life photography, soft directional daylight, gentle shadow fall, tactile material rendering",
    backdrop: "warm neutral plaster backdrop with a soft grounded shadow",
    extraFields: ["Material & finish", "Dimensions", "Care instructions", "Colour options"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Object straight on, full shape",
        required: true,
        aspect: "1:1",
        render:
          "straight-on front view of the object, its full form readable, centred and grounded",
      },
      {
        id: "three_quarter",
        label: "Three-quarter",
        hint: "Angled view showing volume",
        required: true,
        aspect: "1:1",
        render:
          "three-quarter view of the object showing its volume, curve and true proportions",
      },
      {
        id: "detail",
        label: "Craft detail",
        hint: "Close-up of texture, glaze or weave",
        required: true,
        aspect: "1:1",
        render:
          "macro detail of the craftsmanship — glaze pooling, brush texture, weave, joint or foot — shot with shallow depth of field",
      },
      {
        id: "scale",
        label: "In a room",
        hint: "Styled on a shelf, table or floor",
        required: true,
        aspect: "3:2",
        render:
          "the object placed naturally in a calm styled interior, shelf or table, with correct scale and believable contact shadow",
      },
      {
        id: "size",
        label: "With scale reference",
        hint: "Next to something of known size",
        required: false,
        aspect: "1:1",
        render:
          "the object shown next to a familiar everyday reference object so its real size is instantly readable",
      },
    ],
  },
  {
    id: "jewellery",
    label: "Jewellery",
    blurb: "Necklaces, earrings, rings, bangles, sets.",
    subject:
      "the jewellery piece alone, the metal and stone catching light, nothing else competing in frame",
    studio:
      "fine jewellery macro photography, dark-field gradient lighting, crisp specular sparkle, shallow depth of field",
    backdrop: "deep charcoal velvet gradient",
    extraFields: ["Metal purity", "Stone type", "Weight (g)", "Plating"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Piece laid flat, centred",
        required: true,
        aspect: "1:1",
        render:
          "the piece laid flat and centred, photographed straight on, the complete design fully legible",
      },
      {
        id: "detail",
        label: "Macro",
        hint: "Extreme close-up on setting or stone",
        required: true,
        aspect: "1:1",
        render:
          "extreme macro of the setting, stone facets or engraving, with brilliant specular sparkle and shallow depth of field",
      },
      {
        id: "clasp",
        label: "Clasp / back",
        hint: "Clasp, hook or catch",
        required: false,
        aspect: "1:1",
        render:
          "close-up of the clasp, hook, post or catch showing how the piece is fastened",
      },
      {
        id: "onhand",
        label: "On a hand",
        hint: "Worn on hand or wrist",
        required: true,
        aspect: "4:5",
        render:
          "the piece worn naturally on a hand or wrist, real skin texture, believable scale and lighting",
      },
      {
        id: "onmodel",
        label: "On a person",
        hint: "Worn as intended",
        required: false,
        aspect: "3:2",
        render:
          "editorial shot of the piece worn as intended on a person, neckline or wrist framed, soft luxury lighting",
      },
    ],
  },
  {
    id: "accessories",
    label: "Watches & accessories",
    blurb: "Watches, belts, sunglasses, wallets, scarves.",
    subject:
      "the accessory as a precision object, its materials and finishing doing the talking",
    studio:
      "premium accessory product photography, controlled specular highlights, precise edge separation",
    backdrop: "seamless graphite studio gradient",
    extraFields: ["Material", "Dial / face details", "Adjustability", "Warranty"],
    slots: [
      {
        id: "front",
        label: "Front",
        hint: "Dial or face toward camera",
        required: true,
        aspect: "1:1",
        render:
          "straight-on front view with the dial, face or primary surface fully legible and centred",
      },
      {
        id: "three_quarter",
        label: "Three-quarter",
        hint: "Angled, shows thickness",
        required: true,
        aspect: "1:1",
        render:
          "three-quarter angle showing the case thickness, side profile and finishing",
      },
      {
        id: "side",
        label: "Side / clasp",
        hint: "Side edge, buckle or clasp",
        required: true,
        aspect: "1:1",
        render:
          "side profile showing the edge, buckle, clasp or fastening mechanism",
      },
      {
        id: "macro",
        label: "Macro detail",
        hint: "Close-up texture or branding",
        required: false,
        aspect: "1:1",
        render:
          "macro detail of the engraving, branding, stitching or surface texture",
      },
      {
        id: "styled",
        label: "Worn",
        hint: "Worn by a person",
        required: true,
        aspect: "3:2",
        render:
          "the accessory worn naturally on a person, correctly scaled, editorial lighting, shallow depth of field",
      },
    ],
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function getSlot(categoryId: string, slotId: string): PhotoSlot | undefined {
  return getCategory(categoryId).slots.find((s) => s.id === slotId);
}

/** Shared negative prompt — keeps hands, text and watermarks out of every shot. */
export const NEGATIVE_DIRECTIVES = [
  "no watermark",
  "no text overlay",
  "no logos of third parties",
  "no distorted or extra limbs",
  "no duplicate products",
  "no heavy vignette",
  "photorealistic, high detail, sharp focus",
].join(", ");

/** Build the generation prompt for one slot. Order matters for image models:
 *  subject first, then the listing facts, then the camera directive. */
export function buildImagePrompt(args: {
  category: Category;
  slot: PhotoSlot;
  title: string;
  material?: string;
  colors?: string[];
  notes?: string;
  visual?: string;
}): string {
  const { category, slot, title, material, colors, notes, visual } = args;
  const facts = [
    title ? `item: ${title}` : "",
    material ? `material: ${material}` : "",
    colors && colors.length ? `colours: ${colors.slice(0, 4).join(", ")}` : "",
    notes ? `extra detail to respect: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  return [
    `Edit the attached source photograph into a professional e-commerce catalogue shot. The attached image is the exact product to preserve, not merely a style reference. Preserve its real shape, proportions, construction, colors, patterns, hardware and any visible branding. Do not invent missing product details.`,
    `Subject: ${category.subject}.`,
    visual ? `Verified visual facts from image analysis: ${visual}.` : "",
    facts,
    category.studio,
    `Camera direction: ${slot.render}.`,
    `Background: ${category.backdrop}.`,
    `Exactly one product, filling the frame, no props, no people unless the shot calls for it.`,
    NEGATIVE_DIRECTIVES,
  ]
    .filter(Boolean)
    .join(" ");
}
