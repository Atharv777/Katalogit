import { ArrowRight, Camera, FileText, Share2 } from "lucide-react";
import Brand from "./Brand";

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="welcome-page">
      <header className="welcome-header"><Brand /></header>
      <main className="welcome-main">
        <div className="welcome-copy">
          <h1>Your products deserve a better first impression.</h1>
          <p className="welcome-lead">Katalogit helps your shop turn a product photo into a clear listing, a catalogue image, a social post, and a simple website.</p>
          <div className="welcome-steps" aria-label="How Katalogit works">
            <span><Camera size={19} /> Add a product photo</span>
            <span><FileText size={19} /> Check the suggested details</span>
            <span><Share2 size={19} /> Share your products</span>
          </div>
          <button className="welcome-cta" onClick={onGetStarted}>Get started <ArrowRight size={19} /></button>
          <p className="welcome-reassurance">First, tell us a little about your shop. No sign-in needed for this demo.</p>
        </div>
        <div className="welcome-example" aria-label="Example product transformation">
          <div className="welcome-example-heading"><strong>See what one photo can become</strong><span>Real team example</span></div>
          <div className="welcome-example-images">
            <figure><img src="/examples/source-kurti.jpg" alt="Original photo of a white embroidered kurti" /><figcaption>Photo taken</figcaption></figure>
            <figure><img src="/examples/flux-kurti-catalog.jpg" alt="Generated catalogue image of the embroidered kurti" /><figcaption>Catalogue image</figcaption></figure>
          </div>
          <p>You stay in control: review the details before adding anything to your catalogue.</p>
        </div>
      </main>
    </div>
  );
}
