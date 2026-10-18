import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

const steps = [
  { eyebrow: "PS2 Submission by team: TEAM_NAME", title: "One photo can start your online shop.", body: "The problem: small sellers spend hours writing listings and making posts for every product. Katalogit helps turn a product photo into a listing, a social post, and a simple shop website.", view: "dashboard", target: "", image: "/walkthrough/capture.jpg", alt: "A seller photographing a handmade mug" },
  { eyebrow: "1 of 4 · Add a product", title: "Take or upload a photo.", body: "Tap Add a product. Use your camera or choose a photo. Katalogit suggests the details; you check them before saving.", view: "dashboard", target: "capture", image: "/walkthrough/capture.jpg", alt: "A seller taking a product photo with a phone" },
  { eyebrow: "2 of 4 · Your catalogue", title: "Keep products together.", body: "The team's kurti examples show what the app can make. Products you add appear here too, ready to use across the app.", view: "dashboard", target: "catalog", image: "/walkthrough/catalogue.jpg", alt: "A mug, tote, and candle arranged for a catalogue" },
  { eyebrow: "3 of 4 · Social posts", title: "Make a post from a product.", body: "Choose a saved product. Get a post image and caption you can download and share.", view: "social", target: "social", image: "/walkthrough/social.jpg", alt: "A product post on a seller's phone" },
  { eyebrow: "4 of 4 · Shop website", title: "Create a simple website.", body: "Choose your products, add your shop name, preview the page, and download it when you are ready.", view: "website", target: "website", image: "/walkthrough/website.jpg", alt: "A small seller's shop website on a laptop" },
];

type Spotlight = { top: number; left: number; width: number; height: number };

export default function Walkthrough({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: string) => void }) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const step = steps[index];

  useEffect(() => {
    onNavigate(step.view);
    setSpotlight(null);
    if (!step.target) return;
    const measure = () => {
      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const padding = 7;
      setSpotlight({ top: Math.max(4, rect.top - padding), left: Math.max(4, rect.left - padding), width: Math.min(window.innerWidth - 8, rect.width + padding * 2), height: rect.height + padding * 2 });
    };
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-tour="${step.target}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
    }, 100);
    const settle = window.setTimeout(measure, 500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.clearTimeout(timer); window.clearTimeout(settle); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [index]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const cardWidth = Math.min(400, window.innerWidth - 24);
  const cardLeft = spotlight ? Math.max(12, Math.min(window.innerWidth - cardWidth - 12, spotlight.left + spotlight.width / 2 - cardWidth / 2)) : undefined;
  const placeBelow = !!spotlight && spotlight.top + spotlight.height + 420 < window.innerHeight;
  const cardTop = spotlight ? placeBelow ? spotlight.top + spotlight.height + 16 : Math.max(12, spotlight.top - 430) : undefined;

  return <div className={`tour-overlay ${index === 0 ? "tour-intro" : "tour-guided"}`}>
    {spotlight ? <div className="tour-spotlight" style={spotlight} aria-hidden="true" /> : <div className="tour-shade" aria-hidden="true" />}
    <section className="tour-card" style={spotlight ? { width: cardWidth, left: cardLeft, top: cardTop } : undefined} role="dialog" aria-modal="true" aria-label="Katalogit walkthrough">
      <header><span>{step.eyebrow}</span><button type="button" aria-label="Close walkthrough" onClick={onClose}><X size={19} /></button></header>
      <div className="tour-photo"><img src={step.image} alt={step.alt} /></div>
      <div className="tour-count">{index + 1} / {steps.length}</div>
      <h2>{step.title}</h2><p>{step.body}</p>
      <div className="tour-dots" aria-label={`Step ${index + 1} of ${steps.length}`}>{steps.map((item, position) => <span key={item.title} className={position === index ? "active" : ""} />)}</div>
      <footer><button type="button" className="tour-skip" onClick={onClose}>{index === steps.length - 1 ? "Close" : "Skip tour"}</button><div>{index > 0 && <button type="button" className="tour-back" onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={16} /> Back</button>}<button type="button" className="tour-next" onClick={() => index === steps.length - 1 ? onClose() : setIndex((value) => value + 1)}>{index === steps.length - 1 ? "Explore the studio" : "Next"}<ArrowRight size={16} /></button></div></footer>
    </section>
  </div>;
}
