/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { networkInterfaces } from "os";
import { aiRouter } from "./server/routes-ai.js";

// .env.local holds the machine-local secrets and must win over the committed
// .env defaults. Neither is ever exposed to the browser bundle.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for mobile upload sessions
// sessionId -> { imageData: string | null, createdAt: number }
const mobileSessions = new Map<string, { imageData: string | null; createdAt: number }>();

// Clean up sessions older than 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of mobileSessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      mobileSessions.delete(id);
    }
  }
}, 60 * 1000);

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '16mb' }));

  // AI: listing copy + image generation. Runs server-side so OPENROUTER_API_KEY
  // is never shipped to the browser.
  app.use("/api/ai", aiRouter);

  // Log all API requests for debugging
  app.use('/api', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} — from ${req.ip}`);
    next();
  });

  // Allow cross-origin requests (phone browser hits a different origin in some setups)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Return the server's local network IP so the frontend can build the QR URL
  app.get("/api/network-ip", (req, res) => {
    res.json({ ip: getLocalIp(), port: PORT });
  });

  // Create a new mobile upload session
  app.post("/api/mobile-session", (req, res) => {
    const id = Math.random().toString(36).substring(2, 10);
    mobileSessions.set(id, { imageData: null, createdAt: Date.now() });
    res.json({ sessionId: id });
  });

  // Mobile device posts the image here
  app.post("/api/mobile-upload/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { imageData } = req.body;
    if (!sessionId || !imageData) {
      return res.status(400).json({ error: "Missing sessionId or imageData" });
    }
    mobileSessions.set(sessionId, { imageData, createdAt: Date.now() });
    res.json({ ok: true });
  });

  // Desktop polls this to check if an image has arrived
  app.get("/api/mobile-session/:sessionId", (req, res) => {
    const session = mobileSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.imageData) {
      // Return the image and clear it so it's only consumed once
      const imageData = session.imageData;
      mobileSessions.set(req.params.sessionId, { imageData: null, createdAt: session.createdAt });
      return res.json({ ready: true, imageData });
    }
    res.json({ ready: false });
  });

  // Mock implementation of duplicate check
  app.post("/api/check-duplicate", async (req, res) => {
    const { embedding, existingProducts } = req.body;
    
    if (!embedding || !existingProducts || !Array.isArray(existingProducts)) {
      return res.json({ match: false, confidence: 0 });
    }

    let bestMatch = { match: false, confidence: 0, matchedSku: "", matchedProductName: "" };

    for (const prod of existingProducts) {
      if (prod.embedding) {
        const sim = cosineSimilarity(embedding, prod.embedding);
        if (sim > bestMatch.confidence) {
          bestMatch = {
            match: sim > 0.85,
            confidence: sim,
            matchedSku: prod.sku,
            matchedProductName: prod.title,
          };
        }
      }
    }

    res.json(bestMatch);
  });

  function cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * (vec2[i] || 0), 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Local network: http://${getLocalIp()}:${PORT}`);
  });
}

startServer();
