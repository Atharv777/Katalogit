import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Smartphone } from "lucide-react";
import QRCode from "qrcode";

const localHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

export default function PhoneCapture({ onImageReceived }: { onImageReceived: (image: string) => void }) {
  const [origin, setOrigin] = useState(localHost ? "" : window.location.origin);
  const [sessionId, setSessionId] = useState("");
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const onReceived = useRef(onImageReceived);
  onReceived.current = onImageReceived;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const setup = async () => {
      try {
        const networkRequest = localHost ? fetch("/api/network-ip") : null;
        const sessionResponse = await fetch("/api/mobile-session", { method: "POST" });
        if (!sessionResponse.ok) throw new Error("Phone upload could not be started.");
        const session = await sessionResponse.json() as { sessionId: string };
        if (!active) return;
        setSessionId(session.sessionId);
        if (networkRequest) {
          const networkResponse = await networkRequest;
          if (!networkResponse.ok) throw new Error("Could not find this computer's network address.");
          const { ip, port } = await networkResponse.json() as { ip: string; port: number };
          if (active) setOrigin(`http://${ip}:${port}`);
        }
        timer = setInterval(async () => {
          try {
            const response = await fetch(`/api/mobile-session/${session.sessionId}`);
            if (!response.ok) return;
            const result = await response.json() as { ready: boolean; imageData?: string };
            if (result.ready && result.imageData && active) {
              clearInterval(timer);
              onReceived.current(result.imageData);
            }
          } catch {
            // The phone may briefly disconnect; keep the session open.
          }
        }, 1800);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Phone connection failed.");
      }
    };
    void setup();
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  const cleanOrigin = origin.trim().replace(/\/$/, "");
  const phoneUrl = sessionId && cleanOrigin
    ? `${/^https?:\/\//i.test(cleanOrigin) ? cleanOrigin : `http://${cleanOrigin}`}/mobile-upload?session=${encodeURIComponent(sessionId)}`
    : "";

  useEffect(() => {
    let active = true;
    setQr("");
    if (phoneUrl) void QRCode.toDataURL(phoneUrl, { width: 188, margin: 1 })
      .then((image) => { if (active) setQr(image); })
      .catch(() => { if (active) setError("Could not create the QR code."); });
    return () => { active = false; };
  }, [phoneUrl]);

  return (
    <div className="flow-phone">
      <div className="flow-phone-copy"><Smartphone size={19} /><div><strong>Send a photo from your phone</strong><span>Open the link on your phone and the photo will appear here automatically.</span></div></div>
      {error ? <p role="alert">{error}</p> : !qr ? <p><Loader2 className="spin" size={16} /> Preparing phone link…</p> : (
        <div className="flow-phone-ready">
          <img src={qr} alt="QR code to open mobile product upload" width={188} height={188} />
          <div><p>Waiting for your photo…</p><code>{phoneUrl}</code><button className="il-btn" onClick={() => { void navigator.clipboard.writeText(phoneUrl).then(() => setCopied(true)); }} type="button">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy link"}</button></div>
        </div>
      )}
      <label className="flow-phone-address"><span>Address your phone can reach</span><input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="http://192.168.1.10:3000" /></label>
      <p className="flow-phone-help">On localhost, both devices need the same Wi-Fi and your firewall must allow port 3000. When hosted, this uses the public site address.</p>
    </div>
  );
}
