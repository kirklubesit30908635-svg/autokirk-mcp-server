// server.js
"use strict";

const express = require("express");
const cors = require("cors");

const app = express();

// --------- Config ----------
const PORT = process.env.PORT || 10000;
const SERVICE_NAME = process.env.SERVICE_NAME || "Autokirk MCP Server";
const LOG_LEVEL = process.env.LOG_LEVEL || "dev";

// --------- Middleware ----------
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// tiny request logger (no extra deps)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    if (LOG_LEVEL !== "silent") {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

// --------- Shared Status Payload ----------
function getStatusPayload() {
  return {
    status: "ok",
    service: SERVICE_NAME,
    message:
      "Deployment successful. MCP online. AIS blueprint endpoints at /mcp/generate-ais-blueprint and /api/ais-blueprint.",
    env: {
      node: process.version,
      port: String(PORT),
      logLevel: LOG_LEVEL,
    },
    time: new Date().toISOString(),
  };
}

// --------- Health / Status (ALWAYS ON) ----------
app.get("/", (req, res) => res.status(200).json(getStatusPayload()));
app.get("/status", (req, res) => res.status(200).json(getStatusPayload()));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// --------- AIS Blueprint (MCP + API) ----------
// This is the core "communication" endpoint.
// Replace `generateBlueprint()` with your real implementation later.
function generateBlueprint(input) {
  const prompt = input?.prompt ?? input?.query ?? input?.text ?? "";
  return {
    blueprintId: `bp_${Date.now()}`,
    received: {
      prompt,
      meta: input?.meta ?? null,
    },
    // Put your system output here:
    blueprint: {
      name: "AIS Blueprint",
      version: "1.0.0",
      summary: prompt ? `Generated from prompt: "${prompt}"` : "Generated with no prompt",
      modules: [
        { name: "intake", status: "stub" },
        { name: "plan", status: "stub" },
        { name: "execute", status: "stub" },
      ],
    },
  };
}

// Allow GET so browsers don't show "Cannot GET ..."
app.get("/mcp/generate-ais-blueprint", (req, res) => {
  res.status(200).json({
    ok: true,
    method: "POST",
    message: "Send JSON to this endpoint via POST. Example: {\"prompt\":\"hello\"}",
  });
});

app.post("/mcp/generate-ais-blueprint", (req, res) => {
  try {
    const result = generateBlueprint(req.body || {});
    res.status(200).json({ ok: true, source: "mcp", result });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Blueprint generation failed", detail: String(err) });
  }
});

// Mirror endpoint for /api/ais-blueprint
app.get("/api/ais-blueprint", (req, res) => {
  res.status(200).json({
    ok: true,
    method: "POST",
    message: "Send JSON to this endpoint via POST. Example: {\"prompt\":\"hello\"}",
  });
});

app.post("/api/ais-blueprint", (req, res) => {
  try {
    const result = generateBlueprint(req.body || {});
    res.status(200).json({ ok: true, source: "api", result });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Blueprint generation failed", detail: String(err) });
  }
});

// --------- 404 + Error Handling ----------
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not Found",
    path: req.originalUrl,
    hint: "Try GET /, /status, /healthz or POST /mcp/generate-ais-blueprint",
  });
});

// --------- Start ----------
app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
});
