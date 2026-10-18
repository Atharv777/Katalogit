import {
  LayoutGrid,
  Plus,
  Download,
  ClipboardCheck,
  Sun,
  Moon,
  ArrowLeft,
  LogOut,
  Share2,
  Globe2,
  PlayCircle,
} from "lucide-react";
import { User } from "firebase/auth";
import Brand from "./Brand";
import { LanguageSelect, useLanguage } from "../lib/language";
interface Props {
  currentView: string;
  onViewChange: (view: string) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  user: User | null;
  onLogout: () => void;
  onHome: () => void;
  onTour: () => void;
}
export default function Navigation({
  currentView,
  onViewChange,
  darkMode,
  onToggleDark,
  user,
  onLogout,
  onHome,
  onTour,
}: Props) {
  const { t } = useLanguage();
  const items = [
    { id: "dashboard", label: "Products", mobileLabel: "Products", icon: LayoutGrid },
    { id: "review", label: "Review", mobileLabel: "Review", icon: ClipboardCheck },
    { id: "export", label: "Download CSV", mobileLabel: "CSV", icon: Download },
    { id: "social", label: "Make a post", mobileLabel: "Post", icon: Share2 },
    { id: "website", label: "Build a website", mobileLabel: "Site", icon: Globe2 },
  ];
  return (
    <aside className="studio-sidebar">
      <Brand onClick={onHome} />
      <LanguageSelect />
      <div className="sidebar-label">{t("Your creative workspace")}</div>
      <nav aria-label="Studio navigation">
        {items.map((item) => (
          <button
            className={`sidebar-link ${currentView === item.id ? "active" : ""}`}
            key={item.id}
            aria-label={t(item.label)}
            onClick={() => onViewChange(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
          >
            <item.icon size={19} />
            <span className="nav-full-label">{t(item.label)}</span><span className="nav-mobile-label">{t(item.mobileLabel)}</span>
            {currentView === item.id && <i />}
          </button>
        ))}
        <button className="sidebar-add" aria-label={t("Add a product")} onClick={() => onViewChange("add")}>
          <Plus size={19} />
          <span className="nav-full-label">{t("Add a product")}</span><span className="nav-mobile-label">{t("Add")}</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={onTour}><PlayCircle size={18} /><span>{t("Take the tour")}</span></button>
        <button className="sidebar-link" onClick={onToggleDark}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{t(darkMode ? "Light appearance" : "Dark appearance")}</span>
        </button>
        <button className="sidebar-link" onClick={onHome}>
          <ArrowLeft size={18} />
          <span>{t("Back to home")}</span>
        </button>
        <div className="sidebar-profile">
          <span className="profile-avatar">
            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "K"}
          </span>
          <div>
            <strong>{user?.displayName || "Your studio"}</strong>
            <span>{user?.email || ""}</span>
          </div>
          <button className="icon-button" aria-label={t("Sign out")} onClick={onLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
