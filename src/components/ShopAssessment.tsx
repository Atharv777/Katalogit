import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Package, Sparkles } from "lucide-react";
import type { ShopProfile } from "../lib/shopProfile";
import Brand from "./Brand";
import { LanguageSelect, useLanguage } from "../lib/language";

const categories = [
  { label: "Women's Clothing", icon: "👗" }, { label: "Men's Clothing", icon: "👔" },
  { label: "Footwear", icon: "👟" }, { label: "Bags & Accessories", icon: "👜" },
  { label: "Kids' Wear", icon: "🧸" }, { label: "Jewellery", icon: "💎" },
  { label: "Beauty & Grooming", icon: "🧴" }, { label: "Electronics", icon: "📱" },
];
const scales = [
  { label: "Just starting", detail: "Under 50 products", icon: "📦" },
  { label: "Small store", detail: "50–500 products", icon: "🏪" },
  { label: "Growing fast", detail: "500–2,000 products", icon: "🏬" },
  { label: "Large operation", detail: "2,000+ products", icon: "🏭" },
];
const ages = ["Just starting", "Less than a year", "1–3 years", "More than 3 years"];
const goals = ["Write listings", "Better product photos", "Make social posts", "Build a shop website", "Export a CSV"];
const toggle = (items: string[], item: string) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item];

function ShopGraphic({ name, step, products }: { name: string; step: number; products: string[] }) {
  return <div className="ob-shop-container">
    <svg className={`ob-shop-graphic ${step === 1 ? "is-zoomed" : ""}`} viewBox="0 0 280 240" role="img" aria-label={`Illustration of ${name || "your shop"}`}>
      <defs>
        <linearGradient id="obSkyGrad" x2="0" y2="1"><stop stopColor="#fdf7ee" /><stop offset="1" stopColor="#f8eee3" /></linearGradient>
        <linearGradient id="obFacadeGrad" x2="0" y2="1"><stop stopColor="#f2cba2" /><stop offset="1" stopColor="#e0ac7e" /></linearGradient>
      </defs>
      <rect width="280" height="240" rx="28" fill="url(#obSkyGrad)" />
      <circle cx="230" cy="42" r="30" fill="#f4d47c" opacity=".25" /><circle cx="230" cy="42" r="19" fill="#f4d47c" />
      <g fill="#fff" opacity=".9"><ellipse cx="54" cy="48" rx="22" ry="9" /><ellipse cx="70" cy="42" rx="13" ry="7" /><ellipse cx="176" cy="30" rx="15" ry="6" /></g>
      <rect y="196" width="280" height="44" fill="#e3ecdd" /><line y1="196" x2="280" y2="196" stroke="#167a52" strokeWidth="3" opacity=".3" />
      <rect x="48" y="72" width="184" height="124" rx="12" fill="url(#obFacadeGrad)" /><path d="M38 82 140 34 242 82Z" fill="#0f6240" />
      <rect x="62" y="82" width="156" height="30" rx="15" fill="#fffdf8" stroke="#0f6240" strokeWidth="2.5" />
      <text x="140" y="102" textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="DM Sans, sans-serif" fill="#24211d">{name.trim().slice(0, 16) || "Your Store"}</text>
      <rect x="62" y="130" width="78" height="56" rx="10" fill="#fff8ea" stroke="#b98a5e" strokeWidth="2.5" /><rect x="56" y="186" width="90" height="4" rx="2" fill="#b98a5e" />
      {step === 1 ? <g className="ob-shop-interior" opacity={products.length ? 1 : .35}><rect x="62" y="148" width="78" height="3" rx="1.5" fill="#b98a5e" /><rect x="62" y="168" width="78" height="3" rx="1.5" fill="#b98a5e" /><text x="82" y="165" fontSize="12">{categories.find((item) => products.includes(item.label))?.icon || "👗"}</text><text x="109" y="184" fontSize="12">{categories.find((item) => products.includes(item.label) && item.label !== products[0])?.icon || "👜"}</text></g> : <g><rect x="120" y="168" width="14" height="18" rx="3" fill="#c77f4a" /><path d="M127 168Q119 158 127 150Q135 158 127 168Z" fill="#3d8b63" /></g>}
      <path d="M154 196V154a34 34 0 0 1 68 0v42Z" fill="#a9743f" /><path d="M160 196V156a28 28 0 0 1 56 0v40Z" fill="#c8925e" /><circle cx="210" cy="176" r="4" fill="#f4d47c" />
      <rect x="146" y="114" width="86" height="13" rx="6.5" fill="#0f6240" /><path d="M154 114h11v13h-11zm22 0h11v13h-11zm22 0h11v13h-11z" fill="#f8eee3" />
    </svg>
  </div>;
}

