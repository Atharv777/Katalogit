import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = "http://127.0.0.1:3000";
const out = "artifacts/smoke-product-flow";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
let image;
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 1 });
  const svg = await readFile("public/demo/bag.svg", "utf8");
  await page.setContent(`<main style="width:600px;height:600px;display:grid;place-items:center;background:#f5f0e9">${svg}</main>`);
  image = await page.locator("main").screenshot({ path: `${out}/source.png` });
} finally {
  await browser.close();
}

const dataUrl = `data:image/png;base64,${image.toString("base64")}`;
const request = async (path, body) => {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(`${path}: HTTP ${response.status}: ${payload.error}`);
  return payload.data;
};

const status = await (await fetch(`${base}/api/ai/status`)).json();
console.log("AI status", JSON.stringify(status.data));

const { listing } = await request("/api/ai/listing", {
  category: "bags",
  slots: ["front"],
  notes: "Structured warm coral handbag with handles. Suggested price 2499 rupees.",
  image: dataUrl,
});
console.log("Analysis", JSON.stringify({
  title: listing.title,
  visual: listing.visual,
  price: listing.price,
}));

const result = await request("/api/ai/image", {
  category: "bags",
  slot: "front",
  image: dataUrl,
  title: listing.title,
  material: listing.visual?.material,
  colors: [listing.visual?.colors].filter(Boolean),
  visual: listing.visual,
  notes: "Preserve the exact coral bag from the source photograph.",
});
const generated = Buffer.from(result.imageBase64, "base64");
await writeFile(`${out}/generated.jpg`, generated);
console.log("Image edit", JSON.stringify({ slot: result.slot, bytes: generated.length, file: `${out}/generated.jpg` }));
