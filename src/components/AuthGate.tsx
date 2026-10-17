import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Mail, Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../lib/firebase";
import Brand from "./Brand";

type Mode = "signin" | "signup";

export default function AuthGate({
  aiReady,
  onAuthenticated,
}: {
  aiReady: boolean | null;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [emailDisabled, setEmailDisabled] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setBusy("form");
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, name);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onAuthenticated();
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : "Something went wrong.";
      setError(message);
      if (/switched off|operation-not-allowed/i.test(message)) setEmailDisabled(true);
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    if (busy) return;
    setError("");
    setBusy("google");
    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Google sign-in failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-card">
        <Brand onClick={() => window.location.reload()} />

        <div className="auth-heading">
          <h1>{mode === "signup" ? "Open your studio" : "Welcome back"}</h1>
          <p>
            {mode === "signup"
              ? "Create an account to keep your catalogue, your photos and every listing you generate."
              : "Sign in to pick up where your catalogue left off."}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account">
          {(["signup", "signin"] as Mode[]).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              className={mode === value ? "selected" : ""}
              onClick={() => {
                setMode(value);
                setError("");
              }}
            >
              {value === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        <button className="auth-google" onClick={google} disabled={busy !== null}>
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.4 14.3a7.1 7.1 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
            />
          </svg>
          {busy === "google" ? "Opening Google…" : "Continue with Google"}
        </button>

        <div className="auth-or">
          <span />
          <em>or use your email</em>
          <span />
        </div>

        {emailDisabled && (
          <p className="auth-warn">
            Email sign-in is switched off for this project. Use Google above,
            or ask the owner to turn on Email/Password in the Firebase console.
          </p>
        )}

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>
              <span>
                <UserIcon size={14} /> Your name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Asha Verma"
                autoComplete="name"
              />
            </label>
          )}

          <label>
            <span>
              <Mail size={14} /> Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.in"
              autoComplete="email"
            />
          </label>

          <label>
            <span>
              <Lock size={14} /> Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {notice && <p className="auth-notice">{notice}</p>}

          <button className="auth-submit" type="submit" disabled={busy !== null}>
            {busy === "form" ? (
              <>
                <Loader2 className="spin" size={17} /> Working…
              </>
            ) : (
              <>
                {mode === "signup" ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <p className="auth-note">
          <ShieldCheck size={14} />
          {aiReady === false
            ? "Signed in. The image generator needs credits on the server before it can render shots."
            : "Your catalogue and photos stay in your account. Nothing is shared."}
        </p>
      </div>
    </div>
  );
}