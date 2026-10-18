import { useMemo, useState } from "react";
import { Check, Download, Globe2, LayoutTemplate } from "lucide-react";
import type { Product } from "../types";
import { catalogImage } from "../lib/catalogImage";
import { useLanguage } from "../lib/language";

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function storefrontHtml(name: string, tagline: string, accent: string, products: Product[], imageOverrides: Record<string, string> = {}) {
  const safeName = escapeHtml(name || "Your shop");
  const safeTagline = escapeHtml(tagline || "Thoughtfully chosen, ready for you.");
  const cards = products.map((product) => `<article class="item"><div class="photo"><img src="${escapeHtml(imageOverrides[product.id] || catalogImage(product) || product.imageUrl)}" alt="${escapeHtml(product.title)}"></div><div class="info"><span>${escapeHtml(product.category)}</span><h2>${escapeHtml(product.title)}</h2><strong>${product.price > 0 ? `₹${product.price.toLocaleString("en-IN")}` : "Price on request"}</strong></div></article>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${safeTagline}"><title>${safeName} · Shop</title><style>
    :root{--accent:${accent};--ink:#272831;--paper:#f9f8f5}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif}header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:23px clamp(22px,6vw,80px);border-bottom:1px solid #e9e5df;background:#fff}header strong{font-size:24px;letter-spacing:-1px}header a{color:var(--ink);font-size:13px;text-decoration:none}main{max-width:1280px;margin:auto;padding:0 clamp(22px,6vw,80px) 90px}.hero{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:30px;min-height:300px;padding:54px 0;border-bottom:1px solid #dedbd4}.hero p{max-width:42ch;color:#727078;line-height:1.6}.hero h1{margin:0;font-size:clamp(43px,6vw,88px);line-height:.98;letter-spacing:-.065em}.hero .shape{height:210px;border-radius:50% 50% 12% 50%;background:var(--accent);opacity:.72;transform:rotate(-12deg);justify-self:center;aspect-ratio:1}.collection-head{display:flex;justify-content:space-between;align-items:end;gap:18px;padding:45px 0 23px}.collection-head h2{font-size:29px;letter-spacing:-1px;margin:0}.collection-head span{color:#787780;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.item{min-width:0;background:#fff;border:1px solid #ece8e2}.photo{aspect-ratio:1.08;background:#f0ede8}.photo img{width:100%;height:100%;object-fit:contain}.info{padding:20px}.info span{font-size:11px;color:#85818a}.info h2{font-size:19px;letter-spacing:-.5px;margin:8px 0 14px}.info strong{font-size:15px}footer{padding:35px clamp(22px,6vw,80px);border-top:1px solid #e9e5df;color:#8b8790;font-size:12px}@media(max-width:700px){.hero{grid-template-columns:1fr;min-height:0}.hero .shape{height:120px;justify-self:start}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.info{padding:12px}.info h2{font-size:15px}}@media(max-width:440px){.grid{grid-template-columns:1fr}}
  </style></head><body><header><strong>${safeName}</strong><a href="#collection">Shop the collection ↓</a></header><main><section class="hero"><div><h1>Good finds.<br>Made yours.</h1><p>${safeTagline}</p></div><div class="shape" aria-hidden="true"></div></section><section id="collection"><div class="collection-head"><h2>Our collection</h2><span>${products.length} products</span></div><div class="grid">${cards}</div></section></main><footer>${safeName} · Made with Katalogit AI</footer></body></html>`;
}

async function inlineImage(source: string): Promise<string> {
  if (source.startsWith("data:")) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("Image unavailable");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image unavailable"));
    reader.readAsDataURL(blob);
  });
}

export default function WebsiteBuilder({ products, shopName }: { products: Product[]; shopName: string }) {
  const { t } = useLanguage();
  const [name, setName] = useState(shopName);
  const [tagline, setTagline] = useState(t("Everyday objects worth keeping close. Explore our edited collection."));
  const [accent, setAccent] = useState("#ec7153");
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const chosen = selected.length ? products.filter((product) => selected.includes(product.id)) : products.slice(0, 6);
  const preview = useMemo(() => storefrontHtml(name, tagline, accent, chosen), [name, tagline, accent, chosen.map((product) => product.id).join(",")]);
  const download = async () => {
    const imageOverrides: Record<string, string> = {};
    await Promise.all(chosen.map(async (product) => {
      const image = catalogImage(product) || product.imageUrl;
      try { imageOverrides[product.id] = await inlineImage(image); }
      catch { imageOverrides[product.id] = new URL(image, window.location.origin).href; }
    }));
    const html = storefrontHtml(name, tagline, accent, chosen, imageOverrides);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "katalogit-storefront.html"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("Website downloaded. Open the HTML file to see your storefront.");
  };
  return <div className="studio-page"><header className="studio-topbar"><span>Workspace <span>/</span> Build a website</span><span className="studio-status">Create a shop page from your products</span></header><main className="studio-content tool-page"><div className="tool-heading" data-tour="website"><div><p className="section-note">Put your products online</p><h1>Build a website</h1><p>Choose products, add your shop name, preview the page, and download it.</p></div><Globe2 size={32} /></div><div className="tool-layout website-layout"><section className="tool-controls"><h2>Set up your shop</h2><label>Shop name<input value={name} maxLength={45} onChange={(event) => setName(event.target.value)} /></label><label>Short introduction<textarea value={tagline} maxLength={180} rows={3} onChange={(event) => setTagline(event.target.value)} /></label><div className="website-colors"><strong>Accent color</strong><div>{["#ec7153", "#a99ad1", "#8ea780", "#d5a34c"].map((color) => <button key={color} type="button" className={accent === color ? "active" : ""} style={{ background: color }} aria-label={`Use ${color} accent`} aria-pressed={accent === color} onClick={() => setAccent(color)} />)}</div></div><div className="website-products"><strong>Products to show</strong><p>{selected.length ? `${selected.length} selected` : products.length ? `Showing the first ${Math.min(products.length, 6)} by default` : "Add a product photo to fill your shop"}</p><div>{products.map((product) => <label key={product.id}><input type="checkbox" checked={selected.includes(product.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} /><img src={product.imageUrl} alt="" /><span>{product.title}{product.isDemo ? " · team example" : ""}</span></label>)}</div></div><button className="button button-coral tool-primary" onClick={() => void download()} disabled={!chosen.length}><Download size={17} /> Download website</button>{feedback && <p className="tool-feedback" role="status"><Check size={15} /> {feedback}</p>}</section><section className="website-preview-wrap"><div><LayoutTemplate size={17} /><strong>Live preview</strong><span>Desktop and mobile ready</span></div><iframe title="Storefront preview" srcDoc={preview} /></section></div></main></div>;
}
