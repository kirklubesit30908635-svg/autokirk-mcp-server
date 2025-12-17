"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

/* =========================
   CONFIG
========================= */
const PORT = Number(process.env.PORT || 10000);
const SERVICE_NAME = process.env.SERVICE_NAME || "Autokirk MCP Server";
const LOG_LEVEL = process.env.LOG_LEVEL || "dev"; // dev | silent
const JSON_LIMIT = process.env.JSON_LIMIT || "2mb";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300); // per IP per window

const AIS_ENDPOINTS = Object.freeze({
  mcp: "/mcp/generate-ais-blueprint",
  api: "/api/ais-blueprint",
});

/* =========================
   HELPERS
========================= */
const nowIso = () => new Date().toISOString();

function requestId() {
  // crypto.randomUUID exists on modern Node; fallback for safety
  return crypto.randomUUID?.() || crypto.randomBytes(16).toString("hex");
}

function statusPayload() {
  return {
    status: "ok",
    service: SERVICE_NAME,
    message: `Deployment successful. MCP online. AIS blueprint endpoints at ${AIS_ENDPOINTS.mcp} and ${AIS_ENDPOINTS.api}.`,
    env: { node: process.version, port: String(PORT), logLevel: LOG_LEVEL },
    time: nowIso(),
  };
}

function ok(res, data, meta) {
  res.status(200).json({ ok: true, ...data, meta });
}

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* =========================
   PLATFORM SETTINGS
========================= */
app.set("trust proxy", true);

/* =========================
   SECURITY HEADERS (no extra deps)
========================= */
app.use((req, res, next) => {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-xss-protection", "0"); // modern browsers ignore; keep explicit
  res.setHeader("permissions-policy", "geolocation=(), microphone=(), camera=()");
  next();
});

/* =========================
   CORS + BODY PARSING
========================= */
app.use(cors({ origin: true })); // tighten later if you have known origins
app.use(express.json({ limit: JSON_LIMIT }));

/* =========================
   REQUEST ID + LOGGING
========================= */
app.use((req, res, next) => {
  req.id = String(req.headers["x-request-id"] || requestId());
  res.setHeader("x-request-id", req.id);

  const start = Date.now();
  res.on("finish", () => {
    if (LOG_LEVEL === "silent") return;
    const ms = Date.now() - start;
    console.log(
      JSON.stringify({
        t: nowIso(),
        requestId: req.id,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms,
      })
    );
  });

  next();
});

/* =========================
   RATE LIMIT (in-memory, fast, good enough for Render single instance)
   If you scale horizontally, swap to Redis later.
========================= */
const buckets = new Map(); // ip -> { count, resetAt }

app.use((req, res, next) => {
  // don’t rate-limit health checks (keeps platform stable)
  if (req.path === "/healthz" || req.path === "/health" || req.path === "/status" || req.path === "/") {
    return next();
  }

  const ip = req.ip || "unknown";
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader("x-ratelimit-limit", String(RATE_LIMIT_MAX));
    res.setHeader("x-ratelimit-remaining", String(RATE_LIMIT_MAX - 1));
    return next();
  }

  b.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX - b.count);
  res.setHeader("x-ratelimit-limit", String(RATE_LIMIT_MAX));
  res.setHeader("x-ratelimit-remaining", String(remaining));

  if (b.count > RATE_LIMIT_MAX) {
    res.setHeader("retry-after", String(Math.ceil((b.resetAt - now) / 1000)));
    return next(httpError(429, "Rate limit exceeded", "RATE_LIMIT"));
  }

  next();
});

/* =========================
   ROUTES: HEALTH / STATUS (ALWAYS ON)
========================= */
app.get("/", (req, res) => res.status(200).json(statusPayload()));
app.get("/status", (req, res) => res.status(200).json(statusPayload()));
app.get("/health", (req, res) => res.status(200).json({ status: "ok", time: nowIso() }));
app.get("/healthz", (req, res) => res.status(200).send("ok"));

/* =========================
   CORE: Blueprint Generator (stub contract)
   Replace internals later — keep interface stable.
========================= */
function generateBlueprint(input) {
  const prompt = input?.prompt ?? input?.query ?? input?.text ?? "";
  const meta = input?.meta ?? null;

  // Strong contract response: deterministic fields
  return {
    blueprintId: `bp_${Date.now()}`,
    version: "1.0.0",
    received: { prompt, meta },
    blueprint: {
      name: "AIS Blueprint",
      summary: prompt ? `Generated from prompt: "${prompt}"` : "Generated with no prompt",
      modules: [
        { name: "intake", status: "ready" },
        { name: "plan", status: "ready" },
        { name: "execute", status: "ready" },
      ],
      // This is where your real blueprint structure goes.
      // Keep it stable so clients can integrate safely.
    },
  };
}

function validateBodyIsObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be a JSON object", "BAD_JSON");
  }
  return body;
}

function explain(path) {
  return {
    ok: true,
    endpoint: path,
    method: "POST",
    contentType: "application/json",
    example: { prompt: "hello", meta: { source: "client" } },
  };
}

function mountBlueprint(path, source) {
  app.get(path, (req, res) => res.status(200).json(explain(path)));

  app.post(
    path,
    asyncRoute(async (req, res) => {
      const input = validateBodyIsObject(req.body);
      const result = generateBlueprint(input);
      ok(res, { source, result }, { requestId: req.id, time: nowIso() });
    })
  );
}

mountBlueprint(AIS_ENDPOINTS.mcp, "mcp");
mountBlueprint(AIS_ENDPOINTS.api, "api");

/* =========================
   404
========================= */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not Found",
    requestId: req.id,
    path: req.originalUrl,
    hint: {
      health: ["/healthz", "/health", "/status", "/"],
      blueprint: [AIS_ENDPOINTS.mcp, AIS_ENDPOINTS.api],
    },
    time: nowIso(),
  });
});

/* =========================
   ERROR HANDLER (LAST)
========================= */
app.use((err, req, res, next) => {
  const statusCode = Number(err?.statusCode || 500);
  const isServer = statusCode >= 500;

  if (LOG_LEVEL !== "silent") {
    console.error(
      JSON.stringify({
        t: nowIso(),
        requestId: req?.id,
        statusCode,
        code: err?.code,
        message: err?.message || String(err),
        stack: err?.stack,
      })
    );
  }

  res.status(statusCode).json({
    ok: false,
    error: isServer ? "Internal Server Error" : "Request Error",
    code: err?.code,
    message: isServer ? "Unexpected failure" : (err?.message || "Bad request"),
    requestId: req?.id,
    time: nowIso(),
  });
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  if (LOG_LEVEL !== "silent") {
    console.log(`${SERVICE_NAME} listening on port ${PORT}`);
    console.log(`Health: /healthz`);
    console.log(`MCP: ${AIS_ENDPOINTS.mcp}`);
    console.log(`API: ${AIS_ENDPOINTS.api}`);
  }
});
