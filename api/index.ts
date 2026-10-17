import express from "express";
import { randomBytes } from "node:crypto";
import { aiRouter } from "../server/routes-ai.js";

// Vercel runs this as a Node function. Keep AI credentials in Vercel's server
// environment; the browser only receives the generated result.
const app = express();
app.use(express.json({ limit: "16mb" }));
app.use("/api/ai", aiRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// A best-effort phone handoff for the live demo. Vercel can start a fresh
// function instance between requests, so the browser also offers local upload.
const mobileSessions = new Map<string, { imageData: string | null; createdAt: number }>();
app.post("/api/mobile-session", (_req, res) => {
  const sessionId = randomBytes(8).toString("hex");
  mobileSessions.set(sessionId, { imageData: null, createdAt: Date.now() });
  res.json({ sessionId });
});
app.post("/api/mobile-upload/:sessionId", (req, res) => {
  const session = mobileSessions.get(req.params.sessionId);
  if (!session || Date.now() - session.createdAt > 600_000) return res.status(404).json({ error: "Session expired" });
  if (typeof req.body?.imageData !== "string" || !req.body.imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "A product photo is required" });
  }
  session.imageData = req.body.imageData;
  res.json({ ok: true });
});
app.get("/api/mobile-session/:sessionId", (req, res) => {
  const session = mobileSessions.get(req.params.sessionId);
  if (!session || Date.now() - session.createdAt > 600_000) return res.status(404).json({ error: "Session expired" });
  if (!session.imageData) return res.json({ ready: false });
  const imageData = session.imageData;
  session.imageData = null;
  res.json({ ready: true, imageData });
});

export default app;