function StepVisual({ step, profile, products, goals: selectedGoals }: { step: number; profile: ShopProfile; products: string[]; goals: string[] }) {
  if (step < 2) return <ShopGraphic name={profile.name} step={step} products={products} />;
  if (step === 2) return <div className="ob-visual-card"><div className="ob-visual-icon"><Package size={28} /></div><div className="ob-box-stack" aria-hidden="true">{Array.from({ length: profile.size === "Large operation" ? 12 : profile.size === "Growing fast" ? 9 : profile.size === "Small store" ? 6 : 3 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 55}ms` }} />)}</div><strong>{profile.size || "Your catalogue"}</strong><small>Every product, in one place</small></div>;
  if (step === 3) return <div className="ob-visual-card"><div className="ob-visual-icon">✦</div><div className="ob-history-line"><span /><span /><span /><span /></div><strong>{profile.age || "Your journey"}</strong><small>We meet your shop where it is today</small></div>;
  return <div className="ob-visual-card"><div className="ob-visual-icon"><Sparkles size={28} /></div><div className="ob-goal-preview">{(selectedGoals.length ? selectedGoals : goals.slice(0, 3)).slice(0, 3).map((goal) => <span key={goal}><Check size={14} /> {goal}</span>)}</div><strong>Your next steps</strong><small>Choose what would help your shop most</small></div>;
}

export default function ShopAssessment({ onBack, onComplete }: { onBack: () => void; onComplete: (profile: ShopProfile) => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ShopProfile>({ name: "", location: "", products: "", size: "", age: "", goal: "" });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [otherProduct, setOtherProduct] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalNote, setGoalNote] = useState("");
  const reduced = useReducedMotion();
  const update = (field: keyof ShopProfile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const canContinue = [Boolean(profile.name.trim() && profile.location.trim()), selectedProducts.length > 0 || Boolean(otherProduct.trim()), Boolean(profile.size), Boolean(profile.age), selectedGoals.length > 0 || Boolean(goalNote.trim())][step];
  const back = () => step ? setStep(step - 1) : onBack();
  const next = () => {
    if (!canContinue) return;
    if (step < 4) { setStep(step + 1); return; }
    onComplete({ ...profile, name: profile.name.trim(), location: profile.location.trim(), products: [...selectedProducts, otherProduct.trim()].filter(Boolean).join(", "), goal: [...selectedGoals, goalNote.trim()].filter(Boolean).join(" · ") });
  };
  const titles = ["Tell us about your store", "What do you sell?", "How big is your catalogue?", "How long have you been selling?", "What would you like help with?"];

  return <div className="ob-overlay-new seller-assessment">
    <div className="ob-progress-bar-new"><div className="ob-progress-fill-new" style={{ width: `${(step + 1) * 20}%` }} /></div>
    <header className="seller-assessment-header"><Brand onClick={onBack} /><span>{t("About your shop")}</span><LanguageSelect /></header>
    <main className="ob-main-container-new">
      <div className="ob-content-left-new">
        <AnimatePresence mode="wait">
          <motion.section key={step} className="ob-step-new" initial={reduced ? false : { opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: 18 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }}>
            <span className="ob-step-label-new">{t("Step {step} of 5", { step: step + 1 })}</span>
            <h1 className="ob-title-new">{t(titles[step])}</h1>
            {step === 0 && <><p className="ob-subtitle-new">{t("Your shop name appears on the storefront as you type.")}</p><label className="ob-form-group-new"><span className="ob-label-new">{t("Store name")}</span><input className="ob-input-new" value={profile.name} maxLength={60} onChange={(event) => update("name", event.target.value)} placeholder={t("Your store name")} /></label><label className="ob-form-group-new"><span className="ob-label-new">{t("City or neighbourhood")}</span><input className="ob-input-new" value={profile.location} maxLength={80} onChange={(event) => update("location", event.target.value)} placeholder={t("Where is your shop?")} /></label></>}
            {step === 1 && <><p className="ob-subtitle-new">{t("Choose the products you want to show. Pick more than one if you like.")}</p><div className="ob-chips-grid-new">{categories.map((item) => <button type="button" key={item.label} className={`ob-chip-new ob-chip-lg ${selectedProducts.includes(item.label) ? "active" : ""}`} aria-pressed={selectedProducts.includes(item.label)} onClick={() => setSelectedProducts((current) => toggle(current, item.label))}><span>{item.icon}</span>{t(item.label)}</button>)}</div><label className="ob-form-group-new"><span className="ob-label-new">{t("Something else?")}</span><input className="ob-input-new" value={otherProduct} maxLength={80} onChange={(event) => setOtherProduct(event.target.value)} placeholder={t("Tell us what you sell")} /></label></>}
            {step === 2 && <><p className="ob-subtitle-new">{t("About how many products do you have today?")}</p><div className="ob-scale-grid-new">{scales.map((item) => <button type="button" key={item.label} className={`ob-scale-card-new ${profile.size === item.label ? "active" : ""}`} aria-pressed={profile.size === item.label} onClick={() => update("size", item.label)}><span>{item.icon}</span><div><div className="ob-scale-title">{t(item.label)}</div><div className="ob-scale-sub">{item.detail}</div></div></button>)}</div></>}
            {step === 3 && <><p className="ob-subtitle-new">{t("There is no minimum experience needed.")}</p><div className="ob-scale-grid-new">{ages.map((item, index) => <button type="button" key={item} className={`ob-scale-card-new ${profile.age === item ? "active" : ""}`} aria-pressed={profile.age === item} onClick={() => update("age", item)}><span>{["🌱", "🪴", "🌿", "🌳"][index]}</span><div className="ob-scale-title">{t(item)}</div></button>)}</div></>}
            {step === 4 && <><p className="ob-subtitle-new">{t("Tell us what matters most. We’ll show those details in your studio.")}</p><div className="ob-goals-grid">{goals.map((item) => <button type="button" key={item} className={`ob-option-new ${selectedGoals.includes(item) ? "active" : ""}`} aria-pressed={selectedGoals.includes(item)} onClick={() => setSelectedGoals((current) => toggle(current, item))}>{t(item)}</button>)}</div><label className="ob-form-group-new"><span className="ob-label-new">{t("Anything else?")} <small>{t("(optional)")}</small></span><textarea className="ob-input-new" rows={3} value={goalNote} maxLength={180} onChange={(event) => setGoalNote(event.target.value)} placeholder="e.g. I want more people nearby to find my shop" /></label></>}
            <div className="ob-buttons-row-new"><button type="button" className="ob-btn-secondary-new" onClick={back}><ArrowLeft size={17} /> {t("Back")}</button><button type="button" className="ob-btn-primary-new" disabled={!canContinue} onClick={next}>{step === 4 ? t("Enter my studio") : t("Next")}<ArrowRight size={17} /></button></div>
          </motion.section>
        </AnimatePresence>
      </div>
      <div className="ob-graphics-right-new"><StepVisual step={step} profile={profile} products={selectedProducts} goals={selectedGoals} /></div>
    </main>
    <footer className="ob-step-dots-container">{titles.map((title, index) => <span key={title} className={`ob-step-dot ${index === step ? "active" : index < step ? "completed" : ""}`} aria-label={t("Step {step} of 5", { step: index + 1 })} />)}<small>{t("No account or password needed")}</small></footer>
  </div>;
}
