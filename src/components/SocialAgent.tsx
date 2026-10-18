import { useEffect, useState } from "react";
import { Check, Copy, Download, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import type { Product } from "../types";
import { catalogImage } from "../lib/catalogImage";
import { useLanguage } from "../lib/language";

async function imageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("The catalogue image could not be loaded.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The catalogue image could not be read."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The product image could not be opened."));
    image.src = src;
  });
}

const lineWrap = (ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) => {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
};

export default function SocialAgent({ products }: { products: Product[] }) {
  const { language, t } = useLanguage();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [platform, setPlatform] = useState("Instagram");
  const [angle, setAngle] = useState("Product spotlight");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [campaignImage, setCampaignImage] = useState("");
  const [imageFinish, setImageFinish] = useState<"ai" | "catalog" | "example">("catalog");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const product = products.find((item) => item.id === productId) ?? products[0];

  useEffect(() => { if (!productId && products[0]) setProductId(products[0].id); }, [productId, products]);
  useEffect(() => {
    if (!product) return;
    const example = product.isDemo ? product.aiImageLifestyle || "" : "";
    setCampaignImage(example); setImageFinish(example ? "example" : "catalog"); setFeedback("");
    setCaption(example ? "A closer look at the blue floral embroidery, soft white fabric, and details that make this kurti stand out." : `${product.title}. ${product.description.split(".")[0]}. Discover it in our collection.`);
    setHashtags(["#ShopSmall", `#${product.category.replace(/[^a-zA-Z]/g, "")}`, "#NewFinds"]);
  }, [product?.id]);

  const generate = async () => {
    if (!product) return;
    setBusy(true); setFeedback("");
    const imageUrl = catalogImage(product) || product.imageUrl;
    const copyRequest = fetch("/api/ai/social-copy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: product.title, description: product.description, category: product.category, platform, angle, language }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Caption unavailable");
      return payload.data as { caption: string; hashtags: string[] };
    });
    const imageRequest = imageAsDataUrl(imageUrl).then(async (source) => {
      // SVG sample art is rasterized before it reaches an image model.
      const input = source.includes("image/svg") ? await (async () => {
        const image = await loadImage(source);
        const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#f5f1ea"; ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(image, 0, 0, 1024, 1024);
        return canvas.toDataURL("image/png");
      })() : source;
      const response = await fetch("/api/ai/social-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: input, title: product.title, angle, visual: product.description.slice(0, 180) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Image edit unavailable");
      const base64 = String(payload.data.imageBase64);
      return `data:${base64.startsWith("/9j/") ? "image/jpeg" : "image/png"};base64,${base64}`;
    });
    const [copy, picture] = await Promise.allSettled([copyRequest, imageRequest]);
    if (copy.status === "fulfilled") { setCaption(copy.value.caption); setHashtags(copy.value.hashtags); }
    if (picture.status === "fulfilled") { setCampaignImage(picture.value); setImageFinish("ai"); }
    else { const example = product.isDemo ? product.aiImageLifestyle || "" : ""; setCampaignImage(example); setImageFinish(example ? "example" : "catalog"); }
    setFeedback(picture.status === "fulfilled" ? "New AI image and caption are ready." : product.isDemo && product.aiImageLifestyle ? "The example post is still available. Live image editing could not finish; try again later." : "Post layout is ready with your catalogue photo. Live image editing could not finish; try again later.");
    setBusy(false);
  };

  const download = async () => {
    if (!product) return;
    try {
      if (imageFinish === "example" && product.aiImageLifestyle) {
        const anchor = document.createElement("a"); anchor.href = product.aiImageLifestyle;
        anchor.download = `${product.sku.toLowerCase()}-example-post.jpg`; anchor.click();
        setFeedback("Example post downloaded."); return;
      }
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f5f1ea"; ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "#282931"; ctx.font = "700 38px Arial"; ctx.fillText("katalogit", 72, 94);
      ctx.fillStyle = "#ec7153"; ctx.fillRect(72, 125, 936, 7);
      const src = campaignImage || catalogImage(product) || product.imageUrl;
      const image = await loadImage(src);
      const scale = Math.min(910 / image.width, 850 / image.height);
      const width = image.width * scale, height = image.height * scale;
      ctx.drawImage(image, (1080 - width) / 2, 157 + (850 - height) / 2, width, height);
      ctx.fillStyle = "#282931"; ctx.font = "700 58px Arial";
      lineWrap(ctx, product.title, 920, 2).forEach((line, index) => ctx.fillText(line, 72, 1090 + index * 65));
      ctx.font = "36px Arial"; ctx.fillText(product.price > 0 ? `₹${product.price.toLocaleString("en-IN")}` : "Price on request", 72, 1265);
      ctx.fillStyle = "#ec7153"; ctx.fillRect(72, 1290, 180, 8);
      const anchor = document.createElement("a"); anchor.href = canvas.toDataURL("image/png");
      anchor.download = `${product.sku.toLowerCase()}-social-post.png`; anchor.click();
      setFeedback("Post image downloaded.");
    } catch {
      setFeedback("This product image cannot be exported from this browser. Try a demo product or an uploaded image.");
    }
  };

  return <div className="studio-page"><header className="studio-topbar"><span>{t("Workspace")} <span>/</span> {t("Make a post")}</span><span className="studio-status">{t("Create a post from a product")}</span></header><main className="studio-content tool-page">
    <div className="tool-heading" data-tour="social"><div><p className="section-note">{t("Share your products")}</p><h1>{t("Make a social post")}</h1><p>{t("Choose a product to make a post image and caption.")}</p></div><Sparkles size={32} /></div>
    {product?.isDemo && product.aiImageLifestyle && <div className="social-example-note"><strong>Team example</strong><span>The post shown below was provided by the team for this kurti. Choose Generate post to try a new FLUX image.</span></div>}
    {product ? <div className="tool-layout"><section className="tool-controls"><h2>Make a post</h2><label>Product<select value={product.id} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.title}{item.isDemo ? " · team example" : ""}</option>)}</select></label><label>Platform<select value={platform} onChange={(event) => setPlatform(event.target.value)}><option>Instagram</option><option>Facebook</option><option>Pinterest</option></select></label><label>Post angle<select value={angle} onChange={(event) => setAngle(event.target.value)}><option>Product spotlight</option><option>New arrival</option><option>Everyday inspiration</option></select></label><button className="button button-coral tool-primary" disabled={busy} onClick={() => void generate()}>{busy ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}{busy ? "Creating post…" : "Generate post"}</button><p className="tool-hint">Generate post uses FLUX to edit this product photo. You can also download the team example shown here.</p></section>
    <section className="tool-output"><div className="social-preview"><div className="social-preview-head"><strong>katalogit</strong><span>{angle}</span></div><div className={`social-preview-art ${imageFinish === "example" ? "social-preview-example" : ""}`}><img src={campaignImage || product.imageUrl} alt={`${product.title} social post`} /><span>{imageFinish === "ai" ? "New AI image" : imageFinish === "example" ? "Team example post" : "Catalogue photo"}</span></div><div className="social-preview-bottom"><span>{product.category}</span><h2>{product.title}</h2><strong>{product.price > 0 ? `₹${product.price.toLocaleString("en-IN")}` : "Price not set"}</strong></div></div><div className="social-caption"><div><strong>Caption</strong><span>{platform}</span></div><p>{caption}</p><small>{hashtags.join(" ")}</small><div className="social-actions"><button className="button button-dark" onClick={() => void download()}><Download size={16} /> Download post image</button><button className="button button-light" onClick={() => { void navigator.clipboard.writeText(`${caption}\n\n${hashtags.join(" ")}`).then(() => setFeedback("Caption copied.")); }}><Copy size={16} /> Copy caption</button></div>{feedback && <p className="tool-feedback" role="status"><Check size={15} /> {feedback}</p>}</div></section></div> : <div className="tool-empty"><ImageIcon size={28} /><h2>Add a product photo first</h2><p>Once you save a product with a photo, you can make a post from it here.</p></div>}
  </main></div>;
}
