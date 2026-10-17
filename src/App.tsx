import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import LandingPage from "./components/LandingPage";
import ShopAssessment from "./components/ShopAssessment";
import { PROTOTYPE_UID, prototypeUser } from "./lib/prototype";
import type { ShopProfile } from "./lib/shopProfile";
import "./onboarding.css";

const CatalogApp = lazy(() => import("./CatalogApp"));
const MobileUpload = lazy(() => import("./components/MobileUpload"));

class AppBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="route-loader">
        <h1>The studio couldn’t open.</h1>
        <p>Reload to try again.</p>
        <button className="button button-dark" onClick={() => location.reload()}>
          Reload studio
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  const [route, setRoute] = useState(location.hash);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);

  useEffect(() => {
    const update = () => setRoute(location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const go = (hash: string) => {
    location.hash = hash;
    window.scrollTo(0, 0);
  };

  const session = new URLSearchParams(location.search).get("session");
  const isUpload = location.pathname === "/mobile-upload" && !!session;
  const workspace = route === "#/studio" || route === "#/demo";
  const assessment = route === "#/assessment" || (workspace && !shopProfile);

  useEffect(() => {
    document.title = workspace && shopProfile
      ? `${shopProfile.name} — Katalogit AI`
      : assessment ? "Tell us about your shop — Katalogit AI" : "Katalogit AI — From photo to catalogue";
  }, [workspace, assessment, shopProfile]);

  return (
    <MotionConfig reducedMotion="user">
      <AppBoundary>
        <Suspense
          fallback={
            <div className="route-loader">
              <span className="brand-icon">K</span>
              <p>Opening your studio…</p>
            </div>
          }
        >
          {isUpload ? (
            <MobileUpload sessionId={session as string} />
          ) : assessment ? (
            <ShopAssessment onBack={() => go("")} onComplete={(profile) => { setShopProfile(profile); go("#/studio"); }} />
          ) : workspace && shopProfile ? (
            <CatalogApp
              key={PROTOTYPE_UID}
              user={prototypeUser(shopProfile.name)}
              shopProfile={shopProfile}
              onHome={() => go("")}
            />
          ) : (
            <LandingPage onGetStarted={() => go("#/assessment")} />
          )}
        </Suspense>
      </AppBoundary>
    </MotionConfig>
  );
}
